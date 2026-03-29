"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Btn, Modal, Input, Select, Table, tdStyle, Row, Grid, Badge, TextArea } from "@/components/ui";
import { t } from "@/lib/i18n";

interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  item_code: string;
  category: string;
  unit: string;
  purchase_price: number;
  sell_price: number;
  qty_in_stock: number;
  qty_reserved: number;
  qty_ordered: number;
  min_stock: number;
  supplier_id?: string;
  location: string;
  notes: string;
  is_active: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

interface Movement {
  id: string;
  inventory_id: string;
  movement_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reference_note: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "", label: t("inv.allCategories") },
  { value: "filtrai", label: t("inv.catFilters") },
  { value: "alyvos", label: t("inv.catOils") },
  { value: "stabdziai", label: t("inv.catBrakes") },
  { value: "elektra", label: t("inv.catElectrical") },
  { value: "variklis", label: t("inv.catEngine") },
  { value: "pavara", label: t("inv.catTransmission") },
  { value: "kebulas", label: t("inv.catBody") },
  { value: "padangos", label: t("inv.catTires") },
  { value: "kita", label: t("inv.catOther") },
];

const UNITS = [
  { value: "vnt", label: t("inv.unitPcs") },
  { value: "l", label: t("inv.unitL") },
  { value: "kg", label: t("inv.unitKg") },
  { value: "ml", label: t("inv.unitMl") },
  { value: "m", label: t("inv.unitM") },
  { value: "kompl", label: t("inv.unitSet") },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [showMovement, setShowMovement] = useState<InventoryItem | null>(null);
  const [showHistory, setShowHistory] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!prof) return;
    setTenantId(prof.tenant_id);

    const [{ data: inv }, { data: sup }] = await Promise.all([
      supabase().from("inventory").select("*").eq("tenant_id", prof.tenant_id).order("name"),
      supabase().from("suppliers").select("id, name").eq("tenant_id", prof.tenant_id).eq("is_active", true),
    ]);
    setItems((inv || []) as InventoryItem[]);
    setSuppliers((sup || []) as Supplier[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.item_code.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && i.category !== catFilter) return false;
    if (stockFilter === "low" && i.qty_in_stock > i.min_stock) return false;
    if (stockFilter === "out" && i.qty_in_stock > 0) return false;
    return true;
  });

  const available = (i: InventoryItem) => i.qty_in_stock - i.qty_reserved;

  async function loadHistory(item: InventoryItem) {
    const { data } = await supabase()
      .from("inventory_movements")
      .select("*")
      .eq("inventory_id", item.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMovements((data || []) as Movement[]);
    setShowHistory(item);
  }

  // Stats
  const totalItems = items.length;
  const totalValue = items.reduce((s, i) => s + i.qty_in_stock * i.purchase_price, 0);
  const lowStock = items.filter((i) => i.qty_in_stock <= i.min_stock && i.qty_in_stock > 0).length;
  const outOfStock = items.filter((i) => i.qty_in_stock === 0).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("inv.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ {t("inv.new")}</Btn>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatBox label={t("inv.totalItems")} value={totalItems} />
        <StatBox label={t("inv.stockValue")} value={`€${totalValue.toFixed(0)}`} />
        <StatBox label={t("inv.lowStock")} value={lowStock} color={lowStock > 0 ? "var(--warning)" : undefined} />
        <StatBox label={t("inv.outOfStock")} value={outOfStock} color={outOfStock > 0 ? "var(--danger)" : undefined} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Input label="" placeholder={t("inv.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240, margin: 0 }} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 13 }}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "low", "out"] as const).map((f) => (
            <button key={f} onClick={() => setStockFilter(f)}
              style={{
                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: stockFilter === f ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: stockFilter === f ? "var(--accent)" : "transparent",
                color: stockFilter === f ? "#fff" : "var(--text)",
              }}>
              {f === "all" ? t("c.all") : f === "low" ? t("inv.lowStock") : t("inv.outOfStock")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("th.code"), t("c.name"), t("inv.category"), t("inv.qtyAvail"), t("inv.qtyOrdered"), t("inv.purchasePrice"), t("inv.sellPrice"), t("c.status"), ""]}>
          {filtered.map((i) => (
            <tr key={i.id} style={{ opacity: i.is_active ? 1 : 0.5 }}>
              <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 12 }}>{i.item_code}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>
                <div>{i.name}</div>
                {i.location && <div style={{ fontSize: 11, color: "var(--muted)" }}>📍 {i.location}</div>}
              </td>
              <td style={tdStyle}>
                {i.category && <Badge color={getCategoryColor(i.category)}>{CATEGORIES.find((c) => c.value === i.category)?.label || i.category}</Badge>}
              </td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 700, color: available(i) <= 0 ? "var(--danger)" : available(i) <= i.min_stock ? "var(--warning)" : "var(--success)" }}>
                  {available(i)}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}> / {i.qty_in_stock} {i.unit}</span>
                {i.qty_reserved > 0 && <div style={{ fontSize: 10, color: "var(--warning)" }}>🔒 {i.qty_reserved} {t("inv.reserved")}</div>}
              </td>
              <td style={tdStyle}>
                {i.qty_ordered > 0 ? <Badge color="#3b82f6">{i.qty_ordered}</Badge> : <span style={{ color: "var(--muted)" }}>—</span>}
              </td>
              <td style={{ ...tdStyle, fontFamily: "monospace" }}>€{Number(i.purchase_price).toFixed(2)}</td>
              <td style={{ ...tdStyle, fontFamily: "monospace" }}>€{Number(i.sell_price).toFixed(2)}</td>
              <td style={tdStyle}>
                {!i.is_active ? <Badge color="var(--muted)">{t("c.inactive")}</Badge>
                  : i.qty_in_stock === 0 ? <Badge color="var(--danger)">{t("inv.outOfStock")}</Badge>
                  : i.qty_in_stock <= i.min_stock ? <Badge color="var(--warning)">{t("inv.lowStock")}</Badge>
                  : <Badge color="var(--success)">{t("c.active")}</Badge>}
              </td>
              <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => setShowMovement(i)}>📦</Btn>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => loadHistory(i)}>📋</Btn>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => { setEditing(i); setShowForm(true); }}>✎</Btn>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>
              {search || catFilter ? t("c.notFound") : t("inv.empty")}
            </td></tr>
          )}
        </Table>
      )}

      {/* Item form */}
      <ItemForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        item={editing} tenantId={tenantId} suppliers={suppliers} />

      {/* Movement form (purchase / write-off) */}
      {showMovement && (
        <MovementForm item={showMovement} tenantId={tenantId}
          onClose={() => setShowMovement(null)}
          onSaved={() => { setShowMovement(null); load(); }}
          suppliers={suppliers} />
      )}

      {/* History modal */}
      {showHistory && (
        <Modal open={true} onClose={() => setShowHistory(null)} title={`${t("inv.history")}: ${showHistory.name}`} width={600}>
          {movements.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>{t("inv.noMovements")}</p>
          ) : (
            <Table headers={[t("c.date"), t("inv.movementType"), t("inv.qty"), t("c.price"), t("c.notes")]}>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td style={tdStyle}>{new Date(m.created_at).toLocaleDateString("lt")}</td>
                  <td style={tdStyle}><Badge color={getMovementColor(m.movement_type)}>{t(`inv.mt_${m.movement_type}`)}</Badge></td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace" }}>€{Number(m.total_price).toFixed(2)}</td>
                  <td style={tdStyle}>{m.reference_note || "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </Modal>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)",
      background: "var(--card)",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

/* ============== ITEM FORM ============== */
function ItemForm({ open, onClose, onSaved, item, tenantId, suppliers }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  item: InventoryItem | null; tenantId: string | null; suppliers: Supplier[];
}) {
  const isEdit = !!item;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("vnt");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (item) {
      setName(item.name); setItemCode(item.item_code); setCategory(item.category);
      setUnit(item.unit); setPurchasePrice(String(item.purchase_price || ""));
      setSellPrice(String(item.sell_price || "")); setMinStock(String(item.min_stock || ""));
      setSupplierId(item.supplier_id || ""); setLocation(item.location || "");
      setNotes(item.notes || ""); setIsActive(item.is_active);
    } else {
      setName(""); setItemCode(generateCode()); setCategory(""); setUnit("vnt");
      setPurchasePrice(""); setSellPrice(""); setMinStock(""); setSupplierId("");
      setLocation(""); setNotes(""); setIsActive(true);
    }
  }, [item, open]);

  async function handleSave() {
    if (!name.trim() || !itemCode.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(), item_code: itemCode.trim(), category, unit,
      purchase_price: parseFloat(purchasePrice) || 0,
      sell_price: parseFloat(sellPrice) || 0,
      min_stock: parseInt(minStock) || 0,
      supplier_id: supplierId || null, location: location.trim(),
      notes: notes.trim(), is_active: isActive,
      updated_at: new Date().toISOString(),
    };

    if (isEdit && item) {
      await supabase().from("inventory").update(payload).eq("id", item.id);
    } else {
      await supabase().from("inventory").insert({ ...payload, tenant_id: tenantId, qty_in_stock: 0, qty_reserved: 0, qty_ordered: 0 });
    }
    setSaving(false);
    onSaved();
  }

  const supplierOpts = [{ value: "", label: "—" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))];
  const catOpts = CATEGORIES.filter((c) => c.value !== "");

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("inv.editItem") : t("inv.new")} width={560}>
      <Grid cols={2} gap={14}>
        <Input label={t("c.nameRequired")} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t("inv.itemCode")} value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
      </Grid>
      <Grid cols={2} gap={14}>
        <Select label={t("inv.category")} options={catOpts} value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select label={t("inv.unit")} options={UNITS} value={unit} onChange={(e) => setUnit(e.target.value)} />
      </Grid>
      <Grid cols={2} gap={14}>
        <Input label={t("inv.purchasePrice")} type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" />
        <Input label={t("inv.sellPrice")} type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00" />
      </Grid>
      <Grid cols={3} gap={14}>
        <Input label={t("inv.minStock")} type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" />
        <Select label={t("inv.supplier")} options={supplierOpts} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
        <Input label={t("inv.location")} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="A-1-3" />
      </Grid>
      <TextArea label={t("c.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
      {isEdit && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
          <span style={{ fontSize: 13 }}>{t("c.active")}</span>
        </label>
      )}
      <Row gap={10} style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}
        </Btn>
      </Row>
    </Modal>
  );
}

/* ============== MOVEMENT FORM (Purchase / Write-off) ============== */
function MovementForm({ item, tenantId, onClose, onSaved, suppliers }: {
  item: InventoryItem; tenantId: string | null; onClose: () => void; onSaved: () => void; suppliers: Supplier[];
}) {
  const [type, setType] = useState<"purchase" | "write_off" | "adjustment">("purchase");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState(String(item.purchase_price || ""));
  const [note, setNote] = useState("");
  const [suppId, setSuppId] = useState(item.supplier_id || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const q = parseInt(qty);
    if (!q || q <= 0) return;
    setSaving(true);

    const price = parseFloat(unitPrice) || 0;
    const total = q * price;
    const delta = type === "write_off" ? -q : q;

    // Insert movement
    await supabase().from("inventory_movements").insert({
      tenant_id: tenantId,
      inventory_id: item.id,
      movement_type: type,
      quantity: delta,
      unit_price: price,
      total_price: total,
      supplier_id: type === "purchase" ? (suppId || null) : null,
      reference_note: note.trim(),
    });

    // Update stock
    if (type === "purchase") {
      await supabase().from("inventory").update({
        qty_in_stock: item.qty_in_stock + q,
        purchase_price: price > 0 ? price : item.purchase_price,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
    } else if (type === "write_off") {
      await supabase().from("inventory").update({
        qty_in_stock: Math.max(0, item.qty_in_stock - q),
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
    } else {
      // adjustment — set exact quantity
      await supabase().from("inventory").update({
        qty_in_stock: q,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
    }

    setSaving(false);
    onSaved();
  }

  const supplierOpts = [{ value: "", label: "—" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))];

  return (
    <Modal open={true} onClose={onClose} title={`${t("inv.stockOp")}: ${item.name}`} width={420}>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        {t("inv.currentStock")}: <strong>{item.qty_in_stock} {item.unit}</strong>
      </p>
      <Select label={t("inv.operationType")}
        options={[
          { value: "purchase", label: `📦 ${t("inv.purchase")}` },
          { value: "write_off", label: `🗑️ ${t("inv.writeOff")}` },
          { value: "adjustment", label: `🔧 ${t("inv.adjustment")}` },
        ]}
        value={type} onChange={(e) => setType(e.target.value as any)} />
      <Grid cols={2} gap={14}>
        <Input label={type === "adjustment" ? t("inv.newQty") : t("inv.qty")} type="number" value={qty}
          onChange={(e) => setQty(e.target.value)} placeholder="0" />
        {type !== "adjustment" && (
          <Input label={t("inv.unitPrice")} type="number" value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" />
        )}
      </Grid>
      {type === "purchase" && (
        <Select label={t("inv.supplier")} options={supplierOpts} value={suppId} onChange={(e) => setSuppId(e.target.value)} />
      )}
      <Input label={t("c.notes")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("inv.notePlaceholder")} />
      <Row gap={10} style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSubmit} disabled={saving || !qty}>
          {saving ? t("c.saving") : t("c.confirm")}
        </Btn>
      </Row>
    </Modal>
  );
}

/* ============== HELPERS ============== */
function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "SG-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getCategoryColor(cat: string): string {
  const m: Record<string, string> = {
    filtrai: "#3b82f6", alyvos: "#eab308", stabdziai: "#ef4444", elektra: "#8b5cf6",
    variklis: "#f97316", pavara: "#06b6d4", kebulas: "#10b981", padangos: "#6b7280", kita: "#a855f7",
  };
  return m[cat] || "#6b7280";
}

function getMovementColor(type: string): string {
  const m: Record<string, string> = {
    purchase: "#10b981", write_off: "#ef4444", used_in_order: "#f97316",
    return: "#3b82f6", adjustment: "#8b5cf6", reserved: "#eab308", unreserved: "#6b7280",
  };
  return m[type] || "#6b7280";
}
