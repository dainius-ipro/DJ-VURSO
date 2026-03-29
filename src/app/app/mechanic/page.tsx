"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  supabase, MechanicLog, WorkOrder, ServiceType,
  SERVICE_LABELS, ALL_SERVICES,
} from "@/lib/supabase";
import { Badge, Btn, Modal, Input, TextArea, Select, TagSelect, Table, tdStyle, Row, Grid, StatCard } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

/* ── Types ────────────────────────────────── */
interface StaffMember { id: string; full_name: string; role: string; profile_id?: string; }
interface Supplier { id: string; name: string; }
interface OrderPart {
  id?: string; tenant_id?: string; work_order_id?: string; mechanic_log_id?: string;
  description: string; supplier: string; supplier_id?: string; purchase_price: number; sell_price: number; quantity: number;
}
interface MechanicLogExt extends MechanicLog { parts_sell_price?: number; }

/* ── Markup calc (mirrors DB function) ────── */
function calcMarkup(cost: number): number {
  if (cost <= 0) return 0;
  if (cost <= 60) return Math.round(cost * 1.33 * 100) / 100;
  if (cost <= 200) return Math.round(cost * 1.28 * 100) / 100;
  if (cost <= 400) return Math.round(cost * 1.21 * 100) / 100;
  return Math.round(cost * 1.18 * 100) / 100;
}

/* ── Live timer hook ─────────────────────── */
function useLiveTimer(startTime: string | null | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!active || !startTime) { setElapsed(""); return; }
    const update = () => {
      const ms = Date.now() - new Date(startTime).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [startTime, active]);
  return elapsed;
}

/* ── Timer cell component ─────────────────── */
function TimerCell({ log, onRefresh }: { log: MechanicLogExt; onRefresh: () => void }) {
  const isActive = log.started && !log.finished;
  const elapsed = useLiveTimer(log.start_time, isActive);

  return (
    <td style={tdStyle}>
      {log.finished ? (
        <>
          <Badge color="var(--success)">✓ Baigtas</Badge>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {log.duration_minutes > 0 && `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}min`}
          </div>
        </>
      ) : log.started ? (
        <>
          <Badge color="var(--accent)">▶ Vykdomas</Badge>
          {elapsed && <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{elapsed}</div>}
        </>
      ) : (
        <Badge color="#ffb347">○ Laukia</Badge>
      )}
    </td>
  );
}

/* ── Actions cell component ───────────────── */
function ActionsCell({ log, onRefresh }: { log: MechanicLogExt; onRefresh: () => void }) {
  async function startWork(e: React.MouseEvent) {
    e.stopPropagation();
    await supabase().from("mechanic_logs").update({
      started: true, start_time: new Date().toISOString(), log_status: "in_progress"
    }).eq("id", log.id);
    onRefresh();
  }
  async function stopWork(e: React.MouseEvent) {
    e.stopPropagation();
    const endTime = new Date();
    const startTime = log.start_time ? new Date(log.start_time) : endTime;
    const mins = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    await supabase().from("mechanic_logs").update({
      finished: true, end_time: endTime.toISOString(),
      duration_minutes: mins, log_status: "done"
    }).eq("id", log.id);
    onRefresh();
  }

  if (log.finished) return <td style={tdStyle} />;
  return (
    <td style={tdStyle}>
      {!log.started && (
        <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 10px", background: "#e8f5e9" }}
          onClick={startWork}>▶ Pradėti</Btn>
      )}
      {log.started && !log.finished && (
        <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 10px", background: "#ffebee" }}
          onClick={stopWork}>⏹ Baigti</Btn>
      )}
    </td>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function MechanicPage() {
  const [logs, setLogs] = useState<MechanicLogExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MechanicLogExt | null>(null);
  const [userRole, setUserRole] = useState<string>("mechanic");
  const [myStaffId, setMyStaffId] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("");
  const [mechanics, setMechanics] = useState<StaffMember[]>([]);
  const [filterMechanic, setFilterMechanic] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterInit, setFilterInit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: prof } = await supabase().from("profiles").select("tenant_id, role").eq("id", user.id).single();
      if (!prof) { setLoading(false); return; }
      setUserRole(prof.role);
      setTenantId(prof.tenant_id);

      // mechanic_id in mechanic_logs = auth.uid() (= user.id = profiles.id)
      // This is what RLS checks: mechanic_id = auth.uid()
      const myAuthId = user.id;
      setMyStaffId(myAuthId);

      // Set default filter: owner/manager see ALL, mechanic sees only own
      const isManagerRole = prof.role === "owner" || prof.role === "manager";
      let activeFilter = filterMechanic;
      if (!filterInit) {
        activeFilter = isManagerRole ? "all" : "mine";
        setFilterMechanic(activeFilter);
        setFilterInit(true);
      }

      // Load all active staff for filters
      const { data: allStaff } = await supabase().from("staff").select("id, full_name, role, profile_id")
        .in("role", ["mechanic", "programmer"]).eq("is_active", true);
      setMechanics((allStaff || []) as StaffMember[]);

      // Build query
      let q = supabase().from("mechanic_logs").select("*")
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (activeFilter === "mine") {
        // Use auth.uid — this is what RLS checks and what mechanic_id stores
        q = q.eq("mechanic_id", myAuthId);
      } else if (activeFilter && activeFilter !== "all") {
        // Filter by specific staff member's profile_id
        const staffMember = (allStaff || []).find((s: any) => s.id === activeFilter);
        q = q.eq("mechanic_id", staffMember?.profile_id || activeFilter);
      }
      // "all" = no filter, owner/manager sees everything (RLS allows it)

      if (filterDate) {
        q = q.eq("log_date", filterDate);
      }

      const { data, error } = await q;
      if (error) console.error("mechanic_logs query error:", error);
      setLogs((data || []) as MechanicLogExt[]);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  }, [filterMechanic, filterDate]);

  useEffect(() => { load(); }, [load]);

  const isManager = userRole === "owner" || userRole === "manager";
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter(l => l.log_date === today);
  const inProgress = logs.filter(l => l.started && !l.finished);
  const totalParts = logs.reduce((s, l) => s + (l.parts_cost || 0), 0);
  const totalRepair = logs.reduce((s, l) => s + (l.repair_cost || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          👨‍🔧 {isManager ? t("mech.masterJobs") : t("mech.myJobs")}
        </h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>
          + {isManager ? t("mech.assignWork") : t("mech.newWork")}
        </Btn>
      </div>

      {/* Stats */}
      <Grid cols={4} gap={10} style={{ marginBottom: 18 }}>
        <StatCard label={t("mech.todayJobs")} value={todayLogs.length} />
        <StatCard label={t("wo.inProgress")} value={inProgress.length} color="var(--accent)" />
        <StatCard label={t("wo.partsCost")} value={`€${totalParts.toFixed(0)}`} />
        <StatCard label={t("mech.repairSum")} value={`€${totalRepair.toFixed(0)}`} color="var(--success)" />
      </Grid>

      {/* Filters */}
      <Row gap={10} style={{ marginBottom: 14, flexWrap: "wrap" }}>
        {isManager && (
          <Select label="" options={[
            { value: "all", label: t("mech.allMechanics") },
            { value: "mine", label: t("mech.mine") },
            ...mechanics.map(m => ({ value: m.profile_id || m.id, label: m.full_name })),
          ]} value={filterMechanic} onChange={e => setFilterMechanic(e.target.value)}
            style={{ width: 200, marginBottom: 0 }} />
        )}
        <Input label="" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          style={{ width: 160 }} placeholder={t("mech.filterDate")} />
        {filterDate && (
          <Btn variant="ghost" onClick={() => setFilterDate("")} style={{ marginTop: 0, fontSize: 11 }}>✕ valyti</Btn>
        )}
      </Row>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={isManager
          ? [t("c.date"), t("veh.title"), t("wo.services"), t("mech.comments"), t("wo.parts"), t("c.price"), t("c.status"), ""]
          : [t("c.date"), t("veh.title"), t("wo.services"), t("mech.comments"), t("wo.parts"), t("c.status"), ""]
        }>
          {logs.map(l => (
            <tr key={l.id} onClick={() => { setEditing(l); setShowForm(true); }} style={{ cursor: "pointer" }}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.log_date}</div>
              </td>
              <td style={tdStyle}>
                <div style={{ fontWeight: 600 }}>{l.vehicle_make} {l.vehicle_model}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {l.vehicle_plate}{l.vehicle_cc ? ` • ${l.vehicle_cc}cc` : ""}{l.vehicle_kw ? ` • ${l.vehicle_kw}kW` : ""}
                </div>
              </td>
              <td style={tdStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {(l.services || []).map(s => (
                    <Badge key={s} color="#77a8ff">{SERVICE_LABELS[s as ServiceType] || s}</Badge>
                  ))}
                </div>
              </td>
              <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: "normal", fontSize: 12 }}>
                {l.office_comment && <div style={{ marginBottom: 2 }}>📋 {l.office_comment}</div>}
                {l.mechanic_comment && <div style={{ color: "var(--muted)" }}>🔧 {l.mechanic_comment}</div>}
                {!l.office_comment && !l.mechanic_comment && "—"}
              </td>
              <td style={tdStyle}>
                <div style={{ fontSize: 12 }}>{l.parts_used || "—"}</div>
                {isManager && l.parts_cost > 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    Pirk: €{l.parts_cost.toFixed(0)}
                    {(l as any).parts_sell_price > 0 && ` → Pard: €${(l as any).parts_sell_price.toFixed(0)}`}
                  </div>
                )}
              </td>
              {isManager && (
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>€{(l.repair_cost || 0).toFixed(0)}</span>
                </td>
              )}
              <TimerCell log={l} onRefresh={load} />
              <ActionsCell log={l} onRefresh={load} />
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan={isManager ? 8 : 7} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>
              {filterMechanic === "mine" ? t("mech.noAssigned") : t("mech.noJobs")}
            </td></tr>
          )}
        </Table>
      )}

      {/* Form */}
      <MechanicLogForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        log={editing}
        mechanics={mechanics}
        isManager={isManager}
        myStaffId={myStaffId}
        tenantId={tenantId}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   FORM — with Work Order search + Parts rows
   ═══════════════════════════════════════════════ */
function MechanicLogForm({ open, onClose, onSaved, log, mechanics, isManager, myStaffId, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  log: MechanicLogExt | null; mechanics: StaffMember[]; isManager: boolean;
  myStaffId: string; tenantId: string;
}) {
  const isEdit = !!log;
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"info" | "parts">("info");

  // Work Order search
  const [woSearch, setWoSearch] = useState("");
  const [woResults, setWoResults] = useState<WorkOrder[]>([]);
  const [linkedWo, setLinkedWo] = useState<WorkOrder | null>(null);

  // Fields
  const [mechanicId, setMechanicId] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleCc, setVehicleCc] = useState("");
  const [vehicleKw, setVehicleKw] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [officeComment, setOfficeComment] = useState("");
  const [mechanicComment, setMechanicComment] = useState("");
  const [repairCost, setRepairCost] = useState("0");
  const [workOrderId, setWorkOrderId] = useState<string | null>(null);

  // Parts rows
  const [parts, setParts] = useState<OrderPart[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Load suppliers
  useEffect(() => {
    supabase().from("suppliers").select("id, name").eq("is_active", true).order("name")
      .then(({ data }) => setSuppliers((data || []) as Supplier[]));
  }, [open]);

  // Initialize form
  useEffect(() => {
    if (!open) return;
    if (log) {
      setMechanicId(log.mechanic_id);
      setLogDate(log.log_date);
      setVehicleMake(log.vehicle_make || "");
      setVehicleModel(log.vehicle_model || "");
      setVehiclePlate(log.vehicle_plate || "");
      setVehicleCc(log.vehicle_cc || "");
      setVehicleKw(String(log.vehicle_kw || ""));
      setVehicleYear(String(log.vehicle_year || ""));
      setServices(log.services || []);
      setOfficeComment(log.office_comment || "");
      setMechanicComment(log.mechanic_comment || "");
      setRepairCost(String(log.repair_cost || 0));
      setWorkOrderId(log.work_order_id || null);
      setTab("info");
      // Load parts — always from order_parts by mechanic_log_id
      supabase().from("order_parts").select("*")
        .eq("mechanic_log_id", log.id)
        .order("created_at").then(({ data }) => {
          if (data && data.length > 0) {
            setParts(data as OrderPart[]);
          } else if (log.parts_used) {
            // Fallback: reconstruct from legacy text fields
            setParts([{
              description: log.parts_used,
              supplier: (log as any).parts_supplier || "",
              purchase_price: Number(log.parts_cost) || 0,
              sell_price: Number((log as any).parts_sell_price) || 0,
              quantity: 1,
            }]);
          } else {
            setParts([]);
          }
        });
    } else {
      setMechanicId(myStaffId);
      setLogDate(new Date().toISOString().slice(0, 10));
      setVehicleMake(""); setVehicleModel(""); setVehiclePlate("");
      setVehicleCc(""); setVehicleKw(""); setVehicleYear("");
      setServices([]); setOfficeComment(""); setMechanicComment("");
      setRepairCost("0"); setWorkOrderId(null); setLinkedWo(null);
      setParts([]); setTab("info"); setWoSearch(""); setWoResults([]);
    }
  }, [log, open, myStaffId]);

  // Work Order search
  async function searchWorkOrders(query: string) {
    setWoSearch(query);
    if (query.length < 2) { setWoResults([]); return; }
    // Search by plate through vehicles join
    const { data } = await supabase().from("work_orders")
      .select("*, vehicle:vehicles!inner(make, model, plate)")
      .ilike("vehicle.plate", `%${query}%`)
      .in("status", ["queued", "in_progress"])
      .order("order_date", { ascending: false })
      .limit(10);
    setWoResults((data || []) as WorkOrder[]);
  }

  function selectWorkOrder(wo: WorkOrder) {
    setLinkedWo(wo);
    setWorkOrderId(wo.id);
    setWoSearch("");
    setWoResults([]);
    // Auto-fill from work order
    const v = wo.vehicle;
    if (v) {
      setVehicleMake(v.make || ""); setVehicleModel(v.model || "");
      setVehiclePlate(v.plate || ""); setVehicleCc(v.cc || "");
      setVehicleKw(String(v.kw || "")); setVehicleYear(String(v.year || ""));
    }
    if (wo.services?.length) setServices(wo.services);
    if (wo.client_comment) setOfficeComment(wo.client_comment);
  }

  // Add empty part row
  function addPartRow() {
    setParts(prev => [...prev, { description: "", supplier: "", purchase_price: 0, sell_price: 0, quantity: 1 }]);
  }

  function updatePart(idx: number, field: keyof OrderPart, value: any) {
    setParts(prev => {
      const next = [...prev];
      const p = { ...next[idx], [field]: value };
      // Auto-calc sell price from markup when purchase_price changes
      if (field === "purchase_price") {
        p.sell_price = calcMarkup(Number(value) || 0);
      }
      next[idx] = p;
      return next;
    });
  }

  function removePart(idx: number) {
    setParts(prev => prev.filter((_, i) => i !== idx));
  }

  const totalPartsCost = parts.reduce((s, p) => s + (p.purchase_price || 0) * (p.quantity || 1), 0);
  const totalPartsSell = parts.reduce((s, p) => s + (p.sell_price || 0) * (p.quantity || 1), 0);

  // Save
  async function handleSave() {
    setSaving(true);
    const payload: any = {
      mechanic_id: mechanicId || myStaffId,
      log_date: logDate,
      vehicle_make: vehicleMake || null,
      vehicle_model: vehicleModel || null,
      vehicle_plate: vehiclePlate || null,
      vehicle_cc: vehicleCc || null,
      vehicle_kw: parseFloat(vehicleKw) || null,
      vehicle_year: parseInt(vehicleYear) || null,
      services,
      office_comment: officeComment || null,
      mechanic_comment: mechanicComment || null,
      parts_cost: totalPartsCost,
      parts_sell_price: totalPartsSell,
      parts_used: parts.filter(p => p.description).map(p => p.description).join(", ") || null,
      parts_supplier: parts.filter(p => p.supplier).map(p => p.supplier).filter((v, i, a) => a.indexOf(v) === i).join(", ") || null,
      repair_cost: parseFloat(repairCost) || 0,
      work_order_id: workOrderId || null,
    };

    let logId = log?.id;

    if (isEdit && log) {
      await supabase().from("mechanic_logs").update(payload).eq("id", log.id);
    } else {
      payload.tenant_id = tenantId;
      const { data: inserted } = await supabase().from("mechanic_logs").insert(payload).select("id").single();
      if (inserted) logId = inserted.id;
    }

    // Save parts to order_parts table (always by mechanic_log_id)
    if (logId && parts.length > 0) {
      // Delete existing parts for this log, then re-insert
      await supabase().from("order_parts").delete().eq("mechanic_log_id", logId);
      const partsToInsert = parts.filter(p => p.description.trim()).map(p => ({
        tenant_id: tenantId,
        work_order_id: workOrderId || null,
        mechanic_log_id: logId,
        description: p.description,
        supplier: p.supplier || null,
        supplier_id: p.supplier_id || null,
        purchase_price: p.purchase_price || 0,
        sell_price: p.sell_price || 0,
        quantity: p.quantity || 1,
        added_by: myStaffId || null,
      }));
      if (partsToInsert.length > 0) {
        await supabase().from("order_parts").insert(partsToInsert);
      }
    } else if (logId && parts.length === 0) {
      // If all parts removed, clean up
      await supabase().from("order_parts").delete().eq("mechanic_log_id", logId);
    }

    // Sync totals back to work_order if linked
    if (workOrderId) {
      await supabase().from("work_orders").update({
        parts_cost: totalPartsCost,
        parts_revenue: totalPartsSell,
        repair_cost: parseFloat(repairCost) || 0,
      }).eq("id", workOrderId);
    }

    setSaving(false);
    onSaved();
  }

  const serviceOpts = ALL_SERVICES.map(s => ({ value: s, label: SERVICE_LABELS[s] }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("mech.editWork") : t("mech.newWork")} width={720}>
      {/* Tabs */}
      <Row gap={0} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)" }}>
        {(["info", "parts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: "pointer",
            border: "none", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
            background: "none", color: tab === t ? "var(--accent)" : "var(--muted)",
          }}>
            {t === "info" ? "📋 Informacija" : `🔩 Detalės (${parts.length})`}
          </button>
        ))}
      </Row>

      {tab === "info" && (
        <>
          {/* Work Order linkage */}
          {!isEdit && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                🔗 Susieti su užsakymu (paieška pagal v/n)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text" value={woSearch} onChange={e => searchWorkOrders(e.target.value)}
                  placeholder={t("sch.searchPlate")}
                  style={{
                    width: "100%", padding: "8px 12px", border: "1px solid var(--border)",
                    borderRadius: 8, fontSize: 13, background: "var(--bg)", color: "var(--text)",
                    boxSizing: "border-box",
                  }}
                />
                {woResults.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                    background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
                    maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}>
                    {woResults.map(wo => (
                      <div key={wo.id} onClick={() => selectWorkOrder(wo)} style={{
                        padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                        fontSize: 12,
                      }}>
                        <strong>{wo.vehicle?.plate || "?"}</strong>{" "}
                        {wo.vehicle?.make} {wo.vehicle?.model}{" "}
                        <span style={{ color: "var(--muted)" }}>• {wo.vehicle?.plate || "?"}</span>{" "}
                        <Badge color="#77a8ff">{wo.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {linkedWo && (
                <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--bg)", borderRadius: 6, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>✅ Susietas: <strong>{linkedWo.vehicle?.plate}</strong> — {linkedWo.vehicle?.make} {linkedWo.vehicle?.model}</span>
                  <button onClick={() => { setLinkedWo(null); setWorkOrderId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>✕</button>
                </div>
              )}
            </div>
          )}

          {workOrderId && isEdit && (
            <div style={{ marginBottom: 14, padding: "6px 10px", background: "var(--bg)", borderRadius: 6, fontSize: 12 }}>
              🔗 Susietas su užsakymu
            </div>
          )}

          <Grid cols={2} gap={14}>
            {isManager && (
              <Select label={t("mech.master")} options={mechanics.map(m => ({ value: m.id, label: m.full_name }))}
                value={mechanicId} onChange={e => setMechanicId(e.target.value)} />
            )}
            <Input label={t("c.date")} type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
          </Grid>

          <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 0.5 }}>🚗 AUTOMOBILIS</span>
          </div>
          <Grid cols={3} gap={14}>
            <Input label={t("mech.make")} value={vehicleMake}
              onChange={!isManager && linkedWo ? undefined : (e => setVehicleMake(e.target.value))}
              readOnly={!isManager && !!linkedWo} placeholder="BMW" />
            <Input label={t("veh.model")} value={vehicleModel}
              onChange={!isManager && linkedWo ? undefined : (e => setVehicleModel(e.target.value))}
              readOnly={!isManager && !!linkedWo} placeholder="320d" />
            <Input label={t("mech.plateNr")} value={vehiclePlate}
              onChange={!isManager && linkedWo ? undefined : (e => setVehiclePlate(e.target.value))}
              readOnly={!isManager && !!linkedWo} placeholder="ABC 123" />
          </Grid>
          <Grid cols={3} gap={14}>
            <Input label="CC" value={vehicleCc} onChange={e => setVehicleCc(e.target.value)} placeholder="2000" />
            <Input label="kW" type="number" value={vehicleKw} onChange={e => setVehicleKw(e.target.value)} />
            <Input label={t("veh.year")} type="number" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} />
          </Grid>

          <TagSelect label={t("nav.services")} options={serviceOpts} value={services} onChange={setServices} />

          <Grid cols={2} gap={14}>
            <TextArea label={t("mech.officeComment")} value={officeComment}
              onChange={isManager ? (e => setOfficeComment(e.target.value)) : undefined}
              readOnly={!isManager}
              style={!isManager ? { background: "var(--bg)", opacity: 0.8 } : undefined}
            />
            <TextArea label={t("mech.mechanicComment")} value={mechanicComment} onChange={e => setMechanicComment(e.target.value)} />
          </Grid>

          {isManager && (
            <>
              <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0", paddingTop: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 0.5 }}>💰 FINANSAI</span>
              </div>
              <Grid cols={2} gap={14}>
                <Input label={t("mech.repairPrice")} type="number" value={repairCost} onChange={e => setRepairCost(e.target.value)} />
                <div style={{ padding: "8px 0" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{t("mech.partsTotal")}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    Pirk: €{totalPartsCost.toFixed(2)} → Pard: €{totalPartsSell.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--success)" }}>
                    Marža: €{(totalPartsSell - totalPartsCost).toFixed(2)}
                  </div>
                </div>
              </Grid>
            </>
          )}
        </>
      )}

      {tab === "parts" && (
        <>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t("mech.usedParts")}</span>
            <Btn variant="ghost" onClick={addPartRow} style={{ fontSize: 12 }}>+ Pridėti detalę</Btn>
          </div>

          {parts.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              {t("c.noPartsHint")} "{t("mech.addPart")}".
            </div>
          ) : isManager ? (
            /* ── ADMIN/OWNER view — full parts grid with prices ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 90px 60px 30px", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--muted)", padding: "0 4px" }}>
                <span>{t("c.name")}</span>
                <span>{t("mech.supplier")}</span>
                <span>{t("mech.buyPrice")}</span>
                <span>{t("mech.sellPrice")}</span>
                <span>{t("c.qty")}</span>
                <span></span>
              </div>
              {parts.map((p, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 90px 60px 30px", gap: 8, alignItems: "center" }}>
                  <input value={p.description} onChange={e => updatePart(idx, "description", e.target.value)}
                    placeholder="DPF filtras..." style={inputMiniStyle} />
                  <select value={p.supplier_id || ""} onChange={e => {
                      const sid = e.target.value;
                      const sName = suppliers.find(s => s.id === sid)?.name || "";
                      const updated = [...parts];
                      updated[idx] = { ...updated[idx], supplier_id: sid || undefined, supplier: sName };
                      setParts(updated);
                    }} style={{ ...inputMiniStyle, cursor: "pointer" }}>
                    <option value="">— Tiekėjas —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" value={p.purchase_price || ""} onChange={e => updatePart(idx, "purchase_price", parseFloat(e.target.value) || 0)}
                    placeholder="0" style={inputMiniStyle} />
                  <input type="number" value={p.sell_price || ""} onChange={e => updatePart(idx, "sell_price", parseFloat(e.target.value) || 0)}
                    style={{ ...inputMiniStyle, fontWeight: 600 }} />
                  <input type="number" value={p.quantity} onChange={e => updatePart(idx, "quantity", parseInt(e.target.value) || 1)}
                    min={1} style={inputMiniStyle} />
                  <button onClick={() => removePart(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff6b6b", fontSize: 16 }}>✕</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 90px 60px 30px", gap: 8, padding: "8px 4px", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>
                <span>Viso:</span>
                <span></span>
                <span>€{totalPartsCost.toFixed(2)}</span>
                <span style={{ color: "var(--success)" }}>€{totalPartsSell.toFixed(2)}</span>
                <span></span>
                <span></span>
              </div>
              <div style={{ fontSize: 12, color: "var(--success)", padding: "0 4px" }}>
                Marža: €{(totalPartsSell - totalPartsCost).toFixed(2)} ({totalPartsCost > 0 ? ((totalPartsSell / totalPartsCost - 1) * 100).toFixed(0) : 0}%)
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", padding: "4px 4px 0", fontStyle: "italic" }}>
                * Pardavimo kaina skaičiuojama automatiškai pagal antkainio formulę (×1.18–1.33)
              </div>
            </div>
          ) : (
            /* ── MECHANIC view — no sell price, no margin ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px 70px 30px", gap: 8, fontSize: 11, fontWeight: 600, color: "var(--muted)", padding: "0 4px" }}>
                <span>{t("c.name")}</span>
                <span>{t("mech.supplier")}</span>
                <span>{t("mech.priceEur")}</span>
                <span>{t("c.qty")}</span>
                <span></span>
              </div>
              {parts.map((p, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px 70px 30px", gap: 8, alignItems: "center" }}>
                  <input value={p.description} onChange={e => updatePart(idx, "description", e.target.value)}
                    placeholder="DPF filtras..." style={inputMiniStyle} />
                  <select value={p.supplier_id || ""} onChange={e => {
                      const sid = e.target.value;
                      const sName = suppliers.find(s => s.id === sid)?.name || "";
                      const updated = [...parts];
                      updated[idx] = { ...updated[idx], supplier_id: sid || undefined, supplier: sName };
                      setParts(updated);
                    }} style={{ ...inputMiniStyle, cursor: "pointer" }}>
                    <option value="">— Tiekėjas —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" value={p.purchase_price || ""} onChange={e => updatePart(idx, "purchase_price", parseFloat(e.target.value) || 0)}
                    placeholder="0" style={inputMiniStyle} />
                  <input type="number" value={p.quantity} onChange={e => updatePart(idx, "quantity", parseInt(e.target.value) || 1)}
                    min={1} style={inputMiniStyle} />
                  <button onClick={() => removePart(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff6b6b", fontSize: 16 }}>✕</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px 70px 30px", gap: 8, padding: "8px 4px", borderTop: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>
                <span>Viso:</span>
                <span></span>
                <span>€{totalPartsCost.toFixed(2)}</span>
                <span>{parts.reduce((s, p) => s + (p.quantity || 1), 0)} vnt.</span>
                <span></span>
              </div>
            </div>
          )}
        </>
      )}

      <Row gap={10} style={{ marginTop: 18, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}

const inputMiniStyle: React.CSSProperties = {
  width: "100%", padding: "6px 8px", fontSize: 12,
  border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--bg)", color: "var(--text)",
  boxSizing: "border-box",
};
