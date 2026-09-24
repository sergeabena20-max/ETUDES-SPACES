"use client";

import { useState } from "react";

type City={id:string;name:string;_count:{schools:number}};
type School={id:string;name:string;type:string|null;cityId:string|null;city:{name:string}|null;_count:{users:number;courses:number;exams:number}};
type Item={id:string;name:string;kind?:string|null;_count:Record<string,number>};

export default function AcademicManager({initial}:{initial:{cities:City[];schools:School[];levels:Item[];programs:Item[];subjects:Item[]}}){
 const [data,setData]=useState(initial); const [entity,setEntity]=useState<"city"|"school"|"level"|"program"|"subject">("city");
 const [editing,setEditing]=useState<{entity:string;id:string}|null>(null); const [name,setName]=useState(""); const [type,setType]=useState(""); const [cityId,setCityId]=useState(""); const [kind,setKind]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 function reset(){setEditing(null);setName("");setType("");setCityId("");setKind("");setMessage("")}
 function edit(e:string,x:any){setEntity(e as any);setEditing({entity:e,id:x.id});setName(x.name);setType(x.type||"");setCityId(x.cityId||"");setKind(x.kind||"");setMessage("");window.scrollTo({top:0,behavior:"smooth"})}
 async function refresh(){const r=await fetch("/api/admin/academic");const d=await r.json();if(r.ok)setData(d)}
 async function save(){setBusy(true);setMessage("");try{const r=await fetch("/api/admin/academic",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity,id:editing?.id,name,type:type||null,cityId:cityId||null,kind:kind||null})});const d=await r.json();if(!r.ok)throw Error(d.error);await refresh();reset();setMessage("Élément enregistré avec succès.")}catch(e){setMessage(e instanceof Error?e.message:"Une erreur est survenue.")}finally{setBusy(false)}}
 async function remove(e:string,id:string,label:string){if(!confirm(`Supprimer « ${label} » ?`))return;setBusy(true);try{const r=await fetch("/api/admin/academic",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity:e,id})});const d=await r.json();if(!r.ok)throw Error(d.error);await refresh();setMessage("Élément supprimé.")}catch(e){setMessage(e instanceof Error?e.message:"Une erreur est survenue.")}finally{setBusy(false)}}
 const config=[["city","Villes","Ville"],["school","Établissements","Établissement"],["level","Niveaux","Niveau"],["program","Filières / séries","Filière ou série"],["subject","Matières","Matière"]] as const;
 const list:any=entity==="city"?data.cities:entity==="school"?data.schools:entity==="level"?data.levels:entity==="program"?data.programs:data.subjects;
 return <div className="space-y-6">
  <section className="card p-6"><div className="flex flex-wrap gap-2">{config.map(([id,label])=><button key={id} onClick={()=>{setEntity(id);reset()}} className={`rounded-xl px-4 py-2 text-sm font-bold ${entity===id?"bg-sky-600 text-white":"border bg-white text-slate-700"}`}>{label}</button>)}</div>
   <div className="mt-6 grid gap-4 md:grid-cols-2">
    <input value={name} onChange={e=>setName(e.target.value)} placeholder={config.find(x=>x[0]===entity)?.[2]} className="rounded-xl border px-4 py-3 outline-none focus:border-sky-400"/>
    {entity==="school"&&<><input value={type} onChange={e=>setType(e.target.value)} placeholder="Type (université, lycée, collège...)" className="rounded-xl border px-4 py-3 outline-none focus:border-sky-400"/><select value={cityId} onChange={e=>setCityId(e.target.value)} className="rounded-xl border bg-white px-4 py-3"><option value="">Ville (optionnel)</option>{data.cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></>}
    {entity==="program"&&<input value={kind} onChange={e=>setKind(e.target.value)} placeholder="Type : filière, série..." className="rounded-xl border px-4 py-3 outline-none focus:border-sky-400"/>}
   </div>
   {message&&<p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
   <div className="mt-5 flex gap-2"><button onClick={save} disabled={busy||!name.trim()} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?"Enregistrement...":editing?"Enregistrer":"Ajouter"}</button>{editing&&<button onClick={reset} className="rounded-xl border px-5 py-3 font-semibold">Annuler</button>}</div>
  </section>
  <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="border-b px-6 py-5"><h2 className="text-xl font-black">{config.find(x=>x[0]===entity)?.[1]} ({list.length})</h2></div><div className="divide-y divide-slate-100">{list.map((x:any)=><div key={x.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"><div><div className="font-bold">{x.name}</div><div className="text-sm text-slate-500">{entity==="school"?[`Ville : ${x.city?.name||"—"}`,x.type||"Type non précisé"].join(" · "):entity==="program"?(x.kind||"Filière / série"):Object.values(x._count||{}).map((v:any)=>v).join(" · ")}</div></div><div className="flex gap-2"><button onClick={()=>edit(entity,x)} className="rounded-lg border px-3 py-2 text-xs font-bold">Modifier</button><button disabled={busy} onClick={()=>remove(entity,x.id,x.name)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600">Supprimer</button></div></div>)}</div></section>
 </div>
}