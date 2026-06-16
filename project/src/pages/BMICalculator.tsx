import { useState } from 'react';
import { Activity, Save, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface BMIResult {
  bmi: number;
  category: string;
  color: string;
  arcColor: string;
  description: string;
  advice: string[];
}

function calcBMI(weightKg: number, heightCm: number): BMIResult {
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const rounded = Math.round(bmi * 10) / 10;

  if (bmi < 18.5) return {
    bmi: rounded, category: 'Underweight', color: 'text-blue-400', arcColor: '#60a5fa',
    description: 'Your BMI indicates you may be underweight. Consider consulting a healthcare provider.',
    advice: ['Increase caloric intake with nutrient-dense foods', 'Incorporate strength training to build muscle mass', 'Eat 5-6 small meals throughout the day', 'Include healthy fats: avocado, nuts, olive oil'],
  };
  if (bmi < 25) return {
    bmi: rounded, category: 'Normal Weight', color: 'text-gym-accent', arcColor: '#a3e635',
    description: 'Great! Your BMI is within the healthy range. Maintain your current lifestyle.',
    advice: ['Continue balanced nutrition habits', 'Aim for 150+ min of moderate exercise per week', 'Include both cardio and strength training', 'Stay hydrated — drink 8+ glasses of water daily'],
  };
  if (bmi < 30) return {
    bmi: rounded, category: 'Overweight', color: 'text-yellow-400', arcColor: '#facc15',
    description: 'Your BMI suggests you are slightly overweight. Small lifestyle changes can help.',
    advice: ['Create a moderate caloric deficit (300-500 kcal/day)', 'Increase cardio: aim for 200+ min/week', 'Reduce processed food and refined sugars', 'Try HIIT workouts for efficient fat burning'],
  };
  return {
    bmi: rounded, category: 'Obese', color: 'text-red-400', arcColor: '#f87171',
    description: 'Your BMI indicates obesity. Gradual lifestyle changes and medical guidance are recommended.',
    advice: ['Consult a healthcare provider before starting intense exercise', 'Start with low-impact cardio: walking, swimming, cycling', 'Focus on sustainable dietary changes, not crash diets', 'Track meals and aim for 500-700 kcal deficit per day'],
  };
}

function BMIGauge({ bmi }: { bmi: number }) {
  const cx = 120, cy = 110, r = 90;
  const startAngle = 210, endAngle = 330;
  const totalDeg = (360 - startAngle + endAngle);

  function polarToXY(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function arcPath(from: number, to: number, innerR: number, outerR: number) {
    const s = polarToXY(from, outerR);
    const e = polarToXY(to, outerR);
    const si = polarToXY(from, innerR);
    const ei = polarToXY(to, innerR);
    const la = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${outerR} ${outerR} 0 ${la} 1 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${innerR} ${innerR} 0 ${la} 0 ${si.x} ${si.y} Z`;
  }

  const clampedBmi = Math.min(Math.max(bmi, 10), 40);
  const needleAngle = startAngle + ((clampedBmi - 10) / 30) * totalDeg;
  const needleTip = polarToXY(needleAngle, 78);

  const segments = [
    { from: startAngle, to: startAngle + totalDeg * (8.5 / 30), color: '#60a5fa', label: '<18.5' },
    { from: startAngle + totalDeg * (8.5 / 30), to: startAngle + totalDeg * (15 / 30), color: '#a3e635', label: '18.5-25' },
    { from: startAngle + totalDeg * (15 / 30), to: startAngle + totalDeg * (20 / 30), color: '#facc15', label: '25-30' },
    { from: startAngle + totalDeg * (20 / 30), to: startAngle + totalDeg, color: '#f87171', label: '30+' },
  ];

  return (
    <svg viewBox="0 0 240 140" className="w-full max-w-xs mx-auto">
      {segments.map((seg, i) => (
        <path key={i} d={arcPath(seg.from, seg.to, 68, 95)} fill={seg.color} opacity="0.85" />
      ))}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="white" />
      {/* Labels */}
      {[
        { label: 'Under', x: 22, y: 108 },
        { label: 'Normal', x: 95, y: 20 },
        { label: 'Over', x: 165, y: 50 },
        { label: 'Obese', x: 190, y: 108 },
      ].map(({ label, x, y }) => (
        <text key={label} x={x} y={y} fill="#71717a" fontSize="9" textAnchor="middle">{label}</text>
      ))}
    </svg>
  );
}

export default function BMICalculator() {
  const { user } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [result, setResult] = useState<BMIResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function calculate() {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return;

    let weightKg = w, heightCm = h;
    if (unit === 'imperial') {
      weightKg = w * 0.453592;
      heightCm = h * 2.54;
    }
    setResult(calcBMI(weightKg, heightCm));
    setSaved(false);
  }

  async function saveToDB() {
    if (!result || !user) return;
    const h = parseFloat(height);
    const w = parseFloat(weight);
    let weightKg = w, heightCm = h;
    if (unit === 'imperial') { weightKg = w * 0.453592; heightCm = h * 2.54; }

    setSaving(true);
    await supabase.from('fitness_progress').insert({
      user_id: user.id,
      recorded_date: new Date().toISOString().split('T')[0],
      weight_kg: Math.round(weightKg * 10) / 10,
      height_cm: Math.round(heightCm * 10) / 10,
      bmi: result.bmi,
    });
    setSaving(false);
    setSaved(true);
  }

  const idealMin = unit === 'imperial'
    ? (18.5 * Math.pow((parseFloat(height) * 2.54 / 100), 2) / 0.453592).toFixed(1)
    : (18.5 * Math.pow((parseFloat(height) / 100), 2)).toFixed(1);
  const idealMax = unit === 'imperial'
    ? (24.9 * Math.pow((parseFloat(height) * 2.54 / 100), 2) / 0.453592).toFixed(1)
    : (24.9 * Math.pow((parseFloat(height) / 100), 2)).toFixed(1);
  const showIdeal = parseFloat(height) > 0;

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">BMI Calculator</h1>
        <p className="text-zinc-500 mt-1">Calculate your Body Mass Index and get personalized health insights</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6 max-w-5xl">
        {/* Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Activity className="w-5 h-5 text-gym-accent" />
              <h2 className="font-semibold text-white">Your Measurements</h2>
            </div>

            {/* Unit toggle */}
            <div className="flex bg-gym-muted rounded-xl p-1 mb-5">
              {(['metric', 'imperial'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => { setUnit(u); setHeight(''); setWeight(''); setResult(null); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${unit === u ? 'bg-gym-accent text-black' : 'text-zinc-400 hover:text-white'}`}
                >
                  {u} {u === 'metric' ? '(kg/cm)' : '(lb/in)'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Height ({unit === 'metric' ? 'cm' : 'inches'})
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder={unit === 'metric' ? 'e.g. 175' : 'e.g. 69'}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Weight ({unit === 'metric' ? 'kg' : 'lbs'})
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder={unit === 'metric' ? 'e.g. 72' : 'e.g. 158'}
                  className="input-base w-full"
                />
              </div>

              {showIdeal && (
                <p className="text-xs text-zinc-600 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-zinc-500" />
                  Healthy weight range for your height: <span className="text-zinc-400">{idealMin}–{idealMax} {unit === 'metric' ? 'kg' : 'lbs'}</span>
                </p>
              )}

              <button
                onClick={calculate}
                disabled={!height || !weight}
                className="w-full bg-gym-accent hover:bg-gym-accent-dark text-black font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-gym-accent/20 disabled:opacity-40"
              >
                <Activity className="w-4 h-4" /> Calculate BMI
              </button>

              {result && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setHeight(''); setWeight(''); setResult(null); setSaved(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-400 hover:text-white bg-gym-muted rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                  <button
                    onClick={saveToDB}
                    disabled={saving || saved}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${saved ? 'bg-gym-accent/10 text-gym-accent' : 'bg-gym-surface hover:bg-gym-muted border border-gym-border text-zinc-400 hover:text-white'}`}
                  >
                    {saved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save to Progress</>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BMI reference table */}
          <div className="bg-gym-card border border-gym-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">BMI Categories</h3>
            <div className="space-y-2">
              {[
                { label: 'Underweight', range: '< 18.5', color: 'bg-blue-400' },
                { label: 'Normal Weight', range: '18.5 – 24.9', color: 'bg-gym-accent' },
                { label: 'Overweight', range: '25 – 29.9', color: 'bg-yellow-400' },
                { label: 'Obese', range: '≥ 30', color: 'bg-red-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                    <span className="text-sm text-zinc-300">{row.label}</span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">{row.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="lg:col-span-3">
          {!result ? (
            <div className="bg-gym-card border border-gym-border rounded-2xl h-full flex items-center justify-center p-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gym-accent/10 border border-gym-accent/20 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-10 h-10 text-gym-accent opacity-60" />
                </div>
                <p className="text-zinc-500">Enter your measurements to calculate your BMI</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              {/* Main result card */}
              <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
                <BMIGauge bmi={result.bmi} />
                <div className="text-center mt-4">
                  <p className="text-5xl font-bold text-white mb-1">{result.bmi}</p>
                  <p className={`text-lg font-semibold ${result.color}`}>{result.category}</p>
                  <p className="text-zinc-500 text-sm mt-2 max-w-sm mx-auto">{result.description}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-gym-card border border-gym-border rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gym-accent" />
                  Health Recommendations
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {result.advice.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gym-surface border border-gym-border rounded-xl p-3">
                      <div className="w-5 h-5 rounded-lg bg-gym-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-gym-accent text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-relaxed">
                  BMI is a screening tool, not a diagnostic measure. It does not account for muscle mass, bone density, or body fat distribution. Consult a healthcare professional for personalized medical advice.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
