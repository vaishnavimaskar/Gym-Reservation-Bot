import { useEffect, useState } from 'react';
import {
  Bell, Mail, Smartphone, Check, Send, Inbox, MessageSquare,
  RefreshCw, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  sms: <Smartphone className="w-4 h-4" />,
  in_app: <Bell className="w-4 h-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-gym-accent/20 text-gym-accent',
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
};

export default function Notifications() {
  const { user, profile, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [phone, setPhone] = useState('');
  const [emailPref, setEmailPref] = useState(true);
  const [smsPref, setSmsPref] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [testChannel, setTestChannel] = useState<'email' | 'sms'>('email');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (profile) {
      setEmailPref(profile.email_notifications ?? true);
      setSmsPref(profile.sms_notifications ?? false);
      setPhone(profile.phone_number || '');
    }
  }, [profile]);

  useEffect(() => { load(); }, []);

  async function savePreferences() {
    setSavingPrefs(true);
    await supabase.from('profiles').update({
      email_notifications: emailPref,
      sms_notifications: smsPref,
      phone_number: phone,
    }).eq('id', user!.id);
    await refreshProfile();
    setSavingPrefs(false);
  }

  async function sendTestNotification() {
    setSending(true);
    setSendSuccess(null);
    setSendError(null);

    const message = testChannel === 'email'
      ? 'This is a test email notification from GymFit. Your notification system is working correctly!'
      : `GymFit: Test SMS notification. Your SMS alerts are configured correctly.`;

    const subject = testChannel === 'email' ? 'GymFit — Test Notification' : '';

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({
          user_id: user!.id,
          channel: testChannel,
          subject,
          message,
          to_email: session?.user.email,
          to_phone: phone,
          related_type: 'test',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');

      setSendSuccess(`Test ${testChannel === 'email' ? 'email' : 'SMS'} sent! Check your notification history below.`);
      load();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setSending(false);
    }
  }

  const grouped = {
    email: notifications.filter(n => n.channel === 'email').length,
    sms: notifications.filter(n => n.channel === 'sms').length,
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-zinc-500 mt-1">Manage your email and SMS alert preferences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl">
        {/* Left: Preferences */}
        <div className="space-y-4">
          {/* Preferences card */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gym-accent" /> Preferences
            </h2>
            <div className="space-y-4">
              {/* Email toggle */}
              <div className="flex items-center justify-between py-3 border-b border-gym-border">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${emailPref ? 'bg-gym-accent/10 border border-gym-accent/20' : 'bg-gym-muted border border-gym-border'}`}>
                    <Mail className={`w-4 h-4 ${emailPref ? 'text-gym-accent' : 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Email Alerts</p>
                    <p className="text-xs text-zinc-500">Booking confirmations, updates</p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailPref(!emailPref)}
                  className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${emailPref ? 'bg-gym-accent' : 'bg-gym-muted'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform m-0.5 ${emailPref ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* SMS toggle */}
              <div className="flex items-center justify-between py-3 border-b border-gym-border">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${smsPref ? 'bg-gym-accent/10 border border-gym-accent/20' : 'bg-gym-muted border border-gym-border'}`}>
                    <Smartphone className={`w-4 h-4 ${smsPref ? 'text-gym-accent' : 'text-zinc-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">SMS Alerts</p>
                    <p className="text-xs text-zinc-500">Text messages to your phone</p>
                  </div>
                </div>
                <button
                  onClick={() => setSmsPref(!smsPref)}
                  className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${smsPref ? 'bg-gym-accent' : 'bg-gym-muted'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform m-0.5 ${smsPref ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1-555-0100"
                  className="input-base w-full"
                />
              </div>

              <button
                onClick={savePreferences}
                disabled={savingPrefs}
                className="w-full py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm hover:bg-gym-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {savingPrefs
                  ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  : <><Check className="w-4 h-4" /> Save Preferences</>
                }
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Sent', value: grouped.total, icon: <Inbox className="w-4 h-4" />, color: 'text-zinc-400' },
                { label: 'Delivered', value: grouped.sent, icon: <CheckCircle className="w-4 h-4" />, color: 'text-gym-accent' },
                { label: 'Emails', value: grouped.email, icon: <Mail className="w-4 h-4" />, color: 'text-blue-400' },
                { label: 'SMS', value: grouped.sms, icon: <MessageSquare className="w-4 h-4" />, color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-gym-surface border border-gym-border rounded-xl p-3">
                  <span className={s.color}>{s.icon}</span>
                  <p className="text-lg font-bold text-white mt-1">{s.value}</p>
                  <p className="text-xs text-zinc-600">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Test + History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Test notification */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
              <Send className="w-4 h-4 text-gym-accent" /> Send Test Notification
            </h2>
            <div className="flex gap-2 mb-4">
              {(['email', 'sms'] as const).map(ch => (
                <button
                  key={ch}
                  onClick={() => setTestChannel(ch)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${testChannel === ch ? 'bg-gym-accent text-black' : 'bg-gym-surface border border-gym-border text-zinc-400 hover:text-white'}`}
                >
                  {ch === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                  {ch === 'email' ? 'Email' : 'SMS'}
                </button>
              ))}
            </div>

            {testChannel === 'sms' && !phone && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-xs text-yellow-400">Add your phone number in preferences to test SMS.</p>
              </div>
            )}

            {sendSuccess && (
              <div className="flex items-center gap-2 bg-gym-accent/10 border border-gym-accent/20 rounded-xl px-3 py-2.5 mb-4">
                <CheckCircle className="w-4 h-4 text-gym-accent flex-shrink-0" />
                <p className="text-xs text-gym-accent">{sendSuccess}</p>
              </div>
            )}
            {sendError && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{sendError}</p>
              </div>
            )}

            <button
              onClick={sendTestNotification}
              disabled={sending || (testChannel === 'sms' && !phone)}
              className="flex items-center gap-2 bg-gym-accent text-black px-5 py-2.5 rounded-xl font-medium hover:bg-gym-accent-dark transition-colors shadow-lg shadow-gym-accent/20 disabled:opacity-50 text-sm"
            >
              {sending ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : `Send Test ${testChannel === 'email' ? 'Email' : 'SMS'}`}
            </button>
            <p className="text-xs text-zinc-600 mt-3">
              Note: Email delivery requires a configured RESEND_API_KEY. SMS requires TWILIO credentials. Notifications are always logged here regardless.
            </p>
          </div>

          {/* Notification history */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-gym-accent" /> Notification History
              </h2>
              <button onClick={load} className="text-zinc-500 hover:text-white transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-zinc-600">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications sent yet.</p>
                <p className="text-xs mt-1">Use "Send Test Notification" above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 py-3 border-b border-gym-border last:border-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.status === 'sent' ? 'bg-gym-accent/10 text-gym-accent' : n.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {CHANNEL_ICONS[n.channel]}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.subject && <p className="text-sm font-medium text-white truncate">{n.subject}</p>}
                      <p className="text-xs text-zinc-500 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium capitalize ${STATUS_COLORS[n.status]}`}>{n.status}</span>
                        <span className="text-xs text-zinc-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
