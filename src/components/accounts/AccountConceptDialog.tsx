import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const conceptSchema = z.object({
  concept_id: z.string().min(1, "Seleccione un concepto"),
  quantity: z.coerce.number().min(1, "Cantidad mínima es 1"),
  unit_price: z.coerce.number().min(0, "Precio no puede ser negativo"),
  status: z.string().default("pending"),
  payment_method: z.string().optional(),
  paid_amount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type ConceptFormValues = z.infer<typeof conceptSchema>;

type AccountConceptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  concept?: any;
  onSuccess: () => void;
};

export function AccountConceptDialog({
  open,
  onOpenChange,
  accountId,
  concept,
  onSuccess,
}: AccountConceptDialogProps) {
  const { data: paymentConcepts } = useQuery({
    queryKey: ["payment-concepts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_concepts")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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
  });

  const form = useForm<ConceptFormValues>({
    resolver: zodResolver(conceptSchema),
    defaultValues: {
      concept_id: "",
      quantity: 1,
      unit_price: 0,
      status: "pending",
      payment_method: "",
      paid_amount: 0,
      notes: "",
    },
  });

  const selectedConceptId = form.watch("concept_id");
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unit_price");
  const status = form.watch("status");

  // Auto-fill price when concept is selected
  useEffect(() => {
    if (selectedConceptId && !concept) {
      const selectedConcept = paymentConcepts?.find(
        (c) => c.id === selectedConceptId
      );
      if (selectedConcept) {
        form.setValue("unit_price", selectedConcept.default_price);
      }
    }
  }, [selectedConceptId, paymentConcepts, form, concept]);

  useEffect(() => {
    if (concept) {
      form.reset({
        concept_id: concept.concept_id,
        quantity: concept.quantity,
        unit_price: concept.unit_price,
        status: concept.status,
        payment_method: concept.payment_method || "",
        paid_amount: concept.paid_amount || 0,
        notes: concept.notes || "",
      });
    } else {
      form.reset({
        concept_id: "",
        quantity: 1,
        unit_price: 0,
        status: "pending",
        payment_method: "",
        paid_amount: 0,
        notes: "",
      });
    }
  }, [concept, form]);

  const subtotal = quantity * unitPrice;

  const onSubmit = async (values: ConceptFormValues) => {
    try {
      const conceptData = {
        account_id: accountId,
        concept_id: values.concept_id,
        quantity: values.quantity,
        unit_price: values.unit_price,
        subtotal: values.quantity * values.unit_price,
        status: values.status,
        payment_method: values.payment_method || null,
        paid_amount: values.paid_amount,
        payment_date: values.status === "paid" ? new Date().toISOString() : null,
        notes: values.notes || null,
      };

      if (concept) {
        const { error } = await supabase
          .from("account_concepts")
          .update(conceptData)
          .eq("id", concept.id);
        if (error) throw error;
        toast.success("Concepto actualizado correctamente");
      } else {
        const { error } = await supabase
          .from("account_concepts")
          .insert(conceptData);
        if (error) throw error;
        toast.success("Concepto agregado correctamente");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el concepto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {concept ? "Editar Concepto" : "Agregar Concepto"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="concept_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto/Tratamiento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un concepto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentConcepts?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} - S/ {c.default_price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Unitario (S/)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="text-xl font-bold">S/ {subtotal.toFixed(2)}</p>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado de Pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="partial">Saldo a Cuenta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(status === "paid" || status === "partial") && (
              <>
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods?.map((m) => (
                            <SelectItem key={m.id} value={m.name}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {status === "partial" && (
                  <FormField
                    control={form.control}
                    name="paid_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto Pagado (S/)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {concept ? "Actualizar" : "Agregar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
