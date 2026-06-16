/*
# Add Fitness & Notifications Tables

## Summary
Adds all tables and columns needed for BMI tracking, fitness progress, workout logging,
exercise/diet goal preferences, and notification history + preferences.

## New Tables
1. `fitness_goals` — one row per user; stores goal type, activity level, dietary preference, target weight
2. `fitness_progress` — time-series body measurements (weight, height, BMI, body fat, waist, etc.)
3. `workout_logs` — individual workout sessions with type, duration, calories burned
4. `notifications` — sent notification history (email/SMS) with status

## Modified Tables
- `profiles` — adds `email_notifications` (bool) and `sms_notifications` (bool) preference columns

## Security
- All new tables: RLS enabled with owner-scoped policies (each user sees only their own rows)
- Notifications: admins can also read all notifications
*/

-- ── fitness_goals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fitness_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL DEFAULT 'general_fitness'
    CHECK (goal_type IN ('weight_loss','muscle_gain','endurance','flexibility','general_fitness')),
  target_weight_kg decimal(5,2),
  activity_level text NOT NULL DEFAULT 'moderate'
    CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  dietary_preference text NOT NULL DEFAULT 'balanced'
    CHECK (dietary_preference IN ('balanced','vegetarian','vegan','keto','high_protein','low_carb')),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE fitness_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitness_goals_select" ON fitness_goals;
CREATE POLICY "fitness_goals_select" ON fitness_goals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fitness_goals_insert" ON fitness_goals;
CREATE POLICY "fitness_goals_insert" ON fitness_goals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fitness_goals_update" ON fitness_goals;
CREATE POLICY "fitness_goals_update" ON fitness_goals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fitness_goals_delete" ON fitness_goals;
CREATE POLICY "fitness_goals_delete" ON fitness_goals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── fitness_progress ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fitness_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg decimal(5,2),
  height_cm decimal(5,2),
  body_fat_percent decimal(4,2),
  bmi decimal(4,2),
  waist_cm decimal(5,2),
  chest_cm decimal(5,2),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fitness_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fp_select" ON fitness_progress;
CREATE POLICY "fp_select" ON fitness_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fp_insert" ON fitness_progress;
CREATE POLICY "fp_insert" ON fitness_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fp_update" ON fitness_progress;
CREATE POLICY "fp_update" ON fitness_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fp_delete" ON fitness_progress;
CREATE POLICY "fp_delete" ON fitness_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── workout_logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  exercise_type text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  calories_burned int DEFAULT 0,
  sets int DEFAULT 0,
  reps int DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wl_select" ON workout_logs;
CREATE POLICY "wl_select" ON workout_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wl_insert" ON workout_logs;
CREATE POLICY "wl_insert" ON workout_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wl_update" ON workout_logs;
CREATE POLICY "wl_update" ON workout_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wl_delete" ON workout_logs;
CREATE POLICY "wl_delete" ON workout_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── notifications ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','in_app')),
  subject text DEFAULT '',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','pending','failed')),
  related_type text DEFAULT '',
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notifications;
CREATE POLICY "notif_select" ON notifications FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "notif_update" ON notifications;
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "notif_delete" ON notifications;
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── profiles: add notification preference columns ──────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_notifications boolean NOT NULL DEFAULT false;
