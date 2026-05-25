import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const conceptSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  default_price: z.string().min(1, "El precio es requerido"),
  is_active: z.boolean().default(true),
});

type ConceptFormValues = z.infer<typeof conceptSchema>;

type PaymentConceptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept?: any;
  onSuccess: () => void;
};

export function PaymentConceptDialog({
  open,
  onOpenChange,
  concept,
  onSuccess,
}: PaymentConceptDialogProps) {
  const form = useForm<ConceptFormValues>({
    resolver: zodResolver(conceptSchema),
    defaultValues: {
      name: "",
      description: "",
      default_price: "0",
      is_active: true,
    },
  });

  useEffect(() => {
    if (concept) {
      form.reset({
        name: concept.name,
        description: concept.description || "",
        default_price: concept.default_price.toString(),
        is_active: concept.is_active ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        default_price: "0",
        is_active: true,
      });
    }
  }, [concept, form]);

  const onSubmit = async (values: ConceptFormValues) => {
    try {
      const conceptData = {
        name: values.name,
        description: values.description || null,
        default_price: parseFloat(values.default_price),
        is_active: values.is_active,
      };

      if (concept) {
        const { error } = await supabase
          .from("payment_concepts")
          .update(conceptData)
          .eq("id", concept.id);

        if (error) throw error;
        toast.success("Concepto actualizado correctamente");
      } else {
        const { error } = await supabase
          .from("payment_concepts")
          .insert(conceptData);

        if (error) throw error;
        toast.success("Concepto creado correctamente");
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el concepto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {concept ? "Editar Concepto" : "Nuevo Concepto"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Consulta Médica" {...field} />
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del concepto (opcional)"
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Base (S/)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Estado</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {field.value ? "Concepto activo" : "Concepto inactivo"}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {concept ? "Actualizar" : "Crear"} Concepto
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
