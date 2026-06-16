import { useEffect, useState } from 'react';
import {
  Search,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  MoreVertical,
  Shield,
  User,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export default function Members() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [terminations, setTerminations] = useState<{ member_id: string; status: string }[]>([]);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: terms }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'member').order('member_since', { ascending: false }),
      supabase.from('pending_terminations').select('member_id, status'),
    ]);
    setMembers(profiles || []);
    setTerminations(terms || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function promoteToAdmin(id: string) {
    await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
    setActiveMenu(null);
    load();
  }

  async function approveTermination(memberId: string) {
    await supabase.from('pending_terminations').update({ status: 'approved' }).eq('member_id', memberId).eq('status', 'pending');
    setActiveMenu(null);
    load();
  }

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const termMap = Object.fromEntries(terminations.map(t => [t.member_id, t.status]));

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <p className="text-zinc-500 mt-1">{members.length} registered members</p>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gym-card border border-gym-border text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-gym-accent transition-colors placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-2 bg-gym-card border border-gym-border rounded-xl px-4 py-2.5">
          <span className="text-sm text-zinc-500">{filtered.length} results</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No members found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((member) => {
            const termStatus = termMap[member.id];
            return (
              <div key={member.id} className="bg-gym-card border border-gym-border rounded-2xl p-5 flex items-center gap-4 hover:border-gym-accent/30 transition-colors">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-xl bg-gym-accent/10 border border-gym-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-gym-accent font-bold">
                    {member.full_name?.charAt(0)?.toUpperCase() || 'M'}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{member.full_name}</p>
                    {termStatus === 'pending' && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Termination Pending</span>
                    )}
                    {termStatus === 'approved' && (
                      <span className="text-xs bg-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded-full">Terminated</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Since {new Date(member.member_since).toLocaleDateString()}
                    </span>
                    {member.phone_number && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {member.phone_number}
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Due: ${Number(member.payment_due).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setActiveMenu(activeMenu === member.id ? null : member.id)}
                    className="w-8 h-8 rounded-lg hover:bg-gym-muted flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {activeMenu === member.id && (
                    <div className="absolute right-0 top-10 z-10 bg-gym-card border border-gym-border rounded-xl shadow-xl w-44 py-1 animate-fade-in">
                      <button
                        onClick={() => promoteToAdmin(member.id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-gym-muted transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Make Admin
                      </button>
                      {termStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => approveTermination(member.id)}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gym-accent hover:bg-gym-muted transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve Termination
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from('pending_terminations').update({ status: 'rejected' }).eq('member_id', member.id).eq('status', 'pending');
                              setActiveMenu(null);
                              load();
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-gym-muted transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject Termination
                          </button>
                        </>
                      )}
                      <div className="border-t border-gym-border mt-1 pt-1">
                        <button
                          onClick={() => setActiveMenu(null)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-500 hover:text-white hover:bg-gym-muted transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Termination requests section */}
      {terminations.filter(t => t.status === 'pending').length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            Pending Terminations
            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">
              {terminations.filter(t => t.status === 'pending').length}
            </span>
          </h2>
        </div>
      )}
    </div>
  );
}
