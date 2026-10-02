// App types shared across screens.

export type Role = "owner" | "supervisor";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  site_ids: string[];
  disabled: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Site {
  id: string;
  name: string;
  company_name: string;
  location: string;
  created_at?: string | null;
}

export interface Labourer {
  id: string;
  site_id: string;
  name: string;
  daily_wage: number;
  phone: string;
}

export type AttendanceStatus = "full" | "half" | "absent";

export interface AttendanceLabourer extends Labourer {
  status: AttendanceStatus;
}

export interface AttendanceDay {
  date: string;
  uploaded: boolean;
  labourers: AttendanceLabourer[];
}

export interface Bill {
  id: string;
  site_id: string;
  bill_no: string;
  amount: number;
  gst: boolean;
  payment_received: number;
  balance: number;
  date: string;
  note: string;
}

export interface Advance {
  id: string;
  labourer_id: string;
  amount: number;
  date: string;
  note: string;
}

export interface DailyReport {
  date: string;
  present_count: number;
  day_total: number;
  wage_total: number;
  note: string;
  submitted_by_name: string;
}

export interface DashboardSite {
  id: string;
  name: string;
  company_name: string;
  location: string;
  total_billed: number;
  total_received: number;
  balance: number;
  labour_cost_month: number;
  labour_count: number;
  today_present: number;
  today_uploaded: boolean;
}

export interface Dashboard {
  month: string;
  totals: {
    total_billed: number;
    total_received: number;
    balance: number;
    labour_cost_month: number;
    site_count: number;
  };
  sites: DashboardSite[];
}

export interface SiteSummary {
  site: Site;
  month: string;
  billing: { total_billed: number; total_received: number; balance: number };
  labour: { earned: number; day_count: number; advances: number; net_payable: number };
  labour_count: number;
  today_present: number;
  today_uploaded: boolean;
}

export interface PayrollRow {
  id: string;
  name: string;
  daily_wage: number;
  full_days: number;
  half_days: number;
  day_value: number;
  earned: number;
  advances: number;
  net_payable: number;
}

export interface Payroll {
  month: string;
  rows: PayrollRow[];
  totals: { earned: number; advances: number; net_payable: number };
}
