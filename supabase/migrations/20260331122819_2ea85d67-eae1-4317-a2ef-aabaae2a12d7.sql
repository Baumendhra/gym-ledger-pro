
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS next_due_date timestamptz;

UPDATE public.members SET next_due_date =
CASE membership_plan
    WHEN 'monthly'   THEN last_payment_date + INTERVAL '30 days'
    WHEN '6months'   THEN last_payment_date + INTERVAL '180 days'
    WHEN '1year'     THEN last_payment_date + INTERVAL '365 days'
    ELSE                  last_payment_date + INTERVAL '30 days'
END
WHERE last_payment_date IS NOT NULL;
