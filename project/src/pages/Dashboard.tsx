import { useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  Activity,
  Building2,
  Clock,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Booking, Payment } from '../types';

interface Stats {
  totalMembers: number;
  activeBookings: number;
  monthlyRevenue: number;
  totalFacilities: number;
  pendingPayments: number;
  completedBookings: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0, activeBookings: 0, monthlyRevenue: 0,
    totalFacilities: 0, pendingPayments: 0, completedBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [calendarBookings, setCalendarBookings] = useState<Booking[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [
          { count: membersCount },
          { count: facilitiesCount },
          { data: bookings },
          { data: payments },
        ] = await Promise.all([
          isAdmin
            ? supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'member')
            : { count: 0 },
          supabase.from('facilities').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase
            .from('bookings')
            .select('*, facilities(name, facility_type)')
            .order('datetime_of_booking', { ascending: false })
            .limit(isAdmin ? 50 : 10),
          supabase
            .from('payments')
            .select('*')
            .order('datetime_of_payment', { ascending: false })
            .limit(isAdmin ? 20 : 5),
        ]);

        const allBookings = bookings || [];
        const allPayments = payments || [];

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const monthRevenue = allPayments
          .filter(p => p.datetime_of_payment >= monthStart && p.status === 'completed')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const activeB = allBookings.filter(b => b.status === 'confirmed' && b.booked_date >= now.toISOString().split('T')[0]).length;
        const completedB = allBookings.filter(b => b.status === 'completed').length;
        const pendingP = allPayments.filter(p => p.status === 'pending').length;

        setStats({
          totalMembers: membersCount || 0,
          activeBookings: activeB,
          monthlyRevenue: monthRevenue,
          totalFacilities: facilitiesCount || 0,
          pendingPayments: pendingP,
          completedBookings: completedB,
        });
        setRecentBookings(allBookings.slice(0, 5));
        setRecentPayments(allPayments.slice(0, 5));
        setCalendarBookings(allBookings);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  function getBookingsForDay(day: number) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarBookings.filter(b => b.booked_date === dateStr);
  }

  const statusColor: Record<string, string> = {
    confirmed: 'bg-gym-accent/20 text-gym-accent',
    pending: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    completed: 'bg-blue-500/20 text-blue-400',
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-gym-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 space-y-8 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="text-gym-accent">{profile?.full_name?.split(' ')[0] || 'User'}</span>
        </h1>
        <p className="text-zinc-500 mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isAdmin && (
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Members"
            value={stats.totalMembers}
            color="blue"
          />
        )}
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          label="Active Bookings"
          value={stats.activeBookings}
          color="green"
        />
        {isAdmin && (
          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toFixed(0)}`}
            color="yellow"
          />
        )}
        <StatCard
          icon={<Building2 className="w-5 h-5" />}
          label="Facilities"
          value={stats.totalFacilities}
          color="purple"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Completed"
          value={stats.completedBookings}
          color="teal"
        />
        {isAdmin && (
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Pending Pay"
            value={stats.pendingPayments}
            color="orange"
          />
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-3 bg-gym-card border border-gym-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-gym-accent" />
              Recent Bookings
            </h2>
            <button className="text-xs text-zinc-500 hover:text-gym-accent flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-4 py-3 border-b border-gym-border last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-gym-accent/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-gym-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {(b.facilities as { name?: string })?.name || 'Facility'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {b.booked_date} • {b.booked_time?.slice(0, 5)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium capitalize ${statusColor[b.status] || 'bg-zinc-800 text-zinc-400'}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="lg:col-span-2 bg-gym-card border border-gym-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gym-accent" />
              Recent Payments
            </h2>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gym-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'completed' ? 'bg-gym-accent' : p.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white capitalize truncate">{p.payment_type}</p>
                      <p className="text-xs text-zinc-500">{new Date(p.datetime_of_payment).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gym-accent ml-2">${Number(p.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-gym-accent" />
            Booking Calendar
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="w-8 h-8 rounded-lg bg-gym-muted hover:bg-gym-border flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-white min-w-32 text-center">{monthName}</span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="w-8 h-8 rounded-lg bg-gym-muted hover:bg-gym-border flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              ›
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-xs text-zinc-600 text-center py-2 font-medium">{d}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayBookings = getBookingsForDay(day);
            const today = new Date();
            const isToday =
              today.getDate() === day &&
              today.getMonth() === currentMonth.getMonth() &&
              today.getFullYear() === currentMonth.getFullYear();
            return (
              <div
                key={day}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all cursor-default ${
                  isToday
                    ? 'bg-gym-accent text-black font-bold'
                    : dayBookings.length > 0
                    ? 'bg-gym-accent/10 border border-gym-accent/30 text-gym-accent'
                    : 'text-zinc-500 hover:bg-gym-muted hover:text-white'
                }`}
              >
                <span>{day}</span>
                {dayBookings.length > 0 && !isToday && (
                  <span className="w-1 h-1 rounded-full bg-gym-accent mt-0.5" />
                )}
                {dayBookings.length > 0 && isToday && (
                  <span className="text-[9px] font-normal">{dayBookings.length}b</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'teal' | 'orange';
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-gym-accent/10 text-gym-accent border-gym-accent/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-gym-card border border-gym-border rounded-2xl p-4 animate-slide-up">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}
