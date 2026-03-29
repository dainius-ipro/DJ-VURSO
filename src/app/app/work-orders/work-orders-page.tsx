"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  supabase, WorkOrder, Vehicle, Customer,
  SERVICE_LABELS, ALL_SERVICES, STATUS_LABELS, STATUS_COLORS,
  OrderStatus, ServiceType, PaymentType, ClientSource,
} from "@/lib/supabase";

/* ── Row background colors by status ── */
const ROW_BG: Record<OrderStatus, string> = {
  queued: "rgba(255, 179, 71, 0.15)",      // geltona — laukia
  in_progress: "rgba(96, 165, 250, 0.15)", // mėlyna — vykdomas
  done: "rgba(52, 211, 153, 0.12)",        // žalia — atliktas
  archived: "rgba(107, 114, 128, 0.08)",   // pilka — archyvas
};
import { Badge, Btn, Modal, Input, TextArea, Select, TagSelect, Table, tdStyle, Row, Grid, Card, StatCard } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";
/* ── Types ── */
interface StaffMember { id: string; full_name: string; role: string; profile_id?: string; is_active?: boolean; }
type WOExt = WorkOrder & {
  vehicle?: Vehicle; customer?: Customer;
  invoice_number?: string; repair_conclusion?: string;
  mechanic_pay?: number; programmer_pay?: number;
};

/* ── Markup calc (mirrors DB) ── */
function calcMarkup(cost: number): number {
  if (cost <= 0) return 0;
  if (cost <= 60) return Math.round(cost * 1.33 * 100) / 100;
  if (cost <= 200) return Math.round(cost * 1.28 * 100) / 100;
  if (cost <= 400) return Math.round(cost * 1.21 * 100) / 100;
  return Math.round(cost * 1.18 * 100) / 100;
}

/* ── Mechanic pay calc ── */
function calcMechanicPay(repairCost: number, services: string[]): number {
  if (repairCost <= 0) return 0;
  const coeff = services.includes("glostymas") ? 0.6 : 0.5;
  return Math.round(repairCost * coeff * 100) / 100;
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WOExt[]>([]);
  const [mechanics, setMechanics] = useState<StaffMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WOExt | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [userRole, setUserRole] = useState<string>("mechanic");
  const [tenantId, setTenantId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (user) {
      const { data: p } = await supabase().from("profiles").select("role, tenant_id").eq("id", user.id).single();
      if (p) { setUserRole(p.role); setTenantId(p.tenant_id); }
    }

    let q = supabase()
      .from("work_orders")
      .select("*, vehicle:vehicles(*), customer:customers(*), assignments:work_order_assignments(id, worker_name, job_category_name)")
      .order("order_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter !== "all") q = q.eq("status", filter);

    const { data } = await q;
    setOrders((data || []) as WOExt[]);

    const { data: staff } = await supabase().from("staff").select("id, full_name, role, profile_id")
      .in("role", ["mechanic", "programmer"]).eq("is_active", true);
    setMechanics((staff || []) as StaffMember[]);

    const { data: vehs } = await supabase().from("vehicles").select("*, customer:customers(name, phone)").order("make");
    setVehicles((vehs || []) as Vehicle[]);

    const { data: custs } = await supabase().from("customers").select("*").order("name");
    setCustomers((custs || []) as Customer[]);

    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const isOwner = userRole === "owner" || userRole === "manager";
  const today = new Date().toISOString().slice(0, 10);

  // Stats
  const todayOrders = orders.filter(o => o.order_date === today);
  const activeOrders = orders.filter(o => o.status === "in_progress");
  const doneOrders = orders.filter(o => o.status === "done");
  const totalRevenue = doneOrders.reduce((s, o) => s + (o.service_price || 0), 0);
  const totalPartsCost = doneOrders.reduce((s, o) => s + (o.parts_cost || 0), 0);
  const totalPartsRev = doneOrders.reduce((s, o) => s + (o.parts_revenue || 0), 0);
  const profit = totalRevenue + totalPartsRev - totalPartsCost;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("wo.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ {t("wo.new")}</Btn>
      </div>

      {/* Stats */}
      <Grid cols={isOwner ? 5 : 3} gap={10} style={{ marginBottom: 18 }}>
        <StatCard label={t("c.today")} value={todayOrders.length} />
        <StatCard label={t("wo.inProgress")} value={activeOrders.length} color="var(--accent)" />
        <StatCard label={t("wo.completed")} value={doneOrders.length} color="var(--success)" />
        {isOwner && <StatCard label={t("wo.revenue")} value={`€${totalRevenue.toFixed(0)}`} color="var(--accent)" />}
        {isOwner && <StatCard label={t("wo.profit")} value={`€${profit.toFixed(0)}`} color="var(--success)" />}
      </Grid>

      {/* Filters */}
      <Row gap={6} style={{ marginBottom: 14 }}>
        {(["all", "queued", "in_progress", "done", "archived"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
            border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}`,
            background: filter === s ? "var(--accent)18" : "transparent",
            color: filter === s ? "var(--accent)" : "var(--muted)",
          }}>
            {s === "all" ? t("c.all") : STATUS_LABELS[s]}
          </button>
        ))}
      </Row>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("c.date"), t("wo.vehicle"), t("wo.services"), t("wo.worker"), t("c.price"), t("wo.parts"), t("c.status"), ""]}>
          {orders.map(o => (
            <tr key={o.id} style={{ cursor: "pointer", background: ROW_BG[o.status] || "transparent", transition: "background 0.15s" }} onClick={() => { setEditing(o); setShowForm(true); }}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{o.order_date}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.day_of_week}</div>
                {o.invoice_number && <div style={{ fontSize: 10, color: "var(--accent)" }}>📄 {o.invoice_number}</div>}
              </td>
              <td style={tdStyle}>
                {o.vehicle ? (
                  <>
                    <div style={{ fontWeight: 600 }}>{o.vehicle.make} {o.vehicle.model}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      {o.vehicle.plate}{o.vehicle.cc ? ` • ${o.vehicle.cc}cc` : ""}{o.vehicle.kw ? ` • ${o.vehicle.kw}kW` : ""}
                    </div>
                  </>
                ) : <span style={{ color: "var(--muted)" }}>—</span>}
                {o.customer && <div style={{ fontSize: 11, color: "var(--accent)" }}>{o.customer.name}</div>}
              </td>
              <td style={tdStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {(o.services || []).map(s => <Badge key={s} color="#77a8ff">{SERVICE_LABELS[s] || s}</Badge>)}
                </div>
              </td>
              <td style={tdStyle}>
                <div>{o.mechanic_name || "—"}</div>
                {(o as any).assignments?.length > 1 && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    +{(o as any).assignments.length - 1} {(o as any).assignments.slice(1).map((a: any) => a.worker_name).join(", ")}
                  </div>
                )}
                {(o as any).executor_name && <div style={{ fontSize: 11, color: "var(--muted)" }}>🏢 {(o as any).executor_name}</div>}
                {!(o as any).executor_name && o.programmer_name && <div style={{ fontSize: 11, color: "var(--muted)" }}>💻 {o.programmer_name}</div>}
              </td>
              <td style={tdStyle}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>€{(o.service_price || 0).toFixed(0)}</div>
                {isOwner && o.repair_cost > 0 && <div style={{ fontSize: 10, color: "var(--muted)" }}>Rem: €{o.repair_cost.toFixed(0)}</div>}
                {isOwner && o.programmer_cost > 0 && <div style={{ fontSize: 10, color: "var(--muted)" }}>Vykd: €{o.programmer_cost.toFixed(0)}</div>}
              </td>
              <td style={tdStyle}>
                {(o.parts_cost > 0 || o.parts_revenue > 0) ? (
                  <>
                    <div style={{ fontSize: 12 }}>€{(o.parts_revenue || 0).toFixed(0)}</div>
                    {isOwner && <div style={{ fontSize: 10, color: "var(--success)" }}>+€{((o.parts_revenue || 0) - (o.parts_cost || 0)).toFixed(0)}</div>}
                  </>
                ) : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
              </td>
              <td style={tdStyle}>
                <Badge color={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge>
                {o.is_paid && <div style={{ marginTop: 2 }}><Badge color="var(--success)">💳 Apmok.</Badge></div>}
              </td>
              <td style={tdStyle}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={(e: any) => { e.stopPropagation(); setEditing(o); setShowForm(true); }}>✎</Btn>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>{t("c.noOrders")}</td></tr>
          )}
        </Table>
      )}

      <WorkOrderForm
        open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        order={editing} mechanics={mechanics} vehicles={vehicles} customers={customers}
        isOwner={isOwner} tenantId={tenantId}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SearchSelect — Dropdown with search + create new
   ═══════════════════════════════════════════ */
function SearchSelect({ label, value, onChange, options, placeholder, onCreateNew, createLabel }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sub?: string }[];
  placeholder?: string;
  onCreateNew?: () => void;
  createLabel?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = options.filter(o =>
    !search || o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.sub || "").toLowerCase().includes(search.toLowerCase())
  );

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>{label}</label>
      <div
        onClick={() => { setIsOpen(!isOpen); setSearch(""); }}
        style={{
          padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--panel)", cursor: "pointer", fontSize: 13, color: "var(--text)",
          display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: 38,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : <span style={{ color: "var(--muted)" }}>{placeholder || t("c.search")}</span>}
        </span>
        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 8 }}>{isOpen ? "▲" : "▼"}</span>
      </div>

      {isOpen && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
          marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", maxHeight: 280, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search input */}
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("c.search")}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6,
                fontSize: 13, background: "var(--bg)", color: "var(--text)", boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Create new button */}
          {onCreateNew && (
            <button onClick={() => { onCreateNew(); setIsOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
              background: "none", border: "none", borderBottom: "1px solid var(--border)",
              color: "var(--accent)", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%",
              textAlign: "left",
            }}>
              {createLabel || `+ ${t("c.create")}`}
            </button>
          )}

          {/* Clear selection */}
          {value && (
            <button onClick={() => { onChange(""); setIsOpen(false); }} style={{
              padding: "6px 12px", background: "none", border: "none",
              borderBottom: "1px solid var(--border)", color: "var(--muted)", fontSize: 12,
              cursor: "pointer", textAlign: "left", width: "100%",
            }}>
              ✕ {t("c.clear")}
            </button>
          )}

          {/* Options list */}
          <div style={{ overflowY: "auto", maxHeight: 200 }}>
            {filtered.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setIsOpen(false); }} style={{
                display: "block", width: "100%", padding: "8px 12px", background: o.value === value ? "var(--panel-soft)" : "none",
                border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--text)",
              }}>
                <div style={{ fontWeight: 500 }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{o.sub}</div>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "12px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>{t("c.notFound")}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FORM — Full Vitoldo field coverage
   ═══════════════════════════════════════════ */
function WorkOrderForm({ open, onClose, onSaved, order, mechanics, vehicles, customers, isOwner, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  order: WOExt | null; mechanics: StaffMember[];
  vehicles: Vehicle[]; customers: Customer[]; isOwner: boolean; tenantId: string;
}) {
  const isEdit = !!order;
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"main" | "finance" | "comments">("main");

  // Main
  const [vehicleId, setVehicleId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("queued");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [services, setServices] = useState<string[]>([]);
  const [serviceDesc, setServiceDesc] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [executorId, setExecutorId] = useState("");
  const [executors, setExecutors] = useState<{id:string;name:string;is_internal:boolean}[]>([]);
  const [jobCategories, setJobCategories] = useState<{id:string;name:string;color:string}[]>([]);

  // Multi-worker assignments
  interface Assignment { mechanicId: string; jobCategoryId: string; dbId?: string; }
  const [assignments, setAssignments] = useState<Assignment[]>([{ mechanicId: "", jobCategoryId: "" }]);

  function addAssignment() {
    setAssignments(prev => [...prev, { mechanicId: "", jobCategoryId: "" }]);
  }

  function removeAssignment(idx: number) {
    setAssignments(prev => prev.filter((_, i) => i !== idx));
  }

  function updateAssignment(idx: number, field: keyof Assignment, value: string) {
    setAssignments(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }

  // Legacy — keep for backward compat
  const [programmerId, setProgrammerId] = useState("");

  // Finance
  const [repairCost, setRepairCost] = useState("0");
  const [programmerCost, setProgrammerCost] = useState("0");
  const [partsCost, setPartsCost] = useState("0");
  const [partsRevenue, setPartsRevenue] = useState("0");
  const [servicePrice, setServicePrice] = useState("0");
  const [isPaid, setIsPaid] = useState(false);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [withVat, setWithVat] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("none");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [internalTotal, setInternalTotal] = useState("0");
  const [internalCost, setInternalCost] = useState("0");

  // Comments
  const [clientComment, setClientComment] = useState("");
  const [internalComment, setInternalComment] = useState("");
  const [postRepairNotes, setPostRepairNotes] = useState("");
  const [repairConclusion, setRepairConclusion] = useState("");
  const [clientSource, setClientSource] = useState<ClientSource>("naujas");
  const [referralSource, setReferralSource] = useState("");

  // Load executors & job categories & assignments
  useEffect(() => {
    if (!open) return;
    supabase().from("executors").select("id, name, is_internal").eq("is_active", true).order("sort_order")
      .then(({ data }) => setExecutors((data || []) as any));
    supabase().from("job_categories").select("id, name, color").eq("is_active", true).order("sort_order")
      .then(({ data }) => setJobCategories((data || []) as any));

    // Load assignments for existing order
    if (order) {
      supabase().from("work_order_assignments").select("*")
        .eq("work_order_id", order.id).order("sort_order")
        .then(({ data }) => {
          if (data && data.length > 0) {
            setAssignments(data.map((a: any) => ({
              mechanicId: a.mechanic_id || a.staff_id || "",
              jobCategoryId: a.job_category_id || "",
              dbId: a.id,
            })));
          } else if (order.mechanic_id) {
            // Fallback: convert legacy mechanic_id to first assignment
            setAssignments([{ mechanicId: order.mechanic_id, jobCategoryId: "" }]);
          } else {
            setAssignments([{ mechanicId: "", jobCategoryId: "" }]);
          }
        });
    } else {
      setAssignments([{ mechanicId: "", jobCategoryId: "" }]);
    }
  }, [open, order]);

  // Load
  useEffect(() => {
    if (!open) return;
    if (order) {
      setVehicleId(order.vehicle_id || ""); setCustomerId(order.customer_id || "");
      setStatus(order.status); setOrderDate(order.order_date);
      setServices(order.services || []); setServiceDesc(order.service_description || "");
      setMechanicId(order.mechanic_id || ""); setProgrammerId(order.programmer_id || "");
      setExecutorId((order as any).executor_id || "");
      setRepairCost(String(order.repair_cost || 0)); setProgrammerCost(String(order.programmer_cost || 0));
      setPartsCost(String(order.parts_cost || 0)); setPartsRevenue(String(order.parts_revenue || 0));
      setServicePrice(String(order.service_price || 0));
      setIsPaid(order.is_paid); setHasDiscount(order.has_discount); setWithVat(order.with_vat);
      setPaymentType(order.payment_type); setInvoiceNumber(order.invoice_number || "");
      setInternalTotal(String(order.internal_total || 0)); setInternalCost(String(order.internal_cost || 0));
      setClientComment(order.client_comment || ""); setInternalComment(order.internal_comment || "");
      setPostRepairNotes(order.post_repair_notes || ""); setRepairConclusion(order.repair_conclusion || "");
      setClientSource(order.client_source || "naujas"); setReferralSource(order.referral_source || "");
      setTab("main");
    } else {
      setVehicleId(""); setCustomerId(""); setStatus("queued");
      setOrderDate(new Date().toISOString().slice(0, 10));
      setServices([]); setServiceDesc(""); setMechanicId(""); setProgrammerId(""); setExecutorId("");
      setRepairCost("0"); setProgrammerCost("0"); setPartsCost("0"); setPartsRevenue("0");
      setServicePrice("0"); setIsPaid(false); setHasDiscount(false); setWithVat(false);
      setPaymentType("none"); setInvoiceNumber("");
      setInternalTotal("0"); setInternalCost("0");
      setClientComment(""); setInternalComment(""); setPostRepairNotes(""); setRepairConclusion("");
      setClientSource("naujas"); setReferralSource(""); setTab("main");
    }
  }, [order, open]);

  // Auto-calc service price = repair + programmer + parts_revenue (like Vitoldo P = W+Y+AA)
  const calcRepair = parseFloat(repairCost) || 0;
  const calcProg = parseFloat(programmerCost) || 0;
  const calcPartsRev = parseFloat(partsRevenue) || 0;
  const calcPartsCost = parseFloat(partsCost) || 0;
  const autoServicePrice = calcRepair + calcProg + calcPartsRev;
  const mechanicPay = calcMechanicPay(calcRepair, services);
  const partsMargin = calcPartsRev - calcPartsCost;

  // Auto-update service price when components change
  useEffect(() => {
    setServicePrice(autoServicePrice.toFixed(2));
  }, [autoServicePrice]);

  // Auto-fill customer when vehicle selected
  function handleVehicleChange(vId: string) {
    setVehicleId(vId);
    const v = vehicles.find(x => x.id === vId);
    if (v?.customer_id && !customerId) {
      setCustomerId(v.customer_id);
    }
  }

  async function handleSave() {
    setSaving(true);
    // Primary worker = first assignment
    const primaryMechanicId = assignments[0]?.mechanicId || mechanicId || "";
    const mechanic = mechanics.find(m => m.profile_id === primaryMechanicId || m.id === primaryMechanicId);
    const programmer = mechanics.find(m => m.profile_id === programmerId || m.id === programmerId);
    const vehicle = vehicles.find(v => v.id === vehicleId);

    const payload: any = {
      vehicle_id: vehicleId || null, customer_id: customerId || null,
      status, order_date: orderDate, services,
      service_description: serviceDesc || null,
      // mechanic_id FK -> profiles(id), so must use profile_id (auth uid)
      mechanic_id: primaryMechanicId || null,
      mechanic_name: mechanic?.full_name || null,
      programmer_id: programmerId || null,
      programmer_name: programmer?.full_name || null,
      executor_id: executorId || null,
      executor_name: executors.find(e => e.id === executorId)?.name || null,
      repair_cost: calcRepair, programmer_cost: calcProg,
      parts_cost: calcPartsCost, parts_revenue: calcPartsRev,
      service_price: parseFloat(servicePrice) || 0,
      is_paid: isPaid, is_done: status === "done", has_discount: hasDiscount,
      with_vat: withVat, payment_type: paymentType,
      invoice_number: invoiceNumber || null,
      mechanic_pay: mechanicPay,
      internal_total: parseFloat(internalTotal) || 0,
      internal_cost: parseFloat(internalCost) || 0,
      client_comment: clientComment || null, internal_comment: internalComment || null,
      post_repair_notes: postRepairNotes || null,
      repair_conclusion: repairConclusion || null,
      client_source: clientSource, referral_source: referralSource || null,
    };

    // ── Auto-advance status: queued → in_progress when mechanic assigned ──
    if (payload.status === "queued" && primaryMechanicId) {
      payload.status = "in_progress";
      setStatus("in_progress");
    }

    let workOrderId = order?.id;

    if (isEdit && order) {
      await supabase().from("work_orders").update(payload).eq("id", order.id);
    } else {
      payload.tenant_id = tenantId;
      payload.checked_in_at = new Date().toISOString();
      const { data: newWO, error } = await supabase().from("work_orders").insert(payload).select("id").single();
      if (error) console.error(error);
      if (newWO) workOrderId = newWO.id;
    }

    // ── Auto-create mechanic_log when mechanic assigned ──
    // mechanicId is already profile_id (auth.uid) — matches RLS check
    if (mechanicId && workOrderId) {
      const oldMechanicId = order?.mechanic_id;
      if (!isEdit || oldMechanicId !== mechanicId) {
        const { data: existing } = await supabase().from("mechanic_logs")
          .select("id").eq("work_order_id", workOrderId).eq("mechanic_id", mechanicId).limit(1);
        if (!existing || existing.length === 0) {
          const { error: logErr } = await supabase().from("mechanic_logs").insert({
            tenant_id: tenantId,
            work_order_id: workOrderId,
            mechanic_id: mechanicId,
            vehicle_make: vehicle?.make || null,
            vehicle_model: vehicle?.model || null,
            vehicle_plate: vehicle?.plate || null,
            vehicle_cc: vehicle?.cc || null,
            vehicle_kw: vehicle?.kw || null,
            vehicle_year: vehicle?.year || null,
            services: services,
            office_comment: clientComment || serviceDesc || null,
            log_date: orderDate,
            log_status: "assigned",
          });
          if (logErr) console.error("mechanic_log create error:", logErr);
        }
      }
    }

    // ── Auto-create programmer log if programmer assigned ──
    if (programmerId && workOrderId) {
      const oldProgrammerId = order?.programmer_id;
      if (!isEdit || oldProgrammerId !== programmerId) {
        const { data: existing } = await supabase().from("mechanic_logs")
          .select("id").eq("work_order_id", workOrderId).eq("mechanic_id", programmerId).limit(1);
        if (!existing || existing.length === 0) {
          const { error: logErr } = await supabase().from("mechanic_logs").insert({
            tenant_id: tenantId,
            work_order_id: workOrderId,
            mechanic_id: programmerId,
            vehicle_make: vehicle?.make || null,
            vehicle_model: vehicle?.model || null,
            vehicle_plate: vehicle?.plate || null,
            vehicle_cc: vehicle?.cc || null,
            vehicle_kw: vehicle?.kw || null,
            vehicle_year: vehicle?.year || null,
            services: services,
            office_comment: clientComment || serviceDesc || null,
            log_date: orderDate,
            log_status: "assigned",
          });
          if (logErr) console.error("programmer_log create error:", logErr);
        }
      }
    }

    // ── Save assignments ──
    if (workOrderId) {
      const validAssignments = assignments.filter(a => a.mechanicId);
      if (validAssignments.length > 0) {
        // Delete old assignments that are no longer present
        const existingDbIds = validAssignments.map(a => a.dbId).filter(Boolean);
        if (isEdit) {
          // Remove assignments not in current list
          const { data: oldAssignments } = await supabase().from("work_order_assignments")
            .select("id").eq("work_order_id", workOrderId);
          const toDelete = (oldAssignments || []).filter(oa => !existingDbIds.includes(oa.id));
          for (const d of toDelete) {
            await supabase().from("work_order_assignments").delete().eq("id", d.id);
          }
        }

        // Upsert each assignment
        for (let i = 0; i < validAssignments.length; i++) {
          const a = validAssignments[i];
          const worker = mechanics.find(m => m.profile_id === a.mechanicId || m.id === a.mechanicId);
          const cat = jobCategories.find(c => c.id === a.jobCategoryId);
          const assignPayload: any = {
            work_order_id: workOrderId,
            tenant_id: tenantId,
            staff_id: worker?.id || null,
            mechanic_id: worker?.profile_id || a.mechanicId,
            worker_name: worker?.full_name || "—",
            job_category_id: a.jobCategoryId || null,
            job_category_name: cat?.name || null,
            sort_order: i,
          };

          if (a.dbId) {
            await supabase().from("work_order_assignments").update(assignPayload).eq("id", a.dbId);
          } else {
            await supabase().from("work_order_assignments").insert(assignPayload);
          }
        }
      }
    }

    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!order || !confirm(t("wo.deleteConfirm"))) return;
    await supabase().from("work_orders").delete().eq("id", order.id);
    onSaved();
  }

  const serviceOpts = ALL_SERVICES.map(s => ({ value: s, label: SERVICE_LABELS[s] }));
  const mechOpts = [{ value: "", label: `— ${t("c.notAssigned")} —` }, ...mechanics.filter(m => m.is_active !== false).map(m => ({ value: m.profile_id || m.id, label: m.full_name + (m.role ? ` (${tRole(m.role)})` : "") }))];
  const vehicleOpts = [{ value: "", label: `— ${t("c.search")} —` }, ...vehicles.map(v => ({ value: v.id, label: `${v.make} ${v.model} ${v.plate || ""} ${v.cc ? v.cc + "cc" : ""}`.trim() }))];
  const customerOpts = [{ value: "", label: `— ${t("c.search")} —` }, ...customers.map(c => ({ value: c.id, label: `${c.name} ${c.phone || ""}`.trim() }))];

  return (
    <>
    <Modal open={open} onClose={onClose} title={isEdit ? t("wo.editOrder") : t("wo.new")} width={760}>
      {/* Tabs */}
      <Row gap={0} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {([
          { key: "main", label: t("wo.tabMain") },
          { key: "finance", label: t("wo.tabFinance") },
          { key: "comments", label: t("wo.tabComments") },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: "8px 18px", fontSize: 13, fontWeight: tab === t.key ? 700 : 400, cursor: "pointer",
            border: "none", borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            background: "none", color: tab === t.key ? "var(--accent)" : "var(--muted)",
          }}>
            {t.label}
          </button>
        ))}
      </Row>

      {/* ── MAIN TAB ── */}
      {tab === "main" && (
        <>
          {/* ── Vehicle & Customer with search + create ── */}
          <Grid cols={2} gap={14}>
            <SearchSelect
              label={t("veh.title")}
              value={vehicleId}
              onChange={handleVehicleChange}
              options={vehicles.map(v => ({
                value: v.id,
                label: `${v.plate || "?"} — ${v.make} ${v.model}`,
                sub: [v.cc ? `${v.cc}cc` : "", v.kw ? `${v.kw}kW` : "", v.year ? `${v.year}` : ""].filter(Boolean).join(" • "),
              }))}
              placeholder={t("wo.searchPlate")}
              onCreateNew={() => setShowNewVehicle(true)}
              createLabel={`+ ${t("wo.newVehicle")}`}
            />
            <SearchSelect
              label={t("cust.title")}
              value={customerId}
              onChange={v => setCustomerId(v)}
              options={customers.map(c => ({
                value: c.id,
                label: c.name + (c.phone ? ` (${c.phone})` : ""),
                sub: c.email || c.company || "",
              }))}
              placeholder={t("wo.searchClient")}
              onCreateNew={() => setShowNewCustomer(true)}
              createLabel={`+ ${t("cust.new")}`}
            />
          </Grid>
          <Grid cols={3} gap={14}>
            <Input label={t("c.date")} type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            <Select label={t("c.status")} options={[
              { value: "queued", label: "🟡 Laukia priskyrimo" }, { value: "in_progress", label: "🔵 Vykdomas" },
              { value: "done", label: "🟢 Atliktas" }, { value: "archived", label: "⚫ Archyvuotas" },
            ]} value={status} onChange={e => setStatus(e.target.value as OrderStatus)} />
            <Select label={t("c.clientType")} options={[
              { value: "naujas", label: "✨ Naujas" }, { value: "senas", label: "👴 Senas" }, { value: "partneris", label: "🤝 Partneris" },
            ]} value={clientSource} onChange={e => setClientSource(e.target.value as ClientSource)} />
          </Grid>

          <TagSelect label={t("nav.services")} options={serviceOpts} value={services} onChange={setServices} />
          <Input label={t("wo.serviceDesc")} value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} />

          {/* ── Workers Section ── */}
          <div style={{ marginTop: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 8 }}>
              {t("ws.employees")}
            </label>
            {assignments.map((a, idx) => (
              <div key={idx} style={{
                display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 8,
                padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)",
              }}>
                <div style={{ flex: 1 }}>
                  <Select label={idx === 0 ? t("wo.workerLabel") : `${t("wo.workerLabel")} ${idx + 1}`}
                    options={mechOpts}
                    value={a.mechanicId}
                    onChange={e => updateAssignment(idx, "mechanicId", e.target.value)} />
                </div>
                <div style={{ width: 160 }}>
                  <Select label={t("team.jobCategory")}
                    options={[
                      { value: "", label: "—" },
                      ...jobCategories.map(c => ({ value: c.id, label: c.name })),
                    ]}
                    value={a.jobCategoryId}
                    onChange={e => updateAssignment(idx, "jobCategoryId", e.target.value)} />
                </div>
                {assignments.length > 1 && (
                  <button onClick={() => removeAssignment(idx)} style={{
                    background: "none", border: "none", cursor: "pointer", color: "var(--danger)",
                    fontSize: 16, padding: "6px", marginBottom: 12,
                  }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addAssignment} style={{
              background: "none", border: "1px dashed var(--border)", borderRadius: 8,
              padding: "8px 16px", width: "100%", cursor: "pointer", color: "var(--accent)",
              fontSize: 13, fontWeight: 600, marginBottom: 4,
            }}>
              {t("wo.addWorkerBtn")}
            </button>
          </div>

          {/* Executor */}
          <div style={{ marginTop: 8 }}>
            <Select label={t("c.executor")} options={[
              { value: "", label: `— ${t("c.notAssigned")} —` },
              ...executors.map(e => ({ value: e.id, label: `${e.is_internal ? "★ " : ""}${e.name}` })),
            ]} value={executorId} onChange={e => setExecutorId(e.target.value)} />
          </div>

          {/* Quick finance summary on main tab */}
          <div style={{ marginTop: 16, padding: 14, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{t("c.priceForClient")}</span>
              <span style={{ fontSize: 22, fontWeight: 700 }}>€{(parseFloat(servicePrice) || 0).toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              = Remonto €{calcRepair.toFixed(0)} + Prog. €{calcProg.toFixed(0)} + Detalės €{calcPartsRev.toFixed(0)}
            </div>
            {isOwner && mechanicPay > 0 && (
              <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>
                Meistro atlygis: €{mechanicPay.toFixed(2)} ({services.includes("glostymas") ? "60%" : "50%"})
              </div>
            )}
          </div>
        </>
      )}

      {/* ── FINANCE TAB ── */}
      {tab === "finance" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", letterSpacing: 0.5 }}>💰 KAINOS</span>
          </div>
          <Grid cols={3} gap={14}>
            <Input label="Remonto kaina €" type="number" value={repairCost} onChange={e => setRepairCost(e.target.value)} />
            <Input label="Vykd. kaina €" type="number" value={programmerCost} onChange={e => setProgrammerCost(e.target.value)} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Paslaugos kaina € (auto)</div>
              <div style={{ padding: "9px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 16, fontWeight: 700 }}>
                €{(parseFloat(servicePrice) || 0).toFixed(2)}
              </div>
            </div>
          </Grid>

          <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0", paddingTop: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 0.5 }}>🔩 DETALĖS</span>
          </div>
          <Grid cols={2} gap={14}>
            <Input label={t("wo.partsCost")} type="number" value={partsCost} onChange={e => setPartsCost(e.target.value)} />
            <Input label={t("wo.partsRevenue")} type="number" value={partsRevenue} onChange={e => setPartsRevenue(e.target.value)} />
          </Grid>
          {calcPartsCost > 0 && (
            <div style={{ padding: "8px 12px", background: "var(--bg)", borderRadius: 8, fontSize: 12, marginTop: 6 }}>
              <span style={{ color: "var(--muted)" }}>Rekomenduojama kaina (antkainis): </span>
              <strong style={{ color: "var(--success)" }}>€{calcMarkup(calcPartsCost).toFixed(2)}</strong>
              <span style={{ color: "var(--muted)" }}> • Marža: €{partsMargin.toFixed(2)} ({calcPartsCost > 0 ? ((partsMargin / calcPartsCost) * 100).toFixed(0) : 0}%)</span>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0", paddingTop: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 0.5 }}>💳 APMOKĖJIMAS</span>
          </div>
          <Grid cols={3} gap={14}>
            <Select label={t("wo.paymentType")} options={[
              { value: "none", label: "—" }, { value: "cash", label: "Gryni" },
              { value: "card", label: t("pay.card") }, { value: "invoice", label: t("pay.invoice") },
            ]} value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)} />
            <Input label={t("wo.invoiceNo")} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="SF-2026-001" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--success)" }} /> Apmokėtas
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={withVat} onChange={e => setWithVat(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} /> {t("wo.withVat")}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={hasDiscount} onChange={e => setHasDiscount(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#ffb347" }} /> {t("wo.discount")}
              </label>
            </div>
          </Grid>

          {isOwner && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0", paddingTop: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#ff6b6b", letterSpacing: 0.5 }}>🔒 VIDINIS (tik savininkas)</span>
              </div>
              <Grid cols={2} gap={14}>
                <Input label={t("wo.internalTotal")} type="number" value={internalTotal} onChange={e => setInternalTotal(e.target.value)} />
                <Input label={t("wo.internalCost")} type="number" value={internalCost} onChange={e => setInternalCost(e.target.value)} />
              </Grid>
              {/* Mechanic pay auto-calc display */}
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#fff9c4", borderRadius: 8, fontSize: 12 }}>
                <strong>Meistro atlygis (auto):</strong> €{mechanicPay.toFixed(2)}
                <span style={{ color: "var(--muted)" }}> ({services.includes("glostymas") ? "60%" : "50%"} nuo remonto €{calcRepair.toFixed(0)})</span>
              </div>
            </>
          )}
        </>
      )}

      {/* ── COMMENTS TAB ── */}
      {tab === "comments" && (
        <>
          <TextArea label={t("wo.clientComment")} value={clientComment} onChange={e => setClientComment(e.target.value)} placeholder="Ko klientas nori..." />
          <TextArea label={t("wo.internalComment")} value={internalComment} onChange={e => setInternalComment(e.target.value)} placeholder="Vidinės pastabos..." />
          <TextArea label={t("wo.repairConclusion")} value={postRepairNotes} onChange={e => setPostRepairNotes(e.target.value)} placeholder="Kas buvo padaryta..." />
          <TextArea label={t("wo.repairConclusion")} value={repairConclusion} onChange={e => setRepairConclusion(e.target.value)} placeholder={t("wo.serviceDesc")} />

          <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0", paddingTop: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 0.5 }}>📣 ŠALTINIS</span>
          </div>
          <Grid cols={2} gap={14}>
            <Select label={t("wo.clientSource")} options={[
              { value: "", label: "— Nepasirinkta —" },
              { value: t("c.website"), label: "🌐 Internetas" },
              { value: "Rekomendavo", label: `👥 ${t("c.sourceRecommend")}` },
              { value: "Socialiniai tinklai", label: `📱 ${t("c.sourceSocial")}` },
              { value: "Skambutis", label: `📞 ${t("c.sourceCall")}` },
              { value: t("svc.kiti"), label: "📌 Kita" },
            ]} value={referralSource} onChange={e => setReferralSource(e.target.value)} />
            <Select label={t("c.clientType")} options={[
              { value: "naujas", label: "✨ Naujas" }, { value: "senas", label: "👴 Senas" }, { value: "partneris", label: "🤝 Partneris" },
            ]} value={clientSource} onChange={e => setClientSource(e.target.value as ClientSource)} />
          </Grid>
        </>
      )}

      {/* Footer */}
      <Row gap={10} style={{ marginTop: 18, justifyContent: "flex-end" }}>
        {isEdit && isOwner && <Btn variant="danger" onClick={handleDelete} style={{ marginRight: "auto" }}>{t("c.delete")}</Btn>}
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}</Btn>
      </Row>
    </Modal>

    {/* ── Quick Create Vehicle ── */}
    <QuickCreateVehicle
      open={showNewVehicle}
      onClose={() => setShowNewVehicle(false)}
      onCreated={(v) => {
        setShowNewVehicle(false);
        vehicles.push(v);
        setVehicleId(v.id);
        if (v.customer_id) setCustomerId(v.customer_id);
      }}
      tenantId={tenantId}
      customers={customers}
    />

    {/* ── Quick Create Customer ── */}
    <QuickCreateCustomer
      open={showNewCustomer}
      onClose={() => setShowNewCustomer(false)}
      onCreated={(c) => {
        setShowNewCustomer(false);
        customers.push(c);
        setCustomerId(c.id);
      }}
      tenantId={tenantId}
    />
  </>
  );
}

/* ═══════════════════════════════════════════
   Quick Create — Vehicle (with make/model autocomplete)
   ═══════════════════════════════════════════ */
function QuickCreateVehicle({ open, onClose, onCreated, tenantId, customers }: {
  open: boolean; onClose: () => void; onCreated: (v: Vehicle) => void;
  tenantId: string; customers: Customer[];
}) {
  const [make, setMake] = useState(""); const [model, setModel] = useState("");
  const [plate, setPlate] = useState(""); const [year, setYear] = useState("");
  const [cc, setCc] = useState(""); const [kw, setKw] = useState("");
  const [customerId, setCustomerId] = useState(""); const [saving, setSaving] = useState(false);
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showMakeList, setShowMakeList] = useState(false);
  const [showModelList, setShowModelList] = useState(false);

  useEffect(() => {
    if (open) { setMake(""); setModel(""); setPlate(""); setYear(""); setCc(""); setKw(""); setCustomerId(""); }
  }, [open]);

  // Dynamic import to avoid SSR issues
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbRef, setDbRef] = useState<any>(null);
  useEffect(() => {
    import("@/lib/vehicle_db").then(mod => { setDbRef(mod); setDbLoaded(true); }).catch(() => {});
  }, []);

  function handleMakeChange(val: string) {
    setMake(val);
    setModel("");
    if (dbRef && val.length >= 1) {
      setMakeSuggestions(dbRef.searchMakes(val).slice(0, 10));
      setShowMakeList(true);
    } else if (dbRef && val === "") {
      setMakeSuggestions(dbRef.getAllMakes().slice(0, 15));
      setShowMakeList(true);
    } else {
      setShowMakeList(false);
    }
  }

  function selectMake(m: string) {
    setMake(m);
    setShowMakeList(false);
    if (dbRef) {
      setModelSuggestions(dbRef.getModelsForMake(m));
      setShowModelList(true);
    }
  }

  function handleModelChange(val: string) {
    setModel(val);
    if (dbRef && make) {
      setModelSuggestions(dbRef.searchModels(make, val).slice(0, 12));
      setShowModelList(true);
    }
  }

  function selectModel(m: string) {
    setModel(m);
    setShowModelList(false);
  }

  async function save() {
    if (!plate.trim()) { alert("Įveskite valst. numerį"); return; }
    setSaving(true);
    const { data, error } = await supabase().from("vehicles").insert({
      tenant_id: tenantId, make: make || null, model: model || null,
      plate: plate.toUpperCase().trim(), year: parseInt(year) || null,
      cc: cc || null, kw: parseFloat(kw) || null,
      customer_id: customerId || null,
    }).select("*").single();
    setSaving(false);
    if (data) onCreated(data as Vehicle);
    if (error) alert("Klaida: " + error.message);
  }

  const custOpts = [{ value: "", label: "— Be kliento —" }, ...customers.map(c => ({ value: c.id, label: c.name }))];

  const acStyle: React.CSSProperties = {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
    background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
    marginTop: 2, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", maxHeight: 200,
    overflowY: "auto",
  };
  const acItemStyle: React.CSSProperties = {
    display: "block", width: "100%", padding: "7px 12px", background: "none",
    border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--text)",
  };

  return (
    <Modal open={open} onClose={onClose} title={t("veh.new")} width={480}>
      <Grid cols={2} gap={14}>
        <Input label={t("c.plateRequired")} value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC 123" />
        <Input label={t("veh.year")} type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2020" />
      </Grid>
      <Grid cols={2} gap={14}>
        {/* Make with autocomplete */}
        <div style={{ position: "relative" }}>
          <Input label={t("veh.make")} value={make}
            onChange={e => handleMakeChange(e.target.value)}
            onFocus={() => { if (dbRef) { setMakeSuggestions(make ? dbRef.searchMakes(make) : dbRef.getAllMakes().slice(0, 15)); setShowMakeList(true); } }}
            onBlur={() => setTimeout(() => setShowMakeList(false), 200)}
            placeholder="Toyota, BMW..." />
          {showMakeList && makeSuggestions.length > 0 && (
            <div style={acStyle}>
              {makeSuggestions.map(m => (
                <button key={m} onMouseDown={() => selectMake(m)} style={{
                  ...acItemStyle,
                  fontWeight: m.toLowerCase() === make.toLowerCase() ? 700 : 400,
                }}>{m}</button>
              ))}
            </div>
          )}
        </div>
        {/* Model with autocomplete */}
        <div style={{ position: "relative" }}>
          <Input label={t("veh.model")} value={model}
            onChange={e => handleModelChange(e.target.value)}
            onFocus={() => { if (dbRef && make) { setModelSuggestions(dbRef.getModelsForMake(make)); setShowModelList(true); } }}
            onBlur={() => setTimeout(() => setShowModelList(false), 200)}
            placeholder={make ? `${make} modelis...` : t("veh.selectMakeFirst")} />
          {showModelList && modelSuggestions.length > 0 && (
            <div style={acStyle}>
              {modelSuggestions.map(m => (
                <button key={m} onMouseDown={() => selectModel(m)} style={{
                  ...acItemStyle,
                  fontWeight: m.toLowerCase() === model.toLowerCase() ? 700 : 400,
                }}>{m}</button>
              ))}
            </div>
          )}
        </div>
      </Grid>
      <Grid cols={2} gap={14}>
        <Input label={t("veh.engine")} value={cc} onChange={e => setCc(e.target.value)} placeholder="1998" />
        <Input label={t("veh.power")} value={kw} onChange={e => setKw(e.target.value)} placeholder="110" />
      </Grid>
      <Select label={t("cust.title")} options={custOpts} value={customerId} onChange={e => setCustomerId(e.target.value)} />
      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? "..." : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}

/* ═══════════════════════════════════════════
   Quick Create — Customer
   ═══════════════════════════════════════════ */
function QuickCreateCustomer({ open, onClose, onCreated, tenantId }: {
  open: boolean; onClose: () => void; onCreated: (c: Customer) => void; tenantId: string;
}) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<"noName" | "noPhone" | null>(null);

  useEffect(() => { if (open) { setName(""); setPhone(""); setEmail(""); setShowConfirm(false); setConfirmType(null); } }, [open]);

  function attemptSave() {
    const hasName = !!name.trim();
    const hasPhone = !!phone.trim();
    if (!hasName && !hasPhone) return;
    if (!hasName && !showConfirm) { setConfirmType("noName"); setShowConfirm(true); return; }
    if (!hasPhone && !showConfirm) { setConfirmType("noPhone"); setShowConfirm(true); return; }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    setShowConfirm(false);
    const { data, error } = await supabase().from("customers").insert({
      tenant_id: tenantId, name: name.trim() || phone.trim(), phone: phone || null, email: email || null,
      source: "naujas" as const,
    }).select("*").single();
    setSaving(false);
    if (data) onCreated(data as Customer);
    if (error) alert("Klaida: " + error.message);
  }

  const canSave = !!name.trim() || !!phone.trim();

  return (
    <Modal open={open} onClose={onClose} title={t("cust.new")} width={400}>
      <Input label={t("cust.nameCompany")} value={name} onChange={e => setName(e.target.value)} placeholder="Jonas Jonaitis" />
      <Grid cols={2} gap={14}>
        <Input label={t("c.phone")} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+370..." />
        <Input label={t("c.email")} value={email} onChange={e => setEmail(e.target.value)} placeholder="jonas@..." />
      </Grid>
      {!name.trim() && !phone.trim() && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>{t("cust.nameOrPhoneRequired")}</div>
      )}
      {showConfirm && (
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "rgba(255,179,71,0.15)", border: "1px solid #ffb347", borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {confirmType === "noName" ? t("cust.confirmNoName") : t("cust.confirmNoPhone")}
          </div>
          <Row gap={8}>
            <Btn variant="ghost" onClick={() => { setShowConfirm(false); setConfirmType(null); }} style={{ fontSize: 12 }}>{t("cust.goBack")}</Btn>
            <Btn onClick={doSave} style={{ fontSize: 12 }}>{t("cust.saveAnyway")}</Btn>
          </Row>
        </div>
      )}
      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={attemptSave} disabled={saving || !canSave}>{saving ? "..." : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}
