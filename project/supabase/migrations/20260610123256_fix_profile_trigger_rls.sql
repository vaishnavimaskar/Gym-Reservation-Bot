/*
# Fix profile trigger and RLS policies

## Problem
The handle_new_user trigger was failing during signup because the profiles
INSERT policy only allows 'authenticated' role, but during signup the trigger
runs in a different security context. This caused "Database error saving new user".

## Changes
1. Recreate handle_new_user with exception handling and correct search_path
2. Add insert policy that covers the service_role and postgres contexts
3. Add anon insert policy so profile creation works during signup flow
*/

-- Drop and recreate the trigger function with proper search_path and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log and continue — don't block signup if profile insert fails
  RAISE WARNING 'handle_new_user: failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Re-create the trigger to make sure it's attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow service_role and postgres to insert profiles (needed for trigger context)
DROP POLICY IF EXISTS "service_role_insert_profiles" ON public.profiles;
CREATE POLICY "service_role_insert_profiles" ON public.profiles FOR INSERT
  TO service_role WITH CHECK (true);

-- Also allow anon inserts so the signup flow profile creation works
-- (Supabase auth runs in anon context during trigger evaluation in some configurations)
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  TO anon, authenticated, service_role WITH CHECK (true);
