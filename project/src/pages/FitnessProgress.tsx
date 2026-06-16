import { useEffect, useState } from 'react';
import {
  TrendingUp, Plus, Dumbbell, Flame, Calendar, X, Check, Trash2, Weight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FitnessProgress as FPType, WorkoutLog } from '../types';

const EXERCISE_TYPES = [
  'Weight Training', 'Running', 'Cycling', 'Swimming', 'HIIT', 'Yoga',
  'Pilates', 'Boxing', 'Basketball', 'Tennis', 'Rowing', 'Jump Rope',
  'Crossfit', 'Stretching', 'Walking', 'Other',
];

function LineChart({ data, label }: { data: { date: string; value: number }[]; label: string }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
        Add at least 2 entries to see the trend
      </div>
    );
  }
  const W = 400, H = 120, PAD = 20;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals) - 1;
  const max = Math.max(...vals) + 1;
  const range = max - min || 1;
  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: H - PAD - ((d.value - min) / range) * (H - PAD * 2),
    ...d,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fill = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a3e635" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
          stroke="#1f1f1f" strokeWidth="1" />
      ))}
      {/* Area fill */}
      <path d={fill} fill="url(#chartGrad)" />
      {/* Line */}
      <path d={path} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#a3e635" />
          <title>{p.date}: {p.value} {label}</title>
        </g>
      ))}
      {/* Y-axis labels */}
      <text x={PAD - 2} y={PAD + 4} fill="#52525b" fontSize="9" textAnchor="end">{max.toFixed(1)}</text>
      <text x={PAD - 2} y={H - PAD + 4} fill="#52525b" fontSize="9" textAnchor="end">{min.toFixed(1)}</text>
    </svg>
  );
}

export default function FitnessProgressPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<FPType[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMeasModal, setShowMeasModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [measForm, setMeasForm] = useState({
    recorded_date: new Date().toISOString().split('T')[0],
    weight_kg: '', height_cm: '', body_fat_percent: '', waist_cm: '', chest_cm: '', notes: '',
  });
  const [workoutForm, setWorkoutForm] = useState({
    workout_date: new Date().toISOString().split('T')[0],
    exercise_type: 'Weight Training', duration_minutes: '45',
    calories_burned: '', sets: '', reps: '', notes: '',
  });

  async function load() {
    setLoading(true);
    const [{ data: fp }, { data: wl }] = await Promise.all([
      supabase.from('fitness_progress').select('*').eq('user_id', user!.id).order('recorded_date'),
      supabase.from('workout_logs').select('*').eq('user_id', user!.id).order('workout_date', { ascending: false }).limit(20),
    ]);
    setProgress(fp || []);
    setWorkouts(wl || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveMeasurement() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      user_id: user!.id,
      recorded_date: measForm.recorded_date,
      notes: measForm.notes,
    };
    if (measForm.weight_kg) payload.weight_kg = parseFloat(measForm.weight_kg);
    if (measForm.height_cm) {
      payload.height_cm = parseFloat(measForm.height_cm);
      if (measForm.weight_kg) {
        const h = parseFloat(measForm.height_cm) / 100;
        payload.bmi = Math.round((parseFloat(measForm.weight_kg) / (h * h)) * 10) / 10;
      }
    }
    if (measForm.body_fat_percent) payload.body_fat_percent = parseFloat(measForm.body_fat_percent);
    if (measForm.waist_cm) payload.waist_cm = parseFloat(measForm.waist_cm);
    if (measForm.chest_cm) payload.chest_cm = parseFloat(measForm.chest_cm);
    await supabase.from('fitness_progress').insert(payload);
    setSaving(false);
    setShowMeasModal(false);
    setMeasForm({ recorded_date: new Date().toISOString().split('T')[0], weight_kg: '', height_cm: '', body_fat_percent: '', waist_cm: '', chest_cm: '', notes: '' });
    load();
  }

  async function saveWorkout() {
    setSaving(true);
    await supabase.from('workout_logs').insert({
      user_id: user!.id,
      workout_date: workoutForm.workout_date,
      exercise_type: workoutForm.exercise_type,
      duration_minutes: parseInt(workoutForm.duration_minutes) || 30,
      calories_burned: parseInt(workoutForm.calories_burned) || 0,
      sets: parseInt(workoutForm.sets) || 0,
      reps: parseInt(workoutForm.reps) || 0,
      notes: workoutForm.notes,
    });
    setSaving(false);
    setShowWorkoutModal(false);
    setWorkoutForm({ workout_date: new Date().toISOString().split('T')[0], exercise_type: 'Weight Training', duration_minutes: '45', calories_burned: '', sets: '', reps: '', notes: '' });
    load();
  }

  async function deleteProgress(id: string) {
    await supabase.from('fitness_progress').delete().eq('id', id);
    load();
  }

  async function deleteWorkout(id: string) {
    await supabase.from('workout_logs').delete().eq('id', id);
    load();
  }

  const latest = progress[progress.length - 1];
  const previous = progress[progress.length - 2];
  const weightDiff = latest?.weight_kg && previous?.weight_kg
    ? (latest.weight_kg - previous.weight_kg).toFixed(1)
    : null;
  const totalCalories = workouts.reduce((s, w) => s + (w.calories_burned || 0), 0);
  const totalMinutes = workouts.reduce((s, w) => s + w.duration_minutes, 0);

  const weightChartData = progress.filter(p => p.weight_kg).map(p => ({
    date: p.recorded_date, value: Number(p.weight_kg),
  }));
  const bmiChartData = progress.filter(p => p.bmi).map(p => ({
    date: p.recorded_date, value: Number(p.bmi),
  }));

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Fitness Progress</h1>
          <p className="text-zinc-500 mt-1">Track your body measurements and workout history</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowMeasModal(true)}
            className="flex items-center gap-2 bg-gym-surface border border-gym-border text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gym-accent/30 transition-all">
            <Weight className="w-4 h-4" /> Log Measurement
          </button>
          <button onClick={() => setShowWorkoutModal(true)}
            className="flex items-center gap-2 bg-gym-accent text-black px-4 py-2.5 rounded-xl font-medium hover:bg-gym-accent-dark transition-colors shadow-lg shadow-gym-accent/20 text-sm">
            <Plus className="w-4 h-4" /> Log Workout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Current Weight', value: latest?.weight_kg ? `${latest.weight_kg} kg` : '—', sub: weightDiff ? `${Number(weightDiff) > 0 ? '+' : ''}${weightDiff} kg from last` : 'No previous', icon: <Weight className="w-4 h-4" />, color: 'text-gym-accent' },
              { label: 'Current BMI', value: latest?.bmi ? String(latest.bmi) : '—', sub: latest?.bmi ? (Number(latest.bmi) < 18.5 ? 'Underweight' : Number(latest.bmi) < 25 ? 'Normal' : Number(latest.bmi) < 30 ? 'Overweight' : 'Obese') : 'Not recorded', icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-400' },
              { label: 'Total Calories Burned', value: totalCalories.toLocaleString(), sub: `${workouts.length} workouts logged`, icon: <Flame className="w-4 h-4" />, color: 'text-orange-400' },
              { label: 'Total Active Minutes', value: `${totalMinutes}`, sub: `${Math.round(totalMinutes / 60)} hours total`, icon: <Dumbbell className="w-4 h-4" />, color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-gym-card border border-gym-border rounded-2xl p-5">
                <div className={`w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center mb-3 ${s.color}`} style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
              <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gym-accent" /> Weight Trend (kg)
              </h3>
              <LineChart data={weightChartData} label="kg" />
            </div>
            <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
              <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" /> BMI Trend
              </h3>
              <LineChart data={bmiChartData} label="BMI" />
            </div>
          </div>

          {/* Progress history */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
            <h3 className="font-semibold text-white text-sm mb-4">Measurement History</h3>
            {progress.length === 0 ? (
              <div className="text-center py-8 text-zinc-600">
                <Weight className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No measurements logged yet. Start tracking your progress!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gym-border">
                      {['Date', 'Weight', 'Height', 'BMI', 'Body Fat', 'Waist', ''].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-zinc-500 pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gym-border">
                    {[...progress].reverse().map(p => (
                      <tr key={p.id} className="hover:bg-gym-surface transition-colors">
                        <td className="py-3 pr-4 text-sm text-zinc-300">{p.recorded_date}</td>
                        <td className="py-3 pr-4 text-sm text-white">{p.weight_kg ? `${p.weight_kg} kg` : '—'}</td>
                        <td className="py-3 pr-4 text-sm text-zinc-400">{p.height_cm ? `${p.height_cm} cm` : '—'}</td>
                        <td className="py-3 pr-4 text-sm text-white font-medium">{p.bmi || '—'}</td>
                        <td className="py-3 pr-4 text-sm text-zinc-400">{p.body_fat_percent ? `${p.body_fat_percent}%` : '—'}</td>
                        <td className="py-3 pr-4 text-sm text-zinc-400">{p.waist_cm ? `${p.waist_cm} cm` : '—'}</td>
                        <td className="py-3">
                          <button onClick={() => deleteProgress(p.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Workout log */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-gym-accent" /> Workout Log
            </h3>
            {workouts.length === 0 ? (
              <div className="text-center py-8 text-zinc-600">
                <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No workouts logged yet. Log your first workout!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workouts.map(w => (
                  <div key={w.id} className="flex items-center gap-4 py-3 border-b border-gym-border last:border-0">
                    <div className="w-9 h-9 rounded-xl bg-gym-accent/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-4 h-4 text-gym-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{w.exercise_type}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-zinc-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{w.workout_date}</span>
                        <span className="text-xs text-zinc-500">{w.duration_minutes} min</span>
                        {w.calories_burned > 0 && <span className="text-xs text-orange-400">{w.calories_burned} kcal</span>}
                        {w.sets > 0 && <span className="text-xs text-zinc-500">{w.sets}×{w.reps}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteWorkout(w.id)} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Measurement modal */}
      {showMeasModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Log Measurement</h2>
              <button onClick={() => setShowMeasModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Date</label>
                <input type="date" value={measForm.recorded_date} onChange={e => setMeasForm({ ...measForm, recorded_date: e.target.value })} className="input-base w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'weight_kg', label: 'Weight (kg)' },
                  { key: 'height_cm', label: 'Height (cm)' },
                  { key: 'body_fat_percent', label: 'Body Fat (%)' },
                  { key: 'waist_cm', label: 'Waist (cm)' },
                  { key: 'chest_cm', label: 'Chest (cm)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                    <input type="number" step="0.1" value={measForm[key as keyof typeof measForm]}
                      onChange={e => setMeasForm({ ...measForm, [key]: e.target.value })}
                      className="input-base w-full" placeholder="optional" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                <textarea value={measForm.notes} onChange={e => setMeasForm({ ...measForm, notes: e.target.value })} className="input-base w-full resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowMeasModal(false)} className="flex-1 py-2.5 rounded-xl border border-gym-border text-zinc-400 text-sm transition-colors hover:text-white">Cancel</button>
                <button onClick={saveMeasurement} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gym-accent-dark disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Save</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workout modal */}
      {showWorkoutModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Log Workout</h2>
              <button onClick={() => setShowWorkoutModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1">Date</label>
                  <input type="date" value={workoutForm.workout_date} onChange={e => setWorkoutForm({ ...workoutForm, workout_date: e.target.value })} className="input-base w-full" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-500 mb-1">Exercise Type</label>
                  <select value={workoutForm.exercise_type} onChange={e => setWorkoutForm({ ...workoutForm, exercise_type: e.target.value })} className="input-base w-full">
                    {EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {[
                  { key: 'duration_minutes', label: 'Duration (min)' },
                  { key: 'calories_burned', label: 'Calories Burned' },
                  { key: 'sets', label: 'Sets' },
                  { key: 'reps', label: 'Reps per Set' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                    <input type="number" min="0" value={workoutForm[key as keyof typeof workoutForm]}
                      onChange={e => setWorkoutForm({ ...workoutForm, [key]: e.target.value })}
                      className="input-base w-full" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                <textarea value={workoutForm.notes} onChange={e => setWorkoutForm({ ...workoutForm, notes: e.target.value })} className="input-base w-full resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowWorkoutModal(false)} className="flex-1 py-2.5 rounded-xl border border-gym-border text-zinc-400 text-sm transition-colors hover:text-white">Cancel</button>
                <button onClick={saveWorkout} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gym-accent-dark disabled:opacity-60">
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
