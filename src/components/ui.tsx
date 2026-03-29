"use client";

import React, { useState, useEffect, useRef, CSSProperties, ReactNode } from "react";

// ── BADGE ──
export function Badge({ children, color = "var(--accent)", style }: {
  children: ReactNode; color?: string; style?: CSSProperties;
}) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      background: color + "22", color, border: `1px solid ${color}44`,
      ...style,
    }}>
      {children}
    </span>
  );
}

// ── MODAL ──
export function Modal({ open, onClose, title, children, width = 600 }: {
  open: boolean; onClose: () => void; title: string;
  children: ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.65)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--panel)", border: "1px solid var(--border)",
        borderRadius: 14, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflow: "auto", padding: "22px 26px",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 18,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--muted)",
            fontSize: 22, cursor: "pointer", padding: "0 4px",
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── BUTTON ──
export function Btn({ children, onClick, variant = "primary", style, disabled, type = "button" }: {
  children: ReactNode; onClick?: (e?: any) => void; variant?: "primary" | "ghost" | "danger";
  style?: CSSProperties; disabled?: boolean; type?: "button" | "submit";
}) {
  const base: CSSProperties = {
    padding: "8px 16px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500, fontSize: 13, border: "1px solid", opacity: disabled ? 0.5 : 1,
    transition: "all 0.15s",
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: "var(--accent)", color: "#0a0c10", borderColor: "var(--accent)" },
    ghost: { background: "transparent", color: "var(--text)", borderColor: "var(--border)" },
    danger: { background: "var(--danger)22", color: "var(--danger)", borderColor: "var(--danger)44" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ── INPUT ──
const inputStyle: CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  background: "var(--bg)", border: "1px solid var(--border)",
  color: "var(--text)", fontSize: 13, outline: "none",
};

export function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <input {...props} style={{ ...inputStyle, ...props.style }} />
    </label>
  );
}

export function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <textarea {...props} style={{ ...inputStyle, minHeight: 60, resize: "vertical", ...props.style }} />
    </label>
  );
}

export function Select({ label, options, ...props }: {
  label: string; options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <select {...props} style={{ ...inputStyle, ...props.style }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

// ── ROW / GRID helpers ──
export function Row({ children, gap = 12, style }: {
  children: ReactNode; gap?: number; style?: CSSProperties;
}) {
  return <div style={{ display: "flex", gap, alignItems: "flex-start", ...style }}>{children}</div>;
}

export function Grid({ children, cols = 2, gap = 12, style }: {
  children: ReactNode; cols?: number; gap?: number; style?: CSSProperties;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, ...style }}>
      {children}
    </div>
  );
}

// ── CARD ──
export function Card({ children, style, onClick }: {
  children: ReactNode; style?: CSSProperties; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "16px 18px",
      cursor: onClick ? "pointer" : undefined,
      transition: "border-color 0.15s",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── STAT CARD ──
export function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "var(--text)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

// ── MULTI-SELECT TAGS ──
export function TagSelect({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string }[];
  value: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => {
          const active = value.includes(o.value);
          return (
            <button key={o.value} onClick={() => toggle(o.value)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "var(--accent)22" : "transparent",
              color: active ? "var(--accent)" : "var(--muted)",
              fontWeight: active ? 600 : 400,
            }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TABLE ──
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--panel-soft)", borderBottom: "1px solid var(--border)" }}>
            {headers.map((h) => (
              <th key={h} style={{
                padding: "10px 14px", textAlign: "left", fontSize: 11,
                color: "var(--muted)", fontWeight: 600, letterSpacing: 0.5,
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const tdStyle: CSSProperties = {
  padding: "10px 14px", borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};
