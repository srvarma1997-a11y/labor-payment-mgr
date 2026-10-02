"""SiteHisab backend API tests - auth, sites, labourers, attendance, bills,
advances, payroll, dashboard, and RBAC supervisor isolation."""
import time
import uuid
import pytest
import requests

# -------------------------------------------------------------------------- auth
class TestAuth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert "SiteHisab" in r.json().get("message", "")

    def test_owner_login(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/login",
                            json={"phone": "9000000001", "password": "test1234"})
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "owner"
        assert data["user"]["phone"] == "9000000001"

    def test_login_invalid(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/login",
                            json={"phone": "9000000001", "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_token(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_me(self, api_client, base_url, owner_headers):
        r = api_client.get(f"{base_url}/api/auth/me", headers=owner_headers)
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    def test_register_duplicate_phone(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/register-owner",
                            json={"name": "Dup", "phone": "9000000001", "password": "x1"})
        assert r.status_code == 409

    def test_register_new_owner(self, api_client, base_url):
        phone = f"999{int(time.time()) % 10000000:07d}"
        r = api_client.post(f"{base_url}/api/auth/register-owner",
                            json={"name": "TEST_Owner2", "phone": phone, "password": "pass1234"})
        assert r.status_code == 201
        data = r.json()
        assert data["user"]["role"] == "owner"
        assert "access_token" in data


# -------------------------------------------------------------------------- sites + full workflow + RBAC
@pytest.fixture(scope="module")
def workflow_state(base_url, owner_headers):
    """Create a site, labourer, attendance, bill, advance; return ids. Cleans up."""
    state = {"created": []}
    # Create site
    r = requests.post(f"{base_url}/api/sites", headers=owner_headers,
                      json={"name": "TEST_Site_A", "company_name": "TEST_Co",
                            "location": "TEST_Loc"})
    assert r.status_code == 201, r.text
    site = r.json()
    state["site_id"] = site["id"]
    state["site"] = site
    yield state
    # teardown: delete site (soft)
    requests.delete(f"{base_url}/api/sites/{state['site_id']}", headers=owner_headers)


class TestSites:
    def test_create_and_list_site(self, base_url, owner_headers, workflow_state):
        r = requests.get(f"{base_url}/api/sites", headers=owner_headers)
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert workflow_state["site_id"] in ids

    def test_get_site(self, base_url, owner_headers, workflow_state):
        r = requests.get(f"{base_url}/api/sites/{workflow_state['site_id']}",
                         headers=owner_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Site_A"

    def test_update_site(self, base_url, owner_headers, workflow_state):
        r = requests.put(f"{base_url}/api/sites/{workflow_state['site_id']}",
                         headers=owner_headers,
                         json={"name": "TEST_Site_A2", "company_name": "TEST_Co",
                               "location": "L2"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Site_A2"
        # revert so later tests see "TEST_Site_A"
        requests.put(f"{base_url}/api/sites/{workflow_state['site_id']}",
                     headers=owner_headers,
                     json={"name": "TEST_Site_A", "company_name": "TEST_Co",
                           "location": "TEST_Loc"})


class TestLabourers:
    def test_add_labourer(self, base_url, owner_headers, workflow_state):
        r = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/labourers",
            headers=owner_headers,
            json={"name": "TEST_Lab1", "daily_wage": 600, "phone": "1111111111"})
        assert r.status_code == 201, r.text
        lab = r.json()
        assert lab["daily_wage"] == 600
        workflow_state["labourer_id"] = lab["id"]

    def test_list_labourers_persisted(self, base_url, owner_headers, workflow_state):
        r = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/labourers",
            headers=owner_headers)
        assert r.status_code == 200
        assert any(l["id"] == workflow_state["labourer_id"] for l in r.json())

    def test_update_labourer(self, base_url, owner_headers, workflow_state):
        r = requests.put(
            f"{base_url}/api/labourers/{workflow_state['labourer_id']}",
            headers=owner_headers, json={"daily_wage": 700})
        assert r.status_code == 200
        assert r.json()["daily_wage"] == 700


class TestAttendance:
    def test_save_attendance(self, base_url, owner_headers, workflow_state):
        from datetime import datetime, timezone
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        workflow_state["date"] = date
        r = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/attendance",
            headers=owner_headers,
            json={"date": date,
                  "records": [{"labourer_id": workflow_state["labourer_id"],
                               "status": "full"}], "note": "TEST"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["present_count"] == 1
        assert data["wage_total"] == 700

    def test_get_attendance(self, base_url, owner_headers, workflow_state):
        r = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/attendance"
            f"?date={workflow_state['date']}", headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["uploaded"] is True
        statuses = {l["id"]: l["status"] for l in data["labourers"]}
        assert statuses[workflow_state["labourer_id"]] == "full"

    def test_reports_listed(self, base_url, owner_headers, workflow_state):
        r = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/reports",
            headers=owner_headers)
        assert r.status_code == 200
        dates = [rp["date"] for rp in r.json()]
        assert workflow_state["date"] in dates


class TestBills:
    def test_add_bill_and_balance(self, base_url, owner_headers, workflow_state):
        r = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/bills",
            headers=owner_headers,
            json={"bill_no": "TEST_B1", "amount": 10000, "gst": True,
                  "payment_received": 4000,
                  "date": workflow_state["date"], "note": ""})
        assert r.status_code == 201, r.text
        bill = r.json()
        assert bill["balance"] == 6000
        assert bill["gst"] is True
        workflow_state["bill_id"] = bill["id"]

    def test_update_bill(self, base_url, owner_headers, workflow_state):
        r = requests.put(f"{base_url}/api/bills/{workflow_state['bill_id']}",
                         headers=owner_headers,
                         json={"payment_received": 5000, "gst": False})
        assert r.status_code == 200
        assert r.json()["payment_received"] == 5000
        assert r.json()["gst"] is False
        assert r.json()["balance"] == 5000

    def test_list_bills(self, base_url, owner_headers, workflow_state):
        r = requests.get(f"{base_url}/api/sites/{workflow_state['site_id']}/bills",
                         headers=owner_headers)
        assert r.status_code == 200
        assert any(b["id"] == workflow_state["bill_id"] for b in r.json())


class TestAdvances:
    def test_add_advance(self, base_url, owner_headers, workflow_state):
        r = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/advances",
            headers=owner_headers,
            json={"labourer_id": workflow_state["labourer_id"], "amount": 200,
                  "date": workflow_state["date"], "note": "TEST adv"})
        assert r.status_code == 201, r.text
        workflow_state["advance_id"] = r.json()["id"]

    def test_list_advances(self, base_url, owner_headers, workflow_state):
        r = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/advances",
            headers=owner_headers)
        assert r.status_code == 200
        assert any(a["id"] == workflow_state["advance_id"] for a in r.json())


class TestPayrollDashboard:
    def test_payroll(self, base_url, owner_headers, workflow_state):
        r = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/payroll",
            headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        rows = data["rows"]
        row = next(r for r in rows if r["id"] == workflow_state["labourer_id"])
        assert row["full_days"] >= 1
        assert row["earned"] >= 700
        assert row["advances"] >= 200
        assert row["net_payable"] == row["earned"] - row["advances"]

    def test_dashboard(self, base_url, owner_headers, workflow_state):
        r = requests.get(f"{base_url}/api/dashboard", headers=owner_headers)
        assert r.status_code == 200
        data = r.json()
        assert "totals" in data and "sites" in data
        assert data["totals"]["site_count"] >= 1

    def test_summary(self, base_url, owner_headers, workflow_state):
        r = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/summary",
            headers=owner_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["today_uploaded"] is True
        assert d["labour_count"] >= 1


# -------------------------------------------------------------------------- supervisor + RBAC
@pytest.fixture(scope="module")
def supervisor_setup(base_url, owner_headers, workflow_state):
    """Create a supervisor assigned to the test site; also create a 2nd site NOT assigned."""
    phone = f"8{int(time.time()*1000) % 1000000000:09d}"
    # create a 2nd site owned by owner but NOT given to supervisor
    r2 = requests.post(f"{base_url}/api/sites", headers=owner_headers,
                       json={"name": "TEST_Site_B", "company_name": "", "location": ""})
    assert r2.status_code == 201
    other_site_id = r2.json()["id"]
    r = requests.post(f"{base_url}/api/auth/supervisors", headers=owner_headers,
                      json={"name": "TEST_Sup", "phone": phone,
                            "password": "sup1234",
                            "site_ids": [workflow_state["site_id"]]})
    assert r.status_code == 201, r.text
    sup_id = r.json()["id"]
    # login
    rl = requests.post(f"{base_url}/api/auth/login",
                       json={"phone": phone, "password": "sup1234"})
    assert rl.status_code == 200
    token = rl.json()["access_token"]
    yield {"sup_id": sup_id, "phone": phone, "token": token,
           "other_site_id": other_site_id,
           "headers": {"Content-Type": "application/json",
                       "Authorization": f"Bearer {token}"}}
    # teardown supervisor and 2nd site
    requests.delete(f"{base_url}/api/auth/supervisors/{sup_id}", headers=owner_headers)
    requests.delete(f"{base_url}/api/sites/{other_site_id}", headers=owner_headers)


class TestSupervisorRBAC:
    def test_supervisor_sees_only_assigned_sites(self, base_url, supervisor_setup, workflow_state):
        r = requests.get(f"{base_url}/api/sites", headers=supervisor_setup["headers"])
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert workflow_state["site_id"] in ids
        assert supervisor_setup["other_site_id"] not in ids

    def test_supervisor_forbidden_dashboard(self, base_url, supervisor_setup):
        r = requests.get(f"{base_url}/api/dashboard", headers=supervisor_setup["headers"])
        assert r.status_code == 403

    def test_supervisor_forbidden_supervisors_list(self, base_url, supervisor_setup):
        r = requests.get(f"{base_url}/api/auth/supervisors",
                         headers=supervisor_setup["headers"])
        assert r.status_code == 403

    def test_supervisor_cannot_create_site(self, base_url, supervisor_setup):
        r = requests.post(f"{base_url}/api/sites", headers=supervisor_setup["headers"],
                          json={"name": "nope"})
        assert r.status_code == 403

    def test_supervisor_cannot_access_unassigned_site(self, base_url, supervisor_setup):
        r = requests.get(
            f"{base_url}/api/sites/{supervisor_setup['other_site_id']}",
            headers=supervisor_setup["headers"])
        assert r.status_code == 403

    def test_supervisor_can_mark_attendance_on_assigned(
            self, base_url, supervisor_setup, workflow_state):
        from datetime import datetime, timezone
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # List labourers (should be accessible)
        rl = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/labourers",
            headers=supervisor_setup["headers"])
        assert rl.status_code == 200
        labs = rl.json()
        assert len(labs) >= 1
        r = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/attendance",
            headers=supervisor_setup["headers"],
            json={"date": date,
                  "records": [{"labourer_id": labs[0]["id"], "status": "half"}],
                  "note": "sup upload"})
        assert r.status_code == 200

    def test_supervisor_can_add_bill_and_advance(
            self, base_url, supervisor_setup, workflow_state):
        from datetime import datetime, timezone
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/bills",
            headers=supervisor_setup["headers"],
            json={"bill_no": "TEST_SUP_B", "amount": 500, "gst": False,
                  "payment_received": 0, "date": date})
        assert r.status_code == 201
        rl = requests.get(
            f"{base_url}/api/sites/{workflow_state['site_id']}/labourers",
            headers=supervisor_setup["headers"]).json()
        r2 = requests.post(
            f"{base_url}/api/sites/{workflow_state['site_id']}/advances",
            headers=supervisor_setup["headers"],
            json={"labourer_id": rl[0]["id"], "amount": 50, "date": date})
        assert r2.status_code == 201


# -------------------------------------------------------------------------- cleanup last
class TestCleanup:
    def test_delete_bill(self, base_url, owner_headers, workflow_state):
        r = requests.delete(f"{base_url}/api/bills/{workflow_state['bill_id']}",
                            headers=owner_headers)
        assert r.status_code == 200

    def test_delete_advance(self, base_url, owner_headers, workflow_state):
        r = requests.delete(
            f"{base_url}/api/advances/{workflow_state['advance_id']}",
            headers=owner_headers)
        assert r.status_code == 200

    def test_delete_labourer(self, base_url, owner_headers, workflow_state):
        r = requests.delete(
            f"{base_url}/api/labourers/{workflow_state['labourer_id']}",
            headers=owner_headers)
        assert r.status_code == 200
