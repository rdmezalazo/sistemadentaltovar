import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, XCircle, Check, X, Printer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AccountConceptDialog } from "./AccountConceptDialog";
import { InvoicePreviewDialog } from "./InvoicePreviewDialog";

type AccountDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  onSuccess: () => void;
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  paid: "bg-green-500/10 text-green-600 border-green-500/30",
  partial: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  partial: "Saldo a Cuenta",
};

export function AccountDetailDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AccountDetailDialogProps) {
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState<any>(null);
  const [internalInvoice, setInternalInvoice] = useState(
    account?.internal_invoice_number || ""
  );
  const [electronicInvoice, setElectronicInvoice] = useState(
    account?.electronic_invoice_number || ""
  );
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: concepts, refetch: refetchConcepts } = useQuery({
    queryKey: ["account-concepts", account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      const { data, error } = await supabase
        .from("account_concepts")
        .select(
          `
          *,
          payment_concepts (name, default_price)
        `
        )
        .eq("account_id", account.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("accounts")
        .update({
          internal_invoice_number: internalInvoice || null,
          electronic_invoice_number: electronicInvoice || null,
        })
        .eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Números de boleta actualizados");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const deleteConceptMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from("account_concepts")
        .delete()
        .eq("id", conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto eliminado");
      refetchConcepts();
      updateAccountTotals();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar");
    },
  });

  const voidConceptMutation = useMutation({
    mutationFn: async (conceptId: string) => {
      const { error } = await supabase
        .from("account_concepts")
        .update({ status: "voided", subtotal: 0, paid_amount: 0 })
        .eq("id", conceptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concepto anulado");
      refetchConcepts();
      updateAccountTotals();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al anular");
    },
  });

  const updateConceptMutation = useMutation({
    mutationFn: async (data: any) => {
      const subtotal = data.quantity * data.unit_price;
      const paidAmount = data.status === "paid" ? subtotal : data.status === "partial" ? data.paid_amount : 0;
      
      // Get concept info for the description
      const concept = concepts?.find((c) => c.id === data.id);
      const conceptName = concept?.payment_concepts?.name || "Concepto";
      
      const { error } = await supabase
        .from("account_concepts")
        .update({
          quantity: data.quantity,
          unit_price: data.unit_price,
          subtotal,
          status: data.status,
          payment_method: data.payment_method,
          paid_amount: paidAmount,
          payment_date: data.status === "paid" || data.status === "partial" ? new Date().toISOString() : null,
        })
        .eq("id", data.id);
      if (error) throw error;

      // If status is "paid" or "partial", create a cash transaction (income)
      if (data.status === "paid" || data.status === "partial") {
        const { data: userData } = await supabase.auth.getUser();
        
        await supabase.from("cash_transactions").insert({
          amount: paidAmount,
          transaction_type: "income",
          category: "treatment",
          payment_method: data.payment_method || "efectivo",
          description: `${conceptName} - Paciente: ${account?.patients?.full_name || "N/A"}`,
          reference_id: data.id,
          created_by: userData?.user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Concepto actualizado e ingreso registrado");
      setEditingConceptId(null);
      refetchConcepts();
      updateAccountTotals();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar");
    },
  });

  const updateAccountTotals = async () => {
    const { data: updatedConcepts } = await supabase
      .from("account_concepts")
      .select("subtotal, paid_amount, status")
      .eq("account_id", account.id)
      .neq("status", "voided");

    if (updatedConcepts) {
      const totalAmount = updatedConcepts.reduce(
        (sum, c) => sum + Number(c.subtotal),
        0
      );
      const paidAmount = updatedConcepts.reduce((sum, c) => {
        if (c.status === "paid") return sum + Number(c.subtotal);
        if (c.status === "partial") return sum + Number(c.paid_amount);
        return sum;
      }, 0);

      await supabase
        .from("accounts")
        .update({
          total_amount: totalAmount,
          paid_amount: paidAmount,
          balance: totalAmount - paidAmount,
          status:
            paidAmount >= totalAmount
              ? "paid"
              : paidAmount > 0
              ? "partial"
              : "pending",
        })
        .eq("id", account.id);

      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    }
  };

  const handleStartEdit = (concept: any) => {
    setEditingConceptId(concept.id);
    setEditForm({
      id: concept.id,
      quantity: concept.quantity,
      unit_price: concept.unit_price,
      status: concept.status,
      payment_method: concept.payment_method || "",
      paid_amount: concept.paid_amount || 0,
    });
  };

  const handleCancelEdit = () => {
    setEditingConceptId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    updateConceptMutation.mutate(editForm);
  };

  const handleDeleteConcept = (concept: any) => {
    setConceptToDelete(concept);
    setDeleteDialogOpen(true);
  };

  const handleConceptSuccess = () => {
    refetchConcepts();
    updateAccountTotals();
    setSelectedConcept(null);
    onSuccess();
  };

  const generateAndOpenInvoicePreview = async () => {
    if (!internalInvoice) {
      const { data, error } = await supabase.rpc("generate_invoice_number");
      if (!error && data) {
        setInternalInvoice(data);
        await supabase
          .from("accounts")
          .update({ internal_invoice_number: data })
          .eq("id", account.id);
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      }
    }
    setInvoicePreviewOpen(true);
  };

  const totals = concepts?.reduce(
    (acc, c) => {
      if (c.status === "voided") return acc;
      acc.total += Number(c.subtotal);
      if (c.status === "paid") acc.paid += Number(c.subtotal);
      if (c.status === "partial") acc.paid += Number(c.paid_amount);
      return acc;
    },
    { total: 0, paid: 0 }
  ) || { total: 0, paid: 0 };

  const balance = totals.total - totals.paid;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Cuenta: {account?.account_number}</span>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedConcept(null);
                  setConceptDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Concepto
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Paciente</p>
              <p className="font-medium text-lg">
                {account?.patients?.full_name}
              </p>
              <p className="text-sm text-muted-foreground">
                DNI: {account?.patients?.dni}
              </p>
            </div>

            {/* Invoice Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° Boleta Interna</Label>
                <div className="flex gap-2">
                  <Input
                    value={internalInvoice}
                    onChange={(e) => setInternalInvoice(e.target.value)}
                    placeholder="Se genera automáticamente"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={generateAndOpenInvoicePreview}
                    title="Ver boleta"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>N° Boleta Electrónica</Label>
                <div className="flex gap-2">
                  <Input
                    value={electronicInvoice}
                    onChange={(e) => setElectronicInvoice(e.target.value)}
                    placeholder="Ej: B001-00001"
                  />
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateInvoiceMutation.mutate()}
            >
              Guardar Boletas
            </Button>

            {/* Concepts Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Concepto</TableHead>
                    <TableHead className="text-center w-[80px]">Cant.</TableHead>
                    <TableHead className="text-right w-[100px]">P. Unit.</TableHead>
                    <TableHead className="text-right w-[100px]">Subtotal</TableHead>
                    <TableHead className="text-center w-[130px]">Estado</TableHead>
                    <TableHead className="text-center w-[130px]">Método</TableHead>
                    <TableHead className="text-right w-[100px]">A Cuenta</TableHead>
                    <TableHead className="text-right w-[100px]">Saldo</TableHead>
                    <TableHead className="text-right w-[100px]">Pagado</TableHead>
                    <TableHead className="w-[120px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {concepts?.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-8"
                      >
                        No hay conceptos agregados
                      </TableCell>
                    </TableRow>
                  )}
                  {concepts?.map((concept) => {
                    const isEditing = editingConceptId === concept.id;
                    const currentSubtotal = isEditing 
                      ? editForm.quantity * editForm.unit_price 
                      : Number(concept.subtotal);
                    const currentPaidAmount = isEditing ? editForm.paid_amount : Number(concept.paid_amount);
                    const currentStatus = isEditing ? editForm.status : concept.status;
                    const saldoACuenta = currentSubtotal - currentPaidAmount;
                    
                    return (
                    <TableRow
                      key={concept.id}
                      className={
                        concept.status === "voided" ? "opacity-50 line-through" : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {concept.payment_concepts?.name || "—"}
                        {concept.notes && (
                          <p className="text-xs text-muted-foreground">
                            {concept.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="1"
                            value={editForm.quantity}
                            onChange={(e) =>
                              setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })
                            }
                            className="w-16 h-8 text-center"
                          />
                        ) : (
                          concept.quantity
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.unit_price}
                            onChange={(e) =>
                              setEditForm({ ...editForm, unit_price: parseFloat(e.target.value) || 0 })
                            }
                            className="w-24 h-8 text-right"
                          />
                        ) : (
                          `S/ ${Number(concept.unit_price).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {`S/ ${currentSubtotal.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Select
                            value={editForm.status}
                            onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="paid">Pagado</SelectItem>
                              <SelectItem value="partial">Saldo a Cuenta</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={
                              concept.status === "voided"
                                ? "bg-gray-500/10 text-gray-600"
                                : statusColors[concept.status]
                            }
                          >
                            {concept.status === "voided"
                              ? "Anulado"
                              : statusLabels[concept.status]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Select
                            value={editForm.payment_method}
                            onValueChange={(value) => setEditForm({ ...editForm, payment_method: value })}
                          >
                            <SelectTrigger className="h-8 w-[120px]">
                              <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethods?.map((method) => (
                                <SelectItem key={method.id} value={method.name}>
                                  {method.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          concept.payment_method || "—"
                        )}
                      </TableCell>
                      {/* A Cuenta column - only shows input when status is partial */}
                      <TableCell className="text-right">
                        {currentStatus === "partial" ? (
                          isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={currentSubtotal}
                              value={editForm.paid_amount}
                              onChange={(e) =>
                                setEditForm({ ...editForm, paid_amount: parseFloat(e.target.value) || 0 })
                              }
                              className="w-24 h-8 text-right"
                            />
                          ) : (
                            `S/ ${Number(concept.paid_amount).toFixed(2)}`
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {/* Saldo a Cuenta column - shows remaining balance when status is partial */}
                      <TableCell className="text-right">
                        {currentStatus === "partial" ? (
                          <span className="text-orange-600 font-medium">
                            S/ {saldoACuenta.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {/* Pagado column - shows total paid */}
                      <TableCell className="text-right">
                        {currentStatus === "paid" ? (
                          <span className="text-green-600 font-medium">
                            S/ {currentSubtotal.toFixed(2)}
                          </span>
                        ) : currentStatus === "partial" ? (
                          <span className="text-green-600 font-medium">
                            S/ {currentPaidAmount.toFixed(2)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {concept.status !== "voided" && (
                          <div className="flex items-center justify-center gap-1">
                            {editingConceptId === concept.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600"
                                  onClick={handleSaveEdit}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleStartEdit(concept)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => voidConceptMutation.mutate(concept.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteConcept(concept)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Totals Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-medium">S/ {totals.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Pagado:</span>
                <span className="font-medium">S/ {totals.paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Saldo Pendiente:</span>
                <span className={balance > 0 ? "text-red-600" : "text-green-600"}>
                  S/ {balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AccountConceptDialog
        open={conceptDialogOpen}
        onOpenChange={setConceptDialogOpen}
        accountId={account?.id}
        concept={selectedConcept}
        onSuccess={handleConceptSuccess}
      />

      <InvoicePreviewDialog
        open={invoicePreviewOpen}
        onOpenChange={setInvoicePreviewOpen}
        account={account}
        concepts={concepts || []}
        invoiceNumber={internalInvoice}
        totals={totals}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar concepto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El concepto será eliminado
              permanentemente de la cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conceptToDelete) {
                  deleteConceptMutation.mutate(conceptToDelete.id);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
