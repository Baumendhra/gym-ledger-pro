-- Add next_due_date column
ALTER TABLE public.members ADD COLUMN next_due_date TIMESTAMP WITH TIME ZONE;

-- Normalize existing membership plans
UPDATE public.members
SET membership_plan = CASE
  WHEN membership_plan = 'Monthly' THEN 'monthly'
  WHEN membership_plan = '3 Months' THEN '3_months'
  WHEN membership_plan = '6 Months' THEN '6_months'
  WHEN membership_plan = '1 Year' THEN 'yearly'
  ELSE 'monthly' -- fallback generic
END;

-- Backfill next due date for existing records with a last_payment_date
UPDATE public.members
SET next_due_date = CASE
  WHEN membership_plan = 'monthly' THEN last_payment_date + interval '30 days'
  WHEN membership_plan = '3_months' THEN last_payment_date + interval '90 days'
  WHEN membership_plan = '6_months' THEN last_payment_date + interval '180 days'
  WHEN membership_plan = 'yearly' THEN last_payment_date + interval '365 days'
  ELSE last_payment_date + interval '30 days'
END
WHERE last_payment_date IS NOT NULL;
