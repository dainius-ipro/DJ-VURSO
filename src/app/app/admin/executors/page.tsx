"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Btn, Modal, Input, Table, tdStyle, Row, Grid, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

interface Executor {
  id: string;
  tenant_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_internal: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function AdminExecutorsPage() {
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Executor | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (prof) setTenantId(prof.tenant_id);

    const { data } = await supabase().from("executors").select("*").order("sort_order").order("name");
    setExecutors((data || []) as Executor[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(e: Executor) {
    await supabase().from("executors").update({ is_active: !e.is_active }).eq("id", e.id);
    setExecutors(prev => prev.map(x => x.id === e.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleDelete(e: Executor) {
    if (e.is_internal) { alert(t("c.cannotDeleteInternal")); return; }
    if (!confirm(`Ištrinti "${e.name}"?`)) return;
    await supabase().from("executors").delete().eq("id", e.id);
    setExecutors(prev => prev.filter(x => x.id !== e.id));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("exec.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ Naujas vykdytojas</Btn>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Vykdytojai — įmonės ar partneriai kurie atlieka darbus. Vidinė įmonė žymima ★.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("c.name"), t("th.type"), t("th.contact"), t("c.phone"), t("c.status"), ""]}>
          {executors.map(e => (
            <tr key={e.id} style={{ opacity: e.is_active ? 1 : 0.5 }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>
                {e.is_internal && <span style={{ color: "var(--accent)", marginRight: 6 }}>★</span>}
                {e.name}
              </td>
              <td style={tdStyle}>
                <Badge color={e.is_internal ? "var(--success)" : "var(--accent)"}>
                  {e.is_internal ? t("c.internal") : t("c.partner")}
                </Badge>
              </td>
              <td style={tdStyle}>{e.contact_person || "—"}</td>
              <td style={tdStyle}>{e.phone || "—"}</td>
              <td style={tdStyle}>
                <button onClick={() => toggleActive(e)} style={{
                  background: "none", border: "1px solid var(--border)", borderRadius: 6,
                  padding: "3px 10px", fontSize: 11, cursor: "pointer",
                  color: e.is_active ? "var(--success)" : "var(--muted)",
                }}>
                  {e.is_active ? t("c.active") : t("c.inactive")}
                </button>
              </td>
              <td style={{ ...tdStyle, display: "flex", gap: 4 }}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => { setEditing(e); setShowForm(true); }}>✎</Btn>
                {!e.is_internal && (
                  <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px", color: "var(--danger)" }}
                    onClick={() => handleDelete(e)}>✕</Btn>
                )}
              </td>
            </tr>
          ))}
          {executors.length === 0 && (
            <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>
              Nėra vykdytojų
            </td></tr>
          )}
        </Table>
      )}

      <ExecutorForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        executor={editing} tenantId={tenantId} />
    </div>
  );
}

function ExecutorForm({ open, onClose, onSaved, executor, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  executor: Executor | null; tenantId: string | null;
}) {
  const isEdit = !!executor;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (executor) {
      setName(executor.name); setContactPerson(executor.contact_person || "");
      setPhone(executor.phone || ""); setEmail(executor.email || "");
      setNotes(executor.notes || ""); setIsInternal(executor.is_internal);
      setSortOrder(String(executor.sort_order));
    } else {
      setName(""); setContactPerson(""); setPhone(""); setEmail("");
      setNotes(""); setIsInternal(false); setSortOrder("0");
    }
  }, [executor, open]);

  async function handleSave() {
    if (!name.trim()) { alert("Įveskite pavadinimą"); return; }
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      is_internal: isInternal,
      sort_order: parseInt(sortOrder) || 0,
    };

    if (isEdit && executor) {
      await supabase().from("executors").update(payload).eq("id", executor.id);
    } else {
      payload.tenant_id = tenantId;
      await supabase().from("executors").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("exec.editExecutor") : t("exec.new")} width={480}>
      <Input label={t("c.nameRequired")} value={name} onChange={e => setName(e.target.value)} placeholder="AutoChip Pro" />
      <Grid cols={2} gap={14}>
        <Input label={t("sup.contactPerson")} value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
        <Input label={t("c.phone")} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+370..." />
      </Grid>
      <Grid cols={2} gap={14}>
        <Input label={t("c.email")} value={email} onChange={e => setEmail(e.target.value)} />
        <Input label={t("c.sortOrder")} type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
      </Grid>
      <Input label={t("c.notes")} value={notes} onChange={e => setNotes(e.target.value)} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
        <span style={{ fontSize: 13, color: "var(--text)" }}>Vidinė įmonė (savos pajėgos)</span>
      </label>
      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}
