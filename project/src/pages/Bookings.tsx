import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  Building2,
  Clock,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Booking, Facility } from '../types';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-gym-accent/20 text-gym-accent',
  pending: 'bg-yellow-500/20 text-yellow-400',
  cancelled: 'bg-red-500/20 text-red-400',
  completed: 'bg-blue-500/20 text-blue-400',
};

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
];

export default function Bookings() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [form, setForm] = useState({
    facility_id: '',
    booked_date: new Date().toISOString().split('T')[0],
    booked_time: '09:00',
    duration_minutes: '60',
    notes: '',
  });

  async function load() {
    setLoading(true);
    const [{ data: bookingData }, { data: facData }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, facilities(id, name, facility_type, price), profiles(full_name)')
        .order('booked_date', { ascending: false })
        .order('booked_time', { ascending: false }),
      supabase.from('facilities').select('*').eq('is_active', true).order('name'),
    ]);
    setBookings(bookingData || []);
    setFacilities(facData || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleBook() {
    if (!form.facility_id) { setError('Please select a facility'); return; }
    if (!form.booked_date) { setError('Please select a date'); return; }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('bookings').insert({
      facility_id: form.facility_id,
      member_id: user!.id,
      booked_date: form.booked_date,
      booked_time: form.booked_time + ':00',
      duration_minutes: Number(form.duration_minutes),
      notes: form.notes,
      status: 'confirmed',
      payment_status: 'pending',
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    setShowModal(false);
    load();
  }

  async function cancelBooking(id: string) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    load();
  }

  async function completeBooking(id: string) {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', id);
    load();
  }

  const filtered = bookings.filter(b => {
    const matchSearch =
      ((b.facilities as { name?: string })?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      ((b.profiles as { full_name?: string })?.full_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const calendarFiltered = selectedDate
    ? filtered.filter(b => b.booked_date === selectedDate)
    : filtered;

  const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();

  function getBookingsForDay(day: number) {
    const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.booked_date === dateStr);
  }

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Bookings</h1>
          <p className="text-zinc-500 mt-1">{bookings.filter(b => b.status === 'confirmed').length} active reservations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gym-card border border-gym-border rounded-xl p-1">
            {(['list', 'calendar'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  viewMode === mode ? 'bg-gym-accent text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setForm({ facility_id: '', booked_date: new Date().toISOString().split('T')[0], booked_time: '09:00', duration_minutes: '60', notes: '' }); setError(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-gym-accent text-black px-4 py-2.5 rounded-xl font-medium hover:bg-gym-accent-dark transition-colors shadow-lg shadow-gym-accent/20"
          >
            <Plus className="w-4 h-4" />
            Book Now
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gym-card border border-gym-border text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-gym-accent transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1 bg-gym-card border border-gym-border rounded-xl p-1">
          <Filter className="w-4 h-4 text-zinc-500 ml-2" />
          {['all', 'confirmed', 'pending', 'completed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filterStatus === s ? 'bg-gym-accent text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-3 bg-gym-card border border-gym-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))} className="w-8 h-8 rounded-lg bg-gym-muted flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white">
                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))} className="w-8 h-8 rounded-lg bg-gym-muted flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-xs text-zinc-600 text-center py-2 font-medium">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayB = getBookingsForDay(day);
                const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const today = new Date();
                const isToday = today.getDate() === day && today.getMonth() === selectedMonth.getMonth() && today.getFullYear() === selectedMonth.getFullYear();
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all ${
                      isSelected ? 'bg-gym-accent text-black font-bold ring-2 ring-gym-accent/50'
                      : isToday ? 'bg-gym-accent/20 text-gym-accent font-bold border border-gym-accent/50'
                      : dayB.length > 0 ? 'bg-gym-muted text-white border border-gym-border/60 hover:border-gym-accent/30'
                      : 'text-zinc-500 hover:bg-gym-muted hover:text-white'
                    }`}
                  >
                    <span>{day}</span>
                    {dayB.length > 0 && (
                      <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-black/60' : 'text-gym-accent'}`}>{dayB.length}b</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day bookings */}
          <div className="lg:col-span-2 bg-gym-card border border-gym-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">
              {selectedDate
                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'All Bookings'}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {calendarFiltered.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">
                  <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No bookings</p>
                </div>
              ) : (
                calendarFiltered.map(b => (
                  <BookingCard key={b.id} booking={b} isAdmin={isAdmin} onCancel={cancelBooking} onComplete={completeBooking} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No bookings found</p>
            </div>
          ) : (
            filtered.map(b => (
              <BookingCard key={b.id} booking={b} isAdmin={isAdmin} onCancel={cancelBooking} onComplete={completeBooking} />
            ))
          )}
        </div>
      )}

      {/* Booking modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">New Booking</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Facility</label>
                <select
                  value={form.facility_id}
                  onChange={e => setForm({ ...form, facility_id: e.target.value })}
                  className="input-base w-full"
                >
                  <option value="">Select a facility</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name} — ${Number(f.price).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.booked_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({ ...form, booked_date: e.target.value })}
                    className="input-base w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Time</label>
                  <select
                    value={form.booked_time}
                    onChange={e => setForm({ ...form, booked_time: e.target.value })}
                    className="input-base w-full"
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Duration</label>
                <select
                  value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                  className="input-base w-full"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input-base w-full resize-none"
                  rows={2}
                  placeholder="Any special requests..."
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gym-border text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleBook}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm hover:bg-gym-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><CalendarCheck className="w-4 h-4" /> Confirm Booking</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BookingCardProps {
  booking: Booking;
  isAdmin: boolean;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}

function BookingCard({ booking: b, isAdmin, onCancel, onComplete }: BookingCardProps) {
  const facilityName = (b.facilities as { name?: string })?.name || 'Facility';
  const memberName = (b.profiles as { full_name?: string })?.full_name;
  return (
    <div className="bg-gym-card border border-gym-border rounded-2xl p-5 flex items-center gap-4 hover:border-gym-accent/20 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-gym-accent/10 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-gym-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-white text-sm">{facilityName}</p>
          {isAdmin && memberName && (
            <span className="text-xs text-zinc-500">· {memberName}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <CalendarCheck className="w-3 h-3" />
            {b.booked_date}
          </span>
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {b.booked_time?.slice(0, 5)} · {b.duration_minutes}min
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${STATUS_COLORS[b.status] || 'bg-zinc-800 text-zinc-400'}`}>
          {b.status}
        </span>
        {b.status === 'confirmed' && (
          <div className="flex gap-1">
            {isAdmin && (
              <button
                onClick={() => onComplete(b.id)}
                className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                title="Mark complete"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onCancel(b.id)}
              className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
              title="Cancel booking"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
