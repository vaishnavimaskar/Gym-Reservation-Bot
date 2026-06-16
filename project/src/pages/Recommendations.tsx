import { useEffect, useState } from 'react';
import {
  Dumbbell, Salad, Target, Check, ChevronRight, Flame,
  Clock, RotateCcw, Zap, Heart, Apple,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FitnessGoal } from '../types';

type GoalType = FitnessGoal['goal_type'];
type ActivityLevel = FitnessGoal['activity_level'];
type DietaryPref = FitnessGoal['dietary_preference'];

interface ExerciseRec {
  name: string;
  type: string;
  duration: string;
  frequency: string;
  calories: number;
  intensity: 'Low' | 'Medium' | 'High';
  facility: string;
  tips: string[];
}

interface DietRec {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: { time: string; description: string }[];
  foods: string[];
  avoid: string[];
}

const EXERCISE_RECS: Record<GoalType, ExerciseRec[]> = {
  weight_loss: [
    { name: 'HIIT Training', type: 'Cardio', duration: '30 min', frequency: '4x/week', calories: 380, intensity: 'High', facility: 'Cardio', tips: ['Keep heart rate at 75–85% max', 'Rest 20 sec between intervals', 'Hydrate every 10 minutes'] },
    { name: 'Swimming', type: 'Aquatics', duration: '45 min', frequency: '3x/week', calories: 350, intensity: 'Medium', facility: 'Aquatics', tips: ['Alternate between strokes', 'Use a kickboard for leg focus', 'Great for joint health'] },
    { name: 'Spin Class', type: 'Cardio', duration: '45 min', frequency: '3x/week', calories: 420, intensity: 'High', facility: 'Cardio', tips: ['Adjust resistance every 5 min', 'Keep cadence 80–100 RPM', 'Stand up for short bursts'] },
    { name: 'Circuit Training', type: 'Strength', duration: '40 min', frequency: '3x/week', calories: 300, intensity: 'High', facility: 'Strength', tips: ['Minimal rest between stations', 'Combine upper and lower body', 'Finish with 10 min core work'] },
  ],
  muscle_gain: [
    { name: 'Progressive Overload', type: 'Strength', duration: '60 min', frequency: '5x/week', calories: 280, intensity: 'High', facility: 'Strength', tips: ['Add 2.5–5% weight weekly', 'Focus on compound lifts', '3–5 sets, 5–8 reps per exercise'] },
    { name: 'Compound Lifts', type: 'Strength', duration: '75 min', frequency: '4x/week', calories: 310, intensity: 'High', facility: 'Strength', tips: ['Squat, deadlift, bench, OHP daily', 'Warm up with 40% working weight', 'Log every session'] },
    { name: 'Boxing / Combat', type: 'Combat Sports', duration: '60 min', frequency: '2x/week', calories: 480, intensity: 'High', facility: 'Combat Sports', tips: ['Great for explosive power', 'Builds functional muscle', 'Improves coordination'] },
    { name: 'Active Recovery', type: 'Mind & Body', duration: '30 min', frequency: '2x/week', calories: 100, intensity: 'Low', facility: 'Mind & Body', tips: ['Foam roll tight muscles', 'Light yoga or stretching', 'Essential to prevent overtraining'] },
  ],
  endurance: [
    { name: 'Long Distance Swimming', type: 'Aquatics', duration: '60 min', frequency: '4x/week', calories: 450, intensity: 'Medium', facility: 'Aquatics', tips: ['Maintain steady pace', 'Focus on breathing rhythm', 'Build up distance gradually'] },
    { name: 'Cycling Intervals', type: 'Cardio', duration: '60 min', frequency: '4x/week', calories: 500, intensity: 'Medium', facility: 'Cardio', tips: ['Alternate pace every 5 min', 'Track distance and speed', 'Zone 2 training (60-70% max HR)'] },
    { name: 'Rowing', type: 'Cardio', duration: '45 min', frequency: '3x/week', calories: 400, intensity: 'Medium', facility: 'Cardio', tips: ['Full body endurance workout', 'Maintain 20–22 strokes/min', 'Focus on push with legs first'] },
    { name: 'Tennis', type: 'Court Sports', duration: '60 min', frequency: '3x/week', calories: 450, intensity: 'Medium', facility: 'Court Sports', tips: ['Improves agility and stamina', 'Excellent aerobic workout', 'Competitive motivation'] },
  ],
  flexibility: [
    { name: 'Yoga Flow', type: 'Mind & Body', duration: '60 min', frequency: '4x/week', calories: 180, intensity: 'Low', facility: 'Mind & Body', tips: ['Hold each pose 30–60 seconds', 'Focus on breath control', 'Progress from basic to advanced poses'] },
    { name: 'Pilates', type: 'Mind & Body', duration: '50 min', frequency: '3x/week', calories: 200, intensity: 'Low', facility: 'Mind & Body', tips: ['Core strength foundation', 'Improves posture dramatically', 'Essential for injury prevention'] },
    { name: 'Sauna + Stretching', type: 'Wellness', duration: '45 min', frequency: '2x/week', calories: 80, intensity: 'Low', facility: 'Wellness', tips: ['Heat increases muscle pliability', 'Stretch in the sauna for best results', 'Hydrate well afterwards'] },
    { name: 'Light Swimming', type: 'Aquatics', duration: '30 min', frequency: '2x/week', calories: 200, intensity: 'Low', facility: 'Aquatics', tips: ['Full range of motion workout', 'Gentle on joints', 'Use fins for hip flexibility'] },
  ],
  general_fitness: [
    { name: 'Weight Training', type: 'Strength', duration: '45 min', frequency: '3x/week', calories: 250, intensity: 'Medium', facility: 'Strength', tips: ['Cover all muscle groups weekly', '3 sets × 10–12 reps', 'Progressive overload over time'] },
    { name: 'Basketball', type: 'Court Sports', duration: '60 min', frequency: '2x/week', calories: 500, intensity: 'Medium', facility: 'Court Sports', tips: ['Full body cardio + agility', 'Great for social fitness', 'Improves coordination'] },
    { name: 'Yoga', type: 'Mind & Body', duration: '45 min', frequency: '2x/week', calories: 150, intensity: 'Low', facility: 'Mind & Body', tips: ['Balances intense training', 'Reduces stress and tension', 'Improves sleep quality'] },
    { name: 'Swimming', type: 'Aquatics', duration: '40 min', frequency: '2x/week', calories: 320, intensity: 'Medium', facility: 'Aquatics', tips: ['Low impact, full body', 'Excellent recovery activity', 'Enjoyable and refreshing'] },
  ],
};

const DIET_RECS: Record<GoalType, (pref: DietaryPref) => DietRec> = {
  weight_loss: (pref) => ({
    calories: 1700,
    protein: 35, carbs: 35, fat: 30,
    meals: [
      { time: '7:00 AM', description: 'High-protein breakfast: eggs, Greek yogurt, berries' },
      { time: '10:00 AM', description: 'Snack: apple + 12 almonds' },
      { time: '1:00 PM', description: 'Lean protein + veggies + small complex carb' },
      { time: '4:00 PM', description: 'Pre-workout: banana + protein shake' },
      { time: '7:00 PM', description: 'Light dinner: salad + grilled fish or tofu' },
    ],
    foods: pref === 'vegan' ? ['Lentils', 'Chickpeas', 'Tofu', 'Quinoa', 'Spinach', 'Berries'] : pref === 'keto' ? ['Eggs', 'Avocado', 'Salmon', 'Almonds', 'Cheese', 'Broccoli'] : ['Chicken breast', 'Salmon', 'Greek yogurt', 'Quinoa', 'Broccoli', 'Berries'],
    avoid: ['Refined sugar', 'White bread & pasta', 'Fried foods', 'Sugary drinks', 'Alcohol', 'Late-night snacking'],
  }),
  muscle_gain: (pref) => ({
    calories: 3000,
    protein: 40, carbs: 40, fat: 20,
    meals: [
      { time: '7:00 AM', description: 'Large breakfast: oats, eggs, banana, milk' },
      { time: '10:30 AM', description: 'Protein snack: cottage cheese + fruit' },
      { time: '1:00 PM', description: 'Big lunch: rice + chicken/tofu + vegetables' },
      { time: '4:00 PM', description: 'Pre-workout: protein shake + fast carbs' },
      { time: '7:00 PM', description: 'Post-workout dinner: salmon + sweet potato' },
      { time: '9:30 PM', description: 'Casein protein shake or cottage cheese' },
    ],
    foods: pref === 'vegan' ? ['Tempeh', 'Seitan', 'Black beans', 'Brown rice', 'Peanut butter'] : ['Chicken', 'Eggs', 'Cottage cheese', 'Brown rice', 'Sweet potato', 'Milk'],
    avoid: ['Processed food', 'Trans fats', 'Excessive alcohol', 'Low-calorie dieting'],
  }),
  endurance: (pref) => ({
    calories: 2800,
    protein: 20, carbs: 55, fat: 25,
    meals: [
      { time: '6:30 AM', description: 'Carb-rich breakfast: oatmeal, banana, honey' },
      { time: '10:00 AM', description: 'Energy bar or fruit' },
      { time: '12:30 PM', description: 'Pasta or rice with lean protein' },
      { time: '3:30 PM', description: 'Pre-workout: carb gel or date balls' },
      { time: '7:00 PM', description: 'Recovery dinner: carbs + protein + healthy fat' },
    ],
    foods: ['Oats', 'Bananas', 'Pasta', 'Sweet potato', 'Dates', 'Whole grain bread'],
    avoid: ['High-fat meals before workout', 'Simple sugars mid-workout (except gels)', 'Dehydration'],
  }),
  flexibility: (pref) => ({
    calories: 2000,
    protein: 25, carbs: 45, fat: 30,
    meals: [
      { time: '8:00 AM', description: 'Anti-inflammatory breakfast: turmeric oats + berries' },
      { time: '11:00 AM', description: 'Green smoothie + handful of nuts' },
      { time: '1:30 PM', description: 'Mediterranean-style lunch: salad + legumes' },
      { time: '6:30 PM', description: 'Light dinner: stir-fry vegetables + tofu or fish' },
    ],
    foods: ['Turmeric', 'Berries', 'Leafy greens', 'Fatty fish', 'Walnuts', 'Olive oil'],
    avoid: ['Inflammatory foods: refined sugar, alcohol', 'Processed meats', 'Trans fats'],
  }),
  general_fitness: (pref) => ({
    calories: 2200,
    protein: 30, carbs: 45, fat: 25,
    meals: [
      { time: '7:30 AM', description: 'Balanced breakfast: eggs + whole grain + fruit' },
      { time: '10:30 AM', description: 'Snack: Greek yogurt + granola' },
      { time: '1:00 PM', description: 'Balanced lunch: protein + complex carbs + veggies' },
      { time: '4:00 PM', description: 'Light snack: fruit or protein bar' },
      { time: '7:00 PM', description: 'Dinner: lean protein + vegetables + healthy fat' },
    ],
    foods: ['Eggs', 'Oats', 'Chicken', 'Salmon', 'Quinoa', 'Broccoli', 'Avocado', 'Berries'],
    avoid: ['Processed food', 'Sugary drinks', 'Excessive saturated fat', 'Skipping meals'],
  }),
};

const GOAL_LABELS: Record<GoalType, string> = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', endurance: 'Endurance',
  flexibility: 'Flexibility', general_fitness: 'General Fitness',
};

const INTENSITY_COLORS: Record<string, string> = {
  Low: 'bg-blue-500/20 text-blue-400',
  Medium: 'bg-yellow-500/20 text-yellow-400',
  High: 'bg-red-500/20 text-red-400',
};

export default function Recommendations() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<FitnessGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [form, setForm] = useState<{
    goal_type: GoalType; activity_level: ActivityLevel; dietary_preference: DietaryPref; target_weight_kg: string;
  }>({ goal_type: 'general_fitness', activity_level: 'moderate', dietary_preference: 'balanced', target_weight_kg: '' });

  async function load() {
    const { data } = await supabase.from('fitness_goals').select('*').eq('user_id', user!.id).maybeSingle();
    setGoal(data);
    if (data) {
      setForm({ goal_type: data.goal_type, activity_level: data.activity_level, dietary_preference: data.dietary_preference, target_weight_kg: data.target_weight_kg ? String(data.target_weight_kg) : '' });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveGoal() {
    setSaving(true);
    const payload = { user_id: user!.id, goal_type: form.goal_type, activity_level: form.activity_level, dietary_preference: form.dietary_preference, target_weight_kg: form.target_weight_kg ? parseFloat(form.target_weight_kg) : null, updated_at: new Date().toISOString() };
    if (goal) {
      await supabase.from('fitness_goals').update(payload).eq('id', goal.id);
    } else {
      await supabase.from('fitness_goals').insert(payload);
    }
    setSaving(false);
    setEditingGoal(false);
    load();
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-gym-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  const exercises = EXERCISE_RECS[goal?.goal_type || 'general_fitness'];
  const diet = DIET_RECS[goal?.goal_type || 'general_fitness'](goal?.dietary_preference || 'balanced');

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Recommendations</h1>
          <p className="text-zinc-500 mt-1">Personalized exercise and diet plans based on your goals</p>
        </div>
        <button onClick={() => setEditingGoal(true)}
          className="flex items-center gap-2 bg-gym-surface border border-gym-border text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:border-gym-accent/30 transition-all">
          <Target className="w-4 h-4" /> {goal ? 'Edit Goal' : 'Set My Goal'}
        </button>
      </div>

      {!goal ? (
        <div className="bg-gym-card border border-gym-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gym-accent/10 border border-gym-accent/20 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gym-accent opacity-60" />
          </div>
          <h3 className="font-semibold text-white mb-2">Set Your Fitness Goal</h3>
          <p className="text-zinc-500 text-sm mb-6">Tell us about your goals to get personalized exercise and diet recommendations.</p>
          <button onClick={() => setEditingGoal(true)} className="bg-gym-accent text-black font-semibold px-6 py-3 rounded-xl hover:bg-gym-accent-dark transition-colors shadow-lg shadow-gym-accent/20">
            Get Started
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Goal summary */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-5 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gym-accent/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-gym-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{GOAL_LABELS[goal.goal_type]}</p>
              <p className="text-xs text-zinc-500 capitalize">{goal.activity_level.replace('_', ' ')} activity · {goal.dietary_preference.replace('_', ' ')} diet{goal.target_weight_kg ? ` · Target: ${goal.target_weight_kg} kg` : ''}</p>
            </div>
            <button onClick={() => setEditingGoal(true)} className="text-xs text-zinc-500 hover:text-gym-accent flex items-center gap-1 transition-colors">
              Change goal <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Exercise Recommendations */}
          <div>
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-gym-accent" /> Exercise Plan
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {exercises.map((ex, i) => (
                <div key={i} className="bg-gym-card border border-gym-border rounded-2xl p-5 hover:border-gym-accent/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white">{ex.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{ex.type}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${INTENSITY_COLORS[ex.intensity]}`}>{ex.intensity}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock className="w-3 h-3" />{ex.duration}</span>
                    <span className="flex items-center gap-1 text-xs text-zinc-400"><RotateCcw className="w-3 h-3" />{ex.frequency}</span>
                    <span className="flex items-center gap-1 text-xs text-orange-400"><Flame className="w-3 h-3" />~{ex.calories} kcal</span>
                  </div>
                  <ul className="space-y-1.5 border-t border-gym-border pt-3">
                    {ex.tips.map((tip, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-zinc-500">
                        <Check className="w-3 h-3 text-gym-accent flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Diet Recommendations */}
          <div>
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Salad className="w-4 h-4 text-gym-accent" /> Diet Plan
            </h2>
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Macros */}
              <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
                <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Daily Targets</p>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-gym-accent">{diet.calories}</p>
                  <p className="text-xs text-zinc-500">calories/day</p>
                </div>
                {[
                  { label: 'Protein', pct: diet.protein, color: 'bg-blue-400', g: Math.round(diet.calories * diet.protein / 100 / 4) },
                  { label: 'Carbs', pct: diet.carbs, color: 'bg-gym-accent', g: Math.round(diet.calories * diet.carbs / 100 / 4) },
                  { label: 'Fat', pct: diet.fat, color: 'bg-yellow-400', g: Math.round(diet.calories * diet.fat / 100 / 9) },
                ].map(m => (
                  <div key={m.label} className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-400">{m.label}</span>
                      <span className="text-zinc-500">{m.pct}% · {m.g}g</span>
                    </div>
                    <div className="h-1.5 bg-gym-muted rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Meal plan */}
              <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
                <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gym-accent" /> Daily Schedule</p>
                <div className="space-y-3">
                  {diet.meals.map((m, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-xs text-gym-accent font-mono flex-shrink-0 mt-0.5 w-14">{m.time}</span>
                      <p className="text-xs text-zinc-400 leading-relaxed">{m.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Foods */}
              <div className="space-y-4">
                <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Apple className="w-4 h-4 text-gym-accent" /> Eat More Of</p>
                  <div className="flex flex-wrap gap-2">
                    {diet.foods.map(f => (
                      <span key={f} className="text-xs bg-gym-accent/10 text-gym-accent border border-gym-accent/20 px-2.5 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
                  <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /> Reduce / Avoid</p>
                  <div className="flex flex-wrap gap-2">
                    {diet.avoid.map(f => (
                      <span key={f} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal setting modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-white">Set Your Goal</h2>
              <button onClick={() => setEditingGoal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2">Primary Goal</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.entries(GOAL_LABELS) as [GoalType, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setForm({ ...form, goal_type: key })}
                      className={`px-4 py-2.5 rounded-xl border text-sm text-left transition-all ${form.goal_type === key ? 'border-gym-accent bg-gym-accent/10 text-gym-accent' : 'border-gym-border text-zinc-400 hover:border-zinc-600'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2">Activity Level</label>
                <select value={form.activity_level} onChange={e => setForm({ ...form, activity_level: e.target.value as ActivityLevel })} className="input-base w-full">
                  <option value="sedentary">Sedentary (desk job, no exercise)</option>
                  <option value="light">Light (1–3 days/week)</option>
                  <option value="moderate">Moderate (3–5 days/week)</option>
                  <option value="active">Active (6–7 days/week)</option>
                  <option value="very_active">Very Active (twice daily)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-2">Dietary Preference</label>
                <select value={form.dietary_preference} onChange={e => setForm({ ...form, dietary_preference: e.target.value as DietaryPref })} className="input-base w-full">
                  <option value="balanced">Balanced</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="high_protein">High Protein</option>
                  <option value="low_carb">Low Carb</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Target Weight (kg, optional)</label>
                <input type="number" step="0.1" value={form.target_weight_kg} onChange={e => setForm({ ...form, target_weight_kg: e.target.value })} className="input-base w-full" placeholder="e.g. 75" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingGoal(false)} className="flex-1 py-2.5 rounded-xl border border-gym-border text-zinc-400 text-sm transition-colors hover:text-white">Cancel</button>
                <button onClick={saveGoal} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gym-accent text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gym-accent-dark disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Save Goal</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
