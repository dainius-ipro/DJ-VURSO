"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Btn, Modal, Input, Select, Row, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────
interface Workshop {
  id: string; name: string; position: number;
  employees: { id: string; staff_id: string; sort_order: number;
    staff: { id: string; full_name: string; role: string } }[];
}

interface ScheduledOp {
  id: string; work_order_id?: string; workshop_id: string; staff_id?: string;
  title: string; operation_type?: string; color: string;
  scheduled_date: string; start_time: string; end_time: string; duration_minutes: number;
  vehicle_plate?: string; vehicle_info?: string; customer_name?: string;
  status: string; notes?: string;
}

interface WOOption {
  id: string; vehicle_plate?: string; vehicle_info?: string;
  customer_name?: string; services?: string[];
}

interface UnscheduledWO {
  id: string;
  vehicle_plate: string;
  vehicle_info: string;
  customer_name: string;
  services: string[];
  status: string;
  created_at: string;
  mechanic_name?: string;
}

// ─── Constants ──────────────────────────────────────
const HOUR_START = 7;
const HOUR_END = 19;
const SLOT_MINUTES = 30;
const SLOT_WIDTH = 70; // px per 30min slot
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES;
const TIMELINE_WIDTH = TOTAL_SLOTS * SLOT_WIDTH;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 50;
const LABEL_WIDTH = 180;

const OP_COLORS = [
  { label: t("clr.blue"), value: "#3b82f6" },
  { label: t("clr.green"), value: "#10b981" },
  { label: t("clr.yellow"), value: "#f59e0b" },
  { label: t("clr.red"), value: "#ef4444" },
  { label: t("clr.purple"), value: "#8b5cf6" },
  { label: t("clr.orange"), value: "#f97316" },
  { label: t("clr.pink"), value: "#ec4899" },
  { label: "Cyan", value: "#06b6d4" },
];

// Service-based colors for auto-coloring operations
const SERVICE_COLOR_MAP: Record<string, string> = {
  stage: "#ef4444", dpf: "#f97316", egr: "#f59e0b", diagnostika: "#3b82f6",
  adblue: "#06b6d4", remontas: "#10b981", glostymas: "#8b5cf6", flaps: "#ec4899",
  dtc: "#6366f1", deze: "#a855f7", kiti: "#6b7280", akle: "#14b8a6",
  evap: "#84cc16", regeneracija: "#eab308", garantinis: "#0ea5e9", aptarnavimas: "#22c55e",
};

function getServiceColor(service: string): string {
  return SERVICE_COLOR_MAP[service] || "#3b82f6";
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function timeToX(t: string): number {
  const mins = timeToMinutes(t);
  const startMins = HOUR_START * 60;
  return ((mins - startMins) / SLOT_MINUTES) * SLOT_WIDTH;
}

function xToTime(x: number): string {
  const startMins = HOUR_START * 60;
  const mins = startMins + (x / SLOT_WIDTH) * SLOT_MINUTES;
  const snapped = Math.round(mins / SLOT_MINUTES) * SLOT_MINUTES;
  return minutesToTime(Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, snapped)));
}

// ─── Main Component ──────────────────────────────────
export default function SchedulerPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [operations, setOperations] = useState<ScheduledOp[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");

  // Create/Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingOp, setEditingOp] = useState<ScheduledOp | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{ workshopId: string; staffId?: string; startTime: string } | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<"employees" | "workshops">("employees");

  // Sidebar — unscheduled orders
  const [showSidebar, setShowSidebar] = useState(true);
  const [unscheduledOrders, setUnscheduledOrders] = useState<UnscheduledWO[]>([]);
  const [sidebarFilter, setSidebarFilter] = useState("");

  // Drag state
  const [draggingWO, setDraggingWO] = useState<UnscheduledWO | null>(null);

  // Calendar feed modal
  const [showCalendar, setShowCalendar] = useState(false);
  const [calStaff, setCalStaff] = useState<{ id: string; full_name: string; role: string }[]>([]);

  // Quick action popup
  const [quickOp, setQuickOp] = useState<ScheduledOp | null>(null);
  const [quickPos, setQuickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging existing operation to another row
  const [draggingOp, setDraggingOp] = useState<ScheduledOp | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (prof) setTenantId(prof.tenant_id);

    const { data: ws } = await supabase()
      .from("workshops")
      .select("id, name, position, employees:workshop_employees(id, staff_id, sort_order, staff:staff(id, full_name, role))")
      .eq("is_active", true)
      .order("position");
    setWorkshops((ws || []) as Workshop[]);

    const { data: ops } = await supabase()
      .from("scheduled_operations")
      .select("*")
      .eq("scheduled_date", selectedDate)
      .order("start_time");
    setOperations((ops || []) as ScheduledOp[]);

    // Load unscheduled work orders (queued, in_progress — not yet on scheduler)
    const scheduledWoIds = (ops || []).map((o: any) => o.work_order_id).filter(Boolean);
    let woQuery = supabase()
      .from("work_orders")
      .select("id, vehicle_plate, services, status, created_at, mechanic_name, vehicle:vehicles(make, model), customer:customers(name)")
      .in("status", ["queued", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50);
    const { data: woData } = await woQuery;
    const unscheduled = (woData || [])
      .filter((wo: any) => !scheduledWoIds.includes(wo.id))
      .map((wo: any) => ({
        id: wo.id,
        vehicle_plate: wo.vehicle_plate || wo.vehicle?.plate || "",
        vehicle_info: `${wo.vehicle?.make || ""} ${wo.vehicle?.model || ""}`.trim(),
        customer_name: wo.customer?.name || "",
        services: wo.services || [],
        status: wo.status,
        created_at: wo.created_at,
        mechanic_name: wo.mechanic_name,
      }));
    setUnscheduledOrders(unscheduled);

    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  function navigateDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  function handleTimelineClick(workshopId: string, staffId: string | undefined, x: number) {
    const startTime = xToTime(x);
    setCreateDefaults({ workshopId, staffId, startTime });
    setEditingOp(null);
    setShowForm(true);
  }

  function handleOpClick(op: ScheduledOp, e?: React.MouseEvent) {
    if (e) {
      setQuickPos({ x: e.clientX, y: e.clientY });
    }
    setQuickOp(op);
  }

  function openEditForm(op: ScheduledOp) {
    setQuickOp(null);
    setEditingOp(op);
    setCreateDefaults(null);
    setShowForm(true);
  }

  const STATUS_FLOW = ["planned", "arrived", "in_progress", "completed", "invoiced", "archived"] as const;
  const STATUS_COLORS: Record<string, string> = {
    planned: "#6b7280", arrived: "#3b82f6", in_progress: "#f59e0b",
    completed: "#10b981", invoiced: "#8b5cf6", archived: "#374151",
  };

  async function quickStatusChange(op: ScheduledOp, newStatus: string) {
    await supabase().from("scheduled_operations").update({ status: newStatus }).eq("id", op.id);
    // Also update linked work order status
    if (op.work_order_id) {
      const woStatusMap: Record<string, string> = {
        arrived: "in_progress", in_progress: "in_progress",
        completed: "done", archived: "archived",
      };
      if (woStatusMap[newStatus]) {
        await supabase().from("work_orders").update({ status: woStatusMap[newStatus] }).eq("id", op.work_order_id);
      }
    }
    setQuickOp(null);
    load();
  }

  // Drop WO from sidebar onto timeline
  async function handleDrop(workshopId: string, staffId: string | undefined, x: number) {
    if (!draggingWO) return;
    const wo = draggingWO;
    setDraggingWO(null);

    const startTime = xToTime(x);
    const startMins = timeToMinutes(startTime);
    const endTime = minutesToTime(startMins + 60);

    // Find staff name
    const ws = workshops.find(w => w.id === workshopId);
    const emp = ws?.employees?.find(e => e.staff?.id === staffId);

    // Pick color based on first service
    const svcColor = getServiceColor(wo.services[0] || "");

    const payload = {
      tenant_id: tenantId,
      work_order_id: wo.id,
      workshop_id: workshopId,
      staff_id: staffId || null,
      title: wo.services[0] || t("c.work"),
      color: svcColor,
      scheduled_date: selectedDate,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      duration_minutes: 60,
      vehicle_plate: wo.vehicle_plate || null,
      vehicle_info: wo.vehicle_info || null,
      customer_name: wo.customer_name || null,
      status: "planned",
    };

    await supabase().from("scheduled_operations").insert(payload);

    // ── Auto-advance WO status: queued → in_progress when dropped on scheduler ──
    if (wo.status === "queued") {
      await supabase().from("work_orders").update({ status: "in_progress" }).eq("id", wo.id);
    }

    load();
  }

  // ── Resize operation (drag edge) ──
  const [resizing, setResizing] = useState<{ opId: string; edge: "left" | "right"; startX: number; origStart: string; origEnd: string } | null>(null);

  function handleResizeStart(e: React.MouseEvent, op: ScheduledOp, edge: "left" | "right") {
    e.stopPropagation();
    e.preventDefault();
    setResizing({ opId: op.id, edge, startX: e.clientX, origStart: op.start_time, origEnd: op.end_time });
  }

  useEffect(() => {
    if (!resizing) return;
    function onMove(e: MouseEvent) {
      if (!resizing) return;
      const dx = e.clientX - resizing.startX;
      const deltaSlots = Math.round(dx / SLOT_WIDTH);
      const deltaMins = deltaSlots * SLOT_MINUTES;

      setOperations(prev => prev.map(op => {
        if (op.id !== resizing.opId) return op;
        if (resizing.edge === "right") {
          const newEnd = minutesToTime(Math.max(timeToMinutes(resizing.origStart) + SLOT_MINUTES, timeToMinutes(resizing.origEnd) + deltaMins));
          return { ...op, end_time: newEnd + ":00", duration_minutes: timeToMinutes(newEnd) - timeToMinutes(op.start_time) };
        } else {
          const newStart = minutesToTime(Math.min(timeToMinutes(resizing.origEnd) - SLOT_MINUTES, timeToMinutes(resizing.origStart) + deltaMins));
          return { ...op, start_time: newStart + ":00", duration_minutes: timeToMinutes(op.end_time) - timeToMinutes(newStart) };
        }
      }));
    }
    async function onUp() {
      if (!resizing) return;
      const op = operations.find(o => o.id === resizing.opId);
      if (op) {
        await supabase().from("scheduled_operations").update({
          start_time: op.start_time, end_time: op.end_time,
          duration_minutes: timeToMinutes(op.end_time) - timeToMinutes(op.start_time),
        }).eq("id", op.id);
      }
      setResizing(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing, operations]);

  // Build rows
  const rows: { workshopId: string; workshopName: string; staffId?: string; staffName: string; role?: string }[] = [];
  if (viewMode === "employees") {
    workshops.forEach(w => {
      const emps = (w.employees || []).sort((a, b) => a.sort_order - b.sort_order);
      if (emps.length === 0) {
        rows.push({ workshopId: w.id, workshopName: w.name, staffName: "—", role: undefined });
      } else {
        emps.forEach(e => {
          rows.push({
            workshopId: w.id, workshopName: w.name,
            staffId: e.staff?.id, staffName: e.staff?.full_name || "?", role: e.staff?.role,
          });
        });
      }
    });
  } else {
    workshops.forEach(w => {
      rows.push({ workshopId: w.id, workshopName: w.name, staffName: w.name });
    });
  }

  // Format date
  const dateObj = new Date(selectedDate + "T12:00:00");
  const dayNames = [t("day.sun"), t("day.mon"), t("day.tue"), t("day.wed"), t("day.thu"), t("day.fri"), t("day.sat")];
  const monthNames = ["sausio", "vasario", "kovo", "balandžio", "gegužės", "birželio", "liepos", "rugpjūčio", "rugsėjo", "spalio", "lapkričio", "gruodžio"];
  const dateLabel = `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} (${selectedDate})`;

  // Now line
  const now = new Date();
  const isToday = selectedDate === now.toISOString().slice(0, 10);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowX = isToday && nowMins >= HOUR_START * 60 && nowMins <= HOUR_END * 60
    ? timeToX(minutesToTime(nowMins))
    : null;

  // Filtered sidebar orders
  const filteredOrders = unscheduledOrders.filter(wo => {
    if (!sidebarFilter) return true;
    const q = sidebarFilter.toLowerCase();
    return wo.vehicle_plate.toLowerCase().includes(q) || wo.vehicle_info.toLowerCase().includes(q) ||
      wo.customer_name.toLowerCase().includes(q) || wo.services.some(s => s.toLowerCase().includes(q));
  });

  return (<>
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 80px)" }}>
      <div style={{ flex: 1, overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📅 Planuoklė</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Btn variant="ghost" style={{ padding: "6px 10px" }} onClick={async () => {
            const { data } = await supabase().from("staff").select("id, full_name, role")
              .eq("tenant_id", tenantId).eq("is_active", true).order("full_name");
            setCalStaff(data || []);
            setShowCalendar(true);
          }}>🗓 Calendar</Btn>
          <Btn variant="ghost" style={{ padding: "6px 10px" }} onClick={() => setViewMode(v => v === "employees" ? "workshops" : "employees")}>
            {viewMode === "employees" ? "👥 Darbuotojai" : "🏭 Vietos"}
          </Btn>
          <Btn variant="ghost" onClick={() => setShowForm(true)}>+ Nauja operacija</Btn>
          <Btn variant="ghost" style={{ padding: "6px 10px", fontWeight: 700 }}
            onClick={() => setShowSidebar(s => !s)}>
            {showSidebar ? "Užsakymai ›" : "‹ Užsakymai"}
          </Btn>
        </div>
      </div>

      {/* Date nav */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
        padding: "10px 16px", background: "var(--card)", borderRadius: 10,
        border: "1px solid var(--border)",
      }}>
        <Btn variant="ghost" style={{ padding: "4px 10px", fontSize: 16 }} onClick={() => navigateDate(-1)}>‹</Btn>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
            padding: "6px 10px", color: "var(--text)", fontSize: 13,
          }} />
        <Btn variant="ghost" style={{ padding: "4px 10px", fontSize: 16 }} onClick={() => navigateDate(1)}>›</Btn>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{dateLabel}</span>
        <Btn variant="ghost" style={{ padding: "4px 8px", fontSize: 11 }}
          onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}>{t("c.today")}</Btn>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : workshops.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t("sch.noWorkshops")}</div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Sukurkite darbo vietas (Box'us) per Admin → Darbo vietos
          </div>
          <a href="/app/admin/workshops" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            → Sukurti darbo vietas
          </a>
        </div>
      ) : (
        <div style={{
          border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
          background: "var(--card)",
        }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: LABEL_WIDTH + TIMELINE_WIDTH, position: "relative" }}>

              {/* Timeline header */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10, background: "var(--card)" }}>
                <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH, padding: "8px 12px", borderRight: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{t("sch.workstation")}</span>
                </div>
                <div style={{ display: "flex", position: "relative" }}>
                  {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                    const mins = HOUR_START * 60 + i * SLOT_MINUTES;
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    const isHour = m === 0;
                    return (
                      <div key={i} style={{
                        width: SLOT_WIDTH, minWidth: SLOT_WIDTH,
                        borderRight: `1px solid ${isHour ? "var(--border)" : "rgba(128,128,128,0.15)"}`,
                        padding: "4px 0", textAlign: "center",
                        fontSize: isHour ? 12 : 10,
                        fontWeight: isHour ? 700 : 400,
                        color: isHour ? "var(--text)" : "var(--muted)",
                        height: HEADER_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isHour ? `${String(h).padStart(2, "0")}` : "30"}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rows */}
              {rows.map((row, rowIdx) => {
                const isFirstOfWorkshop = rowIdx === 0 || rows[rowIdx - 1].workshopId !== row.workshopId;
                const rowOps = operations.filter(op => {
                  if (op.workshop_id !== row.workshopId) return false;
                  if (viewMode === "employees" && row.staffId) return op.staff_id === row.staffId;
                  return true;
                });

                return (
                  <div key={`${row.workshopId}-${row.staffId || rowIdx}`} style={{
                    display: "flex",
                    borderBottom: "1px solid var(--border)",
                    background: rowIdx % 2 === 0 ? "transparent" : "rgba(128,128,128,0.03)",
                  }}>
                    {/* Label */}
                    <div style={{
                      width: LABEL_WIDTH, minWidth: LABEL_WIDTH,
                      borderRight: "1px solid var(--border)",
                      padding: "6px 12px", display: "flex", alignItems: "center", gap: 8,
                      height: ROW_HEIGHT,
                    }}>
                      {isFirstOfWorkshop && viewMode === "employees" && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap" }}>
                          {row.workshopName}
                        </span>
                      )}
                      {viewMode === "employees" && row.staffId && (
                        <>
                          <span style={{
                            width: 22, height: 22, borderRadius: 11,
                            background: getRoleColor(row.role),
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 9, fontWeight: 700,
                          }}>
                            {row.staffName.slice(0, 2).toUpperCase()}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.staffName}
                          </span>
                        </>
                      )}
                      {viewMode === "workshops" && (
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{row.workshopName}</span>
                      )}
                      {viewMode === "employees" && !row.staffId && (
                        <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>{t("sch.noEmployees")}</span>
                      )}
                    </div>

                    {/* Timeline cells */}
                    <div
                      style={{ position: "relative", height: ROW_HEIGHT, flex: 1, minWidth: TIMELINE_WIDTH, cursor: draggingWO ? "copy" : "crosshair" }}
                      onClick={e => {
                        if (draggingWO) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        handleTimelineClick(row.workshopId, row.staffId, x);
                      }}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = e.dataTransfer.types.includes("op-id") ? "move" : "copy";
                        e.currentTarget.style.background = "rgba(59,130,246,0.08)";
                      }}
                      onDragLeave={e => {
                        e.currentTarget.style.background = "";
                      }}
                      onDrop={async e => {
                        e.preventDefault();
                        e.currentTarget.style.background = "";
                        const opId = e.dataTransfer.getData("op-id");
                        if (opId) {
                          // Move existing operation to this row + time
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const newTime = xToTime(x);
                          const op = operations.find(o => o.id === opId);
                          if (op) {
                            const duration = timeToMinutes(op.end_time) - timeToMinutes(op.start_time);
                            const newEnd = minutesToTime(timeToMinutes(newTime) + duration);
                            await supabase().from("scheduled_operations").update({
                              workshop_id: row.workshopId,
                              staff_id: row.staffId || null,
                              start_time: newTime + ":00",
                              end_time: newEnd + ":00",
                            }).eq("id", opId);
                            load();
                          }
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          handleDrop(row.workshopId, row.staffId, x);
                        }
                      }}
                    >
                      {/* Grid lines */}
                      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                        const isHour = i % 2 === 0;
                        return (
                          <div key={i} style={{
                            position: "absolute", left: i * SLOT_WIDTH, top: 0, bottom: 0, width: 1,
                            background: isHour ? "var(--border)" : "rgba(128,128,128,0.1)",
                          }} />
                        );
                      })}

                      {/* Operations */}
                      {rowOps.map(op => {
                        const left = timeToX(op.start_time);
                        const right = timeToX(op.end_time);
                        const width = Math.max(right - left, 30);
                        return (
                          <div
                            key={op.id}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.setData("op-id", op.id);
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onClick={e => { e.stopPropagation(); handleOpClick(op, e); }}
                            style={{
                              position: "absolute", left, top: 3, height: ROW_HEIGHT - 6,
                              width, borderRadius: 6, background: STATUS_COLORS[op.status] || "#6b7280",
                              color: "#fff", fontSize: 10, fontWeight: 600,
                              padding: "2px 8px", overflow: "hidden", whiteSpace: "nowrap",
                              textOverflow: "ellipsis", cursor: "pointer",
                              display: "flex", flexDirection: "column", justifyContent: "center",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                              transition: resizing ? "none" : "opacity 0.15s",
                              opacity: op.status === "archived" ? 0.45 : op.status === "invoiced" ? 0.6 : 1,
                            }}
                            title={`${op.title}\n${op.vehicle_plate || ""} ${op.vehicle_info || ""}\n${op.customer_name || ""}\n${op.start_time?.slice(0,5)}–${op.end_time?.slice(0,5)}`}
                          >
                            {/* Left resize handle */}
                            <div
                              onMouseDown={e => handleResizeStart(e, op, "left")}
                              style={{
                                position: "absolute", left: 0, top: 0, bottom: 0, width: 6,
                                cursor: "ew-resize", borderRadius: "6px 0 0 6px",
                              }}
                            />
                            <div style={{ lineHeight: 1.2 }}>{op.title}</div>
                            {width > 80 && op.vehicle_plate && (
                              <div style={{ fontSize: 9, opacity: 0.8 }}>🚗 {op.vehicle_plate} {op.vehicle_info || ""}</div>
                            )}
                            {width > 120 && op.customer_name && (
                              <div style={{ fontSize: 8, opacity: 0.7 }}>{op.customer_name}</div>
                            )}
                            {/* Right resize handle */}
                            <div
                              onMouseDown={e => handleResizeStart(e, op, "right")}
                              style={{
                                position: "absolute", right: 0, top: 0, bottom: 0, width: 6,
                                cursor: "ew-resize", borderRadius: "0 6px 6px 0",
                              }}
                            />
                          </div>
                        );
                      })}

                      {/* Now line */}
                      {nowX !== null && (
                        <div style={{
                          position: "absolute", left: nowX, top: 0, bottom: 0, width: 2,
                          background: "#ef4444", zIndex: 5, pointerEvents: "none",
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Popup */}
      {quickOp && (
        <div onClick={() => setQuickOp(null)} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed", left: Math.min(quickPos.x, window.innerWidth - 320), top: Math.min(quickPos.y, window.innerHeight - 260),
            zIndex: 999, background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", padding: 14, minWidth: 280,
          }}>
            {/* Header */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{quickOp.title}</div>
              {quickOp.vehicle_plate && <div style={{ fontSize: 12, color: "var(--muted)" }}>🚗 {quickOp.vehicle_plate} {quickOp.vehicle_info}</div>}
              {quickOp.customer_name && <div style={{ fontSize: 12, color: "var(--muted)" }}>👤 {quickOp.customer_name}</div>}
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{quickOp.start_time?.slice(0,5)} — {quickOp.end_time?.slice(0,5)}</div>
            </div>

            {/* Status flow */}
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Statusas</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              {STATUS_FLOW.map(s => {
                const isActive = quickOp.status === s;
                const currentIdx = STATUS_FLOW.indexOf(quickOp.status as any);
                const thisIdx = STATUS_FLOW.indexOf(s);
                const isNext = thisIdx === currentIdx + 1;
                return (
                  <button key={s} onClick={() => quickStatusChange(quickOp, s)} style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: isActive ? `2px solid ${STATUS_COLORS[s]}` : isNext ? `2px solid ${STATUS_COLORS[s]}` : "1px solid var(--border)",
                    background: isActive ? STATUS_COLORS[s] : "transparent",
                    color: isActive ? "#fff" : isNext ? STATUS_COLORS[s] : "var(--muted)",
                    transform: isNext ? "scale(1.05)" : "none",
                    boxShadow: isNext ? `0 0 8px ${STATUS_COLORS[s]}44` : "none",
                  }}>
                    {tStatus(s)}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 10px", flex: 1 }}
                onClick={() => openEditForm(quickOp)}>✎ {t("c.edit")}</Btn>
              <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 10px", color: "var(--danger)" }}
                onClick={async () => {
                  if (!confirm("Ištrinti?")) return;
                  await supabase().from("scheduled_operations").delete().eq("id", quickOp.id);
                  setQuickOp(null); load();
                }}>🗑</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Status Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {STATUS_FLOW.map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLORS[s] }} />
            <span style={{ color: "var(--muted)" }}>{tStatus(s)}</span>
          </div>
        ))}
        {isToday && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
            <div style={{ width: 12, height: 2, background: "#ef4444" }} />
            <span style={{ color: "var(--muted)" }}>{t("sch.now")}</span>
          </div>
        )}
      </div>

      {/* Operation form */}
      <OperationForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingOp(null); setCreateDefaults(null); }}
        onSaved={() => { setShowForm(false); setEditingOp(null); setCreateDefaults(null); load(); }}
        operation={editingOp}
        defaults={createDefaults}
        workshops={workshops}
        selectedDate={selectedDate}
        tenantId={tenantId}
      />
      </div>
      {showSidebar && (
        <div style={{
          width: 300, minWidth: 300, borderLeft: "1px solid var(--border)",
          background: "var(--card)", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
        {/* Sidebar header */}
        <div style={{
          padding: "12px 14px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t("wo.title")}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {unscheduledOrders.length} nesuplanuotų
            </div>
          </div>
          <Btn variant="ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={load}>↻</Btn>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 14px" }}>
          <input
            value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Ieškoti..."
            style={{
              width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6,
              border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Orders list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
          {filteredOrders.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
              {unscheduledOrders.length === 0 ? t("sch.allScheduledEmoji") : t("c.notFoundFilter")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {filteredOrders.map(wo => (
                <div
                  key={wo.id}
                  draggable
                  onDragStart={e => {
                    setDraggingWO(wo);
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", wo.id);
                  }}
                  onDragEnd={() => setDraggingWO(null)}
                  style={{
                    padding: "10px 12px", borderRadius: 8, cursor: "grab",
                    border: "1px solid var(--border)", background: "var(--bg)",
                    transition: "all 0.15s",
                    opacity: draggingWO?.id === wo.id ? 0.4 : 1,
                  }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseOut={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  {/* Vehicle plate badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    {wo.vehicle_plate && (
                      <span style={{
                        padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                        background: "var(--accent)", color: "#fff",
                      }}>
                        {wo.vehicle_plate}
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                      {wo.vehicle_info || "—"}
                    </span>
                  </div>

                  {/* Services */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                    {wo.services.slice(0, 3).map((s, i) => (
                      <span key={i} style={{
                        padding: "1px 6px", borderRadius: 10, fontSize: 10,
                        background: "rgba(59,130,246,0.12)", color: "var(--accent)",
                        fontWeight: 600,
                      }}>
                        {s}
                      </span>
                    ))}
                    {wo.services.length > 3 && (
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>+{wo.services.length - 3}</span>
                    )}
                  </div>

                  {/* Customer + status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {wo.customer_name || t("c.unknownClient")}
                    </span>
                    <span style={{
                      fontSize: 9, padding: "1px 5px", borderRadius: 8, fontWeight: 600,
                      background: wo.status === "queued" ? "rgba(245,158,11,0.15)" :
                        wo.status === "in_progress" ? "rgba(59,130,246,0.15)" : "rgba(107,114,128,0.15)",
                      color: wo.status === "queued" ? "#f59e0b" :
                        wo.status === "in_progress" ? "#3b82f6" : "var(--muted)",
                    }}>
                      {wo.status === "queued" ? tStatus("queued") : wo.status === "in_progress" ? tStatus("in_progress") : wo.status}
                    </span>
                  </div>

                  {/* Drag hint */}
                  <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, textAlign: "center", opacity: 0.6 }}>
                    ⠿ Vilkite ant planuoklės
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    </div>

    {/* Calendar Feed Modal */}
    <Modal open={showCalendar} onClose={() => setShowCalendar(false)} title={"Google Calendar Sync"} width={560}>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        Pridėkite URL į Google Calendar: Settings → Other calendars (+) → From URL. Kalendorius automatiškai atsinaujins.
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Visos operacijos</div>
        <CalUrl url={`https://fmrssaczycxeaadqeduj.supabase.co/functions/v1/calendar-feed?token=${tenantId}`} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Pagal darbuotoją</div>
      {calStaff.map(s => (
        <div key={s.id} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3 }}>
            <Badge color={s.role === "mechanic" ? "#68f3c2" : s.role === "programmer" ? "#ffb347" : "var(--accent)"}>{s.full_name}</Badge>
          </div>
          <CalUrl url={`https://fmrssaczycxeaadqeduj.supabase.co/functions/v1/calendar-feed?token=${tenantId}&staff=${s.id}`} />
        </div>
      ))}

      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <Btn variant="ghost" onClick={() => setShowCalendar(false)}>{t("c.close")}</Btn>
      </Row>
    </Modal>
  </>);
}

/* ── Calendar URL copy component ── */
function CalUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input readOnly value={url} style={{
        flex: 1, padding: "6px 8px", fontSize: 11, fontFamily: "monospace",
        background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
        color: "var(--muted)", cursor: "text",
      }} onFocus={e => e.target.select()} />
      <Btn variant="ghost" style={{ padding: "4px 10px", fontSize: 11, whiteSpace: "nowrap" }}
        onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
        {copied ? "✓" : "Copy"}
      </Btn>
    </div>
  );
}

function getRoleColor(role?: string): string {
  switch (role) {
    case "mechanic": return "#3b82f6";
    case "painter": return "#f59e0b";
    case "programmer": return "#8b5cf6";
    case "washer": return "#10b981";
    case "master": return "#ef4444";
    default: return "#6b7280";
  }
}

// ─── Operation Form ──────────────────────────────────
function OperationForm({ open, onClose, onSaved, operation, defaults, workshops, selectedDate, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  operation: ScheduledOp | null; defaults: { workshopId: string; staffId?: string; startTime: string } | null;
  workshops: Workshop[]; selectedDate: string; tenantId: string;
}) {
  const isEdit = !!operation;
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState("planned");
  const [notes, setNotes] = useState("");

  // WO linking
  const [woSearch, setWoSearch] = useState("");
  const [woResults, setWoResults] = useState<WOOption[]>([]);
  const [linkedWoId, setLinkedWoId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (operation) {
      setTitle(operation.title); setWorkshopId(operation.workshop_id);
      setStaffId(operation.staff_id || ""); setColor(operation.color);
      setStartTime(operation.start_time.slice(0, 5)); setEndTime(operation.end_time.slice(0, 5));
      setVehiclePlate(operation.vehicle_plate || ""); setVehicleInfo(operation.vehicle_info || "");
      setCustomerName(operation.customer_name || ""); setStatus(operation.status);
      setNotes(operation.notes || ""); setLinkedWoId(operation.work_order_id || null);
    } else {
      setTitle(""); setColor("#3b82f6"); setVehiclePlate(""); setVehicleInfo("");
      setCustomerName(""); setStatus("planned"); setNotes(""); setLinkedWoId(null);
      if (defaults) {
        setWorkshopId(defaults.workshopId);
        setStaffId(defaults.staffId || "");
        setStartTime(defaults.startTime);
        const startMins = timeToMinutes(defaults.startTime);
        setEndTime(minutesToTime(startMins + 60));
      } else {
        setWorkshopId(workshops[0]?.id || ""); setStaffId("");
        setStartTime("08:00"); setEndTime("09:00");
      }
    }
  }, [open, operation, defaults, workshops]);

  // Search WO
  useEffect(() => {
    if (!woSearch || woSearch.length < 2) { setWoResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase()
        .from("work_orders")
        .select("id, services, vehicle:vehicles(plate, make, model), customer:customers(name)")
        .or(`vehicle_plate.ilike.%${woSearch}%,mechanic_name.ilike.%${woSearch}%`)
        .limit(5);
      setWoResults((data || []).map((wo: any) => ({
        id: wo.id,
        vehicle_plate: wo.vehicle?.plate,
        vehicle_info: `${wo.vehicle?.make || ""} ${wo.vehicle?.model || ""}`.trim(),
        customer_name: wo.customer?.name,
        services: wo.services,
      })));
    }, 300);
    return () => clearTimeout(t);
  }, [woSearch]);

  function linkWO(wo: WOOption) {
    setLinkedWoId(wo.id);
    setVehiclePlate(wo.vehicle_plate || "");
    setVehicleInfo(wo.vehicle_info || "");
    setCustomerName(wo.customer_name || "");
    if (!title && wo.services?.length) setTitle(wo.services[0]);
    setWoSearch(""); setWoResults([]);
  }

  // Available staff for selected workshop
  const wsEmps = workshops.find(w => w.id === workshopId)?.employees || [];

  async function handleSave() {
    if (!title.trim()) { alert("Įveskite pavadinimą"); return; }
    if (!workshopId) { alert(t("c.selectWorkshop")); return; }
    setSaving(true);

    const payload: any = {
      tenant_id: tenantId,
      work_order_id: linkedWoId || null,
      workshop_id: workshopId,
      staff_id: staffId || null,
      title: title.trim(), color,
      scheduled_date: selectedDate,
      start_time: startTime + ":00", end_time: endTime + ":00",
      duration_minutes: (timeToMinutes(endTime) - timeToMinutes(startTime)),
      vehicle_plate: vehiclePlate || null,
      vehicle_info: vehicleInfo || null,
      customer_name: customerName || null,
      status, notes: notes || null,
    };

    if (isEdit && operation) {
      await supabase().from("scheduled_operations").update(payload).eq("id", operation.id);
    } else {
      await supabase().from("scheduled_operations").insert(payload);
      // ── Auto-advance linked WO status: queued → in_progress ──
      if (linkedWoId) {
        const { data: wo } = await supabase().from("work_orders").select("status").eq("id", linkedWoId).single();
        if (wo?.status === "queued") {
          await supabase().from("work_orders").update({ status: "in_progress" }).eq("id", linkedWoId);
        }
      }
    }

    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!operation || !confirm("Ištrinti šią operaciją?")) return;
    await supabase().from("scheduled_operations").delete().eq("id", operation.id);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("sch.editOp") : t("sch.newOp")} width={520}>
      <Input label={t("c.operation")} value={title} onChange={e => setTitle(e.target.value)} placeholder="Tepalu keitimas, DPF valymas..." />

      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Select label={t("c.workshop")} options={workshops.map(w => ({ value: w.id, label: w.name }))}
            value={workshopId} onChange={e => { setWorkshopId(e.target.value); setStaffId(""); }} />
        </div>
        <div style={{ flex: 1 }}>
          <Select label={t("wo.worker")} options={[
            { value: "", label: "— Nepriskirtas —" },
            ...wsEmps.map(e => ({ value: e.staff?.id || "", label: e.staff?.full_name || "?" })),
          ]} value={staffId} onChange={e => setStaffId(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <Input label={t("c.start")} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ flex: 1 }} />
        <Input label={t("c.end")} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ flex: 1 }} />
      </div>

      {/* Link WO */}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>
          Susieti su užsakymu
        </label>
        {linkedWoId ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12 }}>🔗 {vehiclePlate} {vehicleInfo} — {customerName}</span>
            <button onClick={() => setLinkedWoId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>✕</button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input value={woSearch} onChange={e => setWoSearch(e.target.value)}
              placeholder={t("sch.searchPlate")}
              style={{
                width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 6,
                border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
                boxSizing: "border-box",
              }} />
            {woResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 180, overflowY: "auto",
              }}>
                {woResults.map(wo => (
                  <div key={wo.id} onClick={() => linkWO(wo)} style={{
                    padding: "8px 12px", cursor: "pointer", fontSize: 12,
                    borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontWeight: 600 }}>{wo.vehicle_plate}</span>
                    {" "}{wo.vehicle_info} — {wo.customer_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        <Input label={t("c.plateNr")} value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} style={{ flex: 1 }} />
        <Input label={t("veh.title")} value={vehicleInfo} onChange={e => setVehicleInfo(e.target.value)} style={{ flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <Input label={t("cust.title")} value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ flex: 1 }} />
        <div style={{ flex: 1 }}>
          <Select label={t("c.status")} options={[
            { value: "planned", label: tStatus("planned") },
            { value: "arrived", label: tStatus("arrived") },
            { value: "in_progress", label: tStatus("in_progress") },
            { value: "completed", label: tStatus("completed") },
            { value: "invoiced", label: tStatus("invoiced") },
            { value: "archived", label: tStatus("archived") },
            { value: "cancelled", label: tStatus("cancelled") },
          ]} value={status} onChange={e => setStatus(e.target.value)} />
        </div>
      </div>

      <Input label={t("c.notes")} value={notes} onChange={e => setNotes(e.target.value)} />

      <Row gap={10} style={{ marginTop: 16, justifyContent: "space-between" }}>
        <div>
          {isEdit && (
            <Btn variant="ghost" style={{ color: "var(--danger)" }} onClick={handleDelete}>🗑 Ištrinti</Btn>
          )}
        </div>
        <Row gap={10}>
          <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}
          </Btn>
        </Row>
      </Row>
    </Modal>
  );
}
