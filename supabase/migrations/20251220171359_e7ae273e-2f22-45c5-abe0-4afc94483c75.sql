-- Add status field to account_concepts for tracking payment status per concept
ALTER TABLE public.account_concepts 
ADD COLUMN status text NOT NULL DEFAULT 'pending',
ADD COLUMN paid_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN payment_method text,
ADD COLUMN payment_date timestamp with time zone;

-- Add invoice number fields to accounts
ALTER TABLE public.accounts
ADD COLUMN internal_invoice_number text,
ADD COLUMN electronic_invoice_number text;

-- Update payment_methods to include the required methods if not exists
INSERT INTO public.payment_methods (name, description, is_active)
VALUES 
  ('Contado', 'Pago en efectivo', true),
  ('Yape', 'Pago por Yape', true),
  ('Transferencia', 'Transferencia bancaria', true)
ON CONFLICT DO NOTHING;