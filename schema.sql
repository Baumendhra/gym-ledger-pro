-- SQL Schema for Gym Ledger Pro
-- Execute this in the Supabase SQL Editor of your new project before importing CSVs.

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id uuid NOT NULL DEFAULT auth.uid() PRIMARY KEY,
    owner_name text,
    gym_name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: In a real Supabase setup, 'profiles.id' is a foreign key to 'auth.users(id)'.
-- Assuming you will recreate users in Auth, you can add that constraint manually if needed:
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Members Table
CREATE TABLE public.members (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text NOT NULL,
    package_type text,
    membership_plan text NOT NULL,
    last_payment_date date,
    next_due_date date,
    last_visit_date timestamp with time zone,
    notes text,
    profile_image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Payments Table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    mode text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    note text,
    package_type text,
    membership_plan text
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Members
CREATE POLICY "Users can manage their own gym's members" ON public.members 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Provide anon access to check-in identification
CREATE POLICY "Anon can view members for checkin" ON public.members 
  FOR SELECT USING (true);
CREATE POLICY "Anon can update members for checkin" ON public.members 
  FOR UPDATE USING (true);

-- Payments
CREATE POLICY "Users can manage payments for their members" ON public.payments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.id = payments.member_id AND members.user_id = auth.uid())
  );
