"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, ReactNode } from "react";
import { supabase, type Profile } from "@/lib/supabase";

/* ═══════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════ */
const icons: Record<string, (c: string) => ReactNode> = {
  dashboard: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>),
  orders: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg>),
  scheduler: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="9" y1="4" x2="9" y2="20" /><rect x="11" y="12" width="5" height="2" rx="0.5" fill={c} /><rect x="11" y="16" width="3" height="2" rx="0.5" fill={c} /></svg>),
  mechanic: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>),
  customers: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>),
  vehicles: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17l-1 2h2m12-2l1 2h-2" /><circle cx="7.5" cy="14" r="1.5" /><circle cx="16.5" cy="14" r="1.5" /></svg>),
  team: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>),
  services: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>),
  suppliers: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5a2 2 0 01-2 2h-1" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /><path d="M8 18h8" /></svg>),
  executors: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>),
  workshops: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="6" height="10" rx="1" /><rect x="9" y="7" width="6" height="10" rx="1" /><rect x="16" y="7" width="6" height="10" rx="1" /><line x1="5" y1="4" x2="5" y2="7" /><line x1="12" y1="4" x2="12" y2="7" /><line x1="19" y1="4" x2="19" y2="7" /></svg>),
  settings: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" /></svg>),
  sun: (c) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>),
  moon: (c) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>),
  system: (c) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>),
  logout: (c) => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>),
  sidebar: (c) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>),
};

/* ═══ THEME ═══ */
type ThemeMode = "light" | "dark" | "system";
const LIGHT_VARS: Record<string,string> = {"--bg":"#ffffff","--panel":"#fafafa","--panel-soft":"#f4f4f5","--border":"#e4e4e7","--text":"#18181b","--muted":"#71717a","--accent":"#2563eb","--accent-2":"#7c3aed","--success":"#16a34a","--danger":"#dc2626","--card":"#ffffff"};
const DARK_VARS: Record<string,string> = {"--bg":"#0a0c10","--panel":"#11151c","--panel-soft":"#161b24","--border":"#1e2330","--text":"#e4e7ec","--muted":"#6b7280","--accent":"#60a5fa","--accent-2":"#a78bfa","--success":"#34d399","--danger":"#f87171","--card":"#161b24"};
function applyTheme(mode: ThemeMode) {
  const isDark = mode === "dark" || (mode === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  Object.entries(isDark ? DARK_VARS : LIGHT_VARS).forEach(([k,v]) => document.documentElement.style.setProperty(k,v));
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}

/* ═══ MENU — hardcoded, NO i18n dependency ═══ */
type MenuItem = { href: string; label: string; icon: string; roles?: string[] };
const mainMenu: MenuItem[] = [
  { href: "/app", label: "Dashboard", icon: "dashboard", roles: ["owner","manager"] },
  { href: "/app/work-orders", label: "Užsakymai", icon: "orders", roles: ["owner","manager"] },
  { href: "/app/scheduler", label: "Planuoklė", icon: "scheduler", roles: ["owner","manager"] },
  { href: "/app/mechanic", label: "Meistro lapas", icon: "mechanic" },
  { href: "/app/customers", label: "Klientai", icon: "customers", roles: ["owner","manager"] },
  { href: "/app/vehicles", label: "Automobiliai", icon: "vehicles", roles: ["owner","manager"] },
];
const adminMenu: MenuItem[] = [
  { href: "/app/admin/team", label: "Komanda", icon: "team" },
  { href: "/app/admin/services", label: "Paslaugos", icon: "services" },
  { href: "/app/admin/suppliers", label: "Tiekėjai", icon: "suppliers" },
  { href: "/app/admin/executors", label: "Vykdytojai", icon: "executors" },
  { href: "/app/admin/workshops", label: "Darbo vietos", icon: "workshops" },
  { href: "/app/admin/settings", label: "Nustatymai", icon: "settings" },
];

/* ═══ THEME SWITCHER ═══ */
function ThemeSwitcher({ theme, setTheme, expanded }: { theme: ThemeMode; setTheme: (t: ThemeMode) => void; expanded: boolean }) {
  const modes: { mode: ThemeMode; icon: string; label: string }[] = [
    { mode: "light", icon: "sun", label: "Šviesi" },
    { mode: "dark", icon: "moon", label: "Tamsi" },
    { mode: "system", icon: "system", label: "Sistema" },
  ];
  if (!expanded) {
    const next: ThemeMode = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    const cur = modes.find(m => m.mode === theme)!;
    return (<button onClick={() => setTheme(next)} style={{ display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:6,borderRadius:8,border:"none",background:"transparent",cursor:"pointer" }}>{icons[cur.icon]("var(--muted)")}</button>);
  }
  return (
    <div style={{ display:"flex",gap:2,background:"var(--panel-soft)",borderRadius:8,padding:2 }}>
      {modes.map(m => (
        <button key={m.mode} onClick={() => setTheme(m.mode)} style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"5px 4px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:500,transition:"all 0.15s",background:theme===m.mode?"var(--bg)":"transparent",color:theme===m.mode?"var(--text)":"var(--muted)",boxShadow:theme===m.mode?"0 1px 3px rgba(0,0,0,0.1)":"none" }}>
          {icons[m.icon](theme === m.mode ? "var(--text)" : "var(--muted)")}
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN LAYOUT
   ═══════════════════════════════════════════ */
export default function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const pathname = usePathname();

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("vurso-theme")) as ThemeMode | null;
    const themeVal = saved || "dark";
    setThemeState(themeVal);
    applyTheme(themeVal);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (themeVal === "system") applyTheme("system"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function setTheme(t: ThemeMode) { setThemeState(t); applyTheme(t); localStorage.setItem("vurso-theme", t); }

  useEffect(() => {
    const { data: { subscription } } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        loadProfile();
      }
      if (event === 'SIGNED_OUT') {
        window.location.href = "/login";
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase().auth.getUser();
      if (!user) return; // Don't redirect — let onAuthStateChange handle it
      const { data } = await supabase().from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data as Profile);
        if (data.role === "mechanic" && pathname === "/app") {
          window.location.href = "/app/mechanic";
        } else if ((data.role === "owner" || data.role === "manager") && pathname === "/app") {
          window.location.href = "/app/scheduler";
        }
      } else {
        // No profile yet — don't redirect to login, just wait
        console.warn("Profile not found for user:", user.id, "- staying on page");
      }
    } catch (err) {
      console.error("loadProfile error:", err);
    }
  }

  async function handleLogout() { await supabase().auth.signOut(); window.location.href = "/login"; }

  const showExpanded = !collapsed || hovered;
  const role = profile?.role || "mechanic";
  const isAdmin = role === "owner" || role === "manager";
  const visibleMenu = mainMenu.filter(item => !item.roles || item.roles.includes(role));

  return (
    <div style={{ minHeight:"100vh",display:"flex" }}>
      <aside onMouseEnter={() => collapsed && setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ width:showExpanded?240:56,minWidth:showExpanded?240:56,borderRight:"1px solid var(--border)",background:"var(--panel)",display:"flex",flexDirection:"column",transition:"all 0.2s ease",overflow:"hidden",...(collapsed&&hovered?{position:"fixed" as const,top:0,left:0,bottom:0,zIndex:100,boxShadow:"4px 0 12px rgba(0,0,0,0.15)"}:{}) }}>
        {/* Header */}
        <div style={{ padding:showExpanded?"14px 14px 10px":"14px 0 10px",display:"flex",alignItems:"center",justifyContent:showExpanded?"space-between":"center",borderBottom:"1px solid var(--border)" }}>
          {showExpanded ? (<><span style={{ fontSize:15,fontWeight:700,color:"var(--text)",letterSpacing:"-0.3px" }}>VURSO</span><button onClick={() => { setCollapsed(!collapsed); setHovered(false); }} style={{ background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center" }}>{icons.sidebar("var(--muted)")}</button></>) : (<button onClick={() => setCollapsed(false)} style={{ background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center" }}>{icons.sidebar("var(--muted)")}</button>)}
        </div>

        {/* Main menu */}
        <div style={{ flex:1,padding:showExpanded?"8px 8px":"8px 4px",display:"grid",gap:2,alignContent:"start" }}>
          {visibleMenu.map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname?.startsWith(item.href);
            return (<a key={item.href} href={item.href} style={{ padding:showExpanded?"7px 10px":"8px",borderRadius:7,color:active?"var(--accent)":"var(--muted)",background:active?"var(--accent)11":"transparent",borderLeft:active?"2px solid var(--accent)":"2px solid transparent",fontSize:13,display:"flex",alignItems:"center",gap:8,transition:"all 0.15s",textDecoration:"none",justifyContent:showExpanded?undefined:"center" }}>{icons[item.icon]?.(active?"var(--accent)":"var(--muted)")}{showExpanded && <span>{item.label}</span>}</a>);
          })}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div style={{ borderTop:"1px solid var(--border)",padding:showExpanded?"8px 8px":"8px 4px" }}>
            {showExpanded && <div style={{ fontSize:10,fontWeight:600,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.5px",padding:"4px 10px 6px" }}>Administravimas</div>}
            <div style={{ display:"grid",gap:2 }}>
              {adminMenu.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (<a key={item.href} href={item.href} style={{ padding:showExpanded?"7px 10px":"8px",borderRadius:7,color:active?"var(--accent)":"var(--muted)",background:active?"var(--accent)11":"transparent",borderLeft:active?"2px solid var(--accent)":"2px solid transparent",fontSize:13,display:"flex",alignItems:"center",gap:8,transition:"all 0.15s",textDecoration:"none",justifyContent:showExpanded?undefined:"center" }}>{icons[item.icon]?.(active?"var(--accent)":"var(--muted)")}{showExpanded && <span>{item.label}</span>}</a>);
              })}
            </div>
          </div>
        )}

        {/* Theme */}
        <div style={{ padding:showExpanded?"10px 10px":"10px 6px",borderTop:"1px solid var(--border)" }}>
          <ThemeSwitcher theme={theme} setTheme={setTheme} expanded={showExpanded} />
        </div>

        {/* User */}
        <div style={{ padding:showExpanded?"10px 12px":"10px 0",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,justifyContent:showExpanded?"flex-start":"center" }}>
          <div style={{ width:30,height:30,borderRadius:"50%",background:"var(--accent)22",border:"1px solid var(--accent)44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--accent)",flexShrink:0 }}>{(profile?.full_name||"?").charAt(0).toUpperCase()}</div>
          {showExpanded && (<div style={{ flex:1,overflow:"hidden" }}><div style={{ fontSize:12,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{profile?.full_name||"..."}</div><div style={{ fontSize:10,color:"var(--muted)",textTransform:"capitalize" }}>{profile?.role}</div></div>)}
          {showExpanded && (<button onClick={handleLogout} title="Atsijungti" style={{ background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",alignItems:"center" }}>{icons.logout("var(--muted)")}</button>)}
        </div>
      </aside>

      <main style={{ flex:1,overflow:"auto",background:"var(--bg)",padding:28 }}>{children}</main>
    </div>
  );
}
