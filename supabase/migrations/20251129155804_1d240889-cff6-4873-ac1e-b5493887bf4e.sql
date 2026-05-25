-- Create branches/locations table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branches
CREATE POLICY "Authenticated users can view branches"
  ON public.branches
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage branches"
  ON public.branches
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add branch_id to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Add branch_id to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Insert default branch
INSERT INTO public.branches (name, address, is_active)
VALUES ('Sede Principal', 'Dirección por definir', true)
ON CONFLICT DO NOTHING;