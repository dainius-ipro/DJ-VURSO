"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type UserRole } from "@/lib/supabase";
import { Btn, Modal, Input, Select, Table, tdStyle, Row, Grid, Badge } from "@/components/ui";
import { t, tStatus, tService, tRole } from "@/lib/i18n";

interface Staff {
  id: string;
  tenant_id: string;
  profile_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  hourly_rate?: number;
  salary?: number;
  is_active: boolean;
  invite_status?: string | null; // null | 'sent' | 'confirmed'
  invite_sent_at?: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: t("role.owner"),
  manager: t("role.manager"),
  mechanic: t("mech.master"),
  programmer: t("role.programmer"),
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: "#ff6b6b",
  manager: "#77a8ff",
  mechanic: "#68f3c2",
  programmer: "#ffb347",
};

export default function TeamPage() {
  const [members, setMembers] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase().auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase().from("profiles").select("tenant_id").eq("id", user.id).single();
    if (!prof) return;
    setTenantId(prof.tenant_id);

    const { data } = await supabase()
      .from("staff")
      .select("*")
      .eq("tenant_id", prof.tenant_id)
      .order("role")
      .order("full_name");
    setMembers((data || []) as Staff[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sendInvite(member: Staff) {
    if (!member.email) { alert(t("c.noEmail")); return; }
    const redirectTo = typeof window !== "undefined"
      ? `${window.location.origin}/app`
      : "/app";
    const { error } = await supabase().auth.signInWithOtp({
      email: member.email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      alert(t("c.errorPrefix") + ": " + error.message);
    } else {
      // Update invite status
      await supabase().from("staff").update({
        invite_status: "sent",
        invite_sent_at: new Date().toISOString(),
      }).eq("id", member.id);

      setMembers(prev => prev.map(m =>
        m.id === member.id ? { ...m, invite_status: "sent", invite_sent_at: new Date().toISOString() } : m
      ));
      alert(`${t("c.magicLinkSent")} ${member.email}`);
    }
  }

  function renderInviteStatus(m: Staff) {
    // 1. Confirmed — profile_id exists (user has logged in)
    if (m.profile_id || m.invite_status === "confirmed") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>{t("c.confirmed")}</span>
        </div>
      );
    }
    // 2. Invite sent — waiting for user to click magic link
    if (m.invite_status === "sent") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{t("c.inviteSent")}</span>
          </div>
          <button onClick={() => sendInvite(m)} style={{
            background: "none", border: "none", color: "var(--muted)", fontSize: 11,
            cursor: "pointer", textDecoration: "underline", padding: 0,
          }}>
            {t("c.sendAgain")}
          </button>
        </div>
      );
    }
    // 3. Not invited — show invite button
    if (m.email) {
      return (
        <button onClick={() => sendInvite(m)} style={{
          background: "none", border: "1px solid var(--accent)",
          borderRadius: 6, color: "var(--accent)", fontSize: 11,
          padding: "4px 10px", cursor: "pointer",
        }}>
          {t("c.sendInviteBtn")}
        </button>
      );
    }
    // 4. No email
    return <span style={{ color: "var(--muted)", fontSize: 11 }}>{t("c.noEmail")}</span>;
  }

  return (
    <div>
      {/* Pulse animation for invite sent status */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t("team.title")}</h1>
        <Btn onClick={() => { setEditing(null); setShowForm(true); }}>+ {t("c.newMember")}</Btn>
      </div>

      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        {t("c.createAndInviteHint")}
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>{t("c.loading")}</div>
      ) : (
        <Table headers={[t("c.name"), t("c.email"), t("th.role"), t("th.eurH"), t("c.status"), ""]}>
          {members.map((m) => (
            <tr key={m.id} style={{ opacity: m.is_active ? 1 : 0.5 }}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{m.full_name}</td>
              <td style={tdStyle}>{m.email || "—"}</td>
              <td style={tdStyle}>
                <Badge color={ROLE_COLORS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
              </td>
              <td style={tdStyle}>{m.hourly_rate ? `€${m.hourly_rate}` : "—"}</td>
              <td style={tdStyle}>
                {renderInviteStatus(m)}
              </td>
              <td style={tdStyle}>
                <Btn variant="ghost" style={{ fontSize: 11, padding: "4px 8px" }}
                  onClick={() => { setEditing(m); setShowForm(true); }}>
                  {"✎"}
                </Btn>
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: "var(--muted)", padding: 30 }}>{t("c.noTeamMembers")}</td></tr>
          )}
        </Table>
      )}

      <TeamForm open={showForm} onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={() => { setShowForm(false); setEditing(null); load(); }} member={editing} tenantId={tenantId} />
    </div>
  );
}

function TeamForm({ open, onClose, onSaved, member, tenantId }: {
  open: boolean; onClose: () => void; onSaved: () => void; member: Staff | null; tenantId: string | null;
}) {
  const isEdit = !!member;
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("mechanic");
  const [hourlyRate, setHourlyRate] = useState("");
  const [salary, setSalary] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sendInviteOnCreate, setSendInviteOnCreate] = useState(true);

  useEffect(() => {
    if (member) {
      setFullName(member.full_name); setEmail(member.email || "");
      setPhone(member.phone || ""); setRole(member.role);
      setHourlyRate(String(member.hourly_rate || "")); setSalary(String(member.salary || ""));
      setIsActive(member.is_active); setSendInviteOnCreate(false);
    } else {
      setFullName(""); setEmail(""); setPhone(""); setRole("mechanic");
      setHourlyRate(""); setSalary(""); setIsActive(true); setSendInviteOnCreate(true);
    }
  }, [member, open]);

  async function handleSave() {
    if (!fullName.trim()) return;
    setSaving(true);

    const payload: any = {
      full_name: fullName.trim(),
      email: email || null,
      phone: phone || null,
      role,
      hourly_rate: parseFloat(hourlyRate) || 0,
      salary: parseFloat(salary) || 0,
      is_active: isActive,
    };

    if (isEdit && member) {
      await supabase().from("staff").update(payload).eq("id", member.id);
    } else {
      payload.tenant_id = tenantId;
      const { data: newStaff, error } = await supabase().from("staff").insert(payload).select("id").single();
      if (error) { console.error(error); setSaving(false); return; }

      // Send magic link invite if email provided
      if (sendInviteOnCreate && email && newStaff) {
        const redirectTo = typeof window !== "undefined"
          ? `${window.location.origin}/app`
          : "/app";
        const { error: invErr } = await supabase().auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
        });
        if (!invErr) {
          await supabase().from("staff").update({
            invite_status: "sent",
            invite_sent_at: new Date().toISOString(),
          }).eq("id", newStaff.id);
        }
      }
    }
    setSaving(false);
    onSaved();
  }

  const roleOpts = [
    { value: "mechanic", label: t("mech.master") },
    { value: "manager", label: t("role.manager") },
    { value: "programmer", label: t("role.programmer") },
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("team.editMember") : t("team.newMember")} width={500}>
      <Input label={t("c.fullNameRequired")} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jonas Jonaitis" />
      <Grid cols={2} gap={14}>
        <Input label={t("c.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jonas@servisas.lt" />
        <Input label={t("c.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+370..." />
      </Grid>
      <Grid cols={3} gap={14}>
        <Select label={t("team.role")} options={roleOpts} value={role} onChange={(e) => setRole(e.target.value as UserRole)} />
        <Input label={t("c.hourlyRateShort")} type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="15" />
        <Input label={t("team.salary")} type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="2000" />
      </Grid>
      {!isEdit && email && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={sendInviteOnCreate} onChange={(e) => setSendInviteOnCreate(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
          <span style={{ fontSize: 13, color: "var(--text)" }}>{t("c.sendInvite")}</span>
        </label>
      )}
      {isEdit && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
          <span style={{ fontSize: 13, color: "var(--text)" }}>{t("c.activeEmployee")}</span>
        </label>
      )}
      <Row gap={10} style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>{t("c.cancel")}</Btn>
        <Btn onClick={handleSave} disabled={saving || !fullName.trim()}>
          {saving ? t("c.saving") : isEdit ? t("c.update") : t("c.create")}
        </Btn>
      </Row>
    </Modal>
  );
}
