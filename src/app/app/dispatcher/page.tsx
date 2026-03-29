"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface WO {
  id: string; status: string; order_date: string; services: string[];
  vehicle_plate: string | null; mechanic_name: string | null;
  service_price: number; client_comment: string | null;
  internal_comment: string | null; checked_in_at: string | null;
  customer_name: string | null; customer_phone: string | null;
  make: string | null; model: string | null; plate: string | null;
  sched_start: string | null; sched_end: string | null;
  scheduled_date: string | null; sched_title: string | null;
  staff_name: string | null;
}
type Screen = "default" | "new" | "checkin" | "search";
const SVC_COLORS: Record<string, string> = {
  stage:"#6366f1",dpf:"#f59e0b",egr:"#10b981",diagnostika:"#3b82f6",
  adblue:"#06b6d4",remontas:"#ef4444",glostymas:"#ec4899",flaps:"#8b5cf6",
  dtc:"#f97316",deze:"#14b8a6",kiti:"#6b7280",akle:"#a855f7",
  evap:"#84cc16",regeneracija:"#eab308",garantinis:"#22d3ee",aptarnavimas:"#64748b",
};
const ALL_SERVICES = ["stage","dpf","egr","diagnostika","adblue","remontas","glostymas","flaps","dtc","deze","kiti","akle","evap","regeneracija","garantinis","aptarnavimas"];
function fmtTime(t: string | null) { return t ? t.slice(0, 5) : ""; }
function fmtPhone(p: string | null) { return p ? p.replace(/(\+370)(\d{3})(\d{2})(\d{3})/, "$1 $2 $3 $4") : ""; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDateShort(d: string) { const p = d.split("-"); return p[1] + "-" + p[2]; }
function timeToX(t: string | null): number {
  if (!t) return 5;
  const parts = t.split(":"); const h = parseInt(parts[0]); const m = parseInt(parts[1] || "0");
  const mins = h * 60 + m;
  return Math.max(2, Math.min(95, ((mins - 420) / 660) * 100));
}

export default function DispatcherPage() {
  const [allWOs, setAllWOs] = useState<WO[]>([]);
  const [screen, setScreen] = useState<Screen>("default");
  const [selectedWO, setSelectedWO] = useState<WO | null>(null);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newService, setNewService] = useState("diagnostika");
  const [newTime, setNewTime] = useState("09:00");
  const [newDate, setNewDate] = useState(todayStr());
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [makeSugg, setMakeSugg] = useState<string[]>([]);
  const [modelSugg, setModelSugg] = useState<string[]>([]);
  const [showMakeDD, setShowMakeDD] = useState(false);
  const [showModelDD, setShowModelDD] = useState(false);
  const [allMakes, setAllMakes] = useState<string[]>([]);
  const [allModels, setAllModels] = useState<string[]>([]);
  const [checkinIds, setCheckinIds] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<WO[]>([]);

  useEffect(function hideSidebar() {
    var aside = document.querySelector("aside");
    var main = document.querySelector("main");
    if (aside) (aside as HTMLElement).style.display = "none";
    if (main) { (main as HTMLElement).style.padding = "0"; (main as HTMLElement).style.overflow = "hidden"; }
    return function() {
      if (aside) (aside as HTMLElement).style.display = "";
      if (main) { (main as HTMLElement).style.padding = ""; (main as HTMLElement).style.overflow = ""; }
    };
  }, []);

  var loadData = useCallback(async function() {
    var res = await supabase().from("work_orders")
      .select("*, customer:customers(name, phone), vehicle:vehicles(make, model, plate)")
      .neq("status", "archived").order("order_date", { ascending: false });
    var res2 = await supabase().from("scheduled_operations")
      .select("work_order_id, start_time, end_time, scheduled_date, title, status, staff:staff_id(full_name)")
      .order("start_time");
    var sm: Record<string, any> = {};
    (res2.data || []).forEach(function(s: any) { if (s.work_order_id) sm[s.work_order_id] = s; });
    setAllWOs((res.data || []).map(function(wo: any) {
      var s = sm[wo.id];
      return {
        id: wo.id, status: wo.status, order_date: wo.order_date, services: wo.services || [],
        vehicle_plate: wo.vehicle ? wo.vehicle.plate : wo.vehicle_plate, mechanic_name: wo.mechanic_name,
        service_price: wo.service_price || 0, client_comment: wo.client_comment,
        internal_comment: wo.internal_comment, checked_in_at: wo.checked_in_at,
        customer_name: wo.customer ? wo.customer.name : null, customer_phone: wo.customer ? wo.customer.phone : null,
        make: wo.vehicle ? wo.vehicle.make : null, model: wo.vehicle ? wo.vehicle.model : null,
        plate: wo.vehicle ? wo.vehicle.plate : null,
        sched_start: s ? s.start_time : null, sched_end: s ? s.end_time : null,
        scheduled_date: s ? s.scheduled_date : null, sched_title: s ? s.title : null,
        staff_name: s && s.staff ? s.staff.full_name : null,
      };
    }));
  }, []);

  useEffect(function() { loadData(); }, [loadData]);

  useEffect(function() {
    supabase().from("vehicles").select("make").neq("make", null).then(function(r) {
      var makes = (r.data || []).map(function(v: any) { return v.make; }).filter(Boolean);
      setAllMakes(Array.from(new Set(makes)).sort() as string[]);
    });
  }, []);

  useEffect(function() {
    if (!newMake) { setAllModels([]); return; }
    supabase().from("vehicles").select("model").eq("make", newMake).neq("model", null).then(function(r) {
      var models = (r.data || []).map(function(v: any) { return v.model; }).filter(Boolean);
      setAllModels(Array.from(new Set(models)).sort() as string[]);
    });
  }, [newMake]);

  function onMakeInput(val: string) {
    setNewMake(val);
    if (val.length >= 1) {
      var f = allMakes.filter(function(m) { return m.toLowerCase().startsWith(val.toLowerCase()); });
      setMakeSugg(f); setShowMakeDD(f.length > 0);
    } else setShowMakeDD(false);
  }
  function onModelInput(val: string) {
    setNewModel(val);
    if (val.length >= 1) {
      var f = allModels.filter(function(m) { return m.toLowerCase().startsWith(val.toLowerCase()); });
      setModelSugg(f); setShowModelDD(f.length > 0);
    } else setShowModelDD(false);
  }

  var ganttAll = allWOs.filter(function(w) { return w.status === "queued" || w.status === "in_progress"; });
  var ganttItems = ganttAll.slice().sort(function(a, b) {
    var da = a.scheduled_date || a.order_date; var db = b.scheduled_date || b.order_date;
    return da < db ? 1 : da > db ? -1 : 0;
  });
  var dateSet = new Set(ganttItems.map(function(w) { return w.scheduled_date || w.order_date; }));
  var ganttDates = Array.from(dateSet).sort().reverse();
  var atvyke = allWOs.filter(function(w) { return w.status === "in_progress" && w.checked_in_at; })
    .sort(function(a, b) { return (a.checked_in_at || "") > (b.checked_in_at || "") ? -1 : 1; });
  var checkinable = allWOs.filter(function(w) { return w.status === "queued"; });

  async function saveNewOrder() {
    setSaving(true);
    var customerId: string | null = null;
    if (newPhone) {
      var ex = await supabase().from("customers").select("id").eq("phone", newPhone).single();
      if (ex.data) customerId = ex.data.id;
      else {
        var nc = await supabase().from("customers").insert({ name: "Nezinomas", phone: newPhone, tenant_id: "00000000-0000-0000-0000-000000000001" }).select("id").single();
        if (nc.data) customerId = nc.data.id;
      }
    }
    var veh = await supabase().from("vehicles").insert({ make: newMake, model: newModel, tenant_id: "00000000-0000-0000-0000-000000000001", customer_id: customerId }).select("id").single();
    await supabase().from("work_orders").insert({
      vehicle_id: veh.data ? veh.data.id : null, customer_id: customerId, services: [newService],
      status: "queued", order_date: newDate, tenant_id: "00000000-0000-0000-0000-000000000001",
    });
    setSaving(false); setScreen("default"); setNewMake(""); setNewModel(""); setNewPhone(""); loadData();
  }

  async function saveCheckins() {
    var ids = Array.from(checkinIds);
    for (var i = 0; i < ids.length; i++) {
      await supabase().from("work_orders").update({ status: "in_progress", checked_in_at: new Date().toISOString() }).eq("id", ids[i]);
    }
    setCheckinIds(new Set()); setScreen("default"); loadData();
  }

  async function doSearch(q: string) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    var ql = "%" + q + "%";
    var r1 = await supabase().from("work_orders")
      .select("*, customer:customers(name, phone), vehicle:vehicles(make, model, plate)")
      .neq("status", "archived").or("vehicle_plate.ilike." + ql + ",mechanic_name.ilike." + ql)
      .order("order_date", { ascending: false }).limit(30);
    var r2 = await supabase().from("work_orders")
      .select("*, customer:customers!inner(name, phone), vehicle:vehicles(make, model, plate)")
      .neq("status", "archived").or("name.ilike." + ql + ",phone.ilike." + ql, { referencedTable: "customers" })
      .order("order_date", { ascending: false }).limit(30);
    var all = (r1.data || []).concat(r2.data || []);
    var map = new Map(); all.forEach(function(w: any) { map.set(w.id, w); });
    var unique = Array.from(map.values());
    setSearchResults(unique.map(function(wo: any) {
      return {
        id: wo.id, status: wo.status, order_date: wo.order_date, services: wo.services || [],
        vehicle_plate: wo.vehicle ? wo.vehicle.plate : wo.vehicle_plate, mechanic_name: wo.mechanic_name,
        service_price: wo.service_price || 0, client_comment: wo.client_comment, internal_comment: wo.internal_comment,
        checked_in_at: wo.checked_in_at, customer_name: wo.customer ? wo.customer.name : null,
        customer_phone: wo.customer ? wo.customer.phone : null,
        make: wo.vehicle ? wo.vehicle.make : null, model: wo.vehicle ? wo.vehicle.model : null,
        plate: wo.vehicle ? wo.vehicle.plate : null,
        sched_start: null, sched_end: null, scheduled_date: null, sched_title: null, staff_name: null,
      };
    }));
  }

  var inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #1e2330", background: "#161b24", color: "#e4e7ec", fontSize: 14, outline: "none", boxSizing: "border-box" };
  var btnP: React.CSSProperties = { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "#60a5fa", color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer" };

  return (
    <div style={{ height: "100vh", display: "flex", background: "#0a0c10", color: "#e4e7ec", fontFamily: "'SF Pro Display', -apple-system, sans-serif", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* GANTT TOP */}
        <div style={{ height: "25vh", minHeight: 120, borderBottom: "2px solid #1e2330", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", height: 22, borderBottom: "1px solid #1e233066", flexShrink: 0 }}>
            <div style={{ width: 40, flexShrink: 0, borderRight: "1px solid #1e233066" }} />
            <div style={{ flex: 1, position: "relative" }}>
              {[7, 9, 11, 13, 15, 17].map(function(h) {
                return <span key={h} style={{ position: "absolute", left: ((h - 7) / 11 * 100) + "%", top: 4, fontSize: 9, color: "#374151", fontWeight: 600, transform: "translateX(-50%)" }}>{h}:00</span>;
              })}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {ganttDates.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 11, color: "#374151" }}>Nera aktyviu darbu</div>}
            {ganttDates.map(function(date) {
              var items = ganttItems.filter(function(w) { return (w.scheduled_date || w.order_date) === date; });
              var isToday = date === todayStr();
              return (
                <div key={date} style={{ display: "flex", minHeight: 32, borderBottom: "1px solid #1e233033" }}>
                  <div style={{ width: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isToday ? "#60a5fa" : "#374151", borderRight: "1px solid #1e233066", background: isToday ? "#60a5fa08" : "transparent" }}>{fmtDateShort(date)}</div>
                  <div style={{ flex: 1, position: "relative", minHeight: 32 }}>
                    {items.map(function(wo) {
                      var svc = wo.sched_title || (wo.services || [])[0] || "";
                      var color = SVC_COLORS[svc] || "#6b7280";
                      var label = ((wo.make || "") + " " + ((wo.model || "").slice(0, 6))).trim() || "?";
                      var x = timeToX(wo.sched_start);
                      return (
                        <div key={wo.id} onClick={function() { setSelectedWO(wo); }} style={{ position: "absolute", left: x + "%", top: "50%", transform: "translateY(-50%)", padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: color + "33", color: color, border: "1px solid " + color + "66", whiteSpace: "nowrap", cursor: "pointer", maxWidth: "40%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {label} {svc ? "- " + svc.slice(0, 5) : ""}
                        </div>
                      );
                    })}
                    {isToday && (function() {
                      var now = new Date();
                      var x = timeToX(now.getHours() + ":" + now.getMinutes());
                      return <div style={{ position: "absolute", left: x + "%", top: 0, bottom: 0, width: 1, background: "#ef4444", zIndex: 3 }} />;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM SCREENS */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {screen === "default" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px" }}>Siandien servise - {atvyke.length}</div>
              <div style={{ flex: 1, overflow: "auto", padding: "0 8px 8px" }}>
                {atvyke.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#374151" }}>Dar niekas neatvyko</div>}
                {atvyke.map(function(wo) {
                  return (
                    <div key={wo.id} onClick={function() { setSelectedWO(wo); }} style={{ padding: "10px 12px", borderRadius: 12, background: "#11151c", border: "1px solid #1e2330", marginBottom: 6, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {wo.checked_in_at && <span style={{ fontSize: 11, color: "#6b7280" }}>{new Date(wo.checked_in_at).toLocaleTimeString("lt", { hour: "2-digit", minute: "2-digit" })}</span>}
                          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.5px" }}>{wo.plate || wo.vehicle_plate || "-"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(wo.services || []).slice(0, 2).map(function(s: string) {
                            return <span key={s} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: (SVC_COLORS[s] || "#6b7280") + "22", color: SVC_COLORS[s] || "#6b7280", fontWeight: 700 }}>{s}</span>;
                          })}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                        {wo.make} {wo.model}{wo.customer_phone ? " - " + fmtPhone(wo.customer_phone) : ""}
                      </div>
                    </div>
                  );
                })}

                {/* SEPARATOR */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 8px" }}>
                  <div style={{ flex: 1, height: 1, background: "#1e2330" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Laukia - {checkinable.length}</span>
                  <div style={{ flex: 1, height: 1, background: "#1e2330" }} />
                </div>

                {/* QUEUED / NOT ARRIVED */}
                {checkinable.length === 0 && <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "#374151" }}>Nera laukianciu</div>}
                {checkinable.map(function(wo) {
                  return (
                    <div key={wo.id} onClick={function() { setSelectedWO(wo); }} style={{ padding: "10px 12px", borderRadius: 12, background: "#11151c", border: "1px solid #1e233066", marginBottom: 6, cursor: "pointer", opacity: 0.7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.5px" }}>{wo.plate || wo.vehicle_plate || "-"}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{wo.make} {wo.model}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{wo.order_date ? wo.order_date.slice(5) : ""}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(wo.services || []).slice(0, 2).map(function(s: string) {
                            return <span key={s} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: (SVC_COLORS[s] || "#6b7280") + "22", color: SVC_COLORS[s] || "#6b7280", fontWeight: 700 }}>{s}</span>;
                          })}
                        </div>
                        {wo.sched_start && <span style={{ fontSize: 10, color: "#374151" }}>{fmtTime(wo.sched_start)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {screen === "new" && (
            <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Naujas uzsakymas</span>
                <button onClick={function() { setScreen("default"); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer" }}>X</button>
              </div>
              <div style={{ position: "relative" }}>
                <input placeholder="Gamintojas" value={newMake} onChange={function(e) { onMakeInput(e.target.value); }} onFocus={function() { if (newMake.length >= 1) setShowMakeDD(makeSugg.length > 0); }} onBlur={function() { setTimeout(function() { setShowMakeDD(false); }, 150); }} style={inp} />
                {showMakeDD && makeSugg.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 10, background: "#161b24", border: "1px solid #1e2330", borderRadius: "0 0 10px 10px", maxHeight: 160, overflow: "auto" }}>
                    {makeSugg.map(function(m) { return <div key={m} onMouseDown={function() { setNewMake(m); setShowMakeDD(false); setNewModel(""); }} style={{ padding: "10px 12px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #1e233033" }}>{m}</div>; })}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <input placeholder="Modelis" value={newModel} onChange={function(e) { onModelInput(e.target.value); }} onFocus={function() { if (allModels.length > 0 && !newModel) { setModelSugg(allModels); setShowModelDD(true); } }} onBlur={function() { setTimeout(function() { setShowModelDD(false); }, 150); }} style={inp} />
                {showModelDD && modelSugg.length > 0 && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 10, background: "#161b24", border: "1px solid #1e2330", borderRadius: "0 0 10px 10px", maxHeight: 160, overflow: "auto" }}>
                    {modelSugg.map(function(m) { return <div key={m} onMouseDown={function() { setNewModel(m); setShowModelDD(false); }} style={{ padding: "10px 12px", fontSize: 14, cursor: "pointer", borderBottom: "1px solid #1e233033" }}>{m}</div>; })}
                  </div>
                )}
              </div>
              <select value={newService} onChange={function(e) { setNewService(e.target.value); }} style={inp}>
                {ALL_SERVICES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={newDate} onChange={function(e) { setNewDate(e.target.value); }} style={{ ...inp, flex: 1 }} />
                <input type="time" value={newTime} onChange={function(e) { setNewTime(e.target.value); }} style={{ ...inp, flex: 1 }} />
              </div>
              <input placeholder="Tel nr (neprivalomas)" value={newPhone} onChange={function(e) { setNewPhone(e.target.value); }} type="tel" style={inp} />
            </div>
          )}

          {screen === "checkin" && (
            <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Atvyko</span>
                <button onClick={function() { setScreen("default"); setCheckinIds(new Set()); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer" }}>X</button>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>Pazymekite atvykusius</div>
              <div style={{ flex: 1, overflow: "auto" }}>
                {checkinable.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#374151", fontSize: 12 }}>Nera laukianciu</div>}
                {checkinable.map(function(wo) {
                  var checked = checkinIds.has(wo.id);
                  return (
                    <div key={wo.id} onClick={function() { var n = new Set(checkinIds); if (checked) n.delete(wo.id); else n.add(wo.id); setCheckinIds(n); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: checked ? "#10b98115" : "#11151c", border: checked ? "1px solid #10b98144" : "1px solid #1e2330", marginBottom: 6, cursor: "pointer" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, border: checked ? "2px solid #10b981" : "2px solid #374151", background: checked ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {checked && <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>V</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>
                          {wo.sched_start ? fmtTime(wo.sched_start) + " " : ""}{wo.make || ""} {wo.model || ""}
                        </span>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                          {wo.plate || wo.vehicle_plate || "-"}{(wo.services || []).length > 0 ? " - " + (wo.services || [])[0] : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={saveCheckins} disabled={checkinIds.size === 0} style={{ ...btnP, marginTop: 10, background: "#10b981", opacity: checkinIds.size === 0 ? 0.4 : 1 }}>Issaugot ({checkinIds.size})</button>
            </div>
          )}

          {screen === "search" && (
            <div style={{ flex: 1, overflow: "hidden", padding: 12, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Paieska</span>
                <button onClick={function() { setScreen("default"); setSearchQ(""); setSearchResults([]); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer" }}>X</button>
              </div>
              <input autoFocus value={searchQ} onChange={function(e) { doSearch(e.target.value); }} placeholder="Valst. nr, tel, vardas..." style={{ ...inp, marginBottom: 10 }} />
              <div style={{ flex: 1, overflow: "auto" }}>
                {searchResults.length === 0 && searchQ.length >= 2 && <div style={{ padding: 20, textAlign: "center", color: "#374151", fontSize: 12 }}>Nerasta</div>}
                {searchResults.map(function(wo) {
                  var svc = (wo.services || [])[0] || "";
                  return (
                    <div key={wo.id} onClick={function() { setSelectedWO(wo); }} style={{ padding: "10px 12px", borderRadius: 12, background: "#11151c", border: "1px solid #1e2330", marginBottom: 6, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>{wo.plate || wo.vehicle_plate || "-"}</span>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "#1e2330", color: "#6b7280", fontWeight: 600 }}>
                          {wo.status === "queued" ? "Laukia" : wo.status === "in_progress" ? "Vykdomas" : wo.status === "done" ? "Atliktas" : wo.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{wo.make} {wo.model} {svc ? "- " + svc : ""} - {wo.order_date}</div>
                      {wo.customer_phone && <div style={{ fontSize: 10, color: "#4b5563", marginTop: 1 }}>Tel: {fmtPhone(wo.customer_phone)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT TOOLBAR */}
      <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 12, background: "#11151c", borderLeft: "1px solid #1e2330", paddingBottom: 32, paddingTop: 16 }}>
        <button onClick={function() { if (screen === "new") { saveNewOrder(); } else { setScreen("new"); } }} disabled={screen === "new" && (!newMake || saving)} style={{ width: 42, height: 42, borderRadius: 12, border: "none", cursor: "pointer", fontSize: screen === "new" ? 11 : 20, fontWeight: 800, background: screen === "new" ? "#60a5fa" : "#6366f118", color: screen === "new" ? "#fff" : "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", opacity: (screen === "new" && (!newMake || saving)) ? 0.4 : 1 }}>{screen === "new" ? (saving ? "..." : "Save") : "+"}</button>
        <button onClick={function() { setScreen(screen === "checkin" ? "default" : "checkin"); }} style={{ width: 42, height: 42, borderRadius: 12, border: "none", cursor: "pointer", background: screen === "checkin" ? "#10b981" : "#10b98118", color: screen === "checkin" ? "#fff" : "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button onClick={function() { setScreen(screen === "search" ? "default" : "search"); }} style={{ width: 42, height: 42, borderRadius: 12, border: "none", cursor: "pointer", background: screen === "search" ? "#f59e0b" : "#f59e0b18", color: screen === "search" ? "#fff" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <div style={{ width: 24, height: 1, background: "#1e2330", marginTop: 4 }} />
        <a href="/app" style={{ width: 42, height: 42, borderRadius: 12, border: "1px solid #1e2330", background: "#1e233033", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </a>
      </div>

      {/* DETAIL POPUP */}
      {selectedWO && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={function() { setSelectedWO(null); }}>
          <div style={{ background: "#11151c", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "75vh", overflow: "auto", padding: "20px 16px 34px", border: "1px solid #1e2330", borderBottom: "none" }} onClick={function(e) { e.stopPropagation(); }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", letterSpacing: "1px" }}>{selectedWO.plate || selectedWO.vehicle_plate || "-"}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{selectedWO.make} {selectedWO.model}</div>
              </div>
              <button onClick={function() { setSelectedWO(null); }} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 24, cursor: "pointer" }}>X</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {(selectedWO.services || []).map(function(s: string) {
                return <span key={s} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: (SVC_COLORS[s] || "#6b7280") + "22", color: SVC_COLORS[s] || "#6b7280", fontWeight: 600 }}>{s}</span>;
              })}
            </div>
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {selectedWO.customer_name && selectedWO.customer_name !== "Nezinomas" && <R l="Klientas" v={selectedWO.customer_name} />}
              {selectedWO.customer_phone && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>Telefonas</span>
                  <a href={"tel:" + selectedWO.customer_phone} style={{ fontWeight: 700, color: "#60a5fa", textDecoration: "none" }}>{fmtPhone(selectedWO.customer_phone)}</a>
                </div>
              )}
              {selectedWO.mechanic_name && <R l="Meistras" v={selectedWO.mechanic_name} />}
              <R l="Data" v={selectedWO.order_date} />
              {selectedWO.service_price > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>Kaina</span>
                  <span style={{ fontWeight: 800, color: "#10b981" }}>EUR {selectedWO.service_price}</span>
                </div>
              )}
              {selectedWO.client_comment && <div style={{ fontSize: 12, color: "#9ca3af", background: "#161b24", padding: "8px 10px", borderRadius: 8 }}>Komentaras: {selectedWO.client_comment}</div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {selectedWO.status === "queued" && (
                <button onClick={async function() {
                  await supabase().from("work_orders").update({ status: "in_progress", checked_in_at: new Date().toISOString() }).eq("id", selectedWO.id);
                  setSelectedWO(null); loadData();
                }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Atvyko
                </button>
              )}
              {selectedWO.customer_phone && (
                <a href={"tel:" + selectedWO.customer_phone} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #1e2330", background: "#161b24", color: "#60a5fa", fontWeight: 700, fontSize: 14, textDecoration: "none", textAlign: "center" }}>Skambinti</a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function R(props: { l: string; v: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "#6b7280" }}>{props.l}</span><span style={{ fontWeight: 600 }}>{props.v}</span></div>;
}
