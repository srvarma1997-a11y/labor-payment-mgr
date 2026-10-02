from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Annotated, Literal
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import bcrypt
import jwt

MONTH_REGEX = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
DATE_REGEX = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")


def validate_month_param(m: Optional[str]) -> str:
    if not m:
        return current_month()
    if not MONTH_REGEX.match(m):
        raise HTTPException(400, "Invalid month format. Expected YYYY-MM")
    return m

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------------------------------------------------------------------------
# Config / DB
# ---------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', '43200'))

app = FastAPI()
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def oid(v: str) -> ObjectId:
    if not ObjectId.is_valid(v):
        raise HTTPException(400, "Invalid id")
    return ObjectId(v)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def make_token(user: dict) -> str:
    now = now_utc()
    claims = {"sub": str(user["_id"]), "iat": now,
              "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(claims, JWT_SECRET, algorithm="HS256")


def public_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "name": u.get("name", ""),
        "phone": u.get("phone", ""),
        "role": u.get("role"),
        "site_ids": [str(s) for s in u.get("site_ids", [])],
        "disabled": u.get("disabled", False),
    }


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------
async def current_user(credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)]):
    unauth = HTTPException(status_code=401, detail="Invalid or missing token",
                          headers={"WWW-Authenticate": "Bearer"})
    if not credentials:
        raise unauth
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise unauth
    except Exception:
        raise unauth
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("disabled", False):
        raise unauth
    return user


def require_roles(*roles: str):
    async def dep(user: dict = Depends(current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permission")
        return user
    return dep


async def get_accessible_site(site_id: str, user: dict) -> dict:
    site = await db.sites.find_one({"_id": oid(site_id), "deleted_at": None})
    if not site:
        raise HTTPException(404, "Site not found")
    if user["role"] == "owner":
        if site.get("owner_id") != user["_id"]:
            raise HTTPException(403, "No access to this site")
    elif user["role"] == "supervisor":
        if oid(site_id) not in user.get("site_ids", []):
            raise HTTPException(403, "No access to this site")
    return site


# ---------------------------------------------------------------------------
# Models (request bodies)
# ---------------------------------------------------------------------------
class RegisterOwner(BaseModel):
    name: str
    phone: str
    password: str


class LoginBody(BaseModel):
    phone: str
    password: str


class SupervisorCreate(BaseModel):
    name: str
    phone: str
    password: str
    site_ids: List[str] = []


class SupervisorUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    site_ids: Optional[List[str]] = None
    disabled: Optional[bool] = None


class SiteBody(BaseModel):
    name: str
    company_name: Optional[str] = ""
    location: Optional[str] = ""


class LabourerBody(BaseModel):
    name: str
    daily_wage: float
    phone: Optional[str] = ""


class LabourerUpdate(BaseModel):
    name: Optional[str] = None
    daily_wage: Optional[float] = None
    phone: Optional[str] = None


class AttendanceRecord(BaseModel):
    labourer_id: str
    status: Literal["full", "half", "absent"]


class AttendanceSave(BaseModel):
    date: str  # YYYY-MM-DD
    records: List[AttendanceRecord]
    note: Optional[str] = ""


class AdvanceBody(BaseModel):
    labourer_id: str
    amount: float
    date: str
    note: Optional[str] = ""


class BillBody(BaseModel):
    bill_no: str
    amount: float
    gst: bool = False
    payment_received: float = 0
    date: str
    note: Optional[str] = ""


class BillUpdate(BaseModel):
    bill_no: Optional[str] = None
    amount: Optional[float] = None
    gst: Optional[bool] = None
    payment_received: Optional[float] = None
    date: Optional[str] = None
    note: Optional[str] = None


STATUS_VALUE = {"full": 1.0, "half": 0.5, "absent": 0.0}


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "SiteHisab API"}


@api_router.post("/auth/register-owner", status_code=201)
async def register_owner(body: RegisterOwner):
    phone = body.phone.strip()
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(409, "Phone number already registered")
    doc = {"name": body.name.strip(), "phone": phone,
           "password_hash": hash_password(body.password), "role": "owner",
           "site_ids": [], "disabled": False, "created_at": now_utc()}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return {"access_token": make_token(doc), "token_type": "bearer", "user": public_user(doc)}


@api_router.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"phone": body.phone.strip()})
    if not user or not verify_password(body.password, user["password_hash"]) or user.get("disabled"):
        raise HTTPException(401, "Galat phone ya password / Incorrect phone or password")
    return {"access_token": make_token(user), "token_type": "bearer", "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


# ---------------------------------------------------------------------------
# Supervisors (owner only)
# ---------------------------------------------------------------------------
async def validate_owner_site_ids(owner_id: ObjectId, site_ids: List[str]) -> List[ObjectId]:
    validated = []
    for s in site_ids:
        site_oid = oid(s)
        site = await db.sites.find_one({"_id": site_oid, "owner_id": owner_id, "deleted_at": None})
        if not site:
            raise HTTPException(400, f"Site {s} not found or you do not own it")
        validated.append(site_oid)
    return validated


@api_router.post("/auth/supervisors", status_code=201)
async def create_supervisor(body: SupervisorCreate, owner: dict = Depends(require_roles("owner"))):
    phone = body.phone.strip()
    if len(body.password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")
    if await db.users.find_one({"phone": phone}):
        raise HTTPException(409, "Phone number already registered")
    site_ids = await validate_owner_site_ids(owner["_id"], body.site_ids)
    doc = {"name": body.name.strip(), "phone": phone,
           "password_hash": hash_password(body.password), "role": "supervisor",
           "site_ids": site_ids, "disabled": False, "created_at": now_utc(),
           "created_by": owner["_id"]}
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return public_user(doc)


@api_router.get("/auth/supervisors")
async def list_supervisors(owner: dict = Depends(require_roles("owner"))):
    cursor = db.users.find({"role": "supervisor", "created_by": owner["_id"], "disabled": False}).sort("created_at", -1)
    return [public_user(u) async for u in cursor]


@api_router.put("/auth/supervisors/{sup_id}")
async def update_supervisor(sup_id: str, body: SupervisorUpdate, owner: dict = Depends(require_roles("owner"))):
    sup = await db.users.find_one({"_id": oid(sup_id), "role": "supervisor", "created_by": owner["_id"]})
    if not sup:
        raise HTTPException(404, "Supervisor not found")
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.password:
        if len(body.password) < 4:
            raise HTTPException(400, "Password must be at least 4 characters")
        update["password_hash"] = hash_password(body.password)
    if body.site_ids is not None:
        update["site_ids"] = await validate_owner_site_ids(owner["_id"], body.site_ids)
    if body.disabled is not None:
        update["disabled"] = body.disabled
    if update:
        await db.users.update_one({"_id": sup["_id"]}, {"$set": update})
    sup = await db.users.find_one({"_id": sup["_id"]})
    return public_user(sup)


@api_router.delete("/auth/supervisors/{sup_id}")
async def delete_supervisor(sup_id: str, owner: dict = Depends(require_roles("owner"))):
    res = await db.users.update_one(
        {"_id": oid(sup_id), "role": "supervisor", "created_by": owner["_id"]},
        {"$set": {"disabled": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Supervisor not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Sites
# ---------------------------------------------------------------------------
def site_public(s: dict) -> dict:
    return {"id": str(s["_id"]), "name": s["name"], "company_name": s.get("company_name", ""),
            "location": s.get("location", ""),
            "created_at": s.get("created_at").isoformat() if s.get("created_at") else None}


@api_router.post("/sites", status_code=201)
async def create_site(body: SiteBody, owner: dict = Depends(require_roles("owner"))):
    doc = {"name": body.name.strip(), "company_name": (body.company_name or "").strip(),
           "location": (body.location or "").strip(), "owner_id": owner["_id"],
           "deleted_at": None, "created_at": now_utc()}
    res = await db.sites.insert_one(doc)
    doc["_id"] = res.inserted_id
    return site_public(doc)


@api_router.get("/sites")
async def list_sites(user: dict = Depends(current_user)):
    if user["role"] == "owner":
        q = {"owner_id": user["_id"], "deleted_at": None}
    else:
        q = {"_id": {"$in": user.get("site_ids", [])}, "deleted_at": None}
    cursor = db.sites.find(q).sort("created_at", 1)
    return [site_public(s) async for s in cursor]


@api_router.get("/sites/{site_id}")
async def get_site(site_id: str, user: dict = Depends(current_user)):
    site = await get_accessible_site(site_id, user)
    return site_public(site)


@api_router.put("/sites/{site_id}")
async def update_site(site_id: str, body: SiteBody, owner: dict = Depends(require_roles("owner"))):
    site = await db.sites.find_one({"_id": oid(site_id), "owner_id": owner["_id"], "deleted_at": None})
    if not site:
        raise HTTPException(404, "Site not found")
    await db.sites.update_one({"_id": site["_id"]}, {"$set": {
        "name": body.name.strip(), "company_name": (body.company_name or "").strip(),
        "location": (body.location or "").strip()}})
    site = await db.sites.find_one({"_id": site["_id"]})
    return site_public(site)


@api_router.delete("/sites/{site_id}")
async def delete_site(site_id: str, owner: dict = Depends(require_roles("owner"))):
    res = await db.sites.update_one({"_id": oid(site_id), "owner_id": owner["_id"]},
                                    {"$set": {"deleted_at": now_utc()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Site not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Labourers
# ---------------------------------------------------------------------------
def labourer_public(l: dict) -> dict:
    return {"id": str(l["_id"]), "site_id": str(l["site_id"]), "name": l["name"],
            "daily_wage": l.get("daily_wage", 0), "phone": l.get("phone", "")}


@api_router.post("/sites/{site_id}/labourers", status_code=201)
async def add_labourer(site_id: str, body: LabourerBody, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    doc = {"site_id": oid(site_id), "name": body.name.strip(), "daily_wage": float(body.daily_wage),
           "phone": (body.phone or "").strip(), "deleted_at": None, "created_at": now_utc()}
    res = await db.labourers.insert_one(doc)
    doc["_id"] = res.inserted_id
    return labourer_public(doc)


@api_router.get("/sites/{site_id}/labourers")
async def list_labourers(site_id: str, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    cursor = db.labourers.find({"site_id": oid(site_id), "deleted_at": None}).sort("created_at", 1)
    return [labourer_public(l) async for l in cursor]


@api_router.put("/labourers/{labourer_id}")
async def update_labourer(labourer_id: str, body: LabourerUpdate, user: dict = Depends(current_user)):
    lab = await db.labourers.find_one({"_id": oid(labourer_id), "deleted_at": None})
    if not lab:
        raise HTTPException(404, "Labourer not found")
    await get_accessible_site(str(lab["site_id"]), user)
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.daily_wage is not None:
        update["daily_wage"] = float(body.daily_wage)
    if body.phone is not None:
        update["phone"] = body.phone.strip()
    if update:
        await db.labourers.update_one({"_id": lab["_id"]}, {"$set": update})
    lab = await db.labourers.find_one({"_id": lab["_id"]})
    return labourer_public(lab)


@api_router.delete("/labourers/{labourer_id}")
async def delete_labourer(labourer_id: str, user: dict = Depends(current_user)):
    lab = await db.labourers.find_one({"_id": oid(labourer_id), "deleted_at": None})
    if not lab:
        raise HTTPException(404, "Labourer not found")
    await get_accessible_site(str(lab["site_id"]), user)
    await db.labourers.update_one({"_id": lab["_id"]}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------
@api_router.get("/sites/{site_id}/attendance")
async def get_attendance(site_id: str, date: str = Query(...), user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    labs = [labourer_public(l) async for l in
            db.labourers.find({"site_id": oid(site_id), "deleted_at": None}).sort("created_at", 1)]
    recs = {}
    async for a in db.attendance.find({"site_id": oid(site_id), "date": date}):
        recs[str(a["labourer_id"])] = a["status"]
    report = await db.daily_reports.find_one({"site_id": oid(site_id), "date": date})
    return {
        "date": date,
        "uploaded": bool(report),
        "labourers": [{**l, "status": recs.get(l["id"], "absent")} for l in labs],
    }


@api_router.post("/sites/{site_id}/attendance")
async def save_attendance(site_id: str, body: AttendanceSave, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    lab_map = {}
    async for l in db.labourers.find({"site_id": oid(site_id), "deleted_at": None}):
        lab_map[str(l["_id"])] = l
    present_count = 0
    day_total = 0.0
    wage_total = 0.0
    for r in body.records:
        if r.labourer_id not in lab_map:
            continue
        val = STATUS_VALUE[r.status]
        lab = lab_map[r.labourer_id]
        await db.attendance.update_one(
            {"site_id": oid(site_id), "labourer_id": oid(r.labourer_id), "date": body.date},
            {"$set": {"status": r.status, "day_value": val, "marked_by": user["_id"],
                      "updated_at": now_utc()},
             "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        if val > 0:
            present_count += 1
            day_total += val
            wage_total += val * lab.get("daily_wage", 0)
    await db.daily_reports.update_one(
        {"site_id": oid(site_id), "date": body.date},
        {"$set": {"present_count": present_count, "day_total": day_total,
                  "wage_total": wage_total, "note": body.note or "",
                  "submitted_by": user["_id"], "submitted_by_name": user.get("name", ""),
                  "updated_at": now_utc()},
         "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
    return {"ok": True, "present_count": present_count, "wage_total": wage_total}


@api_router.get("/sites/{site_id}/reports")
async def list_reports(site_id: str, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    cursor = db.daily_reports.find({"site_id": oid(site_id)}).sort("date", -1).limit(60)
    return [{"date": r["date"], "present_count": r.get("present_count", 0),
             "day_total": r.get("day_total", 0), "wage_total": r.get("wage_total", 0),
             "note": r.get("note", ""), "submitted_by_name": r.get("submitted_by_name", "")}
            async for r in cursor]


# ---------------------------------------------------------------------------
# Advances
# ---------------------------------------------------------------------------
@api_router.post("/sites/{site_id}/advances", status_code=201)
async def add_advance(site_id: str, body: AdvanceBody, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    doc = {"site_id": oid(site_id), "labourer_id": oid(body.labourer_id),
           "amount": float(body.amount), "date": body.date, "note": body.note or "",
           "created_by": user["_id"], "deleted_at": None, "created_at": now_utc()}
    res = await db.advances.insert_one(doc)
    return {"id": str(res.inserted_id), "labourer_id": body.labourer_id, "amount": doc["amount"],
            "date": doc["date"], "note": doc["note"]}


@api_router.get("/sites/{site_id}/advances")
async def list_advances(site_id: str, month: Optional[str] = None, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    q = {"site_id": oid(site_id), "deleted_at": None}
    if month:
        m = validate_month_param(month)
        q["date"] = {"$regex": f"^{re.escape(m)}"}
    cursor = db.advances.find(q).sort("date", -1)
    return [{"id": str(a["_id"]), "labourer_id": str(a["labourer_id"]), "amount": a["amount"],
             "date": a["date"], "note": a.get("note", "")} async for a in cursor]


@api_router.delete("/advances/{advance_id}")
async def delete_advance(advance_id: str, user: dict = Depends(current_user)):
    adv = await db.advances.find_one({"_id": oid(advance_id), "deleted_at": None})
    if not adv:
        raise HTTPException(404, "Advance not found")
    await get_accessible_site(str(adv["site_id"]), user)
    await db.advances.update_one({"_id": adv["_id"]}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Bills
# ---------------------------------------------------------------------------
def bill_public(b: dict) -> dict:
    amount = b.get("amount", 0)
    received = b.get("payment_received", 0)
    return {"id": str(b["_id"]), "site_id": str(b["site_id"]), "bill_no": b.get("bill_no", ""),
            "amount": amount, "gst": b.get("gst", False), "payment_received": received,
            "balance": amount - received, "date": b.get("date", ""), "note": b.get("note", "")}


@api_router.post("/sites/{site_id}/bills", status_code=201)
async def add_bill(site_id: str, body: BillBody, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    doc = {"site_id": oid(site_id), "bill_no": body.bill_no.strip(), "amount": float(body.amount),
           "gst": bool(body.gst), "payment_received": float(body.payment_received),
           "date": body.date, "note": body.note or "", "created_by": user["_id"],
           "deleted_at": None, "created_at": now_utc()}
    res = await db.bills.insert_one(doc)
    doc["_id"] = res.inserted_id
    return bill_public(doc)


@api_router.get("/sites/{site_id}/bills")
async def list_bills(site_id: str, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    cursor = db.bills.find({"site_id": oid(site_id), "deleted_at": None}).sort("date", -1)
    return [bill_public(b) async for b in cursor]


@api_router.get("/bills")
async def list_all_bills(user: dict = Depends(current_user)):
    if user["role"] == "owner":
        site_ids = [s["_id"] async for s in db.sites.find({"owner_id": user["_id"], "deleted_at": None})]
    else:
        site_ids = [oid(s) for s in user.get("site_ids", [])]
    cursor = db.bills.find({"site_id": {"$in": site_ids}, "deleted_at": None}).sort("date", -1)
    sites_map = {str(s["_id"]): s["name"] async for s in db.sites.find({"_id": {"$in": site_ids}})}
    bills = []
    async for b in cursor:
        bp = bill_public(b)
        bp["site_name"] = sites_map.get(str(b["site_id"]), "Site")
        bills.append(bp)
    return bills


@api_router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, body: BillUpdate, user: dict = Depends(current_user)):
    bill = await db.bills.find_one({"_id": oid(bill_id), "deleted_at": None})
    if not bill:
        raise HTTPException(404, "Bill not found")
    await get_accessible_site(str(bill["site_id"]), user)
    update = {}
    for field in ["bill_no", "amount", "gst", "payment_received", "date", "note"]:
        val = getattr(body, field)
        if val is not None:
            update[field] = val
    if update:
        await db.bills.update_one({"_id": bill["_id"]}, {"$set": update})
    bill = await db.bills.find_one({"_id": bill["_id"]})
    return bill_public(bill)


@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, user: dict = Depends(current_user)):
    bill = await db.bills.find_one({"_id": oid(bill_id), "deleted_at": None})
    if not bill:
        raise HTTPException(404, "Bill not found")
    await get_accessible_site(str(bill["site_id"]), user)
    await db.bills.update_one({"_id": bill["_id"]}, {"$set": {"deleted_at": now_utc()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Payroll / Summaries
# ---------------------------------------------------------------------------
async def site_billing_totals(site_id: ObjectId) -> dict:
    billed = received = 0.0
    async for b in db.bills.find({"site_id": site_id, "deleted_at": None}):
        billed += b.get("amount", 0)
        received += b.get("payment_received", 0)
    return {"total_billed": billed, "total_received": received, "balance": billed - received}


async def site_month_labour(site_id: ObjectId, month: str) -> dict:
    month = validate_month_param(month)
    labs = {}
    async for l in db.labourers.find({"site_id": site_id}):
        labs[str(l["_id"])] = l
    earned = 0.0
    day_count = 0.0
    async for a in db.attendance.find({"site_id": site_id, "date": {"$regex": f"^{re.escape(month)}"}}):
        lab = labs.get(str(a["labourer_id"]))
        if not lab:
            continue
        val = a.get("day_value", 0)
        earned += val * lab.get("daily_wage", 0)
        day_count += val
    advances = 0.0
    async for adv in db.advances.find({"site_id": site_id, "deleted_at": None, "date": {"$regex": f"^{re.escape(month)}"}}):
        advances += adv.get("amount", 0)
    return {"earned": earned, "day_count": day_count, "advances": advances,
            "net_payable": earned - advances}


def current_month() -> str:
    return now_utc().strftime("%Y-%m")


@api_router.get("/dashboard")
async def dashboard(user: dict = Depends(require_roles("owner"))):
    month = current_month()
    today = now_utc().strftime("%Y-%m-%d")
    sites_out = []
    tot_billed = tot_received = tot_labour = 0.0
    async for s in db.sites.find({"owner_id": user["_id"], "deleted_at": None}).sort("created_at", 1):
        billing = await site_billing_totals(s["_id"])
        labour = await site_month_labour(s["_id"], month)
        report = await db.daily_reports.find_one({"site_id": s["_id"], "date": today})
        lab_count = await db.labourers.count_documents({"site_id": s["_id"], "deleted_at": None})
        sites_out.append({
            "id": str(s["_id"]), "name": s["name"], "company_name": s.get("company_name", ""),
            "location": s.get("location", ""),
            "total_billed": billing["total_billed"], "total_received": billing["total_received"],
            "balance": billing["balance"],
            "labour_cost_month": labour["earned"],
            "labour_count": lab_count,
            "today_present": report.get("present_count", 0) if report else 0,
            "today_uploaded": bool(report),
        })
        tot_billed += billing["total_billed"]
        tot_received += billing["total_received"]
        tot_labour += labour["earned"]
    return {
        "month": month,
        "totals": {"total_billed": tot_billed, "total_received": tot_received,
                   "balance": tot_billed - tot_received, "labour_cost_month": tot_labour,
                   "site_count": len(sites_out)},
        "sites": sites_out,
    }


@api_router.get("/sites/{site_id}/summary")
async def site_summary(site_id: str, month: Optional[str] = None, user: dict = Depends(current_user)):
    site = await get_accessible_site(site_id, user)
    m = validate_month_param(month)
    billing = await site_billing_totals(oid(site_id))
    labour = await site_month_labour(oid(site_id), m)
    lab_count = await db.labourers.count_documents({"site_id": oid(site_id), "deleted_at": None})
    today = now_utc().strftime("%Y-%m-%d")
    report = await db.daily_reports.find_one({"site_id": oid(site_id), "date": today})
    return {
        "site": site_public(site), "month": m,
        "billing": billing, "labour": labour, "labour_count": lab_count,
        "today_present": report.get("present_count", 0) if report else 0,
        "today_uploaded": bool(report),
    }


@api_router.get("/sites/{site_id}/payroll")
async def site_payroll(site_id: str, month: Optional[str] = None, user: dict = Depends(current_user)):
    await get_accessible_site(site_id, user)
    m = validate_month_param(month)
    labs = {}
    order = []
    async for l in db.labourers.find({"site_id": oid(site_id), "deleted_at": None}).sort("created_at", 1):
        labs[str(l["_id"])] = {"id": str(l["_id"]), "name": l["name"],
                               "daily_wage": l.get("daily_wage", 0),
                               "full_days": 0, "half_days": 0, "day_value": 0.0,
                               "earned": 0.0, "advances": 0.0}
        order.append(str(l["_id"]))
    async for a in db.attendance.find({"site_id": oid(site_id), "date": {"$regex": f"^{re.escape(m)}"}}):
        lid = str(a["labourer_id"])
        if lid not in labs:
            continue
        if a["status"] == "full":
            labs[lid]["full_days"] += 1
        elif a["status"] == "half":
            labs[lid]["half_days"] += 1
        labs[lid]["day_value"] += a.get("day_value", 0)
    async for adv in db.advances.find({"site_id": oid(site_id), "deleted_at": None, "date": {"$regex": f"^{re.escape(m)}"}}):
        lid = str(adv["labourer_id"])
        if lid in labs:
            labs[lid]["advances"] += adv.get("amount", 0)
    rows = []
    for lid in order:
        r = labs[lid]
        r["earned"] = r["day_value"] * r["daily_wage"]
        r["net_payable"] = r["earned"] - r["advances"]
        rows.append(r)
    totals = {
        "earned": sum(r["earned"] for r in rows),
        "advances": sum(r["advances"] for r in rows),
        "net_payable": sum(r["net_payable"] for r in rows),
    }
    return {"month": m, "rows": rows, "totals": totals}


# ---------------------------------------------------------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("phone", unique=True)
    await db.attendance.create_index([("site_id", 1), ("labourer_id", 1), ("date", 1)], unique=True)
    await db.daily_reports.create_index([("site_id", 1), ("date", 1)], unique=True)
    logger.info("SiteHisab API started")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
