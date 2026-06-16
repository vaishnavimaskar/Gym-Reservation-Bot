import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, CalendarCheck, Building2, Dumbbell, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Booking, ChatMessage, Facility } from '../types';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'bot',
  content: `Welcome to GymFit! I'm your AI reservation assistant.\n\nI can help you:\n• Book a facility session\n• View your upcoming bookings\n• Cancel a booking\n• Check available facilities\n\nTry saying:\n"Book a strength session for tomorrow at 7 PM"\n"Show my bookings"\n"What facilities are available?"\n"Cancel my next booking"`,
  timestamp: new Date(),
};

interface ParsedIntent {
  type: 'book' | 'list_bookings' | 'cancel' | 'list_facilities' | 'check_availability' | 'unknown';
  facilityKeyword?: string;
  date?: string;
  time?: string;
}

function parseIntent(message: string): ParsedIntent {
  const lower = message.toLowerCase();

  if (lower.includes('cancel')) return { type: 'cancel' };
  if (lower.match(/\b(show|view|my|list).*(book|reserv|schedul)/)) return { type: 'list_bookings' };
  if (lower.match(/\b(what|show|list|available).*(facilit|room|court|pool|gym)/)) return { type: 'list_facilities' };
  if (lower.match(/\b(book|reserve|schedul|sign up|register)/)) {
    const facilityKeywords = ['weight', 'strength', 'pool', 'swim', 'aquatic', 'basketball', 'tennis', 'spin', 'cycling', 'yoga', 'pilates', 'boxing', 'sauna', 'steam', 'cardio'];
    const facilityKeyword = facilityKeywords.find(k => lower.includes(k));

    let date: string | undefined;
    let time: string | undefined;

    const today = new Date();
    if (lower.includes('tomorrow')) {
      const tom = new Date(today);
      tom.setDate(today.getDate() + 1);
      date = tom.toISOString().split('T')[0];
    } else if (lower.includes('today')) {
      date = today.toISOString().split('T')[0];
    } else {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayMatch = days.find(d => lower.includes(d));
      if (dayMatch) {
        const dayIndex = days.indexOf(dayMatch);
        const currentDay = today.getDay();
        const diff = ((dayIndex + 1 - currentDay + 7) % 7) || 7;
        const target = new Date(today);
        target.setDate(today.getDate() + diff);
        date = target.toISOString().split('T')[0];
      }
    }

    const timeMatch = lower.match(/(\d{1,2})\s*(am|pm|:00)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const period = timeMatch[2].toLowerCase();
      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
      time = `${String(hour).padStart(2, '0')}:00`;
    }

    return { type: 'book', facilityKeyword, date, time };
  }

  return { type: 'unknown' };
}

function matchFacility(facilities: Facility[], keyword?: string): Facility | null {
  if (!keyword) return null;
  const lower = keyword.toLowerCase();
  return facilities.find(f =>
    f.name.toLowerCase().includes(lower) ||
    f.facility_type.toLowerCase().includes(lower) ||
    f.description.toLowerCase().includes(lower)
  ) || null;
}

export default function ChatBot() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('facilities').select('*').eq('is_active', true).then(({ data }) => {
      setFacilities(data || []);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
    setMessages(prev => [...prev, { ...msg, id: crypto.randomUUID(), timestamp: new Date() }]);
  }

  async function handleSend() {
    if (!input.trim() || thinking) return;
    const userMsg = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMsg });
    setThinking(true);

    await new Promise(r => setTimeout(r, 600 + Math.random() * 500));

    const intent = parseIntent(userMsg);

    if (intent.type === 'list_facilities') {
      const list = facilities.map(f => `• **${f.name}** (${f.facility_type}) — $${Number(f.price).toFixed(2)}/session, capacity ${f.capacity}`).join('\n');
      addMessage({ role: 'bot', content: `Here are our active facilities:\n\n${list}\n\nJust say "Book [facility name] for [date] at [time]" to make a reservation!` });
      setThinking(false);
      return;
    }

    if (intent.type === 'list_bookings') {
      const { data } = await supabase
        .from('bookings')
        .select('*, facilities(name)')
        .eq('member_id', user!.id)
        .in('status', ['confirmed', 'pending'])
        .order('booked_date')
        .limit(5);

      if (!data || data.length === 0) {
        addMessage({ role: 'bot', content: "You don't have any upcoming bookings. Would you like to book a session?" });
      } else {
        const list = data.map((b: Booking) => {
          const fname = (b.facilities as { name?: string })?.name || 'Facility';
          return `• **${fname}** on ${b.booked_date} at ${b.booked_time?.slice(0, 5)} (${b.status})`;
        }).join('\n');
        addMessage({ role: 'bot', content: `Your upcoming bookings:\n\n${list}\n\nSay "Cancel my booking" to cancel the next one.` });
      }
      setThinking(false);
      return;
    }

    if (intent.type === 'cancel') {
      const { data } = await supabase
        .from('bookings')
        .select('*, facilities(name)')
        .eq('member_id', user!.id)
        .eq('status', 'confirmed')
        .order('booked_date')
        .limit(1);

      if (!data || data.length === 0) {
        addMessage({ role: 'bot', content: "You have no confirmed bookings to cancel." });
      } else {
        const b = data[0] as Booking;
        const fname = (b.facilities as { name?: string })?.name || 'Facility';
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', b.id);
        addMessage({ role: 'bot', content: `Done! I've cancelled your booking for **${fname}** on ${b.booked_date} at ${b.booked_time?.slice(0, 5)}.\n\nIs there anything else I can help with?` });
      }
      setThinking(false);
      return;
    }

    if (intent.type === 'book') {
      const facility = matchFacility(facilities, intent.facilityKeyword);

      if (!facility && !intent.facilityKeyword) {
        const list = facilities.slice(0, 4).map(f => `• ${f.name}`).join('\n');
        addMessage({ role: 'bot', content: `Which facility would you like to book? Available options:\n\n${list}\n\nPlease mention the facility name in your request.` });
        setThinking(false);
        return;
      }

      if (!facility) {
        addMessage({ role: 'bot', content: `I couldn't find a facility matching "${intent.facilityKeyword}". Try saying "Show facilities" to see what's available.` });
        setThinking(false);
        return;
      }

      const date = intent.date || (() => {
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        return tom.toISOString().split('T')[0];
      })();
      const time = intent.time || '09:00';

      const { error } = await supabase.from('bookings').insert({
        facility_id: facility.id,
        member_id: user!.id,
        booked_date: date,
        booked_time: time + ':00',
        duration_minutes: 60,
        status: 'confirmed',
        payment_status: 'pending',
        notes: `Booked via chat bot`,
      });

      if (error) {
        addMessage({ role: 'bot', content: `Sorry, I couldn't complete the booking. Error: ${error.message}` });
      } else {
        addMessage({
          role: 'bot',
          content: `Your booking is confirmed!\n\n**${facility.name}**\nDate: ${date}\nTime: ${time}\nDuration: 60 minutes\nCost: $${Number(facility.price).toFixed(2)}\n\nIs there anything else I can help you with?`,
          action: { type: 'booking_created' },
        });
      }
      setThinking(false);
      return;
    }

    // Unknown intent
    const suggestions = [
      "Book a strength session for tomorrow at 6 AM",
      "Show my upcoming bookings",
      "What facilities are available?",
      "Cancel my next booking",
    ];
    const random = suggestions[Math.floor(Math.random() * suggestions.length)];
    addMessage({
      role: 'bot',
      content: `I'm not sure I understood that. Try something like:\n\n• "Book the pool for Saturday at 10 AM"\n• "Show my bookings"\n• "List available facilities"\n\nFor example: "${random}"`,
    });
    setThinking(false);
  }

  function reset() {
    setMessages([WELCOME_MESSAGE]);
  }

  function renderContent(content: string) {
    return content.split('\n').map((line, i) => {
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />;
    });
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Reservation Bot</h1>
          <p className="text-zinc-500 mt-1 text-sm">AI assistant for facility bookings</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-3 py-2 bg-gym-card border border-gym-border text-zinc-400 hover:text-white rounded-xl text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Chat window */}
        <div className="flex-1 flex flex-col bg-gym-card border border-gym-border rounded-2xl overflow-hidden">
          {/* Bot header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gym-border bg-gym-surface flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gym-accent flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">GymFit Bot</p>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${thinking ? 'bg-yellow-400 animate-pulse' : 'bg-gym-accent'}`} />
                <span className="text-xs text-zinc-500">{thinking ? 'typing...' : 'Online'}</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'bot' ? 'bg-gym-accent/20 border border-gym-accent/30' : 'bg-gym-muted border border-gym-border'
                }`}>
                  {msg.role === 'bot'
                    ? <Bot className="w-4 h-4 text-gym-accent" />
                    : <User className="w-4 h-4 text-zinc-400" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'bot'
                      ? 'bg-gym-surface border border-gym-border text-zinc-200 rounded-tl-sm'
                      : 'bg-gym-accent text-black font-medium rounded-tr-sm'
                  }`}>
                    {renderContent(msg.content)}
                  </div>
                  {msg.action?.type === 'booking_created' && (
                    <div className="flex items-center gap-1.5 text-xs text-gym-accent mt-1">
                      <CalendarCheck className="w-3 h-3" />
                      Booking confirmed
                    </div>
                  )}
                  <span className="text-xs text-zinc-600 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gym-accent/20 border border-gym-accent/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-gym-accent" />
                </div>
                <div className="bg-gym-surface border border-gym-border px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gym-border flex-shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask me to book a session..."
                className="flex-1 bg-gym-surface border border-gym-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-gym-accent transition-colors placeholder:text-zinc-600 text-sm"
                disabled={thinking}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || thinking}
                className="w-11 h-11 rounded-xl bg-gym-accent hover:bg-gym-accent-dark text-black flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-gym-accent/20 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="w-64 flex-shrink-0 hidden xl:flex flex-col gap-4">
          <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Book weight room tomorrow', icon: <Dumbbell className="w-3.5 h-3.5" /> },
                { label: 'Book pool for Saturday', icon: <Building2 className="w-3.5 h-3.5" /> },
                { label: 'Show my bookings', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
                { label: 'List all facilities', icon: <Building2 className="w-3.5 h-3.5" /> },
                { label: 'Cancel my next booking', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => { setInput(action.label); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-muted border border-gym-border text-xs text-zinc-400 hover:text-white transition-all text-left"
                >
                  <span className="text-gym-accent flex-shrink-0">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Bot Capabilities</h3>
            <ul className="space-y-2 text-xs text-zinc-500">
              {[
                'Book any facility by name or type',
                'Natural language date parsing',
                'View upcoming reservations',
                'Cancel confirmed bookings',
                'List available facilities',
              ].map((cap, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-gym-accent mt-0.5 flex-shrink-0">•</span>
                  {cap}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
