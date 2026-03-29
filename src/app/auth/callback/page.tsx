"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const FONT="'SF Pro Display','SF Pro Text',-apple-system,'Helvetica Neue',sans-serif";

export default function AuthCallback() {
  const [status, setStatus] = useState("Prisijungiama...");

  useEffect(() => {
    async function handleCallback() {
      await new Promise(r => setTimeout(r, 300));

      const { data: { session }, error } = await supabase().auth.getSession();

      if (session) {
        // Everyone goes to basic for now
        window.location.href = "/dashboard/basic";
        return;
      }

      if (error) console.error("Auth error:", error);

      // Retry after delay (implicit flow sometimes needs time)
      setTimeout(async () => {
        const { data } = await supabase().auth.getSession();
        if (data.session) {
          window.location.href = "/dashboard/basic";
        } else {
          setStatus("Nepavyko prisijungti. Bandykite dar kartą.");
        }
      }, 1500);
    }
    handleCallback();
  }, []);

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:FONT,background:"#f5f5f7"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:20,fontWeight:800,color:"#1c1c1e",marginBottom:8}}>VURSO</div>
        <p style={{fontSize:15,color:"#8e8e93"}}>{status}</p>
        <p style={{fontSize:13,color:"#aeaeb2",marginTop:12}}>
          Jei prisijungimas neįvyksta, <a href="/login" style={{color:"#007aff",textDecoration:"none"}}>spauskite čia</a>.
        </p>
      </div>
    </main>
  );
}
