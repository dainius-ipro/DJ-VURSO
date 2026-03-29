"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Btn, Modal, Input, Table, tdStyle, Row, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

interface Workshop {
  id: string;
  tenant_id: string;
  name: string;
  position: number;
  is_active: boolean;
  employees?: WE[];
}

interface WE {
  id: string;
  staff_id: string;
  sort_order: number;
  staff?: { id: string; full_name: string; role: string };
}

interface StaffOption {
  id: string;
  full_name: string;
  role: string;
}

export default function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Workshop | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (prof) setTenantId(prof.tenant_id);

    const { data: ws } = await supabase()
      .from("workshops")
      .select("*, employees:workshop_employees(id, staff_id, sort_order, staff:staff(id, full_name, role))")
      .order("position");
    setWorkshops((ws || []) as Workshop[]);

    const { data: s } = await supabase()
      .from("staff")
      .select("id, full_name, role")
      .eq("is_active", true)
      .order("full_name");
    setStaff((s || []) as StaffOption[]);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(w: Workshop) {
    await supabase().from("workshops").update({ is_active: !w.is_active }).eq("id", w.id);
    load();
  }

  async function handleDelete(w: Workshop) {
    if (!confirm(`Ištrinti "${w.name}"?`)) return;
    await supabase().from("workshops").delete().eq("id", w.id);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("ws.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ Nauja vieta</Btn>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Darbo vietos (Box'ai) naudojamos planuoklėje. Kiekvienai vietai priskiriami darbuotojai.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {workshops.map(w => (
            <div key={w.id} style={{
              border: "1px solid var(--border)", borderRadius: 12, padding: 16,
              background: "var(--card)", opacity: w.is_active ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6, background: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: 13,
                  }}>
                    {w.position}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{w.name}</span>
                  {!w.is_active && <Badge color="var(--muted)">{t("c.inactive")}</Badge>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" style={{ fontSize: 12, padding: "4px 10px" }}
                    onClick={() => { setEditing(w); setShowForm(true); }}>✎ Redaguoti</Btn>
                  <Btn variant="ghost" style={{ fontSize: 12, padding: "4px 10px" }}
                    onClick={() => toggleActive(w)}>
                    {w.is_active ? t("c.deactivate") : t("c.activate")}
                  </Btn>
                  <Btn variant="ghost" style={{ fontSize: 12, padding: "4px 10px", color: "var(--danger)" }}
                    onClick={() => handleDelete(w)}>✕</Btn>
                </div>
              </div>

              {/* Employees */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(w.employees || []).length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>{t("ws.noEmployees")}</span>
                ) : (
                  (w.employees || []).sort((a, b) => a.sort_order - b.sort_order).map(e => (
                    <div key={e.id} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "4px 10px", borderRadius: 20, fontSize: 12,
                      background: "var(--bg)", border: "1px solid var(--border)",
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 11, background: getRoleColor(e.staff?.role),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 10, fontWeight: 700,
                      }}>
                        {(e.staff?.full_name || "?").slice(0, 2).toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 600 }}>{e.staff?.full_name || "?"}</span>
                      <span style={{ color: "var(--muted)" }}>{e.staff?.role || ""}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          {workshops.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
              Nėra darbo vietų. Sukurkite pirmą!
            </div>
          )}
        </div>
      )}

      <WorkshopForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        workshop={editing} staff={staff} tenantId={tenantId} />
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

function WorkshopForm({ open, onClose, onSaved, workshop, staff, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  workshop: Workshop | null; staff: StaffOption[]; tenantId: string | null;
}) {
  const isEdit = !!workshop;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("0");
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (workshop) {
      setName(workshop.name);
      setPosition(String(workshop.position));
      setSelectedStaff((workshop.employees || []).map(e => e.staff_id));
    } else {
      setName(""); setPosition("0"); setSelectedStaff([]);
    }
  }, [workshop, open]);

  function toggleStaff(staffId: string) {
    setSelectedStaff(prev =>
      prev.includes(staffId) ? prev.filter(s => s !== staffId) : [...prev, staffId]
    );
  }

  async function handleSave() {
    if (!name.trim()) { alert("Įveskite pavadinimą"); return; }
    setSaving(true);

    let workshopId = workshop?.id;

    if (isEdit && workshopId) {
      await supabase().from("workshops").update({
        name: name.trim(), position: parseInt(position) || 0,
      }).eq("id", workshopId);
    } else {
      const { data } = await supabase().from("workshops").insert({
        tenant_id: tenantId, name: name.trim(), position: parseInt(position) || 0,
      }).select("id").single();
      workshopId = data?.id;
    }

    if (workshopId) {
      // Sync employees: delete old, insert new
      await supabase().from("workshop_employees").delete().eq("workshop_id", workshopId);
      if (selectedStaff.length > 0) {
        await supabase().from("workshop_employees").insert(
          selectedStaff.map((sid, idx) => ({
            workshop_id: workshopId,
            staff_id: sid,
            tenant_id: tenantId,
            sort_order: idx,
          }))
        );
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("ws.editWorkshop") : t("ws.newWorkshop")} width={480}>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Input label={t("c.nameRequired")} value={name} onChange={e => setName(e.target.value)} placeholder="Box 1" />
        </div>
        <div style={{ width: 100 }}>
          <Input label={t("c.position")} type="number" value={position} onChange={e => setPosition(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 8 }}>
          {t("ws.employees")}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 250, overflowY: "auto" }}>
          {staff.map(s => {
            const selected = selectedStaff.includes(s.id);
            return (
              <div key={s.id} onClick={() => toggleStaff(s.id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                background: selected ? "rgba(59,130,246,0.08)" : "transparent",
                transition: "all 0.15s",
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `2px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                  background: selected ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {selected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{
                  width: 26, height: 26, borderRadius: 13, background: getRoleColor(s.role),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                }}>
                  {s.full_name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.role}</div>
                </div>
              </div>
            );
          })}
          {staff.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              Nėra darbuotojų. Pirmiau pridėkite komandą.
            </div>
          )}
        </div>
      </div>

      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving}>
          {saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}
        </Btn>
      </Row>
    </Modal>
  );
}
