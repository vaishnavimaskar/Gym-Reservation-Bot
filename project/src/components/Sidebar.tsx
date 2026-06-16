import { useState } from 'react';
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Bot,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Activity,
  TrendingUp,
  Salad,
  Bell,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type Page =
  | 'dashboard' | 'members' | 'facilities' | 'bookings' | 'chatbot' | 'payments'
  | 'bmi' | 'progress' | 'recommendations' | 'notifications';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

interface NavItem { id: Page; label: string; icon: React.ReactNode }
interface NavSection { label: string; items: NavItem[] }

const sharedFitnessSection: NavSection = {
  label: 'Fitness',
  items: [
    { id: 'bmi', label: 'BMI Calculator', icon: <Calculator className="w-5 h-5" /> },
    { id: 'progress', label: 'My Progress', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'recommendations', label: 'Recommendations', icon: <Salad className="w-5 h-5" /> },
  ],
};

const memberSections: NavSection[] = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'bookings', label: 'My Bookings', icon: <CalendarCheck className="w-5 h-5" /> },
      { id: 'chatbot', label: 'Book via Bot', icon: <Bot className="w-5 h-5" /> },
      { id: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
    ],
  },
  sharedFitnessSection,
  {
    label: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    label: 'Manage',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'members', label: 'Members', icon: <Users className="w-5 h-5" /> },
      { id: 'facilities', label: 'Facilities', icon: <Building2 className="w-5 h-5" /> },
      { id: 'bookings', label: 'Bookings', icon: <CalendarCheck className="w-5 h-5" /> },
      { id: 'chatbot', label: 'Reservation Bot', icon: <Bot className="w-5 h-5" /> },
      { id: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
    ],
  },
  sharedFitnessSection,
  {
    label: 'Account',
    items: [
      { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    ],
  },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = profile?.role === 'admin' ? adminSections : memberSections;

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gym-border">
        <div className="w-9 h-9 rounded-xl bg-gym-accent flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-5 h-5 text-black" />
        </div>
        <div>
          <span className="font-display text-xl tracking-wider text-white">GYMFIT</span>
          <p className="text-xs text-zinc-600 capitalize">{profile?.role} Portal</p>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest px-3 mb-2">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      active
                        ? 'bg-gym-accent text-black shadow-md shadow-gym-accent/20'
                        : 'text-zinc-400 hover:text-white hover:bg-gym-muted'
                    }`}
                  >
                    <span className={active ? 'text-black' : 'text-zinc-500 group-hover:text-white transition-colors'}>
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 text-black/60" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-gym-border p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1">
          <div className="w-8 h-8 rounded-full bg-gym-accent/20 border border-gym-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-gym-accent text-xs font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-zinc-500 capitalize">{profile?.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-gym-card border border-gym-border rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-gym-card border-r border-gym-border z-50 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>

      <aside className="hidden lg:flex flex-col w-64 bg-gym-card border-r border-gym-border h-screen sticky top-0 flex-shrink-0">
        <NavContent />
      </aside>
    </>
  );
}
