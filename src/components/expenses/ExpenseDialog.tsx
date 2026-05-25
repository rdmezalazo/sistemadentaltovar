import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const expenseSchema = z.object({
  expense_date: z.string().min(1, "La fecha es requerida"),
  description: z.string().min(1, "La descripción es requerida"),
  branch_id: z.string().optional(),
  operatory: z.string().optional(),
  endodontics: z.string().optional(),
  orthodontics: z.string().optional(),
  implants: z.string().optional(),
  crowns: z.string().optional(),
  equipment: z.string().optional(),
  repairs: z.string().optional(),
  cleaning: z.string().optional(),
  salaries: z.string().optional(),
  taxes: z.string().optional(),
  laboratory: z.string().optional(),
  services: z.string().optional(),
  other: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: any;
}

export function ExpenseDialog({ open, onOpenChange, expense }: ExpenseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      branch_id: "",
      operatory: "",
      endodontics: "",
      orthodontics: "",
      implants: "",
      crowns: "",
      equipment: "",
      repairs: "",
      cleaning: "",
      salaries: "",
      taxes: "",
      laboratory: "",
      services: "",
      other: "",
    },
  });

  useEffect(() => {
    if (expense) {
      form.reset({
        expense_date: format(new Date(expense.expense_date), "yyyy-MM-dd"),
        description: expense.description || "",
        branch_id: expense.branch_id || "",
        operatory: expense.operatory?.toString() || "",
        endodontics: expense.endodontics?.toString() || "",
        orthodontics: expense.orthodontics?.toString() || "",
        implants: expense.implants?.toString() || "",
        crowns: expense.crowns?.toString() || "",
        equipment: expense.equipment?.toString() || "",
        repairs: expense.repairs?.toString() || "",
        cleaning: expense.cleaning?.toString() || "",
        salaries: expense.salaries?.toString() || "",
        taxes: expense.taxes?.toString() || "",
        laboratory: expense.laboratory?.toString() || "",
        services: expense.services?.toString() || "",
        other: expense.other?.toString() || "",
      });
    } else {
      form.reset({
        expense_date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        branch_id: "",
        operatory: "",
        endodontics: "",
        orthodontics: "",
        implants: "",
        crowns: "",
        equipment: "",
        repairs: "",
        cleaning: "",
        salaries: "",
        taxes: "",
        laboratory: "",
        services: "",
        other: "",
      });
    }
  }, [expense, form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const expenseData = {
        expense_date: data.expense_date,
        description: data.description,
        branch_id: data.branch_id || null,
        operatory: data.operatory ? parseFloat(data.operatory) : 0,
        endodontics: data.endodontics ? parseFloat(data.endodontics) : 0,
        orthodontics: data.orthodontics ? parseFloat(data.orthodontics) : 0,
        implants: data.implants ? parseFloat(data.implants) : 0,
        crowns: data.crowns ? parseFloat(data.crowns) : 0,
        equipment: data.equipment ? parseFloat(data.equipment) : 0,
        repairs: data.repairs ? parseFloat(data.repairs) : 0,
        cleaning: data.cleaning ? parseFloat(data.cleaning) : 0,
        salaries: data.salaries ? parseFloat(data.salaries) : 0,
        taxes: data.taxes ? parseFloat(data.taxes) : 0,
        laboratory: data.laboratory ? parseFloat(data.laboratory) : 0,
        services: data.services ? parseFloat(data.services) : 0,
        other: data.other ? parseFloat(data.other) : 0,
        created_by: user.id,
      };

      if (expense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", expense.id);

        if (error) throw error;

        toast({
          title: "Egreso actualizado",
          description: "El egreso se actualizó correctamente",
        });
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert([expenseData]);

        if (error) throw error;

        toast({
          title: "Egreso registrado",
          description: "El egreso se registró correctamente",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar el egreso",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expense ? "Editar Egreso" : "Registrar Egreso"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detalle</FormLabel>
                    <FormControl>
                      <Input placeholder="Descripción del egreso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sede</FormLabel>
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
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Categorías de Egreso</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="operatory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operatorio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endodontics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endodoncia</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orthodontics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ortodoncia</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="implants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Implantes</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="crowns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coronas</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipo</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="repairs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reparaciones</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cleaning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limpieza</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sueldos</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impuestos</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="laboratory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Laboratorio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicios</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="other"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otros</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {expense ? "Actualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}