"use client";

import { useState } from "react";

type Setting = {
  id: string; key: string; label: string; description: string | null;
  category: string; type: "STRING" | "NUMBER" | "BOOLEAN"; value: string; enabled: boolean;
};

export default function PlatformSettingsManager({ initialSettings }: { initialSettings: Setting[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [editing, setEditing] = useState<Setting | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const blank: Omit<Setting, "id"> = { key: "", label: "", description: "", category: "GENERAL", type: "STRING", value: "", enabled: true };
  const [form, setForm] = useState(blank);

  function startEdit(setting: Setting) {
    setEditing(setting);
    setForm(setting);
    setMessage("");
  }

  function reset() {
    setEditing(null);
    setForm(blank);
  }

  async function save() {
    setSaving(true); setMessage("");
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...form, id: editing.id } : form),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || "Enregistrement impossible."); return; }
      setSettings((items) => editing ? items.map((item) => item.id === data.setting.id ? data.setting : item) : [...items, data.setting].sort((a,b) => (a.category+a.label).localeCompare(b.category+b.label)));
      setMessage(editing ? "Réglage modifié." : "Réglage ajouté.");
      reset();
    } finally { setSaving(false); }
  }

  async function remove(setting: Setting) {
    if (!confirm("Supprimer le réglage « " + setting.label + " » ? Les fonctionnalités qui l'utilisent reviendront à leur valeur par défaut.")) return;
    const res = await fetch("/api/admin/platform-settings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: setting.id }) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Suppression impossible."); return; }
    setSettings((items) => items.filter((item) => item.id !== setting.id));
    setMessage("Réglage supprimé.");
  }

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, setting) => {
    (acc[setting.category] ||= []).push(setting);
    return acc;
  }, {});

  return <section className="card p-6">
    <div>
      <p className="text-sm font-bold text-sky-600">Configuration dynamique</p>
      <h2 className="mt-1 text-2xl font-black">Réglages de la plateforme</h2>
      <p className="mt-1 max-w-3xl text-sm text-slate-500">Les réglages métier sont stockés en base. Tu peux les activer, modifier ou supprimer sans toucher au code.</p>
    </div>

    <div className="mt-6 grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-2">
      <input value={form.key} onChange={(e)=>setForm({...form,key:e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,"_")})} placeholder="CLÉ_EXEMPLE" className="rounded-xl border bg-white px-3 py-2" disabled={Boolean(editing)} />
      <input value={form.label} onChange={(e)=>setForm({...form,label:e.target.value})} placeholder="Nom du réglage" className="rounded-xl border bg-white px-3 py-2" />
      <input value={form.category} onChange={(e)=>setForm({...form,category:e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,"_")})} placeholder="GENERAL" className="rounded-xl border bg-white px-3 py-2" />
      <select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value as Setting["type"]})} className="rounded-xl border bg-white px-3 py-2">
        <option value="STRING">Texte</option><option value="NUMBER">Nombre</option><option value="BOOLEAN">Oui / Non</option>
      </select>
      <input value={form.value} onChange={(e)=>setForm({...form,value:e.target.value})} placeholder="Valeur" className="rounded-xl border bg-white px-3 py-2" />
      <input value={form.description || ""} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="Description / rôle du réglage" className="rounded-xl border bg-white px-3 py-2" />
      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.enabled} onChange={(e)=>setForm({...form,enabled:e.target.checked})} /> Réglage actif</label>
      <div className="flex gap-2">
        <button onClick={()=>void save()} disabled={saving} className="rounded-xl bg-sky-600 px-4 py-2 font-bold text-white disabled:opacity-50">{saving ? "Enregistrement..." : editing ? "Modifier" : "Ajouter"}</button>
        {editing && <button onClick={reset} className="rounded-xl border px-4 py-2 font-bold">Annuler</button>}
      </div>
    </div>

    {message && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">{message}</p>}

    <div className="mt-6 space-y-6">
      {Object.entries(grouped).map(([category, items]) => <div key={category}>
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">{category}</h3>
        <div className="mt-2 space-y-2">
          {items.map((setting) => <div key={setting.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><span className="font-black">{setting.label}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{setting.type}</span><span className={setting.enabled ? "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700" : "rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700"}>{setting.enabled ? "ACTIF" : "DÉSACTIVÉ"}</span></div><p className="mt-1 text-xs text-slate-500">{setting.description || setting.key} · valeur : <strong>{setting.value}</strong></p></div>
            <div className="flex gap-2"><button onClick={()=>startEdit(setting)} className="rounded-lg border px-3 py-2 text-sm font-bold">Modifier</button><button onClick={()=>void remove(setting)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600">Supprimer</button></div>
          </div>)}
        </div>
      </div>)}
    </div>
  </section>;
}
