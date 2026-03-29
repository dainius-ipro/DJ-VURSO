"use client";

import { useState, useEffect, useCallback } from "react";
import {
  supabase, WorkOrder, SERVICE_LABELS, ServiceType,
  STATUS_LABELS, STATUS_COLORS, OrderStatus,
} from "@/lib/supabase";
import { Badge, Card, StatCard, Grid, Row, Select } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

type WO = WorkOrder & { vehicle?: { make: string; model: string; plate?: string }; customer?: { name: string } };

export default function DashboardPage() {
  const [orders, setOrders] = useState<WO[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("mechanic");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (user) {
      const { data: p } = await supabase().from("profiles").select("role").eq("id", user.id).single();
      if (p) setUserRole(p.role);
    }

    let q = supabase().from("work_orders")
      .select("*, vehicle:vehicles(make, model, plate), customer:customers(name)")
      .order("order_date", { ascending: false })
      .limit(500);

    const today = new Date().toISOString().slice(0, 10);
    if (period === "today") {
      q = q.eq("order_date", today);
    } else if (period === "week") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      q = q.gte("order_date", d.toISOString().slice(0, 10));
    } else if (period === "month") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      q = q.gte("order_date", d.toISOString().slice(0, 10));
    }

    const { data } = await q;
    setOrders((data || []) as WO[]);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const isOwner = userRole === "owner" || userRole === "manager";

  // ── Calculations ──
  const done = orders.filter(o => o.status === "done" || o.status === "archived");
  const active = orders.filter(o => o.status === "in_progress");
  const queued = orders.filter(o => o.status === "queued");

  const totalRevenue = done.reduce((s, o) => s + (o.service_price || 0), 0);
  const totalPartsCost = done.reduce((s, o) => s + (o.parts_cost || 0), 0);
  const totalPartsRev = done.reduce((s, o) => s + (o.parts_revenue || 0), 0);
  const totalRepairCost = done.reduce((s, o) => s + (o.repair_cost || 0), 0);
  const totalProgCost = done.reduce((s, o) => s + (o.programmer_cost || 0), 0);
  const mechanicPayTotal = done.reduce((s, o) => s + (o.mechanic_pay || 0), 0);
  const partsMargin = totalPartsRev - totalPartsCost;
  const grossProfit = totalRevenue + totalPartsRev - totalPartsCost - mechanicPayTotal;
  const paidCount = done.filter(o => o.is_paid).length;
  const unpaidCount = done.filter(o => !o.is_paid).length;

  // Service type breakdown
  const svcCounts: Record<string, number> = {};
  const svcRevenue: Record<string, number> = {};
  done.forEach(o => {
    (o.services || []).forEach(s => {
      svcCounts[s] = (svcCounts[s] || 0) + 1;
      svcRevenue[s] = (svcRevenue[s] || 0) + (o.service_price || 0) / Math.max((o.services || []).length, 1);
    });
  });
  const topServices = Object.entries(svcCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Recent orders (last 10)
  const recent = orders.slice(0, 10);

  // Mechanic leaderboard
  const mechMap: Record<string, { name: string; count: number; revenue: number }> = {};
  done.forEach(o => {
    if (o.mechanic_name) {
      if (!mechMap[o.mechanic_name]) mechMap[o.mechanic_name] = { name: o.mechanic_name, count: 0, revenue: 0 };
      mechMap[o.mechanic_name].count++;
      mechMap[o.mechanic_name].revenue += (o.repair_cost || 0);
    }
  });
  const mechLeaderboard = Object.values(mechMap).sort((a, b) => b.count - a.count);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <Select label="" options={[
          { value: "today", label: t("c.today") },
          { value: "week", label: t("dash.7days") },
          { value: "month", label: t("dash.30days") },
          { value: "all", label: t("dash.everything") },
        ]} value={period} onChange={e => setPeriod(e.target.value as any)}
          style={{ width: 140, marginBottom: 0 }} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <>
          {/* ── Main stats ── */}
          <Grid cols={isOwner ? 5 : 4} gap={10} style={{ marginBottom: 20 }}>
            <StatCard label={t("dash.totalOrders")} value={orders.length} />
            <StatCard label={t("wo.inProgress")} value={active.length} color="var(--accent)" />
            <StatCard label={t("dash.waiting")} value={queued.length} color="#ffb347" />
            <StatCard label={t("wo.completed")} value={done.length} color="var(--success)" />
            {isOwner && <StatCard label={t("wo.revenue")} value={`€${totalRevenue.toFixed(0)}`} color="var(--accent)" />}
          </Grid>

          {/* ── Financial stats (owner only) ── */}
          {isOwner && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--muted)", marginBottom: 10, letterSpacing: 0.5 }}>{t("dash.finances").toUpperCase()}</h3>
              <Grid cols={4} gap={10} style={{ marginBottom: 20 }}>
                <StatCard label={t("wo.partsMargin")} value={`€${partsMargin.toFixed(0)}`} sub={`Pirk: €${totalPartsCost.toFixed(0)} → Pard: €${totalPartsRev.toFixed(0)}`} color="var(--success)" />
                <StatCard label={t("dash.mechanicPay")} value={`€${mechanicPayTotal.toFixed(0)}`} sub={`${t("dash.repairSum")}: €${totalRepairCost.toFixed(0)}`} color="#ff6b6b" />
                <StatCard label={t("dash.grossProfit")} value={`€${grossProfit.toFixed(0)}`} color={grossProfit >= 0 ? "var(--success)" : "#ff6b6b"} />
                <StatCard label={t("dash.payment")} value={`${paidCount}/${paidCount + unpaidCount}`} sub={unpaidCount > 0 ? `⚠ ${unpaidCount} ${t("dash.unpaid")}` : t("dash.allPaid")} color={unpaidCount > 0 ? "#ffb347" : "var(--success)"} />
              </Grid>
            </>
          )}

          {/* ── Two column: Services + Mechanics ── */}
          <Grid cols={2} gap={16} style={{ marginBottom: 20 }}>
            {/* Service type breakdown */}
            <Card>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{t("dash.topServices")}</h3>
              {topServices.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13, padding: 10 }}>{t("c.noData")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {topServices.map(([svc, count]) => {
                    const maxCount = topServices[0][1] as number;
                    const pct = (count / maxCount) * 100;
                    return (
                      <div key={svc} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 600 }}>
                          {SERVICE_LABELS[svc as ServiceType] || svc}
                        </div>
                        <div style={{ flex: 1, height: 20, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)44", borderRadius: 4, minWidth: 2 }} />
                        </div>
                        <div style={{ width: 30, fontSize: 12, fontWeight: 700, textAlign: "right" }}>{count}</div>
                        {isOwner && (
                          <div style={{ width: 60, fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                            €{(svcRevenue[svc] || 0).toFixed(0)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Mechanic leaderboard */}
            <Card>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{t("dash.mechanicActivity")}</h3>
              {mechLeaderboard.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: 13, padding: 10 }}>{t("c.noData")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mechLeaderboard.map((m, i) => (
                    <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 16, width: 28, textAlign: "center" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>{m.count} {t("dash.jobs")}</span>
                      {isOwner && <span style={{ fontSize: 12, fontWeight: 600 }}>€{m.revenue.toFixed(0)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Grid>

          {/* ── Recent orders ── */}
          <Card>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--muted)" }}>{t("dash.recentOrders")}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={thStyle}>{t("c.date")}</th>
                    <th style={thStyle}>{t("veh.title")}</th>
                    <th style={thStyle}>{t("cust.title")}</th>
                    <th style={thStyle}>{t("nav.services")}</th>
                    <th style={thStyle}>{t("c.price")}</th>
                    <th style={thStyle}>{t("c.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(o => (
                    <tr key={o.id}>
                      <td style={tcStyle}>{o.order_date}</td>
                      <td style={tcStyle}>
                        {o.vehicle ? `${o.vehicle.make} ${o.vehicle.model}` : "—"}
                        {o.vehicle?.plate && <span style={{ color: "var(--muted)", marginLeft: 4 }}>{o.vehicle.plate}</span>}
                      </td>
                      <td style={tcStyle}>{o.customer?.name || "—"}</td>
                      <td style={tcStyle}>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {(o.services || []).slice(0, 3).map(s => (
                            <Badge key={s} color="#77a8ff">{SERVICE_LABELS[s as ServiceType] || s}</Badge>
                          ))}
                          {(o.services || []).length > 3 && <Badge color="var(--muted)">+{o.services.length - 3}</Badge>}
                        </div>
                      </td>
                      <td style={{ ...tcStyle, fontWeight: 600 }}>€{(o.service_price || 0).toFixed(0)}</td>
                      <td style={tcStyle}><Badge color={STATUS_COLORS[o.status]}>{STATUS_LABELS[o.status]}</Badge></td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr><td colSpan={6} style={{ ...tcStyle, textAlign: "center", color: "var(--muted)", padding: 20 }}>{t("c.noOrders")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 10px", textAlign: "left", fontSize: 10, color: "var(--muted)",
  fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
};
const tcStyle: React.CSSProperties = {
  padding: "8px 10px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
};
