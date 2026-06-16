import { useState } from 'react';
import { Dumbbell, Eye, EyeOff, Lock, Mail, User, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName, role);
      if (error) setError(error);
      else setSuccess('Account created! You can now sign in.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gym-dark flex overflow-hidden">
      {/* Left panel — hero */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center bg-gradient-to-br from-black via-gym-dark to-zinc-900 overflow-hidden">
        <img
          src="https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Gym"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
        <div className="relative z-10 text-center px-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gym-accent flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-black" />
            </div>
            <span className="font-display text-4xl tracking-wider text-white">GYMFIT</span>
          </div>
          <h1 className="font-display text-6xl text-white mb-4 leading-tight">
            ELEVATE YOUR<br />
            <span className="text-gym-accent">PERFORMANCE</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-sm mx-auto leading-relaxed">
            Book facilities, track progress, manage memberships — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[['500+', 'Members'], ['8', 'Facilities'], ['24/7', 'Access']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl text-gym-accent">{val}</div>
                <div className="text-zinc-500 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gym-accent flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-black" />
            </div>
            <span className="font-display text-3xl tracking-wider text-white">GYMFIT</span>
          </div>

          <div className="animate-slide-up">
            <h2 className="text-3xl font-bold text-white mb-1">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-zinc-500 mb-8">
              {mode === 'login' ? 'Sign in to your member account' : 'Join GymFit today'}
            </p>

            {/* Mode tabs */}
            <div className="flex bg-gym-muted rounded-xl p-1 mb-8">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                    mode === m
                      ? 'bg-gym-accent text-black shadow-lg shadow-gym-accent/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-gym-surface border border-gym-border text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-gym-accent focus:ring-1 focus:ring-gym-accent/30 transition-all placeholder:text-zinc-600"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gym-surface border border-gym-border text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-gym-accent focus:ring-1 focus:ring-gym-accent/30 transition-all placeholder:text-zinc-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gym-surface border border-gym-border text-white pl-10 pr-12 py-3 rounded-xl focus:outline-none focus:border-gym-accent focus:ring-1 focus:ring-gym-accent/30 transition-all placeholder:text-zinc-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['member', 'admin'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all capitalize ${
                          role === r
                            ? 'border-gym-accent bg-gym-accent/10 text-gym-accent'
                            : 'border-gym-border bg-gym-surface text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-gym-accent/10 border border-gym-accent/30 text-gym-accent text-sm px-4 py-3 rounded-xl">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gym-accent hover:bg-gym-accent-dark text-black font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-gym-accent/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
