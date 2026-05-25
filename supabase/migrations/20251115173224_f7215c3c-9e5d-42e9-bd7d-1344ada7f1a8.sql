-- Create appointment_statuses table
CREATE TABLE public.appointment_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view appointment statuses"
ON public.appointment_statuses
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage appointment statuses"
ON public.appointment_statuses
FOR ALL
USING (true);

-- Insert default statuses
INSERT INTO public.appointment_statuses (name, color, display_order) VALUES
  ('Programada', '#10b981', 1),
  ('Completada', '#f59e0b', 2),
  ('Cancelada', '#ef4444', 3);