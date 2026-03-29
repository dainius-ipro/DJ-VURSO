"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Btn, Modal, Input, Table, tdStyle, Row, Grid, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
}

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (prof) setTenantId(prof.tenant_id);

    const { data } = await supabase().from("suppliers")
      .select("*").order("name", { ascending: true });
    setSuppliers((data || []) as Supplier[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(s: Supplier) {
    await supabase().from("suppliers").update({ is_active: !s.is_active }).eq("id", s.id);
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function handleDelete(s: Supplier) {
    if (!confirm(`Ištrinti tiekėją "${s.name}"?`)) return;
    await supabase().from("suppliers").delete().eq("id", s.id);
    setSuppliers(prev => prev.filter(x => x.id !== s.id));
  }

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person || "").toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = suppliers.filter(s => s.is_active).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("sup.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ Naujas tiekėjas</Btn>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        Tiekėjų sąrašas naudojamas detalių užsakymuose. Aktyvūs: {activeCount} / {suppliers.length}
      </p>

      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <input placeholder={t("c.search")} value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--panel)", color: "var(--text)", fontSize: 13, outline: "none" }} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("c.name"), t("th.contact"), t("c.phone"), t("c.email"), t("c.status"), ""]}>
          {filtered.map(s => (
            <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.5 }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{s.name}</td>
              <td style={tdStyle}>{s.contact_person || "—"}</td>
              <td style={tdStyle}>{s.phone || "—"}</td>
              <td style={tdStyle}>{s.email || "—"}</td>
              <td style={tdStyle}>
                <button onClick={() => toggleActive(s)} style={{
                  background: "none", border: "1px solid var(--border)", borderRadius: 6,
                  padding: "3px 10px", fontSize: 11, cursor: "pointer",
                  color: s.is_active ? "var(--success)" : "var(--muted)",
                }}>
                  {s.is_active ? t("c.active") : t("c.inactive")}
                </button>
              </td>
              <td style={{ ...tdStyle, display: "flex", gap: 4 }}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => { setEditing(s); setShowForm(true); }}>✎</Btn>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px", color: "var(--danger)" }}
                  onClick={() => handleDelete(s)}>✕</Btn>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>
              {search ? t("c.notFound") : t("c.noSuppliersAdd")}
            </td></tr>
          )}
        </Table>
      )}

      <SupplierForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        supplier={editing} tenantId={tenantId} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPPLIER FORM
   ═══════════════════════════════════════════ */
function SupplierForm({ open, onClose, onSaved, supplier, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void; supplier: Supplier | null; tenantId: string | null;
}) {
  const isEdit = !!supplier;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || "");
      setContactPerson(supplier.contact_person || "");
      setPhone(supplier.phone || "");
      setEmail(supplier.email || "");
      setWebsite(supplier.website || "");
      setAddress(supplier.address || "");
      setNotes(supplier.notes || "");
    } else {
      setName(""); setContactPerson(""); setPhone(""); setEmail("");
      setWebsite(""); setAddress(""); setNotes("");
    }
  }, [supplier, open]);

  async function handleSave() {
    if (!name.trim()) { alert("Įveskite pavadinimą"); return; }
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      contact_person: contactPerson || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      address: address || null,
      notes: notes || null,
    };

    if (isEdit && supplier) {
      await supabase().from("suppliers").update(payload).eq("id", supplier.id);
    } else {
      payload.tenant_id = tenantId;
      await supabase().from("suppliers").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("sup.editSupplier") : t("sup.new")} width={520}>
      <Grid cols={2}>
        <Input label={t("c.nameRequired")} value={name} onChange={e => setName(e.target.value)} />
        <Input label={t("sup.contactPerson")} value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
      </Grid>
      <Grid cols={2}>
        <Input label={t("c.phone")} value={phone} onChange={e => setPhone(e.target.value)} />
        <Input label={t("c.email")} value={email} onChange={e => setEmail(e.target.value)} />
      </Grid>
      <Grid cols={2}>
        <Input label={t("c.websiteLabel")} value={website} onChange={e => setWebsite(e.target.value)} />
        <Input label={t("c.address")} value={address} onChange={e => setAddress(e.target.value)} />
      </Grid>
      <Input label={t("c.notes")} value={notes} onChange={e => setNotes(e.target.value)} />
      <Row style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}
