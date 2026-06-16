import { useEffect, useState } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Plus,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Payment } from '../types';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-gym-accent/20 text-gym-accent',
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
  refunded: 'bg-blue-500/20 text-blue-400',
};

const TYPE_COLORS: Record<string, string> = {
  membership: 'bg-purple-500/20 text-purple-400',
  booking: 'bg-blue-500/20 text-blue-400',
  other: 'bg-zinc-500/20 text-zinc-400',
};

export default function Payments() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: '',
    payment_type: 'membership',
    description: '',
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, profiles(full_name)')
      .order('datetime_of_payment', { ascending: false });
    setPayments(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Valid amount is required');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('payments').insert({
      member_id: user!.id,
      amount: Number(form.amount),
      payment_type: form.payment_type,
      description: form.description,
      status: 'completed',
    });
    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    setShowModal(false);
    setForm({ amount: '', payment_type: 'membership', description: '' });
    load();
  }

  const filtered = payments.filter(p => {
    const name = (p.profiles as { full_name?: string })?.full_name || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.payment_type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0);
  const refundedAmount = payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + Number(p.amount), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthlyRevenue = payments
    .filter(p => p.status === 'completed' && p.datetime_of_payment >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-zinc-500 mt-1">{payments.length} total transactions</p>
        </div>
        <button
          onClick={() => { setForm({ amount: '', payment_type: 'membership', description: '' }); setError(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-gym-accent text-black px-4 py-2.5 rounded-xl font-medium hover:bg-gym-accent-dark transition-colors shadow-lg shadow-gym-accent/20"
        >
          <Plus className="w-4 h-4" />
          Add Payment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gym-accent/10 border border-gym-accent/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-gym-accent" />
            </div>
            <span className="text-xs text-zinc-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-yellow-400" />
            </div>
            <span className="text-xs text-zinc-500">This Month</span>
          </div>
          <p className="text-2xl font-bold text-white">${monthlyRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-xs text-zinc-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">${pendingAmount.toFixed(2)}</p>
        </div>
        <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-zinc-500">Refunded</span>
          </div>
          <p className="text-2xl font-bold text-white">${refundedAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gym-card border border-gym-border text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-gym-accent transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1 bg-gym-card border border-gym-border rounded-xl p-1">
          <Filter className="w-4 h-4 text-zinc-500 ml-2" />
          {['all', 'completed', 'pending', 'failed', 'refunded'].map(s => (
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No payments found</p>
        </div>
      ) : (
        <div className="bg-gym-card border border-gym-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gym-border">
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3.5">Date</th>
                  {isAdmin && <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3.5">Member</th>}
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3.5">Type</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3.5">Description</th>
                  <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3.5">Status</th>
                  <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3.5">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gym-surface transition-colors">
                    <td className="px-5 py-3.5 text-sm text-zinc-400 whitespace-nowrap">
                      {new Date(p.datetime_of_payment).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-sm text-zinc-300">
                        {(p.profiles as { full_name?: string })?.full_name || 'Unknown'}
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium capitalize ${TYPE_COLORS[p.payment_type]}`}>
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-500 max-w-xs truncate">
                      {p.description || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium capitalize ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm font-semibold ${p.status === 'refunded' ? 'text-blue-400' : 'text-gym-accent'}`}>
                        {p.status === 'refunded' ? '-' : ''}${Number(p.amount).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add payment modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Record Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Amount ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="input-base w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Type</label>
                <select
                  value={form.payment_type}
                  onChange={e => setForm({ ...form, payment_type: e.target.value })}
                  className="input-base w-full"
                >
                  <option value="membership">Membership</option>
                  <option value="booking">Booking</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input-base w-full"
                  placeholder="e.g. Monthly membership renewal"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gym-border text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm hover:bg-gym-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    : <><Check className="w-4 h-4" /> Record</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
