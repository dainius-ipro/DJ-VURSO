"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Btn, Modal, Input, Table, tdStyle, Row, Grid, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

/* ── Types ── */
interface MarkupTier { max_price: number; coefficient: number; }
interface PayRule { service_key: string; label: string; pay_percent: number; }
interface JobCategory { id: string; tenant_id: string; name: string; code: string; color: string; sort_order: number; is_active: boolean; }
interface Settings {
  id: string;
  tenant_id: string;
  parts_markup_tiers: MarkupTier[];
  mechanic_pay_rules: PayRule[];
  vat_rate: number;
  company_name: string | null;
  company_code: string | null;
  company_vat_code: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  company_bank_account: string | null;
  company_bank_name: string | null;
}

/* ═══════════════════════════════════════════
   ADMIN SETTINGS PAGE
   ═══════════════════════════════════════════ */
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tab, setTab] = useState<"markup" | "pay" | "categories" | "company" | "theme">("markup");
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<JobCategory | null>(null);

  // ── Editable copies ──
  const [tiers, setTiers] = useState<MarkupTier[]>([]);
  const [payRules, setPayRules] = useState<PayRule[]>([]);
  const [vatRate, setVatRate] = useState("21");
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyVatCode, setCompanyVatCode] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyBank, setCompanyBank] = useState("");
  const [companyBankName, setCompanyBankName] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyPostal, setCompanyPostal] = useState("");
  const [companyCountry, setCompanyCountry] = useState("LT");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  // Theme
  const [themeColors, setThemeColors] = useState<Record<string, string>>({});
  const defaultColors: Record<string, string> = {
    bg: "#0a0c10", panel: "#11151c", "panel-soft": "#171c24", text: "#f4f7ff",
    muted: "#9ea6ba", accent: "#77a8ff", "accent-2": "#31e0d5",
    danger: "#ff6b7f", success: "#68f3c2",
  };
  const themePresets: { name: string; colors: Record<string, string> }[] = [
    { name: "VURSO (numatyta)", colors: { ...defaultColors } },
    { name: "Ocean", colors: { ...defaultColors, accent: "#06b6d4", "accent-2": "#22d3ee", success: "#34d399" } },
    { name: "Purple", colors: { ...defaultColors, accent: "#a78bfa", "accent-2": "#c084fc", success: "#4ade80" } },
    { name: "Warm", colors: { ...defaultColors, accent: "#f59e0b", "accent-2": "#fb923c", success: "#68f3c2", danger: "#ef4444" } },
    { name: "Green", colors: { ...defaultColors, accent: "#22c55e", "accent-2": "#4ade80", success: "#a3e635" } },
    { name: "Rose", colors: { ...defaultColors, accent: "#f472b6", "accent-2": "#fb7185", success: "#68f3c2" } },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!prof) return;
    setTenantId(prof.tenant_id);

    // Settings
    let { data: s } = await supabase().from("tenant_settings").select("*").eq("tenant_id", prof.tenant_id).single();
    if (!s) {
      // Auto-create
      const { data: created } = await supabase().from("tenant_settings").insert({ tenant_id: prof.tenant_id }).select("*").single();
      s = created;
    }
    if (s) {
      setSettings(s as Settings);
      setTiers(s.parts_markup_tiers || []);
      setPayRules(s.mechanic_pay_rules || []);
      setVatRate(String(s.vat_rate || 21));
      setCompanyName(s.company_name || "");
      setCompanyCode(s.company_code || "");
      setCompanyVatCode(s.company_vat_code || "");
      setCompanyAddress(s.company_address || "");
      setCompanyPhone(s.company_phone || "");
      setCompanyEmail(s.company_email || "");
      setCompanyBank(s.company_bank_account || "");
      setCompanyBankName(s.company_bank_name || "");
    }

    // Job categories
    const { data: cats } = await supabase().from("job_categories").select("*")
      .eq("tenant_id", prof.tenant_id).order("sort_order");
    setCategories((cats || []) as JobCategory[]);

    // Theme + Company data from tenants
    const { data: tenant } = await supabase().from("tenants")
      .select("theme_config, company_name, company_code, vat_code, address, city, postal_code, country, phone, email, website, bank_name, bank_account, logo_url")
      .eq("id", prof.tenant_id).single();
    if (tenant?.theme_config && Object.keys(tenant.theme_config).length > 0) {
      setThemeColors(tenant.theme_config);
    } else {
      setThemeColors({ ...defaultColors });
    }
    // Load tenant company fields (override settings if tenant has them)
    if (tenant) {
      if (tenant.company_name) setCompanyName(tenant.company_name);
      if (tenant.company_code) setCompanyCode(tenant.company_code);
      if (tenant.vat_code) setCompanyVatCode(tenant.vat_code);
      if (tenant.address) setCompanyAddress(tenant.address);
      if (tenant.city) setCompanyCity(tenant.city);
      if (tenant.postal_code) setCompanyPostal(tenant.postal_code);
      if (tenant.country) setCompanyCountry(tenant.country);
      if (tenant.phone) setCompanyPhone(tenant.phone);
      if (tenant.email) setCompanyEmail(tenant.email);
      if (tenant.website) setCompanyWebsite(tenant.website);
      if (tenant.bank_name) setCompanyBankName(tenant.bank_name);
      if (tenant.bank_account) setCompanyBank(tenant.bank_account);
      if (tenant.logo_url) setLogoUrl(tenant.logo_url);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save settings ──
  async function saveSettings() {
    if (!settings) return;
    setSaving(true);

    // Sort tiers by max_price ascending
    const sortedTiers = [...tiers].sort((a, b) => a.max_price - b.max_price);

    const { error } = await supabase().from("tenant_settings").update({
      parts_markup_tiers: sortedTiers,
      mechanic_pay_rules: payRules,
      vat_rate: parseFloat(vatRate) || 21,
      company_name: companyName || null,
      company_code: companyCode || null,
      company_vat_code: companyVatCode || null,
      company_address: companyAddress || null,
      company_phone: companyPhone || null,
      company_email: companyEmail || null,
      company_bank_account: companyBank || null,
      company_bank_name: companyBankName || null,
    }).eq("id", settings.id);

    // Also save to tenants table
    if (tenantId) {
      await supabase().from("tenants").update({
        company_name: companyName || null,
        company_code: companyCode || null,
        vat_code: companyVatCode || null,
        address: companyAddress || null,
        city: companyCity || null,
        postal_code: companyPostal || null,
        country: companyCountry || null,
        phone: companyPhone || null,
        email: companyEmail || null,
        website: companyWebsite || null,
        bank_name: companyBankName || null,
        bank_account: companyBank || null,
        logo_url: logoUrl || null,
      }).eq("id", tenantId);
    }

    setSaving(false);
    if (error) {
      alert("Klaida: " + error.message);
    } else {
      alert("✅ Nustatymai išsaugoti");
      setTiers(sortedTiers);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setLogoUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/logo.${ext}`;
    const { error } = await supabase().storage.from("logos").upload(path, file, { upsert: true });
    if (error) {
      alert("Klaida: " + error.message);
      setLogoUploading(false);
      return;
    }
    const { data: urlData } = supabase().storage.from("logos").getPublicUrl(path);
    const url = urlData?.publicUrl + "?t=" + Date.now();
    setLogoUrl(url);
    await supabase().from("tenants").update({ logo_url: url }).eq("id", tenantId);
    setLogoUploading(false);
  }

  // ── Tabs ──
  const tabs = [
    { key: "markup", label: t("set.partsMarkup") },
    { key: "pay", label: t("wo.workerPay") },
    { key: "categories", label: t("set.categories") },
    { key: "company", label: t("set.companyInfo") },
    { key: "theme", label: t("theme.title") },
  ] as const;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>⚙️ Nustatymai</h1>
      </div>

      {/* Tab bar */}
      <Row gap={0} style={{ marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? "var(--accent)" : "var(--muted)",
            borderBottom: tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </Row>

      {/* ═══ MARKUP TIERS ═══ */}
      {tab === "markup" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Detalių pardavimo kaina = pirkimo kaina × koeficientas. Ribos nurodo "iki kokios sumos" taikomas koeficientas.
          </p>

          <Table headers={[t("set.fromEur"), t("set.toEur"), t("set.coefficient"), t("set.example"), ""]}>
            {tiers.map((tier, idx) => {
              const prevMax = idx > 0 ? tiers[idx - 1].max_price : 0;
              const example = Math.round(((prevMax + tier.max_price) / 2) * tier.coefficient * 100) / 100;
              const exampleBase = Math.round((prevMax + tier.max_price) / 2);
              return (
                <tr key={idx}>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>€{prevMax}</span>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={tier.max_price} onChange={e => {
                      const n = [...tiers]; n[idx] = { ...n[idx], max_price: parseFloat(e.target.value) || 0 }; setTiers(n);
                    }} style={{ ...miniInput, width: 90 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" step="0.01" value={tier.coefficient} onChange={e => {
                      const n = [...tiers]; n[idx] = { ...n[idx], coefficient: parseFloat(e.target.value) || 1 }; setTiers(n);
                    }} style={{ ...miniInput, width: 80, fontWeight: 700 }} />
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--muted)" }}>
                    €{exampleBase} → €{example}
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => setTiers(tiers.filter((_, i) => i !== idx))} style={delBtnStyle}>✕</button>
                  </td>
                </tr>
              );
            })}
          </Table>

          <Row gap={10} style={{ marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => setTiers([...tiers, { max_price: 0, coefficient: 1.15 }])}>
              + Pridėti ribą
            </Btn>
          </Row>

          <Row gap={10} style={{ marginTop: 20 }}>
            <div style={{ flex: 1 }}>
              <Input label={t("set.vatRate")} type="number" value={vatRate} onChange={e => setVatRate(e.target.value)} style={{ width: 120 }} />
            </div>
            <Btn onClick={saveSettings} disabled={saving} style={{ alignSelf: "flex-end", marginBottom: 12 }}>
              {saving ? t("c.saving") : `💾 ${t("c.save")}`}
            </Btn>
          </Row>
        </div>
      )}

      {/* ═══ MECHANIC PAY RULES ═══ */}
      {tab === "pay" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Darbuotojo atlygis = remonto kaina × procentas. Galite nustatyti skirtingus procentus pagal paslaugos tipą.
          </p>

          <Table headers={[t("th.code"), t("c.name"), t("set.payPercent"), t("set.exampleRepair"), ""]}>
            {payRules.map((rule, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>
                  <input value={rule.service_key} onChange={e => {
                    const n = [...payRules]; n[idx] = { ...n[idx], service_key: e.target.value }; setPayRules(n);
                  }} style={{ ...miniInput, width: 120 }} />
                </td>
                <td style={tdStyle}>
                  <input value={rule.label} onChange={e => {
                    const n = [...payRules]; n[idx] = { ...n[idx], label: e.target.value }; setPayRules(n);
                  }} style={{ ...miniInput, width: 150 }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" value={rule.pay_percent} onChange={e => {
                    const n = [...payRules]; n[idx] = { ...n[idx], pay_percent: parseFloat(e.target.value) || 0 }; setPayRules(n);
                  }} style={{ ...miniInput, width: 70, fontWeight: 700 }} />
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: "var(--muted)" }}>
                  €100 → €{rule.pay_percent} darbuotojui
                </td>
                <td style={tdStyle}>
                  {rule.service_key !== "default" && (
                    <button onClick={() => setPayRules(payRules.filter((_, i) => i !== idx))} style={delBtnStyle}>✕</button>
                  )}
                </td>
              </tr>
            ))}
          </Table>

          <Row gap={10} style={{ marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => setPayRules([...payRules, { service_key: "", label: "", pay_percent: 50 }])}>
              + Pridėti taisyklę
            </Btn>
            <div style={{ flex: 1 }} />
            <Btn onClick={saveSettings} disabled={saving}>
              {saving ? t("c.saving") : `💾 ${t("c.save")}`}
            </Btn>
          </Row>
        </div>
      )}

      {/* ═══ JOB CATEGORIES ═══ */}
      {tab === "categories" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              Darbuotojų pareigybės naudojamos priskiriant darbuotojus prie užsakymų.
            </p>
            <Btn onClick={() => { setEditingCat(null); setShowCatForm(true); }}>+ Nauja pareigybė</Btn>
          </div>

          <Table headers={[t("c.color"), t("c.name"), t("th.code"), t("th.sortOrder"), t("c.status"), ""]}>
            {categories.map(c => (
              <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
                <td style={tdStyle}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: c.color }} />
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                <td style={tdStyle}><Badge color="var(--muted)">{c.code}</Badge></td>
                <td style={tdStyle}>{c.sort_order}</td>
                <td style={tdStyle}>
                  <button onClick={async () => {
                    await supabase().from("job_categories").update({ is_active: !c.is_active }).eq("id", c.id);
                    setCategories(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
                  }} style={{
                    background: "none", border: "1px solid var(--border)", borderRadius: 6,
                    padding: "3px 10px", fontSize: 11, cursor: "pointer",
                    color: c.is_active ? "var(--success)" : "var(--muted)",
                  }}>
                    {c.is_active ? t("c.active") : t("c.inactive")}
                  </button>
                </td>
                <td style={{ ...tdStyle, display: "flex", gap: 4 }}>
                  <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                    onClick={() => { setEditingCat(c); setShowCatForm(true); }}>✎</Btn>
                  <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px", color: "var(--danger)" }}
                    onClick={async () => {
                      if (!confirm(`Ištrinti "${c.name}"?`)) return;
                      await supabase().from("job_categories").delete().eq("id", c.id);
                      setCategories(prev => prev.filter(x => x.id !== c.id));
                    }}>✕</Btn>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>
                Nėra pareigybių — pridėkite pirmą
              </td></tr>
            )}
          </Table>

          <JobCategoryForm
            open={showCatForm}
            onClose={() => { setShowCatForm(false); setEditingCat(null); }}
            onSaved={() => { setShowCatForm(false); setEditingCat(null); load(); }}
            category={editingCat}
            tenantId={tenantId}
          />
        </div>
      )}

      {/* ═══ COMPANY INFO ═══ */}
      {tab === "company" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            Įmonės duomenys naudojami sąskaitose ir dokumentuose.
          </p>

          {/* Logo */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 100, height: 100, borderRadius: 12, border: "2px dashed var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", background: "var(--bg)", flexShrink: 0,
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: 30, color: "var(--muted)" }}>🏢</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Įmonės logotipas</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>PNG arba SVG, rekomenduojama 200x200px</div>
              <label style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: "var(--accent)", color: "#fff", cursor: "pointer",
                display: "inline-block",
              }}>
                {logoUploading ? "Keliama..." : logoUrl ? "Pakeisti" : "Įkelti logo"}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              </label>
              {logoUrl && (
                <button onClick={() => { setLogoUrl(""); }} style={{
                  marginLeft: 8, padding: "6px 10px", borderRadius: 6, fontSize: 12,
                  background: "none", border: "1px solid var(--border)", color: "var(--danger)", cursor: "pointer",
                }}>Pašalinti</button>
              )}
            </div>
          </div>

          <Grid cols={2} gap={14}>
            <Input label={t("set.companyName")} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="UAB Vimota" />
            <Input label={t("set.companyCode")} value={companyCode} onChange={e => setCompanyCode(e.target.value)} placeholder="123456789" />
          </Grid>
          <Grid cols={2} gap={14}>
            <Input label={t("c.vatPayerCode")} value={companyVatCode} onChange={e => setCompanyVatCode(e.target.value)} placeholder="LT123456789" />
            <Input label={t("c.address")} value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Kauno g. 1" />
          </Grid>
          <Grid cols={3} gap={14}>
            <Input label="Miestas" value={companyCity} onChange={e => setCompanyCity(e.target.value)} placeholder="Vilnius" />
            <Input label="Pašto kodas" value={companyPostal} onChange={e => setCompanyPostal(e.target.value)} placeholder="LT-12345" />
            <Input label="Šalis" value={companyCountry} onChange={e => setCompanyCountry(e.target.value)} placeholder="LT" />
          </Grid>
          <Grid cols={2} gap={14}>
            <Input label={t("c.phone")} value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+370..." />
            <Input label={t("c.email")} value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="info@vimota.lt" />
          </Grid>
          <Grid cols={2} gap={14}>
            <Input label="Svetainė" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="https://vimota.lt" />
            <div />
          </Grid>
          <Grid cols={2} gap={14}>
            <Input label={t("set.bankAccount")} value={companyBank} onChange={e => setCompanyBank(e.target.value)} placeholder="LT12 3456 7890 1234 5678" />
            <Input label={t("set.bankName")} value={companyBankName} onChange={e => setCompanyBankName(e.target.value)} placeholder="Swedbank" />
          </Grid>

          <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 20 }}>
            <Btn onClick={saveSettings} disabled={saving}>
              {saving ? t("c.saving") : `💾 ${t("c.save")}`}
            </Btn>
          </Row>
        </div>
      )}

      {/* ═══ THEME ═══ */}
      {tab === "theme" && (
        <div>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
            {t("theme.colors")}
          </p>

          {/* Presets */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 8, textTransform: "uppercase" }}>{t("theme.preset")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {themePresets.map(p => (
                <button key={p.name} onClick={() => setThemeColors({ ...p.colors })} style={{
                  padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--panel)", cursor: "pointer", fontSize: 12, color: "var(--text)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: p.colors.accent }} />
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: p.colors["accent-2"] }} />
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: p.colors.success }} />
                  </div>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Individual color pickers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {Object.entries(themeColors).map(([key, val]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={val} onChange={e => setThemeColors(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: 32, height: 32, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 0, background: "none" }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{key}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ marginTop: 20, padding: 16, borderRadius: 10, border: "1px solid var(--border)", background: themeColors.bg || "#0a0c10" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: themeColors.muted || "#9ea6ba", marginBottom: 8 }}>PREVIEW</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: themeColors.accent || "#77a8ff", color: "#fff", fontSize: 12, fontWeight: 600 }}>Accent</span>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: themeColors["accent-2"] || "#31e0d5", color: "#000", fontSize: 12, fontWeight: 600 }}>Accent 2</span>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: themeColors.success || "#68f3c2", color: "#000", fontSize: 12, fontWeight: 600 }}>Success</span>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: themeColors.danger || "#ff6b7f", color: "#fff", fontSize: 12, fontWeight: 600 }}>Danger</span>
              <span style={{ padding: "6px 12px", borderRadius: 6, background: themeColors.panel || "#11151c", color: themeColors.text || "#f4f7ff", fontSize: 12, border: `1px solid ${themeColors.muted || "#9ea6ba"}33` }}>Panel</span>
            </div>
          </div>

          <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setThemeColors({ ...defaultColors })}>
              {t("theme.reset")}
            </Btn>
            <Btn onClick={async () => {
              setSaving(true);
              const { error } = await supabase().from("tenants").update({ theme_config: themeColors }).eq("id", tenantId);
              setSaving(false);
              if (error) { alert(t("c.errorPrefix") + ": " + error.message); return; }
              // Apply immediately
              Object.entries(themeColors).forEach(([k, v]) => {
                document.documentElement.style.setProperty(`--${k}`, v);
              });
              alert(`✅ ${t("theme.saved")}`);
            }} disabled={saving}>
              {saving ? t("c.saving") : t("theme.apply")}
            </Btn>
          </Row>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   JOB CATEGORY FORM
   ═══════════════════════════════════════════ */
function JobCategoryForm({ open, onClose, onSaved, category, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  category: JobCategory | null; tenantId: string | null;
}) {
  const isEdit = !!category;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#77a8ff");
  const [sortOrder, setSortOrder] = useState("0");

  useEffect(() => {
    if (category) {
      setName(category.name); setCode(category.code);
      setColor(category.color); setSortOrder(String(category.sort_order));
    } else {
      setName(""); setCode(""); setColor("#77a8ff"); setSortOrder("0");
    }
  }, [category, open]);

  // Auto-generate code from name
  useEffect(() => {
    if (!isEdit && name && !code) {
      setCode(name.toLowerCase().replace(/[^a-z0-9ąčęėįšųūž]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, ""));
    }
  }, [name, isEdit, code]);

  async function handleSave() {
    if (!name.trim()) { alert("Įveskite pavadinimą"); return; }
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      code: code.trim() || name.toLowerCase().replace(/\s+/g, "_"),
      color,
      sort_order: parseInt(sortOrder) || 0,
    };

    if (isEdit && category) {
      await supabase().from("job_categories").update(payload).eq("id", category.id);
    } else {
      payload.tenant_id = tenantId;
      await supabase().from("job_categories").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  const presetColors = ["#68f3c2", "#77a8ff", "#ffb347", "#ff6b6b", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#9ea6ba"];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("set.editCategory") : t("set.newCategory")} width={420}>
      <Input label={t("c.nameRequired")} value={name} onChange={e => setName(e.target.value)} placeholder="Dažytojas" />
      <Grid cols={2} gap={14}>
        <Input label={t("svc_admin.key")} value={code} onChange={e => setCode(e.target.value)} placeholder="painter" />
        <Input label={t("c.sortOrder")} type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
      </Grid>

      {/* Color picker */}
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4, marginTop: 10 }}>{t("c.color")}</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {presetColors.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 28, height: 28, borderRadius: 6, background: c, border: c === color ? "2px solid var(--text)" : "2px solid transparent",
            cursor: "pointer",
          }} />
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width: 28, height: 28, border: "none", padding: 0, cursor: "pointer", borderRadius: 6 }} />
      </div>

      <Row gap={10} style={{ justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving}>{saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}</Btn>
      </Row>
    </Modal>
  );
}

/* ── Shared styles ── */
const miniInput: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--bg)", color: "var(--text)", fontSize: 13,
};

const delBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 14, padding: "4px",
};
