import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// 🔧 CONFIGURATION — paste your Supabase values here
// ============================================================
const SUPABASE_URL  = "YOUR_SUPABASE_URL";   // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY"; // long string from Supabase dashboard
const APP_PIN       = "YOUR_4_DIGIT_PIN";    // e.g. "1947" — family shares this

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const PROFILE_ID = "onward";

// ============================================================
// DATA HELPERS
// ============================================================
const db = {
  async loadProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", PROFILE_ID).single();
    return data;
  },
  async saveProfile(p) {
    await supabase.from("profiles").upsert({ id: PROFILE_ID, name: p.name, dob: p.dob, location: p.location, country: p.country, role: p.role, since: p.since, updated_at: new Date().toISOString() });
  },
  async load(table) {
    const { data } = await supabase.from(table).select("*").eq("profile_id", PROFILE_ID).order("created_at", { ascending: true });
    return data || [];
  },
  async insert(table, row) {
    const { data } = await supabase.from(table).insert({ ...row, profile_id: PROFILE_ID }).select().single();
    return data;
  },
  async remove(table, id) {
    await supabase.from(table).delete().eq("id", id);
  },
};

// Row mappers — DB uses snake_case, app uses camelCase
const mapRow = {
  bowling: r => ({ id: r.id, type: r.type, date: r.date, overs: r.overs, duration: r.duration, wickets: r.wickets, economy: r.economy, maidens: r.maidens, wides: r.wides, noBalls: r.no_balls, opponent: r.opponent, drills: r.drills || [], variations: r.variations || [], accuracy: r.accuracy, selfFeel: r.self_feel, pressureRating: r.pressure_rating, coachNotes: r.coach_notes, notes: r.notes, enteredBy: r.entered_by }),
  fitness: r => ({ id: r.id, date: r.date, type: r.type, duration: r.duration, intensity: r.intensity, notes: r.notes, enteredBy: r.entered_by }),
  nutrition: r => ({ id: r.id, date: r.date, calories: r.calories, protein: r.protein, hydration: r.hydration, preTraining: r.pre_training, postTraining: r.post_training, energyLevel: r.energy_level, enteredBy: r.entered_by }),
  wellness: r => ({ id: r.id, date: r.date, bedtime: r.bedtime, wakeTime: r.wake_time, sleepHours: r.sleep_hours, sleepQuality: r.sleep_quality, sleepInterruptions: r.sleep_interruptions, fatigue: r.fatigue, mood: r.mood, soreness: r.soreness, soreDetails: r.sore_details, enteredBy: r.entered_by }),
  dailyLog: r => ({ id: r.id, date: r.date, feelings: r.feelings || [], studyHours: r.study_hours, screenTime: r.screen_time, playTime: r.play_time, freeTime: r.free_time, journal: r.journal, enteredBy: r.entered_by }),
};
const toDb = {
  bowling: r => ({ type: r.type, date: r.date, overs: r.overs||null, duration: r.duration||null, wickets: r.wickets||null, economy: r.economy||null, maidens: r.maidens||null, wides: r.wides||null, no_balls: r.noBalls||null, opponent: r.opponent||null, drills: r.drills||[], variations: r.variations||[], accuracy: r.accuracy||null, self_feel: r.selfFeel||null, pressure_rating: r.pressureRating||null, coach_notes: r.coachNotes||null, notes: r.notes||null, entered_by: r.enteredBy }),
  fitness: r => ({ date: r.date, type: r.type, duration: r.duration||null, intensity: r.intensity||null, notes: r.notes||null, entered_by: r.enteredBy }),
  nutrition: r => ({ date: r.date, calories: r.calories||null, protein: r.protein||null, hydration: r.hydration||null, pre_training: r.preTraining||null, post_training: r.postTraining||null, energy_level: r.energyLevel||null, entered_by: r.enteredBy }),
  wellness: r => ({ date: r.date, bedtime: r.bedtime||null, wake_time: r.wakeTime||null, sleep_hours: r.sleepHours||null, sleep_quality: r.sleepQuality||null, sleep_interruptions: r.sleepInterruptions||null, fatigue: r.fatigue||null, mood: r.mood||null, soreness: r.soreness||'None', sore_details: r.soreDetails||null, entered_by: r.enteredBy }),
  dailyLog: r => ({ date: r.date, feelings: r.feelings||[], study_hours: r.studyHours||null, screen_time: r.screenTime||null, play_time: r.playTime||null, free_time: r.freeTime||null, journal: r.journal||null, entered_by: r.enteredBy }),
};
const TABLE = { bowling: "bowling", fitness: "fitness", nutrition: "nutrition", wellness: "wellness", dailyLog: "daily_log" };

// ============================================================
// CONSTANTS
// ============================================================
const BODY_ZONES   = ["Wrist","Shoulder","Ankle","Knee","Back","None"];
const VARIATIONS   = ["Leg Break","Googly","Flipper","Top Spin","Wrong 'Un"];
const DRILL_TYPES  = ["Line & Length","Variations","Yorkers","Target Practice","Video Analysis","Net Session"];
const FEELINGS     = ["😊 Happy","😤 Motivated","😴 Tired","😰 Stressed","😐 Neutral","💪 Strong","🤒 Unwell","😔 Low"];
const todayStr     = () => new Date().toISOString().split("T")[0];
const calcAge      = dob => dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25)) : null;
const calcSleep    = (b,w) => { if(!b||!w) return null; const [bh,bm]=b.split(":").map(Number); const [wh,wm]=w.split(":").map(Number); let m=(wh*60+wm)-(bh*60+bm); if(m<0)m+=1440; return +(m/60).toFixed(1); };

// ============================================================
// PALETTE
// ============================================================
const C = {
  bg:"#f5f6fa", surface:"#fff", border:"#e4e7ef",
  textPrimary:"#0f172a", textSecondary:"#64748b", textMuted:"#94a3b8",
  bowling:"#b45309", bowlingLight:"#fef3c7",
  practice:"#0369a1", practiceLight:"#e0f2fe",
  match:"#6d28d9", matchLight:"#ede9fe",
  fitness:"#15803d", fitnessLight:"#dcfce7",
  nutrition:"#be185d", nutritionLight:"#fce7f3",
  wellness:"#b91c1c", wellnessLight:"#fee2e2",
  daily:"#0f766e", dailyLight:"#ccfbf1",
  insights:"#5b21b6", insightsLight:"#f5f3ff",
  overview:"#1d4ed8", overviewLight:"#dbeafe",
  profile:"#0f766e", profileLight:"#f0fdfa",
  warn:"#b45309", warnLight:"#fffbeb",
  good:"#15803d", goodLight:"#f0fdf4",
  info:"#1d4ed8", infoLight:"#eff6ff",
  shadow:"0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:"0 4px 16px rgba(0,0,0,0.09)",
};

// ============================================================
// SHARED UI COMPONENTS
// ============================================================
function StatCard({label,value,unit,color,sub}) {
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`3px solid ${color}`,borderRadius:12,padding:"13px 16px",minWidth:105,flex:1,boxShadow:C.shadow}}>
      <div style={{color:C.textMuted,fontSize:10,letterSpacing:1.1,textTransform:"uppercase",fontWeight:700}}>{label}</div>
      <div style={{color,fontSize:23,fontWeight:800,lineHeight:1.25,marginTop:5}}>
        {value??"—"}<span style={{fontSize:11,marginLeft:2,opacity:0.55,fontWeight:500}}>{value!=null?unit:""}</span>
      </div>
      {sub&&<div style={{color:C.textMuted,fontSize:10,marginTop:2}}>{sub}</div>}
    </div>
  );
}
function Tag({label,color,bg}) {
  return <span style={{background:bg||"#f1f5f9",color:color||C.textSecondary,border:`1px solid ${color?color+"28":C.border}`,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{label}</span>;
}
function SectionHeader({icon,title,color,sub}) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:8,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{icon}</div>
        <h2 style={{margin:0,fontSize:17,fontWeight:800,letterSpacing:-0.3,color:C.textPrimary}}>{title}</h2>
      </div>
      {sub&&<p style={{color:C.textMuted,fontSize:12,marginTop:5,marginLeft:42,marginBottom:0}}>{sub}</p>}
    </div>
  );
}
const iStyle={background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 11px",color:C.textPrimary,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit",boxShadow:"inset 0 1px 2px rgba(0,0,0,0.03)"};
function Field({label,children,flex=1,min=120}){return(<div style={{display:"flex",flexDirection:"column",gap:4,flex,minWidth:min}}><label style={{color:C.textSecondary,fontSize:10,letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>{label}</label>{children}</div>);}
function Input({label,flex,min,style,...p}){return(<Field label={label} flex={flex} min={min}><input {...p} style={{...iStyle,...style}}/></Field>);}
function Sel({label,flex,min,children,...p}){return(<Field label={label} flex={flex} min={min}><select {...p} style={{...iStyle}}>{children}</select></Field>);}
function Textarea({label,...p}){return(<Field label={label} flex={2} min={200}><textarea {...p} style={{...iStyle,minHeight:70,resize:"vertical"}}/></Field>);}
function Slider({label,value,onChange,min=1,max=10,color,suffix="/10"}){return(<div style={{display:"flex",alignItems:"center",gap:12,marginTop:11}}><div style={{color:C.textSecondary,fontSize:10,letterSpacing:1,textTransform:"uppercase",fontWeight:700,minWidth:110}}>{label} <span style={{color,fontSize:14,fontWeight:800}}>{value}{suffix}</span></div><input type="range" min={min} max={max} value={value} onChange={onChange} style={{flex:1,accentColor:color}}/></div>);}
function SaveBtn({onClick,label,color,loading}){const bg=color||C.overview;return(<button onClick={onClick} disabled={loading} style={{background:loading?"#94a3b8":bg,border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontWeight:700,cursor:loading?"not-allowed":"pointer",fontSize:12,marginTop:14,alignSelf:"flex-end",boxShadow:`0 2px 6px ${bg}44`,fontFamily:"inherit"}}>{loading?"Saving...":label}</button>);}
function FormCard({color,lightColor,title,children}){return(<div style={{background:lightColor,border:`1px solid ${color}25`,borderRadius:14,padding:18,marginBottom:20}}><div style={{color,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>{title}</div>{children}</div>);}
function EntryRow({children,color,onDelete,loading}){return(<div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:"9px 12px",marginBottom:7,fontSize:12,color:C.textSecondary,boxShadow:C.shadow}}><div style={{flex:1,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>{children}</div><button onClick={onDelete} disabled={loading} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:17,lineHeight:1,padding:"0 2px"}} onMouseEnter={e=>e.target.style.color=C.wellness} onMouseLeave={e=>e.target.style.color=C.textMuted}>×</button></div>);}
function EmptyState({text}){return(<div style={{color:C.textMuted,fontSize:13,textAlign:"center",padding:"26px 0",background:"#fafbfc",borderRadius:10,border:`1px dashed ${C.border}`}}>{text}</div>);}
function Toggle({options,value,onChange}){return(<div style={{display:"inline-flex",background:"#f1f5f9",borderRadius:10,padding:3,gap:2}}>{options.map(o=>(<button key={o.value} onClick={()=>onChange(o.value)} style={{background:value===o.value?o.color:"transparent",color:value===o.value?"#fff":C.textSecondary,border:"none",borderRadius:8,padding:"6px 16px",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>{o.label}</button>))}</div>);}
function Spinner(){return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:28,height:28,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.overview}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>  </div>);}

// ============================================================
// PIN SCREEN
// ============================================================
function PinScreen({onUnlock}) {
  const [pin,setPin]=useState("");
  const [error,setError]=useState("");
  const [checking,setChecking]=useState(false);

  const attempt = async () => {
    setChecking(true); setError("");
    await new Promise(r=>setTimeout(r,400));
    if(pin===APP_PIN){onUnlock();}
    else{setError("Incorrect PIN. Try again."); setPin("");}
    setChecking(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0fdfa,#dbeafe 60%,#ede9fe)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:22,padding:40,maxWidth:360,width:"100%",boxShadow:C.shadowMd,textAlign:"center"}}>
        <div style={{width:60,height:60,borderRadius:16,background:`linear-gradient(135deg,${C.bowling},${C.match})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px"}}>🏏</div>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.textMuted,textTransform:"uppercase",marginBottom:6}}>Cricket Digital Twin</div>
        <h1 style={{fontSize:22,fontWeight:900,color:C.textPrimary,marginBottom:6,letterSpacing:-0.5}}>Welcome Back</h1>
        <p style={{color:C.textMuted,fontSize:13,marginBottom:28,lineHeight:1.5}}>Enter your family PIN to access Onward's dashboard.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <input
            type="password" inputMode="numeric" maxLength={8}
            placeholder="Enter PIN"
            value={pin} onChange={e=>setPin(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&attempt()}
            style={{...iStyle,textAlign:"center",fontSize:22,letterSpacing:8,padding:"12px 16px"}}
          />
          {error&&<div style={{color:C.wellness,fontSize:12,fontWeight:600}}>{error}</div>}
          <button onClick={attempt} disabled={checking||!pin} style={{background:pin?C.overview:"#94a3b8",border:"none",borderRadius:10,padding:"11px",color:"#fff",fontWeight:800,fontSize:14,cursor:pin?"pointer":"not-allowed",boxShadow:pin?`0 2px 8px ${C.overview}44`:"none",fontFamily:"inherit"}}>
            {checking?"Checking...":"Unlock →"}
          </button>
        </div>
        <p style={{color:C.textMuted,fontSize:11,marginTop:20}}>Shared family access — all data syncs across devices.</p>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE SETUP
// ============================================================
function ProfileSetup({profile,onSave}) {
  const [form,setForm]=useState({name:"",dob:"",location:"",country:"",role:"Leg Spinner",since:"",...profile});
  const [saving,setSaving]=useState(false);
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}));
  const save=async()=>{if(!form.name)return;setSaving(true);await db.saveProfile(form);onSave(form);setSaving(false);};
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0fdfa,#dbeafe 60%,#ede9fe)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:C.surface,borderRadius:22,padding:36,maxWidth:540,width:"100%",boxShadow:C.shadowMd}}>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{width:56,height:56,borderRadius:15,background:`linear-gradient(135deg,${C.bowling},${C.match})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 12px"}}>🏏</div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:C.textMuted,textTransform:"uppercase",marginBottom:5}}>Cricket Digital Twin · v4</div>
          <h1 style={{margin:0,fontSize:22,fontWeight:900,color:C.textPrimary,letterSpacing:-0.5}}>Set Up Your Profile</h1>
          <p style={{color:C.textMuted,fontSize:13,marginTop:7,lineHeight:1.6}}>Saved to the cloud — both devices will always stay in sync.</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
            <Input label="Full Name *" placeholder="e.g. Priya Sharma" value={form.name} onChange={f("name")} flex={2} min={160}/>
            <Input label="Date of Birth" type="date" value={form.dob} onChange={f("dob")} flex={1} min={140}/>
          </div>
          <div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
            <Input label="City / Town" placeholder="e.g. Mumbai" value={form.location} onChange={f("location")}/>
            <Input label="Country" placeholder="e.g. India" value={form.country} onChange={f("country")}/>
          </div>
          <div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
            <Sel label="Playing Role" value={form.role} onChange={f("role")}>
              <option>Leg Spinner</option><option>Off Spinner</option><option>Fast Bowler</option><option>Medium Pace</option><option>Batter</option><option>All Rounder</option><option>Wicketkeeper</option>
            </Sel>
            <Input label="Playing Since" placeholder="e.g. 2020" value={form.since} onChange={f("since")} min={130}/>
          </div>
        </div>
        <div style={{background:C.dailyLight,border:`1px solid ${C.daily}28`,borderRadius:10,padding:"11px 14px",marginTop:14,fontSize:12,color:C.daily,lineHeight:1.5}}>
          📍 Location will be used to pull live weather data in a future update — correlating temperature and humidity with performance.
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <SaveBtn color={C.profile} label={profile?.name?"Save Changes →":"Create My Twin →"} onClick={save} loading={saving}/>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOWLING
// ============================================================
function BowlingPanel({data,onAdd,onDelete}) {
  const [mode,setMode]=useState("practice");
  const [saving,setSaving]=useState(false);
  const [pf,setPF]=useState({date:todayStr(),duration:"",overs:"",drills:[],variations:[],accuracy:6,selfFeel:6,coachNotes:"",enteredBy:"Parent"});
  const [mf,setMF]=useState({date:todayStr(),opponent:"",overs:"",wickets:"",economy:"",maidens:"",wides:"",noBalls:"",variations:[],pressureRating:6,notes:"",enteredBy:"Parent"});
  const tog=(setter,key,val)=>setter(f=>({...f,[key]:f[key].includes(val)?f[key].filter(x=>x!==val):[...f[key],val]}));
  const practice=data.filter(d=>d.type==="practice"), matches=data.filter(d=>d.type==="match");
  const sum=(arr,k)=>arr.reduce((s,d)=>s+Number(d[k]||0),0);
  const avg=(arr,k)=>arr.length?(sum(arr,k)/arr.length).toFixed(1):null;

  const addPractice=async()=>{if(!pf.overs)return;setSaving(true);await onAdd("bowling",{...pf,type:"practice"});setPF({date:todayStr(),duration:"",overs:"",drills:[],variations:[],accuracy:6,selfFeel:6,coachNotes:"",enteredBy:"Parent"});setSaving(false);};
  const addMatch=async()=>{if(!mf.overs)return;setSaving(true);await onAdd("bowling",{...mf,type:"match"});setMF({date:todayStr(),opponent:"",overs:"",wickets:"",economy:"",maidens:"",wides:"",noBalls:"",variations:[],pressureRating:6,notes:"",enteredBy:"Parent"});setSaving(false);};

  return (
    <div>
      <SectionHeader icon="🏏" title="Bowling" color={C.bowling} sub="Practice and match sessions tracked separately"/>
      <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:20}}>
        <StatCard label="Practice" value={practice.length||null} unit="sessions" color={C.practice}/>
        <StatCard label="Matches" value={matches.length||null} unit="innings" color={C.match}/>
        <StatCard label="Match Wickets" value={sum(matches,"wickets")||null} unit="wkts" color={C.fitness}/>
        <StatCard label="Avg Economy" value={matches.length?avg(matches,"economy"):null} unit="rpo" color={C.overview}/>
        <StatCard label="Avg Accuracy" value={avg(practice,"accuracy")} unit="/10" color={C.bowling}/>
      </div>
      <div style={{marginBottom:16}}><Toggle options={[{value:"practice",label:"🎯 Practice",color:C.practice},{value:"match",label:"⚔️ Match",color:C.match}]} value={mode} onChange={setMode}/></div>

      {mode==="practice"&&(
        <FormCard color={C.practice} lightColor={C.practiceLight} title="Log Practice Session">
          <div style={{display:"flex",flexWrap:"wrap",gap:11}}>
            <Input label="Date" type="date" value={pf.date} onChange={e=>setPF(f=>({...f,date:e.target.value}))}/>
            <Input label="Duration (min)" type="number" value={pf.duration} onChange={e=>setPF(f=>({...f,duration:e.target.value}))} placeholder="e.g. 60"/>
            <Input label="Overs Bowled" type="number" value={pf.overs} onChange={e=>setPF(f=>({...f,overs:e.target.value}))} placeholder="e.g. 6"/>
            <Sel label="Entered By" value={pf.enteredBy} onChange={e=>setPF(f=>({...f,enteredBy:e.target.value}))}><option>Parent</option><option>Onward</option><option>Coach</option></Sel>
          </div>
          <div style={{marginTop:12}}>
            <div style={{color:C.textSecondary,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>Drills Covered</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{DRILL_TYPES.map(d=><button key={d} onClick={()=>tog(setPF,"drills",d)} style={{background:pf.drills.includes(d)?C.practice:"#fff",border:`1px solid ${pf.drills.includes(d)?C.practice:C.border}`,borderRadius:20,padding:"4px 12px",color:pf.drills.includes(d)?"#fff":C.textSecondary,fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>{d}</button>)}</div>
          </div>
          <div style={{marginTop:12}}>
            <div style={{color:C.textSecondary,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>Variations Practiced</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{VARIATIONS.map(v=><button key={v} onClick={()=>tog(setPF,"variations",v)} style={{background:pf.variations.includes(v)?C.bowling:"#fff",border:`1px solid ${pf.variations.includes(v)?C.bowling:C.border}`,borderRadius:20,padding:"4px 12px",color:pf.variations.includes(v)?"#fff":C.textSecondary,fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>{v}</button>)}</div>
          </div>
          <Slider label="Accuracy" value={pf.accuracy} onChange={e=>setPF(f=>({...f,accuracy:e.target.value}))} color={C.practice}/>
          <Slider label="Self Feel" value={pf.selfFeel} onChange={e=>setPF(f=>({...f,selfFeel:e.target.value}))} color={C.bowling}/>
          <div style={{marginTop:11}}><Input label="Coach Notes" value={pf.coachNotes} onChange={e=>setPF(f=>({...f,coachNotes:e.target.value}))} placeholder="e.g. Good wrist position, needs faster arm speed..."/></div>
          <div style={{display:"flex",justifyContent:"flex-end"}}><SaveBtn color={C.practice} label="+ Log Practice" onClick={addPractice} loading={saving}/></div>
        </FormCard>
      )}

      {mode==="match"&&(
        <FormCard color={C.match} lightColor={C.matchLight} title="Log Match Performance">
          <div style={{display:"flex",flexWrap:"wrap",gap:11}}>
            <Input label="Date" type="date" value={mf.date} onChange={e=>setMF(f=>({...f,date:e.target.value}))}/>
            <Input label="Opponent" value={mf.opponent} onChange={e=>setMF(f=>({...f,opponent:e.target.value}))} placeholder="e.g. City XI"/>
            <Input label="Overs" type="number" value={mf.overs} onChange={e=>setMF(f=>({...f,overs:e.target.value}))} placeholder="e.g. 4"/>
            <Input label="Wickets" type="number" value={mf.wickets} onChange={e=>setMF(f=>({...f,wickets:e.target.value}))} placeholder="e.g. 2"/>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:11,marginTop:11}}>
            <Input label="Economy" type="number" step="0.1" value={mf.economy} onChange={e=>setMF(f=>({...f,economy:e.target.value}))} placeholder="e.g. 4.5"/>
            <Input label="Maidens" type="number" value={mf.maidens} onChange={e=>setMF(f=>({...f,maidens:e.target.value}))} placeholder="0"/>
            <Input label="Wides" type="number" value={mf.wides} onChange={e=>setMF(f=>({...f,wides:e.target.value}))} placeholder="0"/>
            <Input label="No Balls" type="number" value={mf.noBalls} onChange={e=>setMF(f=>({...f,noBalls:e.target.value}))} placeholder="0"/>
            <Sel label="Entered By" value={mf.enteredBy} onChange={e=>setMF(f=>({...f,enteredBy:e.target.value}))}><option>Parent</option><option>Onward</option><option>Coach</option></Sel>
          </div>
          <div style={{marginTop:12}}>
            <div style={{color:C.textSecondary,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>Variations Used</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{VARIATIONS.map(v=><button key={v} onClick={()=>tog(setMF,"variations",v)} style={{background:mf.variations.includes(v)?C.match:"#fff",border:`1px solid ${mf.variations.includes(v)?C.match:C.border}`,borderRadius:20,padding:"4px 12px",color:mf.variations.includes(v)?"#fff":C.textSecondary,fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>{v}</button>)}</div>
          </div>
          <Slider label="Pressure Handling" value={mf.pressureRating} onChange={e=>setMF(f=>({...f,pressureRating:e.target.value}))} color={C.match}/>
          <div style={{marginTop:11}}><Input label="Notes" value={mf.notes} onChange={e=>setMF(f=>({...f,notes:e.target.value}))} placeholder="e.g. Took 2 wickets in death overs..."/></div>
          <div style={{display:"flex",justifyContent:"flex-end"}}><SaveBtn color={C.match} label="+ Log Match" onClick={addMatch} loading={saving}/></div>
        </FormCard>
      )}

      {data.length===0?<EmptyState text="No bowling sessions logged yet."/>:data.slice().reverse().map((d,i)=>(
        <EntryRow key={d.id} color={d.type==="match"?C.match:C.practice} onDelete={()=>onDelete("bowling",d.id)}>
          <Tag label={d.type==="match"?"⚔️ Match":"🎯 Practice"} color={d.type==="match"?C.match:C.practice} bg={d.type==="match"?C.matchLight:C.practiceLight}/>
          <span style={{color:C.textPrimary,fontWeight:700}}>{d.date}</span>
          {d.opponent&&<span>vs {d.opponent}</span>}
          <span>🎳{d.overs}ov</span>
          {d.wickets&&<span>⚡{d.wickets}wkts</span>}
          {d.economy&&<span>📊{d.economy}rpo</span>}
          {d.accuracy&&<span>🎯Acc {d.accuracy}/10</span>}
          {d.drills?.map(dr=><Tag key={dr} label={dr}/>)}
          {d.variations?.map(v=><Tag key={v} label={v} color={d.type==="match"?C.match:C.bowling} bg={d.type==="match"?C.matchLight:C.bowlingLight}/>)}
          {(d.coachNotes||d.notes)&&<span style={{color:C.textMuted,fontStyle:"italic"}}>"{d.coachNotes||d.notes}"</span>}
          <Tag label={d.enteredBy}/>
        </EntryRow>
      ))}
    </div>
  );
}

// ============================================================
// FITNESS
// ============================================================
function FitnessPanel({data,onAdd,onDelete}) {
  const [form,setForm]=useState({date:todayStr(),type:"Gym / Strength",duration:"",intensity:6,notes:"",enteredBy:"Parent"});
  const [saving,setSaving]=useState(false);
  const sum=(arr,k)=>arr.reduce((s,d)=>s+Number(d[k]||0),0);
  const avg=(arr,k)=>arr.length?(sum(arr,k)/arr.length).toFixed(1):null;
  const add=async()=>{if(!form.duration)return;setSaving(true);await onAdd("fitness",form);setForm({date:todayStr(),type:"Gym / Strength",duration:"",intensity:6,notes:"",enteredBy:"Parent"});setSaving(false);};
  return (
    <div>
      <SectionHeader icon="💪" title="Fitness & Strength" color={C.fitness}/>
      <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:20}}>
        <StatCard label="Sessions" value={data.length||null} unit="" color={C.fitness}/>
        <StatCard label="Total Time" value={sum(data,"duration")||null} unit="min" color="#0369a1"/>
        <StatCard label="Avg Intensity" value={avg(data,"intensity")} unit="/10" color="#7c3aed"/>
      </div>
      <FormCard color={C.fitness} lightColor={C.fitnessLight} title="Log Fitness Session">
        <div style={{display:"flex",flexWrap:"wrap",gap:11}}>
          <Input label="Date" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
          <Sel label="Type" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option>Gym / Strength</option><option>Fielding Drills</option><option>Running / Cardio</option><option>Yoga / Stretching</option><option>Mixed</option></Sel>
          <Input label="Duration (min)" type="number" value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="e.g. 60"/>
          <Sel label="Entered By" value={form.enteredBy} onChange={e=>setForm(f=>({...f,enteredBy:e.target.value}))}><option>Parent</option><option>Onward</option><option>Coach</option></Sel>
        </div>
        <Slider label="Intensity" value={form.intensity} onChange={e=>setForm(f=>({...f,intensity:e.target.value}))} color={C.fitness}/>
        <div style={{marginTop:11}}><Input label="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Wrist strengthening, catching drills..."/></div>
        <div style={{display:"flex",justifyContent:"flex-end"}}><SaveBtn color={C.fitness} label="+ Log Session" onClick={add} loading={saving}/></div>
      </FormCard>
      {data.length===0?<EmptyState text="No fitness sessions logged yet."/>:data.slice().reverse().map(d=>(
        <EntryRow key={d.id} color={C.fitness} onDelete={()=>onDelete("fitness",d.id)}>
          <span style={{color:C.fitness,fontWeight:700}}>{d.date}</span>
          <Tag label={d.type} color={C.fitness} bg={C.fitnessLight}/>
          <span>⏱{d.duration}min</span><span>🔥{d.intensity}/10</span>
          {d.notes&&<span style={{color:C.textMuted,fontStyle:"italic"}}>"{d.notes}"</span>}
          <Tag label={d.enteredBy}/>
        </EntryRow>
      ))}
    </div>
  );
}

// ============================================================
// NUTRITION
// ============================================================
function NutritionPanel({data,onAdd,onDelete}) {
  const [form,setForm]=useState({date:todayStr(),calories:"",protein:"",hydration:"",preTraining:"",postTraining:"",energyLevel:7,enteredBy:"Parent"});
  const [saving,setSaving]=useState(false);
  const avgR=(arr,k)=>arr.length?Math.round(arr.reduce((s,d)=>s+Number(d[k]||0),0)/arr.length):null;
  const avgF=(arr,k)=>arr.length?(arr.reduce((s,d)=>s+Number(d[k]||0),0)/arr.length).toFixed(1):null;
  const add=async()=>{if(!form.calories)return;setSaving(true);await onAdd("nutrition",form);setForm({date:todayStr(),calories:"",protein:"",hydration:"",preTraining:"",postTraining:"",energyLevel:7,enteredBy:"Parent"});setSaving(false);};
  return (
    <div>
      <SectionHeader icon="🥗" title="Diet & Nutrition" color={C.nutrition}/>
      <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:20}}>
        <StatCard label="Avg Calories" value={avgR(data,"calories")} unit="kcal" color={C.nutrition} sub="Target: 1800–2200"/>
        <StatCard label="Avg Protein" value={avgR(data,"protein")} unit="g" color="#ea580c" sub="Target: 70–90g"/>
        <StatCard label="Avg Water" value={avgF(data,"hydration")} unit="L" color={C.overview} sub="Target: 2.5L+"/>
        <StatCard label="Days Logged" value={data.length||null} unit="" color="#7c3aed"/>
      </div>
      <FormCard color={C.nutrition} lightColor={C.nutritionLight} title="Log Daily Nutrition">
        <div style={{display:"flex",flexWrap:"wrap",gap:11}}>
          <Input label="Date" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
          <Input label="Calories (kcal)" type="number" value={form.calories} onChange={e=>setForm(f=>({...f,calories:e.target.value}))} placeholder="e.g. 1950"/>
          <Input label="Protein (g)" type="number" value={form.protein} onChange={e=>setForm(f=>({...f,protein:e.target.value}))} placeholder="e.g. 75"/>
          <Input label="Water (L)" type="number" step="0.1" value={form.hydration} onChange={e=>setForm(f=>({...f,hydration:e.target.value}))} placeholder="e.g. 2.5"/>
          <Sel label="Entered By" value={form.enteredBy} onChange={e=>setForm(f=>({...f,enteredBy:e.target.value}))}><option>Parent</option><option>Onward</option></Sel>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:11,marginTop:11}}>
          <Input label="Pre-Training Meal" value={form.preTraining} onChange={e=>setForm(f=>({...f,preTraining:e.target.value}))} placeholder="e.g. Banana + oats"/>
          <Input label="Post-Training Meal" value={form.postTraining} onChange={e=>setForm(f=>({...f,postTraining:e.target.value}))} placeholder="e.g. Rice + chicken"/>
        </div>
        <Slider label="Energy Level" value={form.energyLevel} onChange={e=>setForm(f=>({...f,energyLevel:e.target.value}))} color={C.nutrition}/>
        <div style={{display:"flex",justifyContent:"flex-end"}}><SaveBtn color={C.nutrition} label="+ Log Day" onClick={add} loading={saving}/></div>
      </FormCard>
      {data.length===0?<EmptyState text="No nutrition days logged yet."/>:data.slice().reverse().map(d=>(
        <EntryRow key={d.id} color={C.nutrition} onDelete={()=>onDelete("nutrition",d.id)}>
          <span style={{color:C.nutrition,fontWeight:700}}>{d.date}</span>
          {d.calories&&<span>🍽{d.calories}kcal</span>}
          {d.protein&&<span>🥩{d.protein}g</span>}
          {d.hydration&&<span>💧{d.hydration}L</span>}
          <span>⚡Energy {d.energyLevel}/10</span>
          {d.preTraining&&<span style={{color:C.textMuted}}>Pre: {d.preTraining}</span>}
          {d.postTraining&&<span style={{color:C.textMuted}}>Post: {d.postTraining}</span>}
          <Tag label={d.enteredBy}/>
        </EntryRow>
      ))}
    </div>
  );
}

// ============================================================
// WELLNESS
// ============================================================
function WellnessPanel({data,onAdd,onDelete}) {
  const [form,setForm]=useState({date:todayStr(),bedtime:"",wakeTime:"",sleepQuality:7,sleepInterruptions:0,fatigue:3,soreness:"None",soreDetails:"",mood:7,enteredBy:"Parent"});
  const [saving,setSaving]=useState(false);
  const sleepHrs=calcSleep(form.bedtime,form.wakeTime);
  const avg=(arr,k)=>arr.length?(arr.reduce((s,d)=>s+Number(d[k]||0),0)/arr.length).toFixed(1):null;
  const fc=v=>v>7?C.wellness:v>4?C.warn:C.fitness;
  const add=async()=>{setSaving(true);await onAdd("wellness",{...form,sleepHours:calcSleep(form.bedtime,form.wakeTime)});setForm({date:todayStr(),bedtime:"",wakeTime:"",sleepQuality:7,sleepInterruptions:0,fatigue:3,soreness:"None",soreDetails:"",mood:7,enteredBy:"Parent"});setSaving(false);};
  return (
    <div>
      <SectionHeader icon="🩹" title="Wellness & Recovery" color={C.wellness} sub="Detailed sleep tracking, fatigue, mood and injury monitoring"/>
      <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:20}}>
        <StatCard label="Avg Sleep" value={avg(data,"sleepHours")} unit="hrs" color="#7c3aed" sub="Target: 8–9 hrs"/>
        <StatCard label="Sleep Quality" value={avg(data,"sleepQuality")} unit="/10" color="#0369a1"/>
        <StatCard label="Avg Fatigue" value={avg(data,"fatigue")} unit="/10" color={C.wellness} sub="Lower = better"/>
        <StatCard label="Avg Mood" value={avg(data,"mood")} unit="/10" color={C.warn}/>
        <StatCard label="Days Logged" value={data.length||null} unit="" color={C.textSecondary}/>
      </div>
      <FormCard color={C.wellness} lightColor={C.wellnessLight} title="Log Wellness Check-in">
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 15px",marginBottom:12}}>
          <div style={{color:C.textSecondary,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>😴 Sleep Details</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:11}}>
            <Input label="Date" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
            <Input label="Bedtime" type="time" value={form.bedtime} onChange={e=>setForm(f=>({...f,bedtime:e.target.value}))}/>
            <Input label="Wake Time" type="time" value={form.wakeTime} onChange={e=>setForm(f=>({...f,wakeTime:e.target.value}))}/>
            <Field label="Duration (auto)"><div style={{...iStyle,background:sleepHrs?C.fitnessLight:"#f9fafb",color:sleepHrs?C.fitness:C.textMuted,fontWeight:sleepHrs?700:400,display:"flex",alignItems:"center"}}>{sleepHrs?`${sleepHrs} hours`:"Enter times"}</div></Field>
            <Input label="Interruptions" type="number" min="0" max="10" value={form.sleepInterruptions} onChange={e=>setForm(f=>({...f,sleepInterruptions:e.target.value}))} placeholder="0" min={90}/>
          </div>
          <Slider label="Sleep Quality" value={form.sleepQuality} onChange={e=>setForm(f=>({...f,sleepQuality:e.target.value}))} color="#7c3aed"/>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:11}}>
          <Sel label="Soreness / Pain Zone" value={form.soreness} onChange={e=>setForm(f=>({...f,soreness:e.target.value}))}>{BODY_ZONES.map(z=><option key={z}>{z}</option>)}</Sel>
          <Sel label="Entered By" value={form.enteredBy} onChange={e=>setForm(f=>({...f,enteredBy:e.target.value}))}><option>Parent</option><option>Onward</option></Sel>
        </div>
        {form.soreness!=="None"&&<div style={{marginTop:11}}><Input label="Describe Soreness" value={form.soreDetails} onChange={e=>setForm(f=>({...f,soreDetails:e.target.value}))} placeholder="e.g. Mild wrist stiffness after bowling"/></div>}
        <Slider label="Fatigue" value={form.fatigue} onChange={e=>setForm(f=>({...f,fatigue:e.target.value}))} color={fc(form.fatigue)}/>
        <Slider label="Mood" value={form.mood} onChange={e=>setForm(f=>({...f,mood:e.target.value}))} color={C.warn}/>
        <div style={{display:"flex",justifyContent:"flex-end"}}><SaveBtn color={C.wellness} label="+ Log Check-in" onClick={add} loading={saving}/></div>
      </FormCard>
      {data.length===0?<EmptyState text="No wellness check-ins logged yet."/>:data.slice().reverse().map(d=>(
        <EntryRow key={d.id} color={d.soreness!=="None"?C.wellness:C.fitness} onDelete={()=>onDelete("wellness",d.id)}>
          <span style={{color:d.soreness!=="None"?C.wellness:C.fitness,fontWeight:700}}>{d.date}</span>
          {d.sleepHours&&<span>😴{d.sleepHours}hrs</span>}
          {d.bedtime&&<span style={{color:C.textMuted}}>🕐{d.bedtime}→{d.wakeTime}</span>}
          <span>💤Quality {d.sleepQuality}/10</span>
          {d.sleepInterruptions>0&&<span>🌙{d.sleepInterruptions} wake-ups</span>}
          <span style={{color:d.fatigue>7?C.wellness:C.textSecondary}}>🔋Fatigue {d.fatigue}/10</span>
          <span>😊Mood {d.mood}/10</span>
          {d.soreness!=="None"&&<Tag label={`⚠ ${d.soreness}`} color={C.wellness} bg={C.wellnessLight}/>}
          {d.soreDetails&&<span style={{color:C.textMuted,fontStyle:"italic"}}>"{d.soreDetails}"</span>}
          <Tag label={d.enteredBy}/>
        </EntryRow>
      ))}
    </div>
  );
}

// ============================================================
// DAILY LOG
// ============================================================
function DailyLogPanel({data,onAdd,onDelete}) {
  const [form,setForm]=useState({date:todayStr(),feelings:[],studyHours:2,screenTime:2,playTime:1,freeTime:1,journal:"",enteredBy:"Parent"});
  const [saving,setSaving]=useState(false);
  const togFeel=feel=>setForm(p=>({...p,feelings:p.feelings.includes(feel)?p.feelings.filter(x=>x!==feel):[...p.feelings,feel]}));
  const avg=(arr,k)=>arr.length?(arr.reduce((s,d)=>s+Number(d[k]||0),0)/arr.length).toFixed(1):null;
  const add=async()=>{setSaving(true);await onAdd("dailyLog",form);setForm({date:todayStr(),feelings:[],studyHours:2,screenTime:2,playTime:1,freeTime:1,journal:"",enteredBy:"Parent"});setSaving(false);};
  return (
    <div>
      <SectionHeader icon="📓" title="Daily Log" color={C.daily} sub="Feelings, time use and journal — powers the Insights engine"/>
      <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:20}}>
        <StatCard label="Days Logged" value={data.length||null} unit="" color={C.daily}/>
        <StatCard label="Avg Study" value={avg(data,"studyHours")} unit="hrs" color={C.overview}/>
        <StatCard label="Avg Screen" value={avg(data,"screenTime")} unit="hrs" color="#ea580c"/>
        <StatCard label="Avg Play" value={avg(data,"playTime")} unit="hrs" color={C.fitness}/>
      </div>
      <FormCard color={C.daily} lightColor={C.dailyLight} title="Log Today">
        <div style={{display:"flex",flexWrap:"wrap",gap:11,marginBottom:12}}>
          <Input label="Date" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
          <Sel label="Entered By" value={form.enteredBy} onChange={e=>setForm(f=>({...f,enteredBy:e.target.value}))}><option>Parent</option><option>Onward</option></Sel>
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 15px",marginBottom:12}}>
          <div style={{color:C.textSecondary,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:9}}>How is Onward feeling today?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{FEELINGS.map(feel=><button key={feel} onClick={()=>togFeel(feel)} style={{background:form.feelings.includes(feel)?C.daily:"#f8fafc",border:`1px solid ${form.feelings.includes(feel)?C.daily:C.border}`,borderRadius:20,padding:"5px 13px",color:form.feelings.includes(feel)?"#fff":C.textSecondary,fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:"inherit"}}>{feel}</button>)}</div>
        </div>
        <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"13px 15px",marginBottom:12}}>
          <div style={{color:C.textSecondary,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Time Breakdown</div>
          <div style={{color:C.textMuted,fontSize:11,marginBottom:11}}>How was today's time spent? These patterns feed into Insights.</div>
          <Slider label="📚 Study" value={form.studyHours} onChange={e=>setForm(f=>({...f,studyHours:+e.target.value}))} color={C.overview} min={0} max={8} suffix="hrs"/>
          <Slider label="📱 Screen Time" value={form.screenTime} onChange={e=>setForm(f=>({...f,screenTime:+e.target.value}))} color="#ea580c" min={0} max={8} suffix="hrs"/>
          <Slider label="🏃 Play / Sport" value={form.playTime} onChange={e=>setForm(f=>({...f,playTime:+e.target.value}))} color={C.fitness} min={0} max={6} suffix="hrs"/>
          <Slider label="🛋 Free / Rest" value={form.freeTime} onChange={e=>setForm(f=>({...f,freeTime:+e.target.value}))} color="#7c3aed" min={0} max={6} suffix="hrs"/>
        </div>
        <Textarea label="Journal — how did today feel?" value={form.journal} onChange={e=>setForm(f=>({...f,journal:e.target.value}))} placeholder="e.g. Felt tired after school but had a solid practice. Wrist a bit stiff. Happy with the googly today..."/>
        <div style={{display:"flex",justifyContent:"flex-end"}}><SaveBtn color={C.daily} label="+ Log Day" onClick={add} loading={saving}/></div>
      </FormCard>
      {data.length===0?<EmptyState text="No daily logs yet. Start logging to unlock the Insights engine."/>:data.slice().reverse().map(d=>(
        <EntryRow key={d.id} color={C.daily} onDelete={()=>onDelete("dailyLog",d.id)}>
          <span style={{color:C.daily,fontWeight:700}}>{d.date}</span>
          {d.feelings?.map(f=><Tag key={f} label={f} color={C.daily} bg={C.dailyLight}/>)}
          <span>📚{d.studyHours}h</span><span>📱{d.screenTime}h</span><span>🏃{d.playTime}h</span>
          {d.journal&&<span style={{color:C.textMuted,fontStyle:"italic",maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{d.journal}"</span>}
          <Tag label={d.enteredBy}/>
        </EntryRow>
      ))}
    </div>
  );
}

// ============================================================
// INSIGHTS
// ============================================================
function InsightsPanel({data,profile}) {
  const {bowling,wellness,dailyLog,nutrition}=data;
  const MIN=7, totalDL=dailyLog.length, totalW=wellness.length;
  const hasEnough=totalDL>=MIN&&totalW>=MIN;
  const pct=Math.min(100,Math.round((Math.min(totalDL,totalW)/MIN)*100));
  const sum=(arr,k)=>arr.reduce((s,d)=>s+Number(d[k]||0),0);

  const insights=useMemo(()=>{
    if(!hasEnough)return[];
    const res=[];
    const slAcc=bowling.filter(b=>b.type==="practice"&&b.accuracy).map(b=>{const w=wellness.find(w=>w.date===b.date);return w?{acc:Number(b.accuracy),sleep:Number(w.sleepHours||0)}:null;}).filter(Boolean);
    if(slAcc.length>=3){const good=slAcc.filter(d=>d.sleep>=8),poor=slAcc.filter(d=>d.sleep<7);if(good.length>0&&poor.length>0){const gA=(good.reduce((s,d)=>s+d.acc,0)/good.length).toFixed(1),pA=(poor.reduce((s,d)=>s+d.acc,0)/poor.length).toFixed(1),diff=(gA-pA).toFixed(1);if(Math.abs(diff)>0.3)res.push({type:diff>0?"good":"warn",icon:"😴",title:"Sleep → Bowling Accuracy",insight:`8+ hours sleep: accuracy ${gA}/10. Under 7 hours: ${pA}/10 — a ${Math.abs(diff)} point difference.`,action:diff>0?"Protect sleep nights before training days. Aim for 8–9hrs.":"Other factors may be impacting accuracy. Cross-check nutrition and fatigue."});}}
    const scMood=dailyLog.filter(d=>d.screenTime!=null).map(d=>{const w=wellness.find(w=>w.date===d.date);return w?{sc:Number(d.screenTime),mood:Number(w.mood)}:null;}).filter(Boolean);
    if(scMood.length>=4){const hi=scMood.filter(d=>d.sc>=4),lo=scMood.filter(d=>d.sc<2);if(hi.length>0&&lo.length>0){const hM=(hi.reduce((s,d)=>s+d.mood,0)/hi.length).toFixed(1),lM=(lo.reduce((s,d)=>s+d.mood,0)/lo.length).toFixed(1),diff=(lM-hM).toFixed(1);res.push({type:diff>0.5?"warn":"info",icon:"📱",title:"Screen Time → Mood",insight:`High screen days (4+ hrs): mood ${hM}/10. Low screen days (<2hrs): mood ${lM}/10.`,action:diff>0.5?"Reducing screen time appears linked to better mood.":"Screen time isn't significantly affecting mood yet."});}}
    const rec=wellness.slice(-7);const avgFat=rec.reduce((s,w)=>s+Number(w.fatigue),0)/rec.length;
    if(avgFat>6.5)res.push({type:"warn",icon:"🔋",title:"Training Load — Fatigue Alert",insight:`Average fatigue over last 7 days: ${avgFat.toFixed(1)}/10 (safe threshold: 6.5).`,action:"Consider scheduling a rest or light recovery day in the next 48 hours."});
    if(nutrition.length>=5){const hyd=nutrition.filter(n=>Number(n.hydration)>=2.5),dehyd=nutrition.filter(n=>Number(n.hydration)>0&&Number(n.hydration)<2);if(hyd.length>=2&&dehyd.length>=2){const hE=(hyd.reduce((s,n)=>s+Number(n.energyLevel),0)/hyd.length).toFixed(1),dE=(dehyd.reduce((s,n)=>s+Number(n.energyLevel),0)/dehyd.length).toFixed(1),diff=(hE-dE).toFixed(1);if(Math.abs(diff)>0.4)res.push({type:diff>0?"good":"warn",icon:"💧",title:"Hydration → Energy Level",insight:`Well-hydrated days (2.5L+): energy ${hE}/10. Under-hydrated (<2L): energy ${dE}/10.`,action:diff>0?"Strong hydration-energy link. Keep targeting 2.5L+ on training days.":"Low energy despite hydration — also check sleep and calorie intake."});}}
    return res;
  },[bowling,wellness,dailyLog,nutrition,hasEnough]);

  return (
    <div>
      <SectionHeader icon="🔮" title="Insights & Predictions" color={C.insights} sub="Real correlations from Onward's data — patterns sharpen with every entry"/>
      {!hasEnough&&(
        <div style={{background:C.insightsLight,border:`1px solid ${C.insights}28`,borderRadius:16,padding:28,textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:34,marginBottom:10}}>🔮</div>
          <div style={{fontSize:16,fontWeight:800,color:C.textPrimary,marginBottom:7}}>Building the Insight Engine</div>
          <p style={{color:C.textSecondary,fontSize:13,lineHeight:1.65,maxWidth:380,margin:"0 auto 18px"}}>Insights unlock after <strong>{MIN} days</strong> of Daily Log and Wellness entries.</p>
          <div style={{background:C.surface,borderRadius:10,padding:"10px 16px",display:"inline-flex",gap:24,fontSize:13,marginBottom:16}}>
            <span>{totalDL>=MIN?"✅":"⏳"} Daily Log: <strong>{totalDL}/{MIN} days</strong></span>
            <span>{totalW>=MIN?"✅":"⏳"} Wellness: <strong>{totalW}/{MIN} days</strong></span>
          </div>
          <div style={{background:C.border,borderRadius:20,height:7,maxWidth:340,margin:"0 auto"}}><div style={{background:`linear-gradient(90deg,${C.insights},#818cf8)`,borderRadius:20,height:7,width:`${pct}%`,transition:"width 0.5s"}}/></div>
          <div style={{color:C.textMuted,fontSize:11,marginTop:7}}>{pct}% of required data collected</div>
        </div>
      )}
      {hasEnough&&insights.length===0&&<div style={{background:C.goodLight,border:`1px solid ${C.good}28`,borderLeft:`3px solid ${C.good}`,borderRadius:12,padding:"14px 18px",color:C.good,fontSize:13,fontWeight:600}}>✅ All indicators balanced. Keep logging for deeper insights.</div>}
      {insights.map((ins,i)=>(
        <div key={i} style={{background:ins.type==="good"?C.goodLight:ins.type==="warn"?C.warnLight:C.infoLight,border:`1px solid ${ins.type==="good"?C.good:ins.type==="warn"?C.warn:C.info}25`,borderLeft:`4px solid ${ins.type==="good"?C.good:ins.type==="warn"?C.warn:C.info}`,borderRadius:12,padding:"15px 17px",marginBottom:13,boxShadow:C.shadow}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:17}}>{ins.icon}</span><div style={{fontWeight:800,fontSize:14,color:C.textPrimary}}>{ins.title}</div><Tag label={ins.type==="good"?"Positive":ins.type==="warn"?"Watch Out":"Insight"} color={ins.type==="good"?C.good:ins.type==="warn"?C.warn:C.info} bg={ins.type==="good"?C.goodLight:ins.type==="warn"?C.warnLight:C.infoLight}/></div>
          <div style={{color:C.textSecondary,fontSize:13,lineHeight:1.6,marginBottom:7}}>{ins.insight}</div>
          <div style={{fontSize:12,fontWeight:700,color:ins.type==="good"?C.good:ins.type==="warn"?C.warn:C.info}}>💡 {ins.action}</div>
        </div>
      ))}
      {profile.location&&profile.country&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 17px",marginTop:6,boxShadow:C.shadow}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><span>📍</span><span style={{fontWeight:700,fontSize:13}}>Environment Context — {profile.location}, {profile.country}</span><Tag label="Coming Soon" color={C.insights} bg={C.insightsLight}/></div>
          <p style={{color:C.textMuted,fontSize:12,lineHeight:1.55,margin:0}}>We'll fetch live temperature and humidity data for <strong>{profile.location}</strong> to correlate weather with bowling performance.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
function OverviewPanel({data,profile}) {
  const {bowling,fitness,nutrition,wellness,dailyLog}=data;
  const sum=(arr,k)=>arr.reduce((s,d)=>s+Number(d[k]||0),0);
  const avg=(arr,k)=>arr.length?(sum(arr,k)/arr.length).toFixed(1):"—";
  const age=calcAge(profile.dob);
  const total=bowling.length+fitness.length+nutrition.length+wellness.length+dailyLog.length;
  const alerts=[];
  if(wellness.length>=3){const rec=wellness.slice(-3);const af=rec.reduce((s,w)=>s+Number(w.fatigue),0)/rec.length;if(af>7)alerts.push({type:"warn",msg:"⚠ High fatigue in the last 3 check-ins. Schedule a rest day."});const as=rec.reduce((s,w)=>s+Number(w.sleepHours||0),0)/rec.length;if(as>0&&as<7.5)alerts.push({type:"warn",msg:"⚠ Average sleep below 7.5hrs recently. Recovery is being compromised."});const inj=wellness.filter(w=>w.soreness!=="None");if(inj.length>0)alerts.push({type:"info",msg:`🩹 ${inj.length} entry/entries flagged soreness or pain.`});}
  if(nutrition.length>=3){const ac=sum(nutrition,"calories")/nutrition.length;if(ac>0&&ac<1800)alerts.push({type:"warn",msg:"⚠ Average calorie intake looks low. Target 1800–2200 kcal."});}
  if(alerts.length===0&&total>0)alerts.push({type:"good",msg:"✅ All tracked indicators looking healthy. Keep the logging going!"});

  return (
    <div>
      <div style={{background:`linear-gradient(135deg,${C.daily}10,${C.overview}10)`,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 20px",marginBottom:22,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{width:46,height:46,borderRadius:13,background:`linear-gradient(135deg,${C.bowling},${C.match})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🏏</div>
        <div style={{flex:1,minWidth:160}}>
          <div style={{fontSize:18,fontWeight:900,color:C.textPrimary}}>{profile.name}</div>
          <div style={{fontSize:12,color:C.textSecondary,marginTop:2}}>{age&&`Age ${age}`}{profile.role&&` · ${profile.role}`}{profile.location&&` · 📍 ${profile.location}${profile.country?`, ${profile.country}`:""}`}{profile.since&&` · Playing since ${profile.since}`}</div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Tag label={profile.role} color={C.bowling} bg={C.bowlingLight}/>{age&&<Tag label={`Age ${age}`} color={C.overview} bg={C.overviewLight}/>}<Tag label={`${total} entries`} color={C.fitness} bg={C.fitnessLight}/></div>
      </div>
      <SectionHeader icon="📊" title="Overview" color={C.overview}/>
      {alerts.length>0&&(<div style={{marginBottom:20}}><div style={{color:C.textMuted,fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Smart Alerts</div>{alerts.map((a,i)=>(<div key={i} style={{background:a.type==="warn"?C.warnLight:a.type==="good"?C.goodLight:C.infoLight,border:`1px solid ${a.type==="warn"?C.warn:a.type==="good"?C.good:C.info}28`,borderLeft:`3px solid ${a.type==="warn"?C.warn:a.type==="good"?C.good:C.info}`,borderRadius:10,padding:"10px 14px",marginBottom:7,fontSize:13,fontWeight:500,color:a.type==="warn"?C.warn:a.type==="good"?C.good:C.info}}>{a.msg}</div>))}</div>)}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(175px, 1fr))",gap:11,marginBottom:20}}>
        {[{label:"🏏 Bowling",value:bowling.length,color:C.bowling,extra:`${bowling.filter(b=>b.type==="practice").length} practice · ${bowling.filter(b=>b.type==="match").length} matches`},{label:"💪 Fitness",value:fitness.length,color:C.fitness,extra:`${sum(fitness,"duration")} min total`},{label:"🥗 Nutrition",value:nutrition.length,color:C.nutrition,extra:`Avg ${avg(nutrition,"calories")} kcal/day`},{label:"🩹 Wellness",value:wellness.length,color:C.wellness,extra:`Avg sleep: ${avg(wellness,"sleepHours")}hrs`},{label:"📓 Daily Log",value:dailyLog.length,color:C.daily,extra:dailyLog.length<7?`${7-dailyLog.length} more to unlock Insights`:"Insights engine active ✅"},].map((item,i)=>(
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderTop:`3px solid ${item.color}`,borderRadius:14,padding:16,boxShadow:C.shadow}}>
            <div style={{color:C.textMuted,fontSize:11,fontWeight:600,marginBottom:7}}>{item.label}</div>
            <div style={{color:item.color,fontSize:30,fontWeight:900,lineHeight:1}}>{item.value}</div>
            <div style={{color:C.textMuted,fontSize:11,marginTop:5}}>{item.extra}</div>
          </div>
        ))}
      </div>
      {total===0&&<div style={{color:C.textMuted,fontSize:13,textAlign:"center",padding:"26px 0",background:"#fafbfc",borderRadius:10,border:`1px dashed ${C.border}`}}>Start logging — Onward's digital twin grows with every entry.</div>}
    </div>
  );
}

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [unlocked,setUnlocked]=useState(false);
  const [data,setData]=useState({profile:{},bowling:[],fitness:[],nutrition:[],wellness:[],dailyLog:[]});
  const [tab,setTab]=useState("overview");
  const [loading,setLoading]=useState(true);
  const [showProfile,setShowProfile]=useState(false);
  const [saving,setSaving]=useState(null);

  const loadAll=useCallback(async()=>{
    setLoading(true);
    const [prof,bowling,fitness,nutrition,wellness,dailyLog]=await Promise.all([
      db.loadProfile(),
      db.load("bowling"),db.load("fitness"),db.load("nutrition"),db.load("wellness"),db.load("daily_log"),
    ]);
    setData({
      profile:prof||{},
      bowling:bowling.map(mapRow.bowling),
      fitness:fitness.map(mapRow.fitness),
      nutrition:nutrition.map(mapRow.nutrition),
      wellness:wellness.map(mapRow.wellness),
      dailyLog:dailyLog.map(mapRow.dailyLog),
    });
    setLoading(false);
  },[]);

  useEffect(()=>{if(unlocked)loadAll();},[unlocked]);

  const addEntry=useCallback(async(section,entry)=>{
    const dbTable=TABLE[section];
    const dbRow=toDb[section](entry);
    const saved=await db.insert(dbTable,dbRow);
    const mapped=mapRow[section](saved);
    setData(d=>({...d,[section]:[...d[section],mapped]}));
  },[]);

  const delEntry=useCallback(async(section,id)=>{
    await db.remove(TABLE[section],id);
    setData(d=>({...d,[section]:d[section].filter(r=>r.id!==id)}));
  },[]);

  const saveProfile=useCallback(async(prof)=>{
    await db.saveProfile(prof);
    setData(d=>({...d,profile:prof}));
    setShowProfile(false);
    setTab("overview");
  },[]);

  const TABS=[
    {id:"overview",label:"Overview",icon:"📊",color:C.overview},
    {id:"bowling",label:"Bowling",icon:"🏏",color:C.bowling},
    {id:"fitness",label:"Fitness",icon:"💪",color:C.fitness},
    {id:"nutrition",label:"Nutrition",icon:"🥗",color:C.nutrition},
    {id:"wellness",label:"Wellness",icon:"🩹",color:C.wellness},
    {id:"dailyLog",label:"Daily Log",icon:"📓",color:C.daily},
    {id:"insights",label:"Insights",icon:"🔮",color:C.insights},
  ];

  if(!unlocked)return<PinScreen onUnlock={()=>setUnlocked(true)}/>;
  if(loading)return<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}><div style={{width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.overview}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><div style={{color:C.textMuted,fontSize:13,fontWeight:600}}>Loading from cloud...</div></div>;
  if(!data.profile.name||showProfile)return<ProfileSetup profile={data.profile} onSave={saveProfile}/>;

  const age=calcAge(data.profile.dob);
  const total=data.bowling.length+data.fitness.length+data.nutrition.length+data.wellness.length+data.dailyLog.length;

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:'Plus Jakarta Sans',sans-serif;}
        body{background:${C.bg};}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:2px;background:${C.border};cursor:pointer;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;cursor:pointer;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.18);}
        input:focus,select:focus,textarea:focus{outline:none;border-color:#93c5fd!important;box-shadow:0 0 0 3px rgba(59,130,246,0.1)!important;}
        button{font-family:'Plus Jakarta Sans',sans-serif;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <div style={{minHeight:"100vh",background:C.bg}}>
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 18px",boxShadow:C.shadow,position:"sticky",top:0,zIndex:20}}>
          <div style={{maxWidth:1000,margin:"0 auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:13,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${C.bowling},${C.match})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏏</div>
                <div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:C.textMuted,textTransform:"uppercase"}}>Cricket Digital Twin · v4</div>
                  <div style={{fontSize:16,fontWeight:900,color:C.textPrimary,letterSpacing:-0.3}}>{data.profile.name}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Tag label={data.profile.role} color={C.bowling} bg={C.bowlingLight}/>
                  {age&&<Tag label={`Age ${age}`} color={C.overview} bg={C.overviewLight}/>}
                  {data.profile.location&&<Tag label={`📍 ${data.profile.location}`} color={C.daily} bg={C.dailyLight}/>}
                  <Tag label={`${total} entries`} color={C.fitness} bg={C.fitnessLight}/>
                </div>
                {saving&&<div style={{color:C.good,fontSize:11,fontWeight:600}}>✓ Saved</div>}
                <button onClick={()=>setShowProfile(true)} style={{background:"#f8fafc",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px 11px",fontSize:11,fontWeight:700,color:C.textSecondary,cursor:"pointer"}}>✏️ Profile</button>
              </div>
            </div>
            <div style={{display:"flex",overflowX:"auto",marginTop:9}}>
              {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",borderBottom:`3px solid ${tab===t.id?t.color:"transparent"}`,padding:"8px 13px",color:tab===t.id?t.color:C.textMuted,fontWeight:tab===t.id?800:500,fontSize:12,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>{t.icon} {t.label}</button>)}
            </div>
          </div>
        </div>
        <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 18px 52px"}}>
          {tab==="overview"  &&<OverviewPanel data={data} profile={data.profile}/>}
          {tab==="bowling"   &&<BowlingPanel data={data.bowling} onAdd={addEntry} onDelete={delEntry}/>}
          {tab==="fitness"   &&<FitnessPanel data={data.fitness} onAdd={addEntry} onDelete={delEntry}/>}
          {tab==="nutrition" &&<NutritionPanel data={data.nutrition} onAdd={addEntry} onDelete={delEntry}/>}
          {tab==="wellness"  &&<WellnessPanel data={data.wellness} onAdd={addEntry} onDelete={delEntry}/>}
          {tab==="dailyLog"  &&<DailyLogPanel data={data.dailyLog} onAdd={addEntry} onDelete={delEntry}/>}
          {tab==="insights"  &&<InsightsPanel data={data} profile={data.profile}/>}
        </div>
        <div style={{textAlign:"center",paddingBottom:22,color:C.textMuted,fontSize:10,letterSpacing:1.5,textTransform:"uppercase"}}>Onward · Cricket Digital Twin · v4 · Cloud Synced via Supabase</div>
      </div>
    </>
  );
}
