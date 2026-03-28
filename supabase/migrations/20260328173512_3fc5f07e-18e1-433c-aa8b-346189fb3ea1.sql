-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('UPI', 'Cash')),
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  note TEXT DEFAULT ''
);

-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Development policies (allow all access via anon key)
CREATE POLICY "Allow all access to members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);

-- Index for faster payment lookups
CREATE INDEX idx_payments_member_id ON public.payments(member_id);
CREATE INDEX idx_payments_date ON public.payments(date DESC);