/*
# Gym Reservation System Schema

## Summary
Creates the full gym management database with facilities, members, bookings, payments, and membership tables.

## New Tables
1. `profiles` - Extended user info (name, phone, role: admin/member) linked to auth.users
2. `facilities` - Gym facilities (pools, courts, weight rooms, etc.) with type, price, facilitator
3. `facilitators` - Staff/trainers who manage facilities
4. `membership_plans` - Available membership tiers (Basic, Pro, VIP)
5. `bookings` - Facility reservations with date/time, status, payment tracking
6. `payments` - Payment transaction records
7. `pending_terminations` - Member termination requests awaiting admin approval

## Security
- RLS enabled on all tables
- Admins (role='admin') can read/write all rows
- Members can only read/write their own data
- Anon users can read facilities and membership plans (for booking page)
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone_number text DEFAULT '',
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  member_since timestamptz DEFAULT now(),
  payment_due decimal(6,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )) WITH CHECK (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Facilitators table
CREATE TABLE IF NOT EXISTS facilitators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone_number text DEFAULT '',
  email text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE facilitators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facilitators_select" ON facilitators;
CREATE POLICY "facilitators_select" ON facilitators FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "facilitators_insert" ON facilitators;
CREATE POLICY "facilitators_insert" ON facilitators FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "facilitators_update" ON facilitators;
CREATE POLICY "facilitators_update" ON facilitators FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "facilitators_delete" ON facilitators;
CREATE POLICY "facilitators_delete" ON facilitators FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  facility_type text NOT NULL,
  description text DEFAULT '',
  price decimal(6,2) NOT NULL DEFAULT 0,
  capacity int NOT NULL DEFAULT 20,
  facilitator_id uuid REFERENCES facilitators(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facilities_select" ON facilities;
CREATE POLICY "facilities_select" ON facilities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "facilities_insert" ON facilities;
CREATE POLICY "facilities_insert" ON facilities FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "facilities_update" ON facilities;
CREATE POLICY "facilities_update" ON facilities FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "facilities_delete" ON facilities;
CREATE POLICY "facilities_delete" ON facilities FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Membership plans table
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(6,2) NOT NULL,
  duration_months int NOT NULL DEFAULT 1,
  description text DEFAULT '',
  features text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "membership_plans_select" ON membership_plans;
CREATE POLICY "membership_plans_select" ON membership_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "membership_plans_insert" ON membership_plans;
CREATE POLICY "membership_plans_insert" ON membership_plans FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "membership_plans_update" ON membership_plans;
CREATE POLICY "membership_plans_update" ON membership_plans FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "membership_plans_delete" ON membership_plans;
CREATE POLICY "membership_plans_delete" ON membership_plans FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  member_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  booked_date date NOT NULL,
  booked_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'pending')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  notes text DEFAULT '',
  datetime_of_booking timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings FOR UPDATE
  TO authenticated USING (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  ) WITH CHECK (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "bookings_delete" ON bookings;
CREATE POLICY "bookings_delete" ON bookings FOR DELETE
  TO authenticated USING (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount decimal(6,2) NOT NULL,
  payment_type text NOT NULL DEFAULT 'membership' CHECK (payment_type IN ('membership', 'booking', 'other')),
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  datetime_of_payment timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT
  TO authenticated USING (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Pending terminations table
CREATE TABLE IF NOT EXISTS pending_terminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text DEFAULT '',
  request_date timestamptz DEFAULT now(),
  payment_due decimal(6,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pending_terminations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terminations_select" ON pending_terminations;
CREATE POLICY "terminations_select" ON pending_terminations FOR SELECT
  TO authenticated USING (
    auth.uid() = member_id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "terminations_insert" ON pending_terminations;
CREATE POLICY "terminations_insert" ON pending_terminations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "terminations_update" ON pending_terminations;
CREATE POLICY "terminations_update" ON pending_terminations FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "terminations_delete" ON pending_terminations;
CREATE POLICY "terminations_delete" ON pending_terminations FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed default membership plans
INSERT INTO membership_plans (name, price, duration_months, description, features) VALUES
  ('Basic', 29.99, 1, 'Essential gym access', ARRAY['Gym floor access', '2 facility bookings/month', 'Locker room access']),
  ('Pro', 59.99, 1, 'Full gym experience', ARRAY['Unlimited gym access', '10 facility bookings/month', 'Group classes', 'Locker room access']),
  ('VIP', 99.99, 1, 'Premium all-inclusive', ARRAY['24/7 gym access', 'Unlimited bookings', 'Personal trainer session', 'Group classes', 'Spa access', 'Nutrition consultation'])
ON CONFLICT DO NOTHING;

-- Seed default facilitators
INSERT INTO facilitators (full_name, phone_number, email) VALUES
  ('Marcus Johnson', '+1-555-0101', 'marcus@gymfit.com'),
  ('Sarah Chen', '+1-555-0102', 'sarah@gymfit.com'),
  ('David Torres', '+1-555-0103', 'david@gymfit.com')
ON CONFLICT DO NOTHING;

-- Seed default facilities (will be updated after facilitators are inserted)
INSERT INTO facilities (name, facility_type, description, price, capacity, is_active) VALUES
  ('Main Weight Room', 'Strength', 'Full equipped weight training area with free weights and machines', 15.00, 30, true),
  ('Olympic Pool', 'Aquatics', '50-meter competition pool with 8 lanes', 20.00, 40, true),
  ('Basketball Court A', 'Court Sports', 'Full-size indoor basketball court', 25.00, 20, true),
  ('Spin Studio', 'Cardio', '40-bike indoor cycling studio', 18.00, 40, true),
  ('Yoga & Pilates Room', 'Mind & Body', 'Dedicated space for yoga and pilates classes', 12.00, 25, true),
  ('Boxing Ring', 'Combat Sports', 'Professional boxing ring with heavy bags', 30.00, 15, true),
  ('Tennis Court 1', 'Court Sports', 'Hard surface indoor tennis court', 35.00, 4, true),
  ('Sauna & Steam Room', 'Wellness', 'Relaxation and recovery facility', 10.00, 10, true)
ON CONFLICT DO NOTHING;
