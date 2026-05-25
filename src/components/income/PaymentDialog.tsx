import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const paymentSchema = z.object({
  account_id: z.string().min(1, "Selecciona una cuenta"),
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
  payment_method: z.string().min(1, "Selecciona un método de pago"),
  branch_id: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PaymentDialog = ({ open, onOpenChange }: PaymentDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      account_id: "",
      amount: 0,
      payment_method: "",
      branch_id: "",
      reference_number: "",
      notes: "",
    },
  });

  // Fetch accounts with pending balance
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts-with-balance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select(`
          *,
          patients(full_name),
          appointments(treatment, diagnosis)
        `)
        .gt("balance", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Create the payment
      const { error: paymentError } = await supabase.from("payments").insert({
        account_id: values.account_id,
        amount: values.amount,
        payment_method: values.payment_method,
        branch_id: values.branch_id || null,
        reference_number: values.reference_number || null,
        notes: values.notes || null,
        created_by: user.id,
        status: "paid",
      });

      if (paymentError) throw paymentError;

      // Update account balance
      const account = accounts?.find((a) => a.id === values.account_id);
      if (account) {
        const newPaidAmount = Number(account.paid_amount) + values.amount;
        const newBalance = Number(account.total_amount) - newPaidAmount;
        const newStatus = newBalance <= 0 ? "paid" : "partial";

        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            paid_amount: newPaidAmount,
            balance: Math.max(0, newBalance),
            status: newStatus,
          })
          .eq("id", values.account_id);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["income-report"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-with-balance"] });
      form.reset();
      setSelectedAccount(null);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const watchAccountId = form.watch("account_id");

  useEffect(() => {
    if (watchAccountId) {
      const account = accounts?.find((a) => a.id === watchAccountId);
      setSelectedAccount(account);
    } else {
      setSelectedAccount(null);
    }
  }, [watchAccountId, accounts]);

  const onSubmit = (values: PaymentFormValues) => {
    createPaymentMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuenta / Paciente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={accountsLoading ? "Cargando..." : "Seleccionar cuenta"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_number} - {account.patients?.full_name} (Saldo: S/ {Number(account.balance).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedAccount && (
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><span className="font-medium">Paciente:</span> {selectedAccount.patients?.full_name}</p>
                <p><span className="font-medium">Tratamiento:</span> {selectedAccount.appointments?.treatment || selectedAccount.appointments?.diagnosis || "N/A"}</p>
                <p><span className="font-medium">Total cuenta:</span> S/ {Number(selectedAccount.total_amount).toFixed(2)}</p>
                <p><span className="font-medium">Pagado:</span> S/ {Number(selectedAccount.paid_amount).toFixed(2)}</p>
                <p className="text-primary font-semibold"><span className="font-medium">Saldo pendiente:</span> S/ {Number(selectedAccount.balance).toFixed(2)}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a pagar</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods?.map((method) => (
                        <SelectItem key={method.id} value={method.name.toLowerCase()}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sede (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sede" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branches?.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Referencia (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Número de transferencia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observaciones adicionales" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar Pago
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
