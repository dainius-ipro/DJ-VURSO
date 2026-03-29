"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, SERVICE_LABELS, ALL_SERVICES, type ServiceType } from "@/lib/supabase";
import { Btn, Modal, Input, Table, tdStyle, Row, Grid, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

interface ServiceConfig {
  id: string;
  tenant_id: string;
  service_key: string;
  label: string;
  default_price: number;
  is_active: boolean;
  sort_order: number;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceConfig | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!prof) return;
    setTenantId(prof.tenant_id);

    const { data, error } = await supabase()
      .from("service_catalog")
      .select("*")
      .eq("tenant_id", prof.tenant_id)
      .order("sort_order")
      .order("label");

    if (error || !data || data.length === 0) {
      const defaults = ALL_SERVICES.map((key, i) => ({
        id: key,
        tenant_id: prof.tenant_id,
        service_key: key,
        label: SERVICE_LABELS[key],
        default_price: 0,
        is_active: true,
        sort_order: i,
      }));
      setServices(defaults);
    } else {
      setServices(data as ServiceConfig[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function initCatalog() {
    if (!tenantId) return;
    const entries = ALL_SERVICES.map((key, i) => ({
      tenant_id: tenantId,
      service_key: key,
      label: SERVICE_LABELS[key],
      default_price: 0,
      is_active: true,
      sort_order: i,
    }));
    await supabase().from("service_catalog").insert(entries);
    load();
  }

  async function toggleActive(svc: ServiceConfig) {
    const { error } = await supabase()
      .from("service_catalog")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (!error) {
      setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s));
    }
  }

  const isFromDB = services.length > 0 && services[0].id !== services[0].service_key;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("nav.services")}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {!isFromDB && (
            <Btn onClick={initCatalog} style={{ background: "var(--accent-2)", color: "#0a0c10", borderColor: "var(--accent-2)" }}>
              Inicializuoti kataloga
            </Btn>
          )}
          {isFromDB && (
            <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ Nauja paslauga</Btn>
          )}
        </div>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        {isFromDB
          ? "Valdykite paslaugu sarasa - keiskite pavadinimus, kainas, isjunkite nenaudojamas."
          : "Paspauskite \"Inicializuoti kataloga\" kad sukurtumete paslaugu lentele."
        }
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={["#", t("th.code"), t("c.name"), t("c.price"), t("c.status"), ""]}>
          {services.map((svc, idx) => (
            <tr key={svc.id} style={{ opacity: svc.is_active ? 1 : 0.5 }}>
              <td style={{ ...tdStyle, width: 40, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>{idx + 1}</td>
              <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>
                <Badge color="var(--accent)">{svc.service_key}</Badge>
              </td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{svc.label}</td>
              <td style={tdStyle}>{svc.default_price ? `${svc.default_price} EUR` : "-"}</td>
              <td style={tdStyle}>
                {isFromDB ? (
                  <button onClick={() => toggleActive(svc)} style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                  }}>
                    <Badge color={svc.is_active ? "var(--success)" : "var(--danger)"}>
                      {svc.is_active ? t("c.active") : t("c.disabled")}
                    </Badge>
                  </button>
                ) : (
                  <Badge color="var(--success)">{t("c.active")}</Badge>
                )}
              </td>
              <td style={tdStyle}>
                {isFromDB && (
                  <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => { setEditing(svc); setShowForm(true); }}>
                    {"✎"}
                  </Btn>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {isFromDB && (
        <ServiceForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
          service={editing} tenantId={tenantId} />
      )}
    </div>
  );
}

function ServiceForm({ open, onClose, onSaved, service, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  service: ServiceConfig | null; tenantId: string | null;
}) {
  const isEdit = !!service;
  const [saving, setSaving] = useState(false);
  const [serviceKey, setServiceKey] = useState("");
  const [label, setLabel] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  useEffect(() => {
    if (service) {
      setServiceKey(service.service_key); setLabel(service.label);
      setDefaultPrice(String(service.default_price || "")); setSortOrder(String(service.sort_order || "0"));
    } else {
      setServiceKey(""); setLabel(""); setDefaultPrice(""); setSortOrder("99");
    }
  }, [service, open]);

  async function handleSave() {
    if (!label.trim() || !serviceKey.trim()) return;
    setSaving(true);
    const payload: any = {
      service_key: serviceKey.trim().toLowerCase(),
      label: label.trim(),
      default_price: parseFloat(defaultPrice) || 0,
      sort_order: parseInt(sortOrder) || 0,
    };
    if (isEdit && service) {
      await supabase().from("service_catalog").update(payload).eq("id", service.id);
    } else {
      payload.tenant_id = tenantId;
      payload.is_active = true;
      await supabase().from("service_catalog").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("svc_admin.editService") : t("svc_admin.newService")} width={450}>
      <Grid cols={2} gap={14}>
        <Input label={t("c.codeRequired")} value={serviceKey} onChange={(e) => setServiceKey(e.target.value)}
          placeholder="stage" disabled={isEdit} />
        <Input label={t("c.nameRequired")} value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Stage 1" />
      </Grid>
      <Grid cols={2} gap={14}>
        <Input label={t("c.priceEur")} type="number" value={defaultPrice}
          onChange={(e) => setDefaultPrice(e.target.value)} placeholder="200" />
        <Input label={t("c.sorting")} type="number" value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)} placeholder="0" />
      </Grid>
      <Row gap={10} style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving || !label.trim() || !serviceKey.trim()}>
          {saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}
        </Btn>
      </Row>
    </Modal>
  );
}
