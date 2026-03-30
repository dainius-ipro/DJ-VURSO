/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const T:Record<string,Record<string,any>>={lt:{
  app_name:"VURSO",loading:"Kraunama...",today:"Šiandien",no_orders:"Nėra užsakymų",
  manufacturer:"Gamintojas",model:"Modelis",displacement:"Kubatūra",power:"Galingumas",
  service:"Paslauga",price:"Kaina",plate:"Valst. nr.",client_name:"Vardas",phone:"Telefonas",
  kw:"kw",ltr:"ltr",eur:"€",journal:"Žurnalas",waiting:"Laukiami",arrived_label:"Atvykę",
  confirm_arrived:"Pažymėti kaip atvykusį?",yes:"Taip",no:"Ne",
  no_waiting:"Nėra laukiamų",no_arrived:"Dar niekas neatvyko",
  settings_label:"Nustatymai",work_days:"Darbo dienos",work_hours:"Darbo valandos",
  from:"Nuo",to:"Iki",services_label:"Paslaugos",service_name:"Pavadinimas",
  days_short:["P","A","T","K","Pn","Š","S"],days:["Pirm","Antr","Treč","Ketv","Penk","Šešt","Sekm"],
  months_full:["Sausio","Vasario","Kovo","Balandžio","Gegužės","Birželio","Liepos","Rugpjūčio","Rugsėjo","Spalio","Lapkričio","Gruodžio"],
  days_full:["sekmadienis","pirmadienis","antradienis","trečiadienis","ketvirtadienis","penktadienis","šeštadienis"],
  edit_order:"Redaguoti užsakymą",new_order:"Pridėti naują",delete_order:"Ištrinti",delete_confirm:"Ar tikrai norite ištrinti?",
  edit_service:"Redaguoti paslaugą",delete_service:"Ištrinti paslaugą",
  mark_arrived:"Atvyko",mark_waiting:"Laukiami",mark_completed:"Atlikta",
  start_after_end:"Pradžia negali būti vėliau nei pabaiga",logout:"Atsijungti",
  confirm_status:"Pakeisti statusą?",no_results:"Nieko nerasta",add:"Pridėti",
  duration_label:"Paslaugos trukmė (min)",
}};

async function getTenantId():Promise<string|null>{const s=supabase();const{data:{user}}=await s.auth.getUser();if(!user)return null;const{data:p}=await s.from("profiles").select("tenant_id").eq("id",user.id).single();return p?.tenant_id||null;}
async function sbInsert(tb:string,r:any):Promise<any>{const{data,error}=await supabase().from(tb).insert(r).select();if(error)console.error("sbI:",tb,error);return data?.[0]||null;}
async function sbUpdate(tb:string,id:string,u:any):Promise<any>{const{data,error}=await supabase().from(tb).update(u).eq("id",id).select();if(error)console.error("sbU:",tb,error);return data?.[0]||null;}
async function sbDelete(tb:string,id:string):Promise<void>{const{error}=await supabase().from(tb).delete().eq("id",id);if(error)console.error("sbD:",tb,error);}

const C={bg:"#f5f5f7",surface:"#ffffff",surface2:"#f0f0f2",border:"#e5e5ea",borderLight:"#f0f0f2",text:"#1c1c1e",textMuted:"#8e8e93",textLight:"#aeaeb2",accent:"#007aff",green:"#34c759",red:"#ff3b30",yellow:"#ffb800",orange:"#ff9500",arrivedBg:"#fff3d0",arrivedBorder:"#ffc107",completedBg:"#e8f5e9",cardShadow:"0 1px 3px rgba(0,0,0,0.06)"};
const FONT="'SF Pro Display','SF Pro Text',-apple-system,'Helvetica Neue',sans-serif";const FONT_MONO="'SF Mono','JetBrains Mono',monospace";
const SUFFIX:React.CSSProperties={position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:11,fontWeight:600,color:C.textMuted,pointerEvents:"none"};
const LBL:React.CSSProperties={fontSize:13,fontWeight:600,color:C.text,marginBottom:6,display:"block"};
const DW=52;
const Fi:React.CSSProperties={background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:14,fontFamily:FONT,width:"100%",outline:"none",boxSizing:"border-box"};
const FiInner:React.CSSProperties={...Fi,padding:"22px 12px 8px"};
// Figma-style: label floats inside input field
function FiField({label,children}:{label:string;children:React.ReactNode}){return(<div style={{position:"relative"}}><span style={{position:"absolute",top:6,left:12,fontSize:10,fontWeight:600,color:C.textMuted,zIndex:1,pointerEvents:"none"}}>{label}</span>{children}</div>);}

function addMin(time:string,mins:number):string{const[h,m]=(time||"09:00").split(":").map(Number);const tot=h*60+(m||0)+mins;return String(Math.min(Math.floor(tot/60),23)).padStart(2,"0")+":"+String(tot%60).padStart(2,"0");}

function getCardColor(op:any,svcMap:Record<string,any>):string{
  if(op.service_colors){const first=op.service_colors.split(",")[0]?.trim();if(first)return first;}
  if(op.operation_type){const sv=svcMap[op.operation_type];if(sv?.color)return sv.color;}
  return C.textMuted;// gray if no service assigned
}
// Get overflow service colors (3rd service onward, for left-side dots)
function getOverflowColors(op:any,svcMap:Record<string,any>):string[]{
  const cols:string[]=[];
  if(op.service_colors){op.service_colors.split(",").forEach((c:string)=>{const cl=c.trim();if(cl&&!cols.includes(cl))cols.push(cl);});}
  if(cols.length===0&&op.operation_type){const sv=svcMap[op.operation_type];if(sv?.color)cols.push(sv.color);}
  // Only return 3rd+ colors (overflow beyond the 2 text badges)
  return cols.slice(2,8);
}

// ══════ SHARED COMPONENTS ══════

function ServicePills({services,selected,onChange}:{services:any[];selected:string[];onChange:(k:string[])=>void}){
  const toggle=(key:string)=>{if(selected.includes(key))onChange(selected.filter((k2:string)=>k2!==key));else onChange([...selected,key]);};
  return(<div style={{display:"flex",flexWrap:"wrap",gap:5}}>{services.map((s:any)=>{const a=selected.includes(s.service_key);return(<button key={s.service_key} onClick={()=>toggle(s.service_key)} type="button" style={{padding:"6px 14px",borderRadius:14,border:a?"2px solid "+s.color:"1px solid "+C.border,background:a?s.color+"15":"transparent",color:a?s.color:C.textMuted,fontSize:12,fontWeight:600,cursor:"pointer"}}>{s.label}</button>);})}</div>);}

function ServiceBadges({op,services,svcMap}:any){
  const keys:string[]=[];
  if(op.service_colors){op.service_colors.split(",").forEach((col:string)=>{const f=services.find((s:any)=>s.color===col.trim());if(f&&!keys.includes(f.service_key))keys.push(f.service_key);});}
  if(keys.length===0&&op.operation_type)keys.push(op.operation_type);
  const show=keys.slice(0,2);if(show.length===0)return null;
  return(<div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>{show.map((k:string)=>{const s=svcMap[k];const col=s?.color||C.accent;return(<div key={k} style={{fontSize:11,fontWeight:600,color:col,background:col+"18",padding:"2px 8px",borderRadius:10,whiteSpace:"nowrap"}}>{s?.label||k}</div>);})}</div>);}

function ConfirmModal({text,onYes,onNo,color,localT,dark}:any){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}><div style={{background:C.surface,borderRadius:20,padding:24,maxWidth:280,textAlign:"center",boxShadow:"0 10px 40px rgba(0,0,0,0.15)"}}><div style={{fontSize:15,fontWeight:700,marginBottom:16,color:C.text}}>{text}</div><div style={{display:"flex",gap:10}}><button onClick={onNo} style={{flex:1,padding:12,borderRadius:12,border:"1px solid "+C.border,background:"transparent",color:C.textMuted,fontSize:14,fontWeight:600,cursor:"pointer"}}>{localT.no}</button><button onClick={onYes} style={{flex:1,padding:12,borderRadius:12,border:"none",background:color,color:dark?"#000":"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>{localT.yes}</button></div></div></div>);}

// ══════ STATUS BUTTONS — Figma: Ištrinti | Atlikta | Laukiami row + full-width blue Atvyko ══════
function StatusButtons({op,localT,onDelete,onStatusChange}:{op:any;localT:any;onDelete:()=>void;onStatusChange:(s:string)=>void}){
  const[showDel,setShowDel]=useState(false);const[showStatus,setShowStatus]=useState<string|null>(null);
  const isA=op.status==="arrived"||op.status==="in_progress";const isC=op.status==="completed";
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:16}}>
      <button onClick={()=>setShowDel(true)} style={{padding:"12px 0",borderRadius:10,border:"1px solid "+C.red+"40",background:"transparent",color:C.red,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:C.cardShadow}}>{localT.delete_order}</button>
      <button onClick={()=>setShowStatus("completed")} style={{padding:"12px 0",borderRadius:10,border:"none",background:isC?C.green+"20":"#f0f0f2",color:isC?C.green:C.text,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:C.cardShadow}}>{localT.mark_completed}</button>
      <button onClick={()=>setShowStatus("planned")} style={{padding:"12px 0",borderRadius:10,border:"none",background:"#f0f0f2",color:C.text,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:C.cardShadow}}>{localT.mark_waiting}</button>
    </div>
    <div style={{marginTop:8}}>
      <button onClick={()=>setShowStatus("arrived")} style={{width:"100%",padding:"14px 0",borderRadius:12,border:"none",background:C.yellow,color:"#000",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 6px rgba(255,184,0,0.3)"}}>{localT.mark_arrived}</button>
    </div>
    {showDel&&<ConfirmModal text={localT.delete_confirm} onYes={()=>{setShowDel(false);onDelete();}} onNo={()=>setShowDel(false)} color={C.red} localT={localT}/>}
    {showStatus&&<ConfirmModal text={localT.confirm_status} onYes={()=>{const s=showStatus;setShowStatus(null);onStatusChange(s);}} onNo={()=>setShowStatus(null)} color={showStatus==="arrived"?C.accent:showStatus==="completed"?C.green:C.accent} localT={localT}/>}
  </>);
}

// ══════ CARD — left dots = overflow services (3rd+), right = max 2 text badges ══════
function OrderCard({op,svcMap,services,onClick,showDate}:{op:any;svcMap:Record<string,any>;services:any[];onClick:()=>void;showDate?:boolean}){
  const overflowColors=getOverflowColors(op,svcMap);const isA=op.status==="arrived"||op.status==="in_progress";
  const ClockIcon=()=>(<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
  return(<div onClick={onClick} style={{background:isA?C.arrivedBg:C.surface,borderRadius:12,padding:"8px 12px",marginBottom:6,display:"flex",gap:4,cursor:"pointer",boxShadow:C.cardShadow}}>
    {/* Fixed-width left column for dots — always 20px for alignment */}
    <div style={{width:20,minWidth:20,display:"flex",flexDirection:"column",gap:3,flexShrink:0,paddingTop:4,alignItems:"center"}}>
      {overflowColors.map((c:string,i:number)=>(<div key={i} style={{width:8,height:8,borderRadius:4,background:c}}/>))}
    </div>
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{op.title||op.vehicle_plate||"—"}</div><ServiceBadges op={op} services={services} svcMap={svcMap}/></div>
      <div style={{display:"flex",gap:5,alignItems:"center",marginTop:4,fontSize:12,color:C.textMuted}}>
        <ClockIcon/>
        {showDate&&<span style={{fontFamily:FONT_MONO,fontWeight:600}}>{op.scheduled_date?.slice(5)}</span>}
        <span style={{fontFamily:FONT_MONO,fontWeight:600}}>{(op.start_time||"").slice(0,5)}</span>
        {op.vehicle_plate&&<span style={{fontWeight:700,color:C.text,fontFamily:FONT_MONO,marginLeft:2}}>{op.vehicle_plate}</span>}
        {op.customer_name&&<span style={{marginLeft:2}}>{op.customer_name}</span>}
        {!op.customer_name&&op.customer_phone&&<span style={{fontFamily:FONT_MONO,marginLeft:2}}>{op.customer_phone}</span>}
      </div>
    </div></div>);
}

// ══════ MAIN APP ══════
export default function VursoBasic(){
  const[locale]=useState("lt");const localT=T[locale];
  const[page,setPage]=useState("main");const nowInit=new Date();const todayLocal=nowInit.getFullYear()+"-"+String(nowInit.getMonth()+1).padStart(2,"0")+"-"+String(nowInit.getDate()).padStart(2,"0");const[selectedDate,setSelectedDate]=useState(todayLocal);
  const[settings,setSettings]=useState<any>({work_days:[1,2,3,4,5],work_hours_from:8,work_hours_to:18});
  const[services,setServices]=useState<any[]>([]);const[schedOps,setSchedOps]=useState<any[]>([]);
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);
  const[searchQuery,setSearchQuery]=useState("");
  const[tenantId,setTenantId]=useState<string|null>(null);const[userInfo,setUserInfo]=useState<any>(null);
  const[editingOp,setEditingOp]=useState<any>(null);const[editingSvc,setEditingSvc]=useState<any>(null);
  const[pageHistory,setPageHistory]=useState<string[]>([]);
  const goPage=(p:string)=>{setPageHistory(h=>[...h,page]);setPage(p);setEditingOp(null);setEditingSvc(null);};
  const goBack=()=>{if(pageHistory.length>0){const prev=pageHistory[pageHistory.length-1];setPageHistory(h=>h.slice(0,-1));setPage(prev);setEditingOp(null);setEditingSvc(null);}else{setPage("main");}};
  const goEdit=(op:any,from?:string)=>{if(from)setPageHistory(h=>[...h,from]);else setPageHistory(h=>[...h,page]);setEditingOp(op);setPage("editOp");};
  const handleDateSelect=(d:string)=>{if(d===selectedDate&&page==="main"){goPage("new");}else{setSelectedDate(d);}};

  useEffect(()=>{(async()=>{try{const s=supabase();const{data:{user}}=await s.auth.getUser();if(user)setUserInfo({email:user.email,name:user.user_metadata?.full_name||user.user_metadata?.name||""});
    const tid=await getTenantId();if(!tid){setLoading(false);return;}setTenantId(tid);
    const sd=new Date(Date.now()-7*86400000).toISOString().slice(0,10);const ed=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
    const[tR,sR,oR]=await Promise.all([s.from("tenants").select("settings").eq("id",tid).single(),s.from("service_catalog").select("*").eq("tenant_id",tid).eq("is_active",true).order("sort_order"),s.from("scheduled_operations").select("*").eq("tenant_id",tid).gte("scheduled_date",sd).lte("scheduled_date",ed).order("scheduled_date").order("start_time")]);
    if(tR.data?.settings&&Object.keys(tR.data.settings).length>0)setSettings(tR.data.settings);setServices(sR.data||[]);setSchedOps(oR.data||[]);}catch(e){console.error(e);}setLoading(false);})();},[]);
  const refreshOps=useCallback(async()=>{if(!tenantId)return;const sd=new Date(Date.now()-7*86400000).toISOString().slice(0,10);const ed=new Date(Date.now()+14*86400000).toISOString().slice(0,10);const{data}=await supabase().from("scheduled_operations").select("*").eq("tenant_id",tenantId).gte("scheduled_date",sd).lte("scheduled_date",ed).order("scheduled_date").order("start_time");setSchedOps(data||[]);},[tenantId]);
  const refreshSvc=useCallback(async()=>{if(!tenantId)return;const{data}=await supabase().from("service_catalog").select("*").eq("tenant_id",tenantId).eq("is_active",true).order("sort_order");setServices(data||[]);},[tenantId]);
  const handleLogout=async()=>{await supabase().auth.signOut();window.location.href="/login";};
  if(loading)return(<div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT}}><div style={{color:C.textMuted,fontSize:14}}>{localT.loading}</div></div>);
  const isEditing=page==="new"||page==="editOp"||page==="editSvc";
  const settingsIcon=page==="settings"?"✓":"⚙";
  const settingsClick=()=>{if(page==="settings")window.dispatchEvent(new Event("vurso-save-settings"));else goPage("settings");};
  const plusIcon=isEditing?(saving?"...":"✓"):"+";
  const plusClick=()=>{if(isEditing)window.dispatchEvent(new Event("vurso-save"));else goPage("new");};
  // SVG icons matching Figma
  const IconPlus=()=>(<svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>);
  const IconCheck=()=>(<svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  const IconDot=()=>(<svg width={isSmall?16:20} height={isSmall?16:20} viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" fill="#1c1c1e"/></svg>);
  const IconBack=()=>(<svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l6-6M5 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  const IconSearch=()=>(<svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2"/><path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
  const IconGear=()=>(<svg width={iconSz} height={iconSz} viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg>);

  // Responsive nav sizing: scale down on small screens (< 380px)
  const screenH=typeof window!=='undefined'?window.innerHeight:844;
  const isSmall=screenH<750;
  const TB_SZ=isSmall?40:48;const TB_RAD=isSmall?12:14;const TB_ICON_COLOR="#555";
  const navPad=isSmall?8:12;const navGap=isSmall?4:6;const navW=isSmall?60:72;const navRad=isSmall?16:20;
  const iconSz=isSmall?20:24;
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:FONT,color:C.text,overflowX:"hidden"}}>
      <style>{`.hide-scrollbar::-webkit-scrollbar{display:none}`}</style>
      <div style={{paddingRight:navW+8,minHeight:"100vh"}}>
        {page==="main"&&<MainPage t={localT} settings={settings} services={services} schedOps={schedOps} selectedDate={selectedDate} setSelectedDate={handleDateSelect} onEditOp={(op:any)=>goEdit(op)}/>}
        {page==="new"&&<NewClientPage t={localT} settings={settings} services={services} schedOps={schedOps} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setSaving={setSaving} tenantId={tenantId} onSave={async()=>{await refreshOps();goBack();}} prefillDate={selectedDate}/>}
        {page==="editOp"&&editingOp&&<EditOpPage t={localT} settings={settings} op={editingOp} services={services} setSaving={setSaving} onSave={async()=>{await refreshOps();goBack();}} onDelete={async()=>{await sbDelete("scheduled_operations",editingOp.id);await refreshOps();goBack();}} refreshOps={refreshOps}/>}
        {page==="arrived"&&<JournalPage t={localT} services={services} schedOps={schedOps} refreshOps={refreshOps} onEditOp={(op:any)=>goEdit(op,"arrived")} settings={settings} selectedDate={selectedDate} onDateChange={setSelectedDate}/>}
        {page==="search"&&<SearchPage t={localT} tenantId={tenantId} onEditOp={(op:any)=>goEdit(op,"search")} query={searchQuery} setQuery={setSearchQuery} services={services}/>}
        {page==="settings"&&<SettingsPage t={localT} settings={settings} setSettings={setSettings} services={services} setServices={setServices} tenantId={tenantId} onEditSvc={(svc:any)=>{setPageHistory(h=>[...h,page]);setEditingSvc(svc);setPage("editSvc");}} goMain={goBack} userInfo={userInfo} onLogout={handleLogout}/>}
        {page==="editSvc"&&editingSvc&&<EditSvcPage t={localT} svc={editingSvc} setSaving={setSaving} onSave={async()=>{await refreshSvc();goBack();}} onDelete={async()=>{await sbDelete("service_catalog",editingSvc.id);await refreshSvc();goBack();}}/>}
      </div>
      {/* ══ NAV — responsive: scales down on small screens ══ */}
      <div style={{position:"fixed",right:16,bottom:20,zIndex:50,background:"#ffffff",borderRadius:navRad,padding:navPad,display:"flex",flexDirection:"column",gap:navGap,boxShadow:"0 4px 14px 0 #E0E0E2",width:navW,alignItems:"center"}}>
        {/* + button: largest, blue */}
        <button onClick={plusClick} style={{width:TB_SZ,height:TB_SZ,borderRadius:TB_RAD,border:"none",background:C.accent,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px "+C.accent+"40",transition:"all 0.15s",flexShrink:0}}>{isEditing?(saving?<span style={{fontSize:14,fontWeight:700}}>...</span>:<IconCheck/>):<IconPlus/>}</button>
        {/* Journal dot button: yellow bg */}
        <button onClick={()=>goPage("arrived")} style={{width:TB_SZ,height:TB_SZ,borderRadius:TB_RAD,border:"none",background:"#fff3d0",color:"#1c1c1e",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}><IconDot/></button>
        {/* Back arrow */}
        <button onClick={goBack} style={{width:TB_SZ,height:TB_SZ,borderRadius:TB_RAD,border:"none",background:"#eeeef0",color:TB_ICON_COLOR,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}><IconBack/></button>
        {/* Search */}
        <button onClick={()=>goPage("search")} style={{width:TB_SZ,height:TB_SZ,borderRadius:TB_RAD,border:"none",background:"#eeeef0",color:TB_ICON_COLOR,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}><IconSearch/></button>
        {/* Settings */}
        <button onClick={settingsClick} style={{width:TB_SZ,height:TB_SZ,borderRadius:TB_RAD,border:"none",background:"#eeeef0",color:TB_ICON_COLOR,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{page==="settings"?<IconCheck/>:<IconGear/>}</button>
      </div></div>);
}

// ══════ GANTT — scrollable, 14 work days forward, today=bottom ══════
function GanttView({settings,schedOps,services,selectedDate,setSelectedDate,compact}:any){
  const hFrom=settings.work_hours_from||8;const hTo=settings.work_hours_to||18;
  const hours:number[]=[];for(let h=hFrom;h<=hTo;h++)hours.push(h);const totalMin=(hTo-hFrom)*60;
  const today=new Date();const lt=T.lt;
  const workDays=settings.work_days||[1,2,3,4,5];
  // Generate 14 work days forward (DST-safe)
  const candidateDates:string[]=[];
  for(let i=0;candidateDates.length<14&&i<30;i++){const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()+i);const ds=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const dow=d.getDay();const dowN=dow===0?7:dow;
    const isWorkDay=workDays.includes(dowN);
    const hasOwnJob=!isWorkDay&&schedOps.some((op:any)=>op.scheduled_date===ds);
    if(isWorkDay||hasOwnJob)candidateDates.push(ds);
  }
  // Reversed: today at bottom, future at top
  const dates=[...candidateDates].reverse();
  const svcMap:Record<string,any>={};(services||[]).forEach((s:any)=>{svcMap[s.service_key]=s;});
  const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();const nowPct=Math.max(0,Math.min(100,((nowMin-hFrom*60)/totalMin)*100));const todayStr=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
  const screenH2=typeof window!=='undefined'?window.innerHeight:844;const navOffset=(screenH2<750?60:72)+8;
  const rowH=compact?40:48;const screenW=typeof window!=='undefined'?window.innerWidth:393;const availW=screenW-32-44-4;const colW=Math.max(36,Math.floor(availW/hours.length));const ganttW=hours.length*colW;
  const dayLetter=(ds:string)=>{const d=new Date(ds+"T00:00:00");const dow=d.getDay();return lt.days_short[dow===0?6:dow-1];};
  const isWeekend=(ds:string)=>{const d=new Date(ds+"T00:00:00");const dow=d.getDay();return dow===0||dow===6;};
  const DWg=44;
  const visibleRows=compact?4:5;const ganttH=visibleRows*rowH+36;
  const scrollRef=useRef<HTMLDivElement>(null);
  const dayScrollRef=useRef<HTMLDivElement>(null);
  // Scroll to bottom (today) on mount
  useEffect(()=>{setTimeout(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;if(dayScrollRef.current)dayScrollRef.current.scrollTop=dayScrollRef.current.scrollHeight;},50);},[]);
  // Sync vertical scroll between day labels and gantt rows
  const syncing=useRef(false);
  const syncScroll=(src:"day"|"gantt")=>{if(syncing.current)return;syncing.current=true;
    if(src==="gantt"&&scrollRef.current&&dayScrollRef.current){dayScrollRef.current.scrollTop=scrollRef.current.scrollTop;}
    if(src==="day"&&dayScrollRef.current&&scrollRef.current){scrollRef.current.scrollTop=dayScrollRef.current.scrollTop;}
    requestAnimationFrame(()=>{syncing.current=false;});
  };
  return(
    <div style={{zIndex:20,marginRight:-navOffset,padding:"0 16px"}}>
      <div style={{display:"flex",background:"#ffffff",borderRadius:32,overflow:"hidden",boxShadow:compact?"none":"0 4px 14px 0 #E0E0E2",height:ganttH}}>
      {/* Day labels column — synced scroll */}
      <div style={{width:DWg,minWidth:DWg,flexShrink:0,zIndex:15,display:"flex",flexDirection:"column"}}>
        <div style={{height:36,flexShrink:0}}/>
        <div ref={dayScrollRef} onScroll={()=>syncScroll("day")} style={{flex:1,overflowY:"auto",overflowX:"hidden",scrollbarWidth:"none",overscrollBehavior:"contain"}} className="hide-scrollbar">
        {dates.map((ds:string)=>{const isSel=ds===selectedDate;const isToday=ds===todayStr;const dayNum=ds.slice(8,10);const wknd=isWeekend(ds);
          return(<div key={ds} onClick={()=>setSelectedDate?.(ds)} style={{height:rowH,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            {isSel?(<div style={{width:34,height:34,borderRadius:17,background:C.accent,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:15,fontWeight:800,color:wknd?"#ff1f00":"#fff",lineHeight:1}}>{dayNum}</span><span style={{fontSize:9,fontWeight:700,color:wknd?"#ff1f00aa":"rgba(255,255,255,0.7)",lineHeight:1,marginTop:1}}>{dayLetter(ds)}</span></div>)
            :(<><span style={{fontSize:15,fontWeight:isToday?800:600,color:wknd?"#ff1f00":isToday?C.text:C.textMuted,lineHeight:1}}>{dayNum}</span><span style={{fontSize:9,fontWeight:600,color:wknd?"#ff1f00":C.textLight,lineHeight:1,marginTop:2}}>{dayLetter(ds)}</span></>)}
          </div>);})}
        </div>
      </div>
      <div style={{width:4,flexShrink:0}}/>
      {/* Gantt area — horizontal scroll + synced vertical scroll */}
      <div style={{flex:1,overflowX:"auto",overflowY:"hidden",display:"flex",flexDirection:"column"}}>
        {/* Fixed hours header */}
        <div style={{display:"flex",borderBottom:"1px solid "+C.borderLight,position:"relative",flexShrink:0,minWidth:ganttW,paddingLeft:8}}>{hours.map((h:number,i:number)=>{const isNowH=h===now.getHours()&&dates.includes(todayStr);return(<div key={h} style={{width:colW,minWidth:colW,padding:"10px 0",fontSize:12,fontWeight:isNowH?800:600,color:isNowH?C.accent:C.textMuted,fontFamily:FONT_MONO,position:"relative"}}><span style={{position:"absolute",left:0,transform:"translateX(-50%)"}}>{h}</span></div>);})}</div>
        {/* Vertically scrollable rows */}
        <div ref={scrollRef} onScroll={()=>syncScroll("gantt")} style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingLeft:8,scrollbarWidth:"none",overscrollBehavior:"contain"}} className="hide-scrollbar">
          <div style={{minWidth:ganttW}}>
          {dates.map((ds:string,di:number)=>{const isSel=ds===selectedDate;const isToday=ds===todayStr;const isLast=di===dates.length-1;
            const dateOps=schedOps.filter((op:any)=>{const s=op.scheduled_date;const e=op.end_date||op.scheduled_date;return ds>=s&&ds<=e;});
            return(<div key={ds} onClick={()=>setSelectedDate?.(ds)} style={{display:"flex",position:"relative",height:rowH,flexShrink:0,borderBottom:isLast?"none":"1.5px solid #d1d1d6",background:isSel?C.surface2+"80":"transparent",cursor:"pointer"}}>
              {hours.map((h:number,i:number)=>(<div key={h} style={{width:colW,minWidth:colW,borderLeft:"1px solid "+C.borderLight}}/>))}
              {isToday&&nowPct>=0&&nowPct<=100&&<div style={{position:"absolute",left:(nowPct/100)*ganttW,top:0,bottom:0,width:0,borderLeft:"2px dashed "+C.accent,zIndex:5,opacity:0.7}}/>}
              {(()=>{
                const barData=dateOps.map((op:any)=>{
                  const opS=op.scheduled_date;const opE=op.end_date||op.scheduled_date;const isFD=ds===opS;const isLD=ds===opE;const isMD=ds>opS&&ds<opE;
                  let sM:number,eM:number;
                  if(isMD){sM=hFrom*60;eM=hTo*60;}else if(isFD&&!isLD){sM=parseInt((op.start_time||"08:00").split(":")[0])*60+parseInt((op.start_time||"08:00").split(":")[1]||"0");eM=hTo*60;}else if(!isFD&&isLD){sM=hFrom*60;eM=parseInt((op.end_time||"18:00").split(":")[0])*60+parseInt((op.end_time||"18:00").split(":")[1]||"0");}else{sM=parseInt((op.start_time||"08:00").split(":")[0])*60+parseInt((op.start_time||"08:00").split(":")[1]||"0");eM=parseInt((op.end_time||"09:00").split(":")[0])*60+parseInt((op.end_time||"09:00").split(":")[1]||"0");if(eM<=sM)eM=sM+(op.duration_minutes||60);}
                  if(sM<hFrom*60)sM=hFrom*60;if(eM>hTo*60)eM=hTo*60;
                  return{op,sM,eM};
                }).filter((b:any)=>b.eM>b.sM);
                const lanes:any[][]=[];
                barData.forEach((b:any)=>{let placed=false;for(let l=0;l<lanes.length;l++){if(!lanes[l].some((lb:any)=>b.sM<lb.eM&&b.eM>lb.sM)){lanes[l].push(b);placed=true;break;}}if(!placed)lanes.push([b]);});
                const laneCount=Math.max(lanes.length,1);const pad=compact?6:8;const totalH=rowH-pad*2;
                return lanes.flatMap((lane:any[],li:number)=>lane.map(({op:opItem,sM:s,eM:e}:any)=>{
                  const left=((s-hFrom*60)/totalMin)*ganttW;const width=Math.max(((e-s)/totalMin)*ganttW,16);
                  const bc=getCardColor(opItem,svcMap);
                  const laneH=totalH/laneCount;const topPos=pad+li*laneH;
                  const showText=laneCount<=3;
                  return(<div key={opItem.id} style={{position:"absolute",left,width,top:topPos,height:laneH-1,borderRadius:laneCount>3?8:16,background:bc,display:"flex",alignItems:"center",padding:showText?"0 8px":"0",overflow:"hidden",boxShadow:"2px 2px 4px 0 rgba(0,0,0,0.15)"}}>{showText&&<span style={{fontSize:compact?8:laneCount>1?9:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{opItem.title||opItem.vehicle_plate||""}</span>}</div>);
                }));
              })()}</div>);})}
          </div>
        </div>
      </div></div></div>);
}

// ══════ MAIN PAGE ══════
function MainPage({t,settings,services,schedOps,selectedDate,setSelectedDate,onEditOp}:any){
  const svcMap:Record<string,any>={};(services||[]).forEach((s:any)=>{svcMap[s.service_key]=s;});
  const dayOps=schedOps.filter((op:any)=>{const s=op.scheduled_date;const e=op.end_date||op.scheduled_date;return selectedDate>=s&&selectedDate<=e;});
  const waiting=dayOps.filter((op:any)=>op.status==="planned"||op.status==="queued");
  const arrived=dayOps.filter((op:any)=>op.status==="arrived"||op.status==="in_progress");
  const fmtH=(ds:string)=>{const d=new Date(ds+"T00:00:00");return t.months_full[d.getMonth()]+" "+d.getDate()+", "+t.days_full[d.getDay()];};
  const nowTime=new Date();const timeStr=String(nowTime.getHours()).padStart(2,"0")+":"+String(nowTime.getMinutes()).padStart(2,"0");
  const RPill=({label,color}:{label:string;color:string})=>(<div style={{display:"flex",justifyContent:"flex-end",marginBottom:6,marginTop:10}}><span style={{fontSize:12,fontWeight:700,color,background:color+"12",padding:"5px 16px",borderRadius:14}}>{label}</span></div>);
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden"}}>
      {/* Gantt — fixed top block, higher z-index so cards scroll behind it */}
      <div style={{flexShrink:0,position:"relative",zIndex:10,background:C.bg}}>
        <GanttView settings={settings} schedOps={schedOps} services={services} selectedDate={selectedDate} setSelectedDate={setSelectedDate}/>
      </div>
      {/* Cards — scrollable below, can go behind gantt */}
      <div style={{flex:1,overflow:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:0}}>
        <div style={{marginBottom:4}}>
          <div style={{fontSize:20,fontWeight:800,color:C.text}}>{fmtH(selectedDate)}</div>
          <div style={{fontSize:13,color:C.textMuted,marginTop:2}}>{timeStr}</div>
        </div>
        {waiting.length>0&&<>
          <RPill label={t.waiting} color={C.textMuted}/>
          {waiting.map((op:any)=><OrderCard key={op.id} op={op} svcMap={svcMap} services={services} onClick={()=>onEditOp(op)}/>)}
        </>}
        {arrived.length>0&&<>
          <RPill label={t.arrived_label} color={C.orange}/>
          {arrived.map((op:any)=><OrderCard key={op.id} op={op} svcMap={svcMap} services={services} onClick={()=>onEditOp(op)}/>)}
        </>}
        {dayOps.length===0&&<div style={{color:C.textMuted,fontSize:14,textAlign:"center",padding:30}}>{t.no_orders}</div>}
      </div></div>);
}

// ══════ EDIT ORDER — Figma field order ══════
function EditOpPage({t,settings,op,services,setSaving,onSave,onDelete,refreshOps}:any){
  const svcMap:Record<string,any>={};(services||[]).forEach((s:any)=>{svcMap[s.service_key]=s;});
  const defDur=settings.default_duration||60;
  const initKeys:string[]=[];if(op.service_colors){op.service_colors.split(",").forEach((col:string)=>{const f=services.find((s:any)=>s.color===col.trim());if(f&&!initKeys.includes(f.service_key))initKeys.push(f.service_key);});}if(initKeys.length===0&&op.operation_type)initKeys.push(op.operation_type);
  const titleParts=(op.title||"").split(" ");const initMake=titleParts[0]||"";const initModel=titleParts.slice(1).join(" ")||"";
  const[form,setForm]=useState({title:op.title||"",date_from:op.scheduled_date||new Date().toISOString().slice(0,10),date_to:op.end_date||op.scheduled_date||new Date().toISOString().slice(0,10),start_time:(op.start_time||"09:00").slice(0,5),end_time:(op.end_time||"10:00").slice(0,5),vehicle_plate:op.vehicle_plate||"",customer_name:op.customer_name||"",notes:op.notes||"",make:initMake,model:initModel,cc:op.vehicle_cc||"",kw:op.vehicle_kw||"",price:op.service_price?String(op.service_price):"",phone:op.customer_phone||""});
  const[selectedSvcs,setSelectedSvcs]=useState<string[]>(initKeys);const[valErr,setValErr]=useState("");
  // Auto-fill price when services change
  const handleSvcChange=(keys:string[])=>{setSelectedSvcs(keys);const total=keys.reduce((sum:number,k:string)=>{const s=svcMap[k];return sum+(s?.default_price||0);},0);if(total>0)setForm((f:any)=>({...f,price:String(total)}));};
  const set=(k:string,v:string)=>{setForm((f:any)=>{const u={...f,[k]:v};if(k==="date_from"){if(u.date_to<v)u.date_to=v;}if(k==="start_time"&&v.length===5){u.end_time=addMin(v,defDur);}return u;});setValErr("");};
  const handleSave=useCallback(async()=>{if(form.start_time>=form.end_time&&form.date_from===form.date_to){setValErr(t.start_after_end);return;}setSaving(true);
    const title=(form.make&&form.model)?form.make+" "+form.model:form.title;const vInfo=form.make+" "+form.model+(form.cc?" "+form.cc:"");
    const svcColors=selectedSvcs.map((k:string)=>svcMap[k]?.color||C.accent).join(",");
    await sbUpdate("scheduled_operations",op.id,{title,operation_type:selectedSvcs[0]||null,color:svcMap[selectedSvcs[0]]?.color||op.color,service_colors:svcColors||null,scheduled_date:form.date_from,end_date:form.date_to!==form.date_from?form.date_to:null,start_time:form.start_time+":00",end_time:form.end_time+":00",vehicle_plate:form.vehicle_plate,customer_name:form.customer_name,customer_phone:form.phone||null,service_price:form.price?parseFloat(form.price):null,vehicle_info:vInfo.trim()||null,vehicle_cc:form.cc||null,vehicle_kw:form.kw||null,notes:form.notes});
    if(op.work_order_id){await supabase().from("work_orders").update({services:selectedSvcs,order_date:form.date_from,service_price:form.price?parseFloat(form.price):0}).eq("id",op.work_order_id);}setSaving(false);onSave();},[form,op,selectedSvcs,svcMap,setSaving,onSave,t]);
  const handleStatusChange=async(newStatus:string)=>{await sbUpdate("scheduled_operations",op.id,{status:newStatus});await refreshOps();onSave();};
  useEffect(()=>{const h=()=>handleSave();window.addEventListener("vurso-save",h);return()=>window.removeEventListener("vurso-save",h);},[handleSave]);
  return(<div style={{padding:"16px 14px"}}>
    <h3 style={{fontSize:22,fontWeight:800,marginBottom:16,fontStyle:"italic"}}>{t.edit_order}</h3>
    {valErr&&<div style={{background:C.red+"15",color:C.red,padding:"10px 14px",borderRadius:10,marginBottom:10,fontSize:13,fontWeight:600}}>{valErr}</div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <FiField label={t.displacement+" ("+t.ltr+")"}><input style={FiInner} value={form.cc} onChange={(e:any)=>set("cc",e.target.value)}/></FiField>
      <FiField label={t.power+" ("+t.kw+")"}><input style={FiInner} type="number" value={form.kw} onChange={(e:any)=>set("kw",e.target.value)}/></FiField>
      <div style={{gridColumn:"1 / -1"}}><ServicePills services={services} selected={selectedSvcs} onChange={handleSvcChange}/></div>
      <FiField label="Atvykimas"><input style={FiInner} type="date" value={form.date_from} onChange={(e:any)=>set("date_from",e.target.value)}/></FiField>
      <FiField label="Išvykimas"><input style={FiInner} type="date" value={form.date_to} onChange={(e:any)=>set("date_to",e.target.value)} min={form.date_from}/></FiField>
      <FiField label={t.from}><input style={FiInner} type="time" lang="lt" value={form.start_time} onChange={(e:any)=>set("start_time",e.target.value)}/></FiField>
      <FiField label={t.to}><input style={FiInner} type="time" lang="lt" value={form.end_time} onChange={(e:any)=>set("end_time",e.target.value)} min={form.start_time}/></FiField>
      <FiField label={t.plate}><input style={{...FiInner,textTransform:"uppercase",fontFamily:FONT_MONO,fontWeight:700}} value={form.vehicle_plate} onChange={(e:any)=>set("vehicle_plate",e.target.value.toUpperCase())}/></FiField>
      <FiField label={t.client_name}><input style={FiInner} value={form.customer_name} onChange={(e:any)=>set("customer_name",e.target.value)}/></FiField>
      <FiField label={t.price+" (EUR)"}><input style={FiInner} type="number" value={form.price} onChange={(e:any)=>set("price",e.target.value)}/></FiField>
      <FiField label={t.phone+" (+370)"}><input type="tel" inputMode="numeric" style={{...FiInner,fontFamily:FONT_MONO}} value={form.phone} onChange={(e:any)=>set("phone",e.target.value)}/></FiField>
      <FiField label={t.model}><input style={FiInner} value={form.model} onChange={(e:any)=>set("model",e.target.value)}/></FiField>
      <FiField label={t.manufacturer}><input style={FiInner} value={form.make} onChange={(e:any)=>set("make",e.target.value)}/></FiField>
      <div style={{gridColumn:"1 / -1"}}><textarea style={{...Fi,minHeight:50,resize:"vertical"}} value={form.notes} onChange={(e:any)=>set("notes",e.target.value)} placeholder="Pastabos..."/></div>
    </div>
    <StatusButtons op={op} localT={t} onDelete={onDelete} onStatusChange={handleStatusChange}/>
  </div>);
}

// ══════ EDIT SERVICE — hue picker + lightness slider + price ══════
// HSL to Hex helper
function hslToHex(h:number,s:number,l:number):string{
  const a=s*Math.min(l,1-l);const f=(n:number)=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,"0");};
  return"#"+f(0)+f(8)+f(4);
}
// Hex to HSL helper (safe)
function hexToHsl(hex:string):{h:number;s:number;l:number}{
  try{
    if(!hex||hex.length<7)return{h:210,s:1,l:0.5};
    const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
    if(isNaN(r)||isNaN(g)||isNaN(b))return{h:210,s:1,l:0.5};
    const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0;const l=(max+min)/2;
    if(max!==min){const d=max-min;const s=l>0.5?d/(2-max-min):d/(max+min);if(max===r)h=((g-b)/d+(g<b?6:0))*60;else if(max===g)h=((b-r)/d+2)*60;else h=((r-g)/d+4)*60;return{h,s,l};}
    return{h:0,s:0,l};
  }catch(e){return{h:210,s:1,l:0.5};}
}

function EditSvcPage({t,svc,setSaving,onSave,onDelete}:any){
  let initH=210,initSlider=40;
  try{const hsl=hexToHsl(svc.color||"#3b82f6");initH=Math.round(hsl.h);
    initSlider=Math.round(Math.max(0,Math.min(100,((hsl.l*100)-30)/50*100)));}catch(e){}
  const[label,setLabel]=useState(svc.label||"");
  const[hue,setHue]=useState(initH);
  const[slider,setSlider]=useState(initSlider);
  const[price,setPrice]=useState(svc.default_price?String(svc.default_price):"");
  const[showDel,setShowDel]=useState(false);
  const realL=(30+slider/100*50)/100;
  let color="#3b82f6";try{color=hslToHex(hue,1,realL);}catch(e){}
  const HUES=[0,20,40,55,120,170,200,230,270,310,340];
  const selectHue=(h:number)=>{setHue(h);if(slider>90)setSlider(40);};
  const handleSave=useCallback(async()=>{setSaving(true);await sbUpdate("service_catalog",svc.id,{label,color,default_price:price?parseFloat(price):null});setSaving(false);onSave();},[label,color,price,svc,setSaving,onSave]);
  useEffect(()=>{const h=()=>handleSave();window.addEventListener("vurso-save",h);return()=>window.removeEventListener("vurso-save",h);},[handleSave]);
  const sliderDark=hslToHex(hue,1,0.3);const sliderLight=hslToHex(hue,1,0.8);
  return(<div style={{padding:"16px 14px"}}><h3 style={{fontSize:18,fontWeight:800,marginBottom:14}}>{t.edit_service}</h3>
    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
      <div style={{width:48,height:48,borderRadius:12,background:color,flexShrink:0}}/>
      <input style={{...Fi,flex:1}} value={label} onChange={(e:any)=>setLabel(e.target.value)} placeholder={t.service_name}/>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
      {HUES.map((h:number)=>{const c=hslToHex(h,1,0.5);const sel=Math.abs(hue-h)<15;return(
        <button key={h} onClick={()=>selectHue(h)} style={{width:28,height:28,borderRadius:14,background:c,border:sel?"3px solid "+C.text:"2px solid transparent",cursor:"pointer",flexShrink:0,boxSizing:"border-box"}}/>);})}
    </div>
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:4}}>Šviesumas</div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1,height:24,borderRadius:12,background:`linear-gradient(to right, ${sliderDark}, ${sliderLight})`,position:"relative",cursor:"pointer",border:"1px solid "+C.border}} onClick={(e:any)=>{const rect=e.currentTarget.getBoundingClientRect();const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));setSlider(Math.round(pct*100));}}>
          <div style={{position:"absolute",left:`${slider}%`,top:-2,width:16,height:28,borderRadius:8,background:"#fff",border:"2px solid "+C.text,transform:"translateX(-50%)",boxShadow:C.cardShadow,pointerEvents:"none"}}/>
        </div>
        <span style={{fontSize:12,fontFamily:FONT_MONO,color:C.textMuted,minWidth:30}}>{slider}%</span>
      </div>
    </div>
    <FiField label={t.price+" (EUR)"}><input style={{...FiInner,width:140,fontFamily:FONT_MONO}} type="number" value={price} onChange={(e:any)=>setPrice(e.target.value)} placeholder="0"/></FiField>
    <div style={{height:16}}/>
    <button onClick={()=>setShowDel(true)} style={{padding:"12px 20px",borderRadius:12,border:"1px solid "+C.red+"40",background:"transparent",color:C.red,fontSize:14,fontWeight:700,cursor:"pointer",width:"100%"}}>{t.delete_service}</button>
    {showDel&&<ConfirmModal text={t.delete_confirm} onYes={onDelete} onNo={()=>setShowDel(false)} color={C.red} localT={t}/>}
  </div>);
}

// ══════ NEW CLIENT — Figma field order ══════
function NewClientPage({t,settings,services,schedOps,selectedDate,setSelectedDate,setSaving,tenantId,onSave,prefillDate}:any){
  const svcMap:Record<string,any>={};(services||[]).forEach((s:any)=>{svcMap[s.service_key]=s;});const _n=new Date();const todayStr=_n.getFullYear()+"-"+String(_n.getMonth()+1).padStart(2,"0")+"-"+String(_n.getDate()).padStart(2,"0");
  const defDur=settings.default_duration||60;const initDate=prefillDate||todayStr;
  const[form,setForm]=useState({make:"",model:"",cc:"",kw:"",date_from:initDate,date_to:initDate,time:"09:00",end_time:addMin("09:00",defDur),price:"",plate:"",name:"",phone:"",notes:""});
  const[selectedSvcs,setSelectedSvcs]=useState<string[]>([]);const[suggestions,setSuggestions]=useState<string[]>([]);const[showSug,setShowSug]=useState(false);
  const handleSvcChange=(keys:string[])=>{setSelectedSvcs(keys);const total=keys.reduce((sum:number,k:string)=>{const s=svcMap[k];return sum+(s?.default_price||0);},0);if(total>0)setForm((f:any)=>({...f,price:String(total)}));};
  const MAKES=["Audi","BMW","Citroen","Dacia","Fiat","Ford","Honda","Hyundai","Jaguar","Jeep","Kia","Land Rover","Lexus","Mazda","Mercedes-Benz","Mini","Mitsubishi","Nissan","Opel","Peugeot","Porsche","Renault","Seat","Skoda","Subaru","Suzuki","Tesla","Toyota","Volkswagen","Volvo"];
  const set=(k:string,v:string)=>{setForm((f:any)=>{const u={...f,[k]:v};if(k==="date_from"){if(u.date_to<v)u.date_to=v;}if(k==="time"&&v.length===5){u.end_time=addMin(v,defDur);}return u;});};
  const handleMake=(v:string)=>{set("make",v);if(v.length>0){const f=MAKES.filter(m=>m.toLowerCase().startsWith(v.toLowerCase()));setSuggestions(f);setShowSug(f.length>0);}else setShowSug(false);};
  const handleSave=useCallback(async()=>{if(!form.make||!form.date_from||!form.time||!tenantId)return;setSaving(true);try{
    let custId:string|null=null;if(form.name||form.phone){const c=await sbInsert("customers",{tenant_id:tenantId,name:form.name,phone:form.phone});if(c?.id)custId=c.id;}
    const veh=await sbInsert("vehicles",{tenant_id:tenantId,make:form.make,model:form.model,cc:form.cc,kw:form.kw?parseFloat(form.kw):null,plate:form.plate,customer_id:custId});
    const wo=await sbInsert("work_orders",{tenant_id:tenantId,vehicle_id:veh?.id,customer_id:custId,order_date:form.date_from,services:selectedSvcs,service_price:form.price?parseFloat(form.price):0,vehicle_plate:form.plate,status:"queued"});
    const sH=parseInt(form.time.split(":")[0]);const sMin=parseInt(form.time.split(":")[1]||"0");const eH=parseInt(form.end_time.split(":")[0]);const eMin=parseInt(form.end_time.split(":")[1]||"0");
    const dur=Math.max((eH*60+eMin)-(sH*60+sMin),30);const{data:ws}=await supabase().from("workshops").select("id").eq("tenant_id",tenantId).limit(1);
    const svcColors=selectedSvcs.map((k:string)=>svcMap[k]?.color||C.accent).join(",");const endDate=form.date_to!==form.date_from?form.date_to:null;
    await sbInsert("scheduled_operations",{tenant_id:tenantId,work_order_id:wo?.id,workshop_id:ws?.[0]?.id||null,title:form.make+" "+form.model,operation_type:selectedSvcs[0]||null,color:svcMap[selectedSvcs[0]]?.color||C.accent,service_colors:svcColors||null,scheduled_date:form.date_from,end_date:endDate,start_time:form.time+":00",end_time:form.end_time+":00",duration_minutes:dur,vehicle_plate:form.plate,vehicle_info:form.make+" "+form.model+(form.cc?" "+form.cc:""),vehicle_cc:form.cc||null,vehicle_kw:form.kw||null,customer_name:form.name,customer_phone:form.phone||null,service_price:form.price?parseFloat(form.price):null,notes:form.notes||null,status:"planned"});
    setTimeout(()=>onSave(),400);}catch(e){console.error(e);}setSaving(false);},[form,selectedSvcs,svcMap,setSaving,onSave,tenantId]);
  useEffect(()=>{const h=()=>handleSave();window.addEventListener("vurso-save",h);return()=>window.removeEventListener("vurso-save",h);},[handleSave]);
  return(<div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
    <GanttView settings={settings} schedOps={schedOps} services={services} selectedDate={selectedDate} setSelectedDate={setSelectedDate} compact/>
    <div style={{flex:1,overflow:"auto",padding:"10px 12px"}}>
      <h3 style={{fontSize:22,fontWeight:800,marginBottom:12,fontStyle:"italic"}}>{t.new_order}</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <FiField label={t.displacement+" ("+t.ltr+")"}><input style={FiInner} value={form.cc} onChange={(e:any)=>set("cc",e.target.value)}/></FiField>
      <FiField label={t.power+" ("+t.kw+")"}><input style={FiInner} type="number" value={form.kw} onChange={(e:any)=>set("kw",e.target.value)}/></FiField>
      <div style={{gridColumn:"1 / -1"}}><ServicePills services={services} selected={selectedSvcs} onChange={handleSvcChange}/></div>
      <FiField label="Atvykimas"><input style={FiInner} type="date" value={form.date_from} onChange={(e:any)=>set("date_from",e.target.value)}/></FiField>
      <FiField label="Išvykimas"><input style={FiInner} type="date" value={form.date_to} onChange={(e:any)=>set("date_to",e.target.value)} min={form.date_from}/></FiField>
      <FiField label={t.from}><input style={FiInner} type="time" lang="lt" value={form.time} onChange={(e:any)=>set("time",e.target.value)}/></FiField>
      <FiField label={t.to}><input style={FiInner} type="time" lang="lt" value={form.end_time} onChange={(e:any)=>set("end_time",e.target.value)} min={form.time}/></FiField>
      <FiField label={t.plate}><input style={{...FiInner,textTransform:"uppercase",fontFamily:FONT_MONO,fontWeight:700}} value={form.plate} onChange={(e:any)=>set("plate",e.target.value.toUpperCase())}/></FiField>
      <FiField label={t.client_name}><input style={FiInner} value={form.name} onChange={(e:any)=>set("name",e.target.value)}/></FiField>
      <FiField label={t.price+" (EUR)"}><input style={FiInner} type="number" value={form.price} onChange={(e:any)=>set("price",e.target.value)}/></FiField>
      <FiField label={t.phone+" (+370)"}><input type="tel" inputMode="numeric" style={{...FiInner,fontFamily:FONT_MONO}} value={form.phone} onChange={(e:any)=>set("phone",e.target.value)}/></FiField>
      <FiField label={t.model}><input style={FiInner} value={form.model} onChange={(e:any)=>set("model",e.target.value)}/></FiField>
      <div style={{position:"relative"}}><FiField label={t.manufacturer}><input style={FiInner} value={form.make} onChange={(e:any)=>handleMake(e.target.value)} onBlur={()=>setTimeout(()=>setShowSug(false),150)}/></FiField>
        {showSug&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.surface,border:"1px solid "+C.border,borderRadius:10,zIndex:20,maxHeight:140,overflow:"auto",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>{suggestions.map((s:string)=>(<div key={s} onMouseDown={()=>{set("make",s);setShowSug(false);}} style={{padding:"8px 12px",fontSize:14,cursor:"pointer",color:C.text,borderBottom:"1px solid "+C.borderLight}}>{s}</div>))}</div>}</div>
      <div style={{gridColumn:"1 / -1"}}><textarea style={{...Fi,minHeight:50,resize:"vertical"}} value={form.notes} onChange={(e:any)=>set("notes",e.target.value)} placeholder="Pastabos..."/></div>
    </div></div></div>);
}

// ══════ JOURNAL — no filter buttons, sections: Laukiami / Atvykę / Atlikta, right-aligned pills ══════
function JournalPage({t,services,schedOps,refreshOps,onEditOp,settings,selectedDate,onDateChange}:any){
  const svcMap:Record<string,any>={};(services||[]).forEach((s:any)=>{svcMap[s.service_key]=s;});
  const[journalDate,setJournalDate]=useState(selectedDate||new Date().toISOString().slice(0,10));
  const shiftDay=(dir:number)=>{const p=journalDate.split("-").map(Number);const d=new Date(p[0],p[1]-1,p[2]+dir);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");const nd=y+"-"+m+"-"+dd;setJournalDate(nd);onDateChange?.(nd);};
  const touchX=useRef<number|null>(null);
  const onTS=(e:any)=>{touchX.current=e.touches[0].clientX;};
  const onTE=(e:any)=>{if(touchX.current===null)return;const diff=e.changedTouches[0].clientX-touchX.current;touchX.current=null;if(Math.abs(diff)>60){shiftDay(diff>0?-1:1);}};
  const fmtH=(ds:string)=>{const p=ds.split("-").map(Number);const d=new Date(p[0],p[1]-1,p[2]);return T.lt.months_full[d.getMonth()]+" "+d.getDate()+", "+T.lt.days_full[d.getDay()];};
  const dayOps=schedOps.filter((op:any)=>op.scheduled_date===journalDate);
  const waiting=dayOps.filter((op:any)=>op.status==="planned"||op.status==="queued");
  const arrived=dayOps.filter((op:any)=>op.status==="arrived"||op.status==="in_progress");
  const completed=dayOps.filter((op:any)=>op.status==="completed");
  const RPill=({label,color}:{label:string;color:string})=>(<div style={{display:"flex",justifyContent:"flex-end",marginBottom:6,marginTop:10}}><span style={{fontSize:12,fontWeight:700,color,background:color+"12",padding:"5px 16px",borderRadius:14}}>{label}</span></div>);

  return(<div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}} onTouchStart={onTS} onTouchEnd={onTE}>
    {/* Top header: ← date → */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 14px 12px",flexShrink:0}}>
      <button onClick={()=>shiftDay(-1)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 8px",display:"flex"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      <div style={{textAlign:"center",fontSize:16,fontWeight:800,color:C.text}}>{fmtH(journalDate)}</div>
      <button onClick={()=>shiftDay(1)} style={{background:"none",border:"none",cursor:"pointer",padding:"4px 8px",display:"flex"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
    </div>

    {/* All cards — no filters, just sections */}
    <div style={{flex:1,overflow:"auto",padding:"0 14px"}}>
      {waiting.length>0&&<><RPill label={t.waiting} color={C.textMuted}/>{waiting.map((op:any)=><OrderCard key={op.id} op={op} svcMap={svcMap} services={services} onClick={()=>onEditOp(op)}/>)}</>}
      {arrived.length>0&&<><RPill label={t.arrived_label} color={C.orange}/>{arrived.map((op:any)=><OrderCard key={op.id} op={op} svcMap={svcMap} services={services} onClick={()=>onEditOp(op)}/>)}</>}
      {completed.length>0&&<><RPill label={t.mark_completed} color={C.green}/>{completed.map((op:any)=><OrderCard key={op.id} op={op} svcMap={svcMap} services={services} onClick={()=>onEditOp(op)}/>)}</>}
      {dayOps.length===0&&<div style={{color:C.textMuted,fontSize:14,textAlign:"center",padding:30}}>{t.no_orders}</div>}
    </div>
  </div>);
}

// ══════ SEARCH ══════
function SearchPage({t,tenantId,onEditOp,query,setQuery,services}:any){
  const svcMap:Record<string,any>={};(services||[]).forEach((s:any)=>{svcMap[s.service_key]=s;});
  const[orders,setOrders]=useState<any[]>([]);const[searched,setSearched]=useState(false);const timer=useRef<any>(null);
  const doSearch=useCallback(async(q:string)=>{if(!q||q.length<2||!tenantId){setOrders([]);setSearched(false);return;}setSearched(true);
    const s=supabase();const{data}=await s.from("scheduled_operations").select("*").eq("tenant_id",tenantId).or(`vehicle_plate.ilike.%${q}%,customer_phone.ilike.%${q}%`).order("scheduled_date",{ascending:false}).limit(30);
    setOrders(data||[]);},[tenantId]);
  useEffect(()=>{if(query&&query.length>=2)doSearch(query);},[]);
  const handleInput=(v:string)=>{setQuery(v);clearTimeout(timer.current);timer.current=setTimeout(()=>doSearch(v),300);};
  return(<div style={{padding:"16px 14px",display:"flex",flexDirection:"column",minHeight:"100vh"}}>
    <div style={{flexShrink:0,marginBottom:12}}><input value={query} onChange={(e:any)=>handleInput(e.target.value)} placeholder="Valst. nr. arba tel. nr." style={{width:"70%",padding:"12px 16px",borderRadius:14,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:15,fontFamily:FONT,outline:"none",boxSizing:"border-box",boxShadow:C.cardShadow}} autoFocus/></div>
    <div style={{flex:1,overflow:"auto"}}>
      {searched&&orders.length===0&&<div style={{color:C.textMuted,fontSize:14,textAlign:"center",padding:30}}>{t.no_results}</div>}
      {orders.map((op:any)=><OrderCard key={op.id} op={op} svcMap={svcMap} services={services} onClick={()=>onEditOp(op)} showDate/>)}
    </div></div>);
}

// ══════ SETTINGS — Figma: time inputs, duration, service list with dots + chevrons ══════
function SettingsPage({t,settings,setSettings,services,setServices,tenantId,onEditSvc,goMain,userInfo,onLogout}:any){
  const[lS,setLS]=useState<any>({...settings});const[lSvc,setLSvc]=useState<any[]>([...services]);const[newSvc,setNewSvc]=useState({label:"",color:"#3b82f6"});
  const toggleDay=(d:number)=>{const days=[...(lS.work_days||[])];const idx=days.indexOf(d);if(idx>=0)days.splice(idx,1);else days.push(d);days.sort();setLS((s:any)=>({...s,work_days:days}));};
  const addSvc=async()=>{if(!newSvc.label||!tenantId)return;const key=newSvc.label.toLowerCase().replace(/[^a-z0-9]/g,"_");
    const created=await sbInsert("service_catalog",{tenant_id:tenantId,service_key:key,label:newSvc.label,color:newSvc.color,is_active:true,sort_order:lSvc.length});
    if(created){setLSvc((s:any[])=>[...s,created]);setServices((s:any[])=>[...s,created]);}setNewSvc({label:"",color:"#3b82f6"});};
  const handleSave=useCallback(async()=>{if(!tenantId)return;await supabase().from("tenants").update({settings:lS}).eq("id",tenantId);setSettings(lS);setServices(lSvc);goMain();},[lS,lSvc,tenantId,setSettings,setServices,goMain]);
  useEffect(()=>{const h=()=>handleSave();window.addEventListener("vurso-save-settings",h);return()=>window.removeEventListener("vurso-save-settings",h);},[handleSave]);
  const DN=[1,2,3,4,5,6,7];const dayNames=["Pir","Ant","Treč","Ketv","Penk","Šeš","Sek"];
  return(<div style={{padding:"16px 14px",maxWidth:480}}>
    <div style={{marginBottom:20}}>
      <h2 style={{fontSize:22,fontWeight:800,marginBottom:0}}>{t.settings_label}</h2>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
        <div style={{fontSize:13,color:C.textMuted}}>{userInfo?.email||""}</div>
        <button onClick={onLogout} style={{padding:"6px 16px",borderRadius:10,border:"1px solid "+C.red+"40",background:"transparent",color:C.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>{t.logout}</button>
      </div>
    </div>
    <div style={{height:1,background:C.border,marginBottom:16}}/>
    <div style={{marginBottom:20}}><label style={LBL}>{t.work_days}</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{DN.map((d:number)=>{const a=(lS.work_days||[]).includes(d);return(<button key={d} onClick={()=>toggleDay(d)} style={{padding:"8px 14px",borderRadius:10,border:a?"none":"1px solid "+C.border,background:a?C.accent:C.surface,color:a?"#fff":C.textMuted,fontSize:13,fontWeight:600,cursor:"pointer"}}>{dayNames[d-1]}</button>);})}</div></div>
    <div style={{marginBottom:20}}><label style={LBL}>{t.work_hours}</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div><div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:2}}>{t.from}</div><input type="time" lang="lt" value={String(lS.work_hours_from||9).padStart(2,"0")+":00"} onChange={(e:any)=>{const v=parseInt(e.target.value);if(!isNaN(v))setLS((s:any)=>({...s,work_hours_from:v}));}} style={Fi}/></div>
      <div><div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:2}}>{t.to}</div><input type="time" lang="lt" value={String(lS.work_hours_to||18).padStart(2,"0")+":00"} onChange={(e:any)=>{const v=parseInt(e.target.value);if(!isNaN(v))setLS((s:any)=>({...s,work_hours_to:v}));}} style={Fi}/></div>
    </div></div>
    <div style={{marginBottom:20}}><label style={LBL}>{t.duration_label}</label><input type="number" value={lS.default_duration??""} onChange={(e:any)=>setLS((s:any)=>({...s,default_duration:e.target.value===""?"":parseInt(e.target.value)}))} onBlur={()=>{if(!lS.default_duration)setLS((s:any)=>({...s,default_duration:60}));}} style={{...Fi,width:120,fontFamily:FONT_MONO,textAlign:"center"}} min={15} step={15}/></div>
    <div style={{marginBottom:20}}><label style={LBL}>{t.services_label}</label>
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}><input type="color" value={newSvc.color} onChange={(e:any)=>setNewSvc((s:any)=>({...s,color:e.target.value}))} style={{width:32,height:32,border:"none",borderRadius:8,cursor:"pointer",background:"transparent",flexShrink:0}}/>
        <input value={newSvc.label} onChange={(e:any)=>setNewSvc((s:any)=>({...s,label:e.target.value}))} placeholder={t.service_name} style={{...Fi,flex:1}}/>
        <button onClick={addSvc} style={{background:"none",border:"none",color:C.accent,fontSize:14,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{t.add}</button></div>
      {lSvc.map((s:any,i:number)=>(<div key={s.id||i} onClick={()=>onEditSvc(s)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 10px",borderRadius:12,cursor:"pointer",background:C.surface,boxShadow:C.cardShadow,marginBottom:6}}>
        <div style={{width:24,height:24,borderRadius:12,background:s.color,flexShrink:0}}/>
        <span style={{fontSize:14,fontWeight:600,flex:1}}>{s.label}</span>
        <span style={{fontSize:16,color:C.textLight}}>›</span>
      </div>))}
    </div>
  </div>);
}
