"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const FONT="'SF Pro Display','SF Pro Text',-apple-system,'Helvetica Neue',sans-serif";
const C={bg:"#f5f5f7",surface:"#ffffff",text:"#1c1c1e",textMuted:"#8e8e93",accent:"#007aff",border:"#e5e5ea"};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "/auth/callback";

  async function signInWithGoogle() {
    setErr(null);
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setErr(error.message);
  }

  async function signInWithApple() {
    setErr(null);
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo },
    });
    if (error) setErr(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMessage(null); setLoading(true);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMessage("Patvirtinimo nuoroda išsiųsta! Patikrinkite el. paštą.");
  }

  const btnBase:React.CSSProperties={
    width:"100%",padding:"14px 16px",borderRadius:12,fontSize:15,fontWeight:600,
    cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
    gap:10,transition:"all 0.15s",fontFamily:FONT,
  };

  return (
    <main style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px"}}>
      <div style={{width:"100%",maxWidth:380,display:"flex",flexDirection:"column",alignItems:"center"}}>

        {/* Logo / Brand */}
        <div style={{fontSize:28,fontWeight:900,color:C.text,marginBottom:8,letterSpacing:"-0.5px"}}>VURSO</div>
        <div style={{fontSize:22,fontWeight:800,color:C.text,textAlign:"center",lineHeight:1.3,marginBottom:8}}>Auto serviso<br/>valdymo sistema</div>
        <p style={{color:C.textMuted,fontSize:14,textAlign:"center",lineHeight:1.5,marginBottom:32,maxWidth:300}}>
          Užsakymų valdymas, meistrų darbų sekimas, klientų ir automobilių duomenų bazė, finansinė analitika — vienoje vietoje
        </p>

        {/* Prisijungti heading */}
        <div style={{fontSize:18,fontWeight:700,color:C.text,marginBottom:16,textAlign:"center"}}>Prisijungti</div>

        {/* Google */}
        <button onClick={signInWithGoogle} style={{
          ...btnBase,background:"#ffffff",color:"#1f1f1f",border:"1px solid "+C.border,marginBottom:10,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Prisijungti su Google
        </button>

        {/* Apple */}
        <button onClick={signInWithApple} style={{
          ...btnBase,background:"#000000",color:"#ffffff",border:"1px solid #333",marginBottom:16,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Prisijungti su Apple
        </button>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:12,width:"100%",marginBottom:16}}>
          <div style={{flex:1,height:1,background:C.border}}/>
          <span style={{color:C.textMuted,fontSize:13}}>arba</span>
          <div style={{flex:1,height:1,background:C.border}}/>
        </div>

        {/* Magic Link form */}
        <form onSubmit={sendMagicLink} style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
          <input
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            type="email"
            style={{
              width:"100%",padding:"14px 16px",borderRadius:12,
              border:"1px solid "+C.border,background:C.surface,
              color:C.text,fontSize:15,fontFamily:FONT,outline:"none",boxSizing:"border-box",
            }}
          />
          <button type="submit" disabled={loading} style={{
            ...btnBase,background:C.accent,color:"#fff",border:"none",
            opacity:loading?0.6:1,fontWeight:700,
          }}>
            {loading ? "Siunčiama..." : "Siųsti magic link"}
          </button>
        </form>

        {/* Messages */}
        {err && <div style={{color:"#ff3b30",fontSize:13,textAlign:"center",marginTop:12}}>{err}</div>}
        {message && <div style={{color:"#34c759",fontSize:13,textAlign:"center",marginTop:12}}>{message}</div>}

        {/* Footer */}
        <p style={{color:C.textMuted,fontSize:11,textAlign:"center",marginTop:32,lineHeight:1.5}}>
          Tęsdami sutinkate su{" "}
          <a href="https://vurso.app" style={{color:C.accent,textDecoration:"none"}}>Privatumo politika</a>
          {" "}ir{" "}
          <a href="https://vurso.app" style={{color:C.accent,textDecoration:"none"}}>Sąlygomis</a>
        </p>
      </div>
    </main>
  );
}
