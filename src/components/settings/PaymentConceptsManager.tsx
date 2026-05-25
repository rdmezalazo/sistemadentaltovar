import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentConceptDialog } from "./PaymentConceptDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PaymentConcept = {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  is_active: boolean | null;
};

export function PaymentConceptsManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<PaymentConcept | undefined>();
  const queryClient = useQueryClient();

  const { data: concepts, isLoading } = useQuery({
    queryKey: ["payment-concepts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_concepts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as PaymentConcept[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_concepts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-concepts"] });
      toast.success("Concepto eliminado correctamente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar el concepto");
    },
  });

  const handleEdit = (concept: PaymentConcept) => {
    setSelectedConcept(concept);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este concepto?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conceptos de Pago</CardTitle>
              <CardDescription>
                Gestiona los conceptos de servicios y procedimientos
              </CardDescription>
            </div>
            <Button onClick={() => {
              setSelectedConcept(undefined);
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Concepto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando conceptos...
            </div>
          ) : concepts && concepts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concepts.map((concept) => (
                  <TableRow key={concept.id}>
                    <TableCell className="font-medium">{concept.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {concept.description || "-"}
                    </TableCell>
                    <TableCell>S/ {(concept.default_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={concept.is_active ? "default" : "secondary"}
                        className={concept.is_active ? "bg-success/10 text-success hover:bg-success/20" : ""}
                      >
                        {concept.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(concept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(concept.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay conceptos registrados. Crea el primero.
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentConceptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        concept={selectedConcept}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["payment-concepts"] });
          setDialogOpen(false);
        }}
      />
    </>
  );
}
