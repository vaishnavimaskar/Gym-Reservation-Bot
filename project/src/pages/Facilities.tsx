import { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  DollarSign,
  Edit2,
  Trash2,
  X,
  Check,
  Waves,
  Dumbbell,
  Bike,
  Target,
  Sword,
  Flame,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Facility, Facilitator } from '../types';
import { useAuth } from '../contexts/AuthContext';

const facilityTypeIcons: Record<string, React.ReactNode> = {
  Strength: <Dumbbell className="w-5 h-5" />,
  Aquatics: <Waves className="w-5 h-5" />,
  Cardio: <Bike className="w-5 h-5" />,
  'Court Sports': <Target className="w-5 h-5" />,
  'Mind & Body': <Flame className="w-5 h-5" />,
  'Combat Sports': <Sword className="w-5 h-5" />,
  Wellness: <Flame className="w-5 h-5" />,
};

const facilityTypeColors: Record<string, string> = {
  Strength: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Aquatics: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Cardio: 'bg-red-500/10 text-red-400 border-red-500/20',
  'Court Sports': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Mind & Body': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Combat Sports': 'bg-red-500/10 text-red-400 border-red-500/20',
  Wellness: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

const FACILITY_TYPES = ['Strength', 'Aquatics', 'Cardio', 'Court Sports', 'Mind & Body', 'Combat Sports', 'Wellness'];

interface FacilityForm {
  name: string;
  facility_type: string;
  description: string;
  price: string;
  capacity: string;
  facilitator_id: string;
  is_active: boolean;
}

const emptyForm: FacilityForm = {
  name: '', facility_type: 'Strength', description: '', price: '', capacity: '', facilitator_id: '', is_active: true,
};

export default function Facilities() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilitators, setFacilitators] = useState<Facilitator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FacilityForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: fac }, { data: facilitatorsData }] = await Promise.all([
      supabase.from('facilities').select('*, facilitators(*)').order('created_at', { ascending: false }),
      supabase.from('facilitators').select('*').order('full_name'),
    ]);
    setFacilities(fac || []);
    setFacilitators(facilitatorsData || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(emptyForm);
    setEditId(null);
    setError(null);
    setShowModal(true);
  }

  function openEdit(f: Facility) {
    setForm({
      name: f.name,
      facility_type: f.facility_type,
      description: f.description,
      price: String(f.price),
      capacity: String(f.capacity),
      facilitator_id: f.facilitator_id || '',
      is_active: f.is_active,
    });
    setEditId(f.id);
    setError(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.price || isNaN(Number(form.price))) { setError('Valid price is required'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      facility_type: form.facility_type,
      description: form.description.trim(),
      price: Number(form.price),
      capacity: Number(form.capacity) || 20,
      facilitator_id: form.facilitator_id || null,
      is_active: form.is_active,
    };
    if (editId) {
      const { error } = await supabase.from('facilities').update(payload).eq('id', editId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('facilities').insert(payload);
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setSaving(false);
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this facility?')) return;
    await supabase.from('facilities').delete().eq('id', id);
    load();
  }

  const filtered = facilities.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.facility_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Facilities</h1>
          <p className="text-zinc-500 mt-1">{facilities.filter(f => f.is_active).length} active facilities</p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-gym-accent text-black px-4 py-2.5 rounded-xl font-medium hover:bg-gym-accent-dark transition-colors shadow-lg shadow-gym-accent/20"
          >
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search facilities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gym-card border border-gym-border text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-gym-accent transition-colors placeholder:text-zinc-600 max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(f => {
            const typeColor = facilityTypeColors[f.facility_type] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
            const typeIcon = facilityTypeIcons[f.facility_type] || <Building2 className="w-5 h-5" />;
            return (
              <div
                key={f.id}
                className={`bg-gym-card border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:border-gym-accent/30 ${f.is_active ? 'border-gym-border' : 'border-gym-border opacity-60'}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${typeColor}`}>
                    {typeIcon}
                  </div>
                  {!f.is_active && (
                    <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-1 rounded-full">Inactive</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{f.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{f.facility_type}</p>
                  {f.description && <p className="text-xs text-zinc-600 mt-2 line-clamp-2">{f.description}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-gym-accent font-semibold">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${Number(f.price).toFixed(2)}/session
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    {f.capacity} max
                  </span>
                </div>
                {f.facilitators && (
                  <p className="text-xs text-zinc-600 border-t border-gym-border pt-3">
                    Trainer: <span className="text-zinc-400">{(f.facilitators as Facilitator).full_name}</span>
                  </p>
                )}
                {isAdmin && (
                  <div className="flex gap-2 border-t border-gym-border pt-3">
                    <button
                      onClick={() => openEdit(f)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-gym-muted hover:bg-gym-border rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{editId ? 'Edit Facility' : 'New Facility'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <FormField label="Facility Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-base"
                  placeholder="e.g. Main Weight Room"
                />
              </FormField>
              <FormField label="Type">
                <select
                  value={form.facility_type}
                  onChange={e => setForm({ ...form, facility_type: e.target.value })}
                  className="input-base"
                >
                  {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Price per session ($)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="input-base"
                    placeholder="0.00"
                  />
                </FormField>
                <FormField label="Capacity">
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: e.target.value })}
                    className="input-base"
                    placeholder="20"
                  />
                </FormField>
              </div>
              <FormField label="Description (optional)">
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input-base resize-none"
                  rows={2}
                  placeholder="Brief description..."
                />
              </FormField>
              <FormField label="Trainer/Facilitator">
                <select
                  value={form.facilitator_id}
                  onChange={e => setForm({ ...form, facilitator_id: e.target.value })}
                  className="input-base"
                >
                  <option value="">— None —</option>
                  {facilitators.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                </select>
              </FormField>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-gym-accent' : 'bg-gym-muted'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-zinc-300">Active</span>
              </label>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gym-border text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm hover:bg-gym-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
