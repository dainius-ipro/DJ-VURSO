"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Customer, ClientSource } from "@/lib/supabase";
import { Btn, Modal, Input, TextArea, Select, Table, tdStyle, Row, Grid, Badge } from "@/components/ui";
import { t } from "@/lib/i18n";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase().from("customers").select("*").order("name");
    if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    const { data } = await q.limit(200);
    setCustomers((data || []) as Customer[]);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("cust.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ {t("cust.new")}</Btn>
      </div>

      <Input label="" placeholder={`🔍 ${t("c.search")}`}
        value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 14 }} />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("c.name"), t("c.phone"), t("c.email"), t("cust.company"), t("th.type"), t("c.notes"), ""]}>
          {customers.map((c) => (
            <tr key={c.id} onClick={() => { setEditing(c); setShowForm(true); }} style={{ cursor: "pointer" }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
              <td style={tdStyle}>{c.phone || "—"}</td>
              <td style={tdStyle}>{c.email || "—"}</td>
              <td style={tdStyle}>{c.company || "—"}</td>
              <td style={tdStyle}>
                <Badge color={c.source === "naujas" ? "var(--accent-2)" : c.source === "senas" ? "var(--accent)" : "#ffb347"}>
                  {c.source === "naujas" ? t("c.typeNew") : c.source === "senas" ? t("c.typeOld") : t("c.partner")}
                </Badge>
              </td>
              <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: "normal", fontSize: 12 }}>{c.notes || "—"}</td>
              <td style={tdStyle}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={(e: any) => { e.stopPropagation(); setEditing(c); setShowForm(true); }}>✎</Btn>
              </td>
            </tr>
          ))}
          {customers.length === 0 && (
            <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>{t("c.noCustomers")}</td></tr>
          )}
        </Table>
      )}

      <CustomerForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }} customer={editing} />
    </div>
  );
}

function CustomerForm({ open, onClose, onSaved, customer }: {
  open: boolean; onClose: () => void; onSaved: () => void; customer: Customer | null;
}) {
  const isEdit = !!customer;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState<ClientSource>("naujas");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<"noName" | "noPhone" | null>(null);

  useEffect(() => {
    if (customer) {
      setName(customer.name); setPhone(customer.phone || "");
      setEmail(customer.email || ""); setCompany(customer.company || "");
      setSource(customer.source); setNotes(customer.notes || "");
    } else {
      setName(""); setPhone(""); setEmail(""); setCompany("");
      setSource("naujas"); setNotes("");
    }
    setShowConfirm(false);
    setConfirmType(null);
    setValidationError("");
  }, [customer, open]);

  const [validationError, setValidationError] = useState("");

  function attemptSave() {
    const hasName = !!name.trim();
    const hasPhone = !!phone.trim();

    // Must have at least one
    if (!hasName && !hasPhone) {
      setValidationError(t("cust.nameOrPhoneRequired"));
      return;
    }
    setValidationError("");

    // Warn if missing one of them (but allow saving after confirm)
    if (!hasName && !showConfirm) {
      setConfirmType("noName");
      setShowConfirm(true);
      return;
    }
    if (!hasPhone && !showConfirm) {
      setConfirmType("noPhone");
      setShowConfirm(true);
      return;
    }
    doSave();
  }

  async function doSave() {
    setSaving(true);
    setShowConfirm(false);
    const payload: any = {
      name: name.trim() || phone.trim(),
      phone: phone || null, email: email || null,
      company: company || null, source, notes: notes || null,
    };

    if (isEdit && customer) {
      await supabase().from("customers").update(payload).eq("id", customer.id);
    } else {
      const { data: { user } } = await supabase().auth.getUser();
      if (user) {
        const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
        if (prof) payload.tenant_id = prof.tenant_id;
      }
      await supabase().from("customers").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("cust.editCustomer") : t("cust.new")} width={500}>
      <Input label={t("c.fullNameLabel")} value={name} onChange={(e) => setName(e.target.value)} />
      <Grid cols={2} gap={14}>
        <Input label={t("c.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+370..." />
        <Input label={t("c.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Grid>
      {validationError && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>
          {validationError}
        </div>
      )}

      {showConfirm && (
        <div style={{ margin: "12px 0", padding: "12px 16px", background: "rgba(255,179,71,0.15)", border: "1px solid #ffb347", borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {confirmType === "noName" ? t("cust.confirmNoName") : t("cust.confirmNoPhone")}
          </div>
          <Row gap={8}>
            <Btn variant="ghost" onClick={() => { setShowConfirm(false); setConfirmType(null); }} style={{ fontSize: 12 }}>
              {t("cust.goBack")}
            </Btn>
            <Btn onClick={doSave} style={{ fontSize: 12 }}>
              {t("cust.saveAnyway")}
            </Btn>
          </Row>
        </div>
      )}

      <Grid cols={2} gap={14}>
        <Input label={t("c.companyLabel")} value={company} onChange={(e) => setCompany(e.target.value)} />
        <Select label={t("c.typeLabel")} options={[
          { value: "naujas", label: t("c.typeNew") }, { value: "senas", label: t("c.typeOld") }, { value: "partneris", label: t("c.partner") },
        ]} value={source} onChange={(e) => setSource(e.target.value as ClientSource)} />
      </Grid>
      <TextArea label={t("c.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Row gap={10} style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={attemptSave} disabled={saving}>{saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}
