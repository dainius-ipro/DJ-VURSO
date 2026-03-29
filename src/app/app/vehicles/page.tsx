"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase, Vehicle, Customer } from "@/lib/supabase";
import { Btn, Modal, Input, TextArea, Select, Table, tdStyle, Row, Grid } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<(Vehicle & { customer?: Customer })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase().from("vehicles").select("*, customer:customers(*)").order("make");
    if (search) q = q.or(`make.ilike.%${search}%,model.ilike.%${search}%,plate.ilike.%${search}%`);
    const { data } = await q.limit(200);
    setVehicles((data || []) as any[]);

    const { data: custs } = await supabase().from("customers").select("*").order("name");
    setCustomers((custs || []) as Customer[]);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🚗 Automobiliai</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ Naujas automobilis</Btn>
      </div>

      <Input label="" placeholder="🔍 Ieškoti pagal gamintoją, modelį, valst. nr..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 14 }} />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("th.make"), t("th.model"), t("th.plate"), t("th.cc"), t("th.kw"), t("th.year"), t("th.mileage"), t("th.owner"), ""]}>
          {vehicles.map((v) => (
            <tr key={v.id} onClick={() => { setEditing(v); setShowForm(true); }} style={{ cursor: "pointer" }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{v.make}</td>
              <td style={tdStyle}>{v.model}</td>
              <td style={{ ...tdStyle, fontWeight: 600, color: "var(--accent)" }}>{v.plate || "—"}</td>
              <td style={tdStyle}>{v.cc || "—"}</td>
              <td style={tdStyle}>{v.kw || "—"}</td>
              <td style={tdStyle}>{v.year || "—"}</td>
              <td style={tdStyle}>{v.mileage ? `${v.mileage.toLocaleString()} km` : "—"}</td>
              <td style={tdStyle}>{v.customer?.name || "—"}</td>
              <td style={tdStyle}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={(e: any) => { e.stopPropagation(); setEditing(v); setShowForm(true); }}>✎</Btn>
              </td>
            </tr>
          ))}
          {vehicles.length === 0 && (
            <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>{t("c.noVehicles")}</td></tr>
          )}
        </Table>
      )}

      <VehicleForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }} vehicle={editing} customers={customers} />
    </div>
  );
}

function VehicleForm({ open, onClose, onSaved, vehicle, customers }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  vehicle: Vehicle | null; customers: Customer[];
}) {
  const isEdit = !!vehicle;
  const [saving, setSaving] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [cc, setCc] = useState("");
  const [kw, setKw] = useState("");
  const [year, setYear] = useState("");
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [decodeMsg, setDecodeMsg] = useState<string | null>(null);
  // Vincario extra decoded fields (not stored in DB, just display)
  const [vinData, setVinData] = useState<Record<string, string>>({});

  // ── Make/Model autocomplete ──
  const [makeSuggestions, setMakeSuggestions] = useState<string[]>([]);
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [showMakeList, setShowMakeList] = useState(false);
  const [showModelList, setShowModelList] = useState(false);
  const [dbRef, setDbRef] = useState<any>(null);

  useEffect(() => {
    import("@/lib/vehicle_db").then(mod => setDbRef(mod)).catch(() => {});
  }, []);

  function handleMakeInput(val: string) {
    setMake(val);
    setModel("");
    if (dbRef && val.length >= 1) {
      setMakeSuggestions(dbRef.searchMakes(val).slice(0, 10));
      setShowMakeList(true);
    } else if (dbRef && val === "") {
      setMakeSuggestions(dbRef.getAllMakes().slice(0, 15));
      setShowMakeList(true);
    } else {
      setShowMakeList(false);
    }
  }

  function pickMake(m: string) {
    setMake(m);
    setShowMakeList(false);
    if (dbRef) {
      setModelSuggestions(dbRef.getModelsForMake(m));
      setShowModelList(true);
    }
  }

  function handleModelInput(val: string) {
    setModel(val);
    if (dbRef && make) {
      setModelSuggestions(dbRef.searchModels(make, val).slice(0, 12));
      setShowModelList(true);
    }
  }

  function pickModel(m: string) {
    setModel(m);
    setShowModelList(false);
  }

  const acStyle: React.CSSProperties = {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
    background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
    marginTop: 2, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", maxHeight: 200,
    overflowY: "auto",
  };
  const acItemStyle: React.CSSProperties = {
    display: "block", width: "100%", padding: "7px 12px", background: "none",
    border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: "var(--text)",
  };
  const [custSearch, setCustSearch] = useState("");
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustCompany, setNewCustCompany] = useState("");
  const [creatingCust, setCreatingCust] = useState(false);

  async function sha1hex(str: string): Promise<string> {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function decodeVinVincario(): Promise<boolean> {
    const apiKey = process.env.NEXT_PUBLIC_VINCARIO_API_KEY;
    const secretKey = process.env.NEXT_PUBLIC_VINCARIO_SECRET_KEY;
    if (!apiKey || !secretKey) return false;

    try {
      const vinUpper = vin.trim().toUpperCase();
      const controlRaw = `${vinUpper}|decode|${apiKey}|${secretKey}`;
      const controlSum = (await sha1hex(controlRaw)).substring(0, 10);
      const url = `https://api.vincario.com/3.2/${apiKey}/${controlSum}/decode/${vinUpper}.json`;
      
      const res = await fetch(url);
      if (!res.ok) return false;
      const json = await res.json();
      
      let d: Record<string, string | number | null> = {};
      const decodeArr = json.decode;
      if (Array.isArray(decodeArr)) {
        for (const item of decodeArr) {
          if (item.label && item.value !== undefined && item.value !== null && item.value !== "") {
            d[item.label] = item.value;
          }
        }
      } else { return false; }

      if (!d["Make"]) return false;

      const v = (label: string): string | null => {
        const val = d[label];
        if (val === null || val === undefined || val === "") return null;
        return String(val);
      };

      let filled: string[] = [];

      const mk = v("Make"); if (mk) { setMake(mk); filled.push("gamintojas"); }
      const md = v("Model");
      if (md) {
        let s = md; const tr = v("Trim"); if (tr) s += ` ${tr}`;
        setModel(s); filled.push("modelis");
      }
      const yr = v("Model Year"); if (yr) { setYear(yr); filled.push("metai"); }
      const ccm = v("Engine Displacement (ccm)");
      if (ccm) { setCc(String(Math.round(parseFloat(ccm.replace(/,/g, ""))))); filled.push("cc"); }
      const kwV = v("Engine Power (kW)");
      if (kwV) { setKw(String(Math.round(parseFloat(kwV.replace(/,/g, ""))))); filled.push("kW"); }
      else { const hp = v("Engine Power (HP)"); if (hp) { setKw(String(Math.round(parseFloat(hp.replace(/,/g, "")) * 0.7457))); filled.push("kW"); } }

      // Store all Vincario data for display
      const extra: Record<string, string> = {};
      const map: [string, string][] = [
        ["Fuel Type - Primary", "Kuras"], ["Drive", "Pavara"], ["Engine Code", "Variklio kodas"],
        ["Engine Model", "Variklis"], ["Transmission", "Pavarų dėžė"], ["Transmission (full)", "Transmisija"],
        ["Number of Gears", "Pavaros"], ["Body", "Kėbulas"], ["Variant", "Variantas"], ["Version", "Versija"],
        ["Number of Doors", "Durys"], ["Number of Seats", "Vietos"], ["Made", "Pagaminta"],
        ["Emission Standard", "Emisija"], ["Engine Power (HP)", "AG"], ["Engine Cylinders", "Cilindrai"],
        ["Engine Turbine", "Turbina"], ["Fuel Capacity (l)", "Bako talpa (l)"],
        ["Weight Empty (kg)", "Svoris (kg)"], ["Max Speed (km/h)", "Max greitis (km/h)"],
        ["Steering", "Vairas"], ["Engine (full)", "Variklis (pilnas)"],
        ["Fuel Consumption Combined (l/100km)", "Sąnaudos (l/100km)"],
        ["Production Started", "Gamyba nuo"], ["Production Stopped", "Gamyba iki"],
      ];
      const plantCountry = v("Plant Country"); const plantCity = v("Plant City");
      if (plantCountry) extra["Gaminta"] = (plantCity ? plantCity + ", " : "") + plantCountry;
      for (const [key, lt] of map) { const val = v(key); if (val) extra[lt] = val; }
      setVinData(extra);

      // Also write key info to notes
      const noteItems: string[] = [];
      for (const [lt, val] of Object.entries(extra)) noteItems.push(`${lt}: ${val}`);
      if (noteItems.length > 0) {
        const existing = notes ? notes + "\n" : "";
        setNotes(existing + "VIN (Vincario): " + noteItems.join(" | "));
      }

      if (filled.length > 0) { setDecodeMsg(`✅ Vincario: ${filled.join(", ")}`); return true; }
      return false;
    } catch { return false; }
  }

  async function decodeVinNHTSA(): Promise<boolean> {
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin.trim()}?format=json`);
      const json = await res.json();
      const d = json.Results?.[0] || {};
      if (d.ErrorCode && d.ErrorCode !== "0" && !d.Make) return false;
      const val = (key: string) => { const v = d[key]; return v && v !== "Not Applicable" && v !== "" ? v : null; };
      let filled: string[] = [];
      const mk = val("Make"); if (mk) { setMake(mk); filled.push("gamintojas"); }
      const md = val("Model");
      if (md) { let s = md; const tr = val("Trim"); if (tr) s += ` ${tr}`; setModel(s); filled.push("modelis"); }
      const yr = val("ModelYear"); if (yr) { setYear(yr); filled.push("metai"); }
      const dcc = val("DisplacementCC"); const dl = val("DisplacementL");
      if (dcc) { setCc(String(Math.round(parseFloat(dcc)))); filled.push("cc"); }
      else if (dl) { setCc(String(Math.round(parseFloat(dl) * 1000))); filled.push("cc"); }
      const ekw = val("EngineKW");
      if (ekw) { setKw(String(Math.round(parseFloat(ekw)))); filled.push("kW"); }
      else { const ehp = val("EngineHP"); if (ehp) { setKw(String(Math.round(parseFloat(ehp) * 0.7457))); filled.push("kW"); } }
      const extras: string[] = [];
      const fuel = val("FuelTypePrimary"); if (fuel) extras.push(`Kuras: ${fuel}`);
      const body = val("BodyClass"); if (body) extras.push(`Kėbulas: ${body}`);
      const pc = val("PlantCountry"); const pci = val("PlantCity");
      if (pc) extras.push(`Gaminta: ${pci ? pci + ", " : ""}${pc}`);
      if (extras.length > 0) { const existing = notes ? notes + "\n" : ""; setNotes(existing + "VIN (NHTSA): " + extras.join(" | ")); }
      if (filled.length > 0) { setDecodeMsg(`✅ NHTSA: ${filled.join(", ")}`); return true; }
      return false;
    } catch { return false; }
  }

  async function decodeVin() {
    if (!vin || vin.length < 11) { setDecodeMsg("VIN per trumpas (min 11 simbolių)"); return; }
    setDecoding(true); setDecodeMsg(null); setVinData({});
    const vincarioOk = await decodeVinVincario();
    if (!vincarioOk) { const nhtsaOk = await decodeVinNHTSA(); if (!nhtsaOk) setDecodeMsg("⚠️ Nepavyko dekoduoti VIN"); }
    setDecoding(false);
  }

  async function createCustomer() {
    if (!newCustName.trim()) return;
    setCreatingCust(true);
    const { data: { user } } = await supabase().auth.getUser();
    let tenantId = null;
    if (user) {
      const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
      if (prof) tenantId = prof.tenant_id;
    }
    const { data } = await supabase().from("customers").insert({
      name: newCustName.trim(), phone: newCustPhone || null, email: newCustEmail || null,
      company: newCustCompany || null, tenant_id: tenantId,
    }).select().single();
    if (data) {
      setCustomerId(data.id);
      setCustSearch(data.name);
      customers.push(data as Customer);
    }
    setCreatingCust(false); setShowNewCust(false);
    setNewCustName(""); setNewCustPhone(""); setNewCustEmail(""); setNewCustCompany("");
  }

  useEffect(() => {
    if (vehicle) {
      setMake(vehicle.make); setModel(vehicle.model); setPlate(vehicle.plate || "");
      setCc(vehicle.cc || ""); setKw(String(vehicle.kw || "")); setYear(String(vehicle.year || ""));
      setVin(vehicle.vin || ""); setMileage(String(vehicle.mileage || ""));
      setCustomerId(vehicle.customer_id || ""); setNotes(vehicle.notes || "");
      const cust = customers.find(c => c.id === vehicle.customer_id);
      setCustSearch(cust?.name || "");
    } else {
      setMake(""); setModel(""); setPlate(""); setCc(""); setKw(""); setYear("");
      setVin(""); setMileage(""); setCustomerId(""); setNotes(""); setCustSearch("");
    }
    setVinData({}); setDecodeMsg(null); setShowNewCust(false);
  }, [vehicle, open]);

  async function handleSave() {
    if (!make.trim() || !model.trim() || !year.trim()) return;
    if (!isEdit && !customerId) return;
    setSaving(true);
    const payload: any = {
      make: make.trim(), model: model.trim(), plate: plate || null,
      cc: cc || null, kw: parseFloat(kw) || null, year: parseInt(year) || null,
      vin: vin || null, mileage: parseInt(mileage) || null,
      customer_id: customerId || null, notes: notes || null,
    };

    if (isEdit && vehicle) {
      await supabase().from("vehicles").update(payload).eq("id", vehicle.id);
    } else {
      const { data: { user } } = await supabase().auth.getUser();
      if (user) {
        const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
        if (prof) payload.tenant_id = prof.tenant_id;
      }
      await supabase().from("vehicles").insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  // Filtered customers for search dropdown
  const filteredCusts = custSearch.trim()
    ? customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        (c.phone && c.phone.includes(custSearch)) ||
        (c.company && c.company.toLowerCase().includes(custSearch.toLowerCase())))
    : customers;

  const selectedCust = customers.find(c => c.id === customerId);

  const infoStyle = { fontSize: 11, color: "var(--muted)", padding: "2px 0" } as const;
  const infoLabelStyle = { color: "var(--text)", fontWeight: 500 } as const;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("veh.editVehicle") : t("veh.new")} width={620}>
      {/* VIN + Decode */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Input label="VIN" value={vin} onChange={(e) => { setVin(e.target.value.toUpperCase()); setDecodeMsg(null); }} placeholder="WBAPH5C55BA436834" />
        </div>
        <Btn onClick={decodeVin} disabled={decoding || !vin || vin.length < 11}
          style={{ marginBottom: 12, whiteSpace: "nowrap", background: "var(--accent-2)", color: "#0a0c10", borderColor: "var(--accent-2)" }}>
          {decoding ? "⏳..." : "🔍 Decode VIN"}
        </Btn>
      </div>
      {decodeMsg && (
        <div style={{
          fontSize: 12, padding: "6px 10px", borderRadius: 6, marginBottom: 10,
          background: decodeMsg.startsWith("✅") ? "var(--success)15" : decodeMsg.startsWith("⚠") ? "#ffb34715" : "var(--danger)15",
          color: decodeMsg.startsWith("✅") ? "var(--success)" : decodeMsg.startsWith("⚠") ? "#ffb347" : "var(--danger)",
          border: `1px solid ${decodeMsg.startsWith("✅") ? "var(--success)33" : decodeMsg.startsWith("⚠") ? "#ffb34733" : "var(--danger)33"}`,
        }}>
          {decodeMsg}
        </div>
      )}

      {/* Core fields */}
      <Grid cols={2} gap={14}>
        {/* Make with autocomplete */}
        <div style={{ position: "relative" }}>
          <Input label={`${t("veh.make")} *`} value={make}
            onChange={(e) => handleMakeInput(e.target.value)}
            onFocus={() => { if (dbRef) { setMakeSuggestions(make ? dbRef.searchMakes(make) : dbRef.getAllMakes().slice(0, 15)); setShowMakeList(true); } }}
            onBlur={() => setTimeout(() => setShowMakeList(false), 200)}
            placeholder="Toyota, BMW..." />
          {showMakeList && makeSuggestions.length > 0 && (
            <div style={acStyle}>
              {makeSuggestions.map(m => (
                <button key={m} onMouseDown={() => pickMake(m)} style={{
                  ...acItemStyle,
                  fontWeight: m.toLowerCase() === make.toLowerCase() ? 700 : 400,
                }}>{m}</button>
              ))}
            </div>
          )}
        </div>
        {/* Model with autocomplete */}
        <div style={{ position: "relative" }}>
          <Input label={`${t("veh.model")} *`} value={model}
            onChange={(e) => handleModelInput(e.target.value)}
            onFocus={() => { if (dbRef && make) { setModelSuggestions(dbRef.getModelsForMake(make)); setShowModelList(true); } }}
            onBlur={() => setTimeout(() => setShowModelList(false), 200)}
            placeholder={make ? `${make} modelis...` : t("veh.selectMakeFirst")} />
          {showModelList && modelSuggestions.length > 0 && (
            <div style={acStyle}>
              {modelSuggestions.map(m => (
                <button key={m} onMouseDown={() => pickModel(m)} style={{
                  ...acItemStyle,
                  fontWeight: m.toLowerCase() === model.toLowerCase() ? 700 : 400,
                }}>{m}</button>
              ))}
            </div>
          )}
        </div>
      </Grid>
      <Grid cols={4} gap={14}>
        <Input label={t("veh.plate")} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="ABC 123" />
        <Input label={`${t("veh.year")} *`} type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        <Input label="CC" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="2000" />
        <Input label="kW" type="number" value={kw} onChange={(e) => setKw(e.target.value)} />
      </Grid>
      <Grid cols={2} gap={14}>
        <Input label={t("veh.mileage")} type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
      </Grid>

      {/* Customer search */}
      <div style={{ marginTop: 6 }}>
        <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted)", marginBottom: 4, display: "block" }}>
          Savininkas *
        </label>
        {!showNewCust ? (
          <div style={{ position: "relative" }}>
            <input
              value={selectedCust ? selectedCust.name + (selectedCust.company ? ` (${selectedCust.company})` : "") : custSearch}
              onChange={(e) => { setCustSearch(e.target.value); setCustomerId(""); }}
              placeholder="Ieškoti pagal vardą, tel., įmonę..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: `1px solid ${customerId ? "var(--success)" : "var(--border)"}`,
                background: "var(--panel)", color: "var(--text)", fontSize: 13,
              }}
            />
            {!customerId && custSearch && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
                maxHeight: 200, overflow: "auto", marginTop: 4,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                {filteredCusts.slice(0, 10).map(c => (
                  <div key={c.id} onClick={() => { setCustomerId(c.id); setCustSearch(""); }}
                    style={{
                      padding: "8px 12px", cursor: "pointer", fontSize: 13,
                      borderBottom: "1px solid var(--border)",
                    }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.company && <span style={{ color: "var(--muted)", marginLeft: 6 }}>({c.company})</span>}
                    {c.phone && <span style={{ color: "var(--muted)", marginLeft: 6 }}>📞 {c.phone}</span>}
                  </div>
                ))}
                {filteredCusts.length === 0 && (
                  <div style={{ padding: "8px 12px", color: "var(--muted)", fontSize: 12 }}>{t("c.notFound")}</div>
                )}
                <div onClick={() => { setShowNewCust(true); setNewCustName(custSearch); }}
                  style={{
                    padding: "8px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: "var(--accent)", background: "var(--accent)08",
                  }}>
                  ➕ Naujas klientas{custSearch ? `: "${custSearch}"` : ""}
                </div>
              </div>
            )}
            {customerId && (
              <button onClick={() => { setCustomerId(""); setCustSearch(""); }}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16,
                }}>✕</button>
            )}
          </div>
        ) : (
          /* Inline new customer form */
          <div style={{
            border: "1px solid var(--accent)44", borderRadius: 10, padding: 14,
            background: "var(--accent)08", marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--accent)" }}>➕ Naujas klientas</div>
            <Grid cols={2} gap={10}>
              <Input label={`${t("c.name")} *`} value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Jonas Jonaitis" />
              <Input label={t("c.phone")} value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="+370..." />
              <Input label={t("c.email")} value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} placeholder="jonas@..." />
              <Input label={t("c.companyLabel")} value={newCustCompany} onChange={(e) => setNewCustCompany(e.target.value)} placeholder="UAB ..." />
            </Grid>
            <Row gap={8} style={{ marginTop: 10 }}>
              <Btn onClick={createCustomer} disabled={creatingCust || !newCustName.trim()} style={{ fontSize: 12, padding: "6px 14px" }}>
                {creatingCust ? t("c.creating") : t("c.createCustomer")}
              </Btn>
              <Btn variant="ghost" onClick={() => setShowNewCust(false)} style={{ fontSize: 12, padding: "6px 14px" }}>{t("c.cancel")}</Btn>
            </Row>
          </div>
        )}
      </div>

      {/* Vincario decoded data display */}
      {Object.keys(vinData).length > 0 && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 10,
          border: "1px solid var(--border)", background: "var(--panel-soft)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            📋 VIN informacija
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
            {Object.entries(vinData).map(([k, val]) => (
              <div key={k} style={infoStyle}>
                <span style={infoLabelStyle}>{k}:</span> {val}
              </div>
            ))}
          </div>
        </div>
      )}

      <TextArea label={t("c.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Row gap={10} style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving || !make.trim() || !model.trim() || !year.trim() || (!isEdit && !customerId)}>
          {saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}
        </Btn>
      </Row>
    </Modal>
  );
}
