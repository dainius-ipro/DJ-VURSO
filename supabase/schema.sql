-- ============================================================
-- AUTO-ERP Schema v2.0 — based on VIMOTA Excel workflow
-- Run this in Supabase SQL Editor
-- ============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- 1. ENUMS
create type user_role as enum ('owner', 'manager', 'mechanic', 'programmer');
create type order_status as enum ('queued', 'in_progress', 'done', 'archived');
create type invoice_status as enum ('not_invoiced', 'invoiced', 'paid');
create type payment_type as enum ('cash', 'card', 'invoice', 'none');
create type service_type as enum (
  'stage', 'dpf', 'egr', 'diagnostika', 'adblue', 'remontas',
  'glostymas', 'flaps', 'dtc', 'deze', 'kiti', 'akle',
  'evap', 'regeneracija', 'garantinis', 'aptarnavimas'
);
create type client_source as enum ('naujas', 'senas', 'partneris');

-- 2. TENANTS (multi-branch / multi-company)
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- 3. PROFILES (users linked to auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id),
  full_name text not null,
  role user_role not null default 'mechanic',
  email text,
  phone text,
  hourly_rate numeric(10,2) default 0,
  salary numeric(10,2) default 0,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. CUSTOMERS
create table customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  phone text,
  email text,
  company text,
  source client_source default 'naujas',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. VEHICLES
create table vehicles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  customer_id uuid references customers(id),
  make text not null,           -- gamintojas
  model text not null,          -- modelis
  plate text,                   -- v/n
  cc text,                      -- cc (engine displacement)
  kw numeric(6,1),              -- kw
  year integer,                 -- metai
  vin text,
  mileage integer,              -- rida
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. WORK ORDERS (replaces PnL sheet)
create table work_orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  vehicle_id uuid references vehicles(id),
  customer_id uuid references customers(id),
  
  -- Status tracking
  status order_status not null default 'queued',
  invoice_status invoice_status not null default 'not_invoiced',
  is_done boolean default false,
  
  -- Timestamps (matches Excel: data, in, out)
  order_date date not null default current_date,
  day_of_week text generated always as (
    case extract(dow from order_date)
      when 1 then 'pirm' when 2 then 'antr' when 3 then 'trec'
      when 4 then 'ketv' when 5 then 'penk' when 6 then 'sest' when 0 then 'sekm'
    end
  ) stored,
  checked_in_at timestamptz,
  checked_out_at timestamptz,

  -- Services (comma-separated tags from Excel)
  services service_type[] default '{}',
  service_description text,     -- paslaugos tipas free text
  
  -- Comments
  client_comment text,          -- komentaras iš kliento
  internal_comment text,        -- komentaras (internal)
  post_repair_notes text,       -- išvada po remonto
  
  -- Financials — OFFICIAL (visible to all, for invoicing)
  service_price numeric(10,2) default 0,  -- kaina be PVM
  is_paid boolean default false,          -- apmok.
  has_discount boolean default false,     -- nuolaida
  with_vat boolean default false,         -- su PVM
  payment_type payment_type default 'none', -- atsisk. tipas
  
  -- Parts tracking
  parts_cost numeric(10,2) default 0,     -- det. pirkim
  parts_revenue numeric(10,2) default 0,  -- det. pardav
  
  -- Mechanic assignment
  mechanic_id uuid references profiles(id),  -- servisas (meistras)
  mechanic_name text,                         -- for display
  repair_cost numeric(10,2) default 0,        -- remonto kaina (mechanic earns)
  
  -- Programmer assignment  
  programmer_id uuid references profiles(id),
  programmer_name text,                       -- Programuotojas
  programmer_cost numeric(10,2) default 0,    -- kaina (programmer earns)
  
  -- INTERNAL financials (owner-only, nefakturuojama)
  internal_total numeric(10,2) default 0,
  internal_cost numeric(10,2) default 0,
  
  -- Client source
  client_source client_source default 'naujas',
  referral_source text,         -- iš kur apie mus sužinojo
  
  -- External ID (from old system)
  external_id text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. MECHANIC WORK LOG (replaces meistro lapas sheets)
create table mechanic_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  work_order_id uuid references work_orders(id) on delete cascade,
  mechanic_id uuid not null references profiles(id),
  
  -- Vehicle info (denormalized for mechanic view)
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  vehicle_cc text,
  vehicle_kw numeric(6,1),
  vehicle_year integer,
  
  -- Service info
  services service_type[] default '{}',
  office_comment text,          -- Komentaras iš ofiso
  mechanic_comment text,        -- komentaras iš meistro
  
  -- Parts used
  parts_supplier text,          -- detalių tiekėjas
  parts_cost numeric(10,2) default 0, -- detalių kaina
  parts_used text,              -- panaudotos detalės
  
  -- Time tracking
  started boolean default false,
  start_time timestamptz,
  finished boolean default false,
  end_time timestamptz,
  duration_minutes integer default 0, -- Trukmė minutėmis
  
  -- Financials
  repair_cost numeric(10,2) default 0, -- remonto kaina
  
  -- Status
  log_status text default 'assigned', -- assigned, in_progress, done
  
  log_date date not null default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. EXPENSES (replaces balans sheet)
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  category text not null,       -- pvm, sodra, intercars, nuoma, etc.
  description text,
  amount_no_vat numeric(10,2) default 0,
  amount_with_vat numeric(10,2) default 0,
  amount_cash numeric(10,2) default 0,  -- nefakturuojama
  expense_month date not null,  -- first day of month
  created_at timestamptz default now()
);

-- 9. DAILY STATS CACHE (replaces Srautai sheet - auto-calculated)
create table daily_stats (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  stat_date date not null,
  day_of_week text,
  revenue numeric(10,2) default 0,
  parts_expense numeric(10,2) default 0,
  parts_revenue numeric(10,2) default 0,
  clients_served integer default 0,
  total_clients integer default 0,
  missed_clients integer default 0,
  -- Service type counts
  stage_count integer default 0,
  dpf_count integer default 0,
  egr_count integer default 0,
  diagnostika_count integer default 0,
  adblue_count integer default 0,
  remontas_count integer default 0,
  glostymas_count integer default 0,
  unique (tenant_id, stat_date)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_profiles_tenant on profiles(tenant_id);
create index idx_customers_tenant on customers(tenant_id);
create index idx_vehicles_tenant on vehicles(tenant_id);
create index idx_vehicles_customer on vehicles(customer_id);
create index idx_work_orders_tenant on work_orders(tenant_id);
create index idx_work_orders_status on work_orders(status);
create index idx_work_orders_date on work_orders(order_date desc);
create index idx_work_orders_mechanic on work_orders(mechanic_id);
create index idx_mechanic_logs_tenant on mechanic_logs(tenant_id);
create index idx_mechanic_logs_mechanic on mechanic_logs(mechanic_id);
create index idx_mechanic_logs_order on mechanic_logs(work_order_id);
create index idx_expenses_tenant_month on expenses(tenant_id, expense_month);
create index idx_daily_stats_tenant_date on daily_stats(tenant_id, stat_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table work_orders enable row level security;
alter table mechanic_logs enable row level security;
alter table expenses enable row level security;
alter table daily_stats enable row level security;

-- Helper: get current user's tenant
create or replace function get_user_tenant_id()
returns uuid as $$
  select tenant_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper: get current user's role
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Tenant isolation policies
create policy "tenant_isolation" on tenants for all using (
  id = get_user_tenant_id()
);

create policy "tenant_isolation" on profiles for all using (
  tenant_id = get_user_tenant_id()
);

create policy "tenant_isolation" on customers for all using (
  tenant_id = get_user_tenant_id()
);

create policy "tenant_isolation" on vehicles for all using (
  tenant_id = get_user_tenant_id()
);

create policy "tenant_isolation" on work_orders for all using (
  tenant_id = get_user_tenant_id()
);

-- Mechanic logs: mechanics see only their own, managers/owners see all
create policy "mechanic_logs_read" on mechanic_logs for select using (
  tenant_id = get_user_tenant_id() and (
    get_user_role() in ('owner', 'manager') or
    mechanic_id = auth.uid()
  )
);

create policy "mechanic_logs_write" on mechanic_logs for insert with check (
  tenant_id = get_user_tenant_id()
);

create policy "mechanic_logs_update" on mechanic_logs for update using (
  tenant_id = get_user_tenant_id() and (
    get_user_role() in ('owner', 'manager') or
    mechanic_id = auth.uid()
  )
);

-- Expenses: owner only
create policy "expenses_owner" on expenses for all using (
  tenant_id = get_user_tenant_id() and get_user_role() = 'owner'
);

create policy "tenant_isolation" on daily_stats for all using (
  tenant_id = get_user_tenant_id()
);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_customers_updated before update on customers
  for each row execute function update_updated_at();
create trigger trg_vehicles_updated before update on vehicles
  for each row execute function update_updated_at();
create trigger trg_work_orders_updated before update on work_orders
  for each row execute function update_updated_at();
create trigger trg_mechanic_logs_updated before update on mechanic_logs
  for each row execute function update_updated_at();

-- ============================================================
-- SEED DATA: VIMOTA tenant
-- ============================================================
insert into tenants (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'VIMOTA', 'vimota');
