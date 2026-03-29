import { createBrowserClient } from "@supabase/ssr";

// ── Types matching schema.sql + v0.4.0 migration ────────────
export type UserRole = "owner" | "manager" | "mechanic" | "programmer";
export type OrderStatus = "queued" | "in_progress" | "done" | "archived";
export type InvoiceStatus = "not_invoiced" | "invoiced" | "paid";
export type PaymentType = "cash" | "card" | "invoice" | "none";
export type ServiceType =
  | "stage" | "dpf" | "egr" | "diagnostika" | "adblue" | "remontas"
  | "glostymas" | "flaps" | "dtc" | "deze" | "kiti" | "akle"
  | "evap" | "regeneracija" | "garantinis" | "aptarnavimas";
export type ClientSource = "naujas" | "senas" | "partneris";

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  hourly_rate?: number;
  salary?: number;
  is_active: boolean;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source: ClientSource;
  notes?: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  customer_id?: string;
  make: string;
  model: string;
  plate?: string;
  cc?: string;
  kw?: number;
  year?: number;
  vin?: string;
  mileage?: number;
  notes?: string;
  customer?: Customer;
}

export interface WorkOrder {
  id: string;
  tenant_id: string;
  vehicle_id?: string;
  customer_id?: string;
  status: OrderStatus;
  invoice_status: InvoiceStatus;
  is_done: boolean;
  order_date: string;
  day_of_week?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  services: ServiceType[];
  service_description?: string;
  client_comment?: string;
  internal_comment?: string;
  post_repair_notes?: string;
  repair_conclusion?: string;      // v0.4: išvada po remonto (meistro)
  service_price: number;
  is_paid: boolean;
  has_discount: boolean;
  with_vat: boolean;
  payment_type: PaymentType;
  invoice_number?: string;          // v0.4: faktūros numeris
  parts_cost: number;
  parts_revenue: number;
  parts_markup_pct?: number;        // v0.4: antkainio %
  mechanic_id?: string;
  mechanic_name?: string;
  repair_cost: number;
  mechanic_pay?: number;            // v0.4: auto-calc meistro atlygis
  programmer_id?: string;
  programmer_name?: string;
  programmer_cost: number;
  programmer_pay?: number;          // v0.4: auto-calc prog. atlygis
  internal_total: number;
  internal_cost: number;
  client_source: ClientSource;
  referral_source?: string;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Vehicle;
  customer?: Customer;
  mechanic?: Profile;
}

export interface MechanicLog {
  id: string;
  tenant_id: string;
  work_order_id?: string;
  mechanic_id: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  vehicle_cc?: string;
  vehicle_kw?: number;
  vehicle_year?: number;
  services: ServiceType[];
  office_comment?: string;
  mechanic_comment?: string;
  parts_supplier?: string;
  parts_cost: number;
  parts_sell_price?: number;        // v0.4: detalių pardavimo kaina
  parts_used?: string;
  started: boolean;
  start_time?: string;
  finished: boolean;
  end_time?: string;
  duration_minutes: number;
  repair_cost: number;
  log_status: string;
  log_date: string;
  created_at: string;
  work_order?: WorkOrder;
}

// v0.4: Order parts (multi-line per work order)
export interface OrderPart {
  id: string;
  tenant_id: string;
  work_order_id: string;
  mechanic_log_id?: string;
  description: string;
  supplier?: string;
  purchase_price: number;
  sell_price: number;
  quantity: number;
  added_by?: string;
  created_at: string;
}

// ── Service type labels (LT) ──
export const SERVICE_LABELS: Record<ServiceType, string> = {
  stage: "Stage", dpf: "DPF", egr: "EGR", diagnostika: "Diagnostika",
  adblue: "AdBlue", remontas: "Remontas", glostymas: "Glostymas",
  flaps: "Flaps", dtc: "DTC", deze: "Dėžė", kiti: "Kiti", akle: "Aklė",
  evap: "EVAP", regeneracija: "Regeneracija", garantinis: "Garantinis",
  aptarnavimas: "Aptarnavimas",
};

export const ALL_SERVICES: ServiceType[] = Object.keys(SERVICE_LABELS) as ServiceType[];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  queued: "Laukia priskyrimo", in_progress: "Vykdomas", done: "Atliktas", archived: "Archyvuotas",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  queued: "#ffb347", in_progress: "#77a8ff", done: "#68f3c2", archived: "#9ea6ba",
};

// ── Supabase client ──
let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "implicit",
        },
      }
    );
  }
  return client;
}
