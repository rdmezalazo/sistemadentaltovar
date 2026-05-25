-- Create expenses table for managing expenses by branch
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  
  -- Expense categories (all numeric columns for amounts)
  operatory NUMERIC DEFAULT 0,
  endodontics NUMERIC DEFAULT 0,
  orthodontics NUMERIC DEFAULT 0,
  implants NUMERIC DEFAULT 0,
  crowns NUMERIC DEFAULT 0,
  equipment NUMERIC DEFAULT 0,
  repairs NUMERIC DEFAULT 0,
  cleaning NUMERIC DEFAULT 0,
  salaries NUMERIC DEFAULT 0,
  taxes NUMERIC DEFAULT 0,
  laboratory NUMERIC DEFAULT 0,
  services NUMERIC DEFAULT 0,
  other NUMERIC DEFAULT 0,
  
  total NUMERIC GENERATED ALWAYS AS (
    COALESCE(operatory, 0) + COALESCE(endodontics, 0) + COALESCE(orthodontics, 0) + 
    COALESCE(implants, 0) + COALESCE(crowns, 0) + COALESCE(equipment, 0) + 
    COALESCE(repairs, 0) + COALESCE(cleaning, 0) + COALESCE(salaries, 0) + 
    COALESCE(taxes, 0) + COALESCE(laboratory, 0) + COALESCE(services, 0) + 
    COALESCE(other, 0)
  ) STORED,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Authenticated users can view expenses"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create expenses"
  ON public.expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update expenses"
  ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete expenses"
  ON public.expenses
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_branch ON public.expenses(branch_id);

-- Create trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();