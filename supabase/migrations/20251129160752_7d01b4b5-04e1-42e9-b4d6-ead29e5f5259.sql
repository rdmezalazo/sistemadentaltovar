-- Create doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  branch_id UUID REFERENCES public.branches(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for doctors
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create policies for doctors
CREATE POLICY "Authenticated users can view doctors"
  ON public.doctors
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage doctors"
  ON public.doctors
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_methods
CREATE POLICY "Authenticated users can view payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage payment methods"
  ON public.payment_methods
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Insert default payment methods
INSERT INTO public.payment_methods (name, description) VALUES
  ('Efectivo', 'Pago en efectivo'),
  ('YAPE', 'Pago digital por YAPE'),
  ('Transferencia Bancaria', 'Transferencia a cuenta bancaria'),
  ('Tarjeta de Crédito/Débito', 'Pago con tarjeta');

-- Create payment_statuses table
CREATE TABLE IF NOT EXISTS public.payment_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6b7280',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for payment_statuses
ALTER TABLE public.payment_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_statuses
CREATE POLICY "Authenticated users can view payment statuses"
  ON public.payment_statuses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage payment statuses"
  ON public.payment_statuses
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Insert default payment statuses
INSERT INTO public.payment_statuses (name, description, color) VALUES
  ('Pagado', 'El pago ha sido completado', '#22c55e'),
  ('Adelanto', 'Pago parcial o adelanto', '#f59e0b'),
  ('Anulado', 'El pago ha sido anulado', '#ef4444'),
  ('Pendiente', 'Pago pendiente de realización', '#6b7280');