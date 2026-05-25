-- Remove the old check constraint that limits status to hardcoded values
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Update default status to match the default appointment status name
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'Programada';