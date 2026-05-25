import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type InvoicePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  concepts: any[];
  invoiceNumber: string;
  totals: { total: number; paid: number };
};

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  account,
  concepts,
  invoiceNumber,
  totals,
}: InvoicePreviewDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Boleta ${invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              font-size: 12px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 { font-size: 18px; margin-bottom: 5px; }
            .header p { font-size: 11px; color: #666; }
            .invoice-number {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin: 15px 0;
              padding: 8px;
              border: 1px solid #000;
            }
            .patient-info {
              margin-bottom: 15px;
              padding: 10px;
              background: #f5f5f5;
            }
            .patient-info p { margin-bottom: 3px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px 8px; 
              text-align: left;
            }
            th { 
              background: #f0f0f0; 
              font-weight: bold;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals {
              margin-top: 15px;
              padding: 10px;
              background: #f5f5f5;
            }
            .totals .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .totals .total-row {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 8px;
              margin-top: 8px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const validConcepts = concepts.filter((c) => c.status !== "voided");
  const currentDate = new Date().toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vista Previa de Boleta</span>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div
          ref={printRef}
          className="bg-white p-6 border rounded-lg text-foreground"
        >
          {/* Header */}
          <div className="text-center border-b-2 border-foreground pb-4 mb-4">
            <h1 className="text-xl font-bold">ESTÉTICA DENTAL TOVAR</h1>
            <p className="text-sm text-muted-foreground">
              Arequipa: Calle Palacio Viejo - Edificio Sudamérica, Offic. 216, 4to piso
            </p>
            <p className="text-sm text-muted-foreground">
              Teléfono: 958 796 530
            </p>
          </div>

          {/* Invoice Number */}
          <div className="text-center border border-foreground p-2 mb-4 font-bold">
            BOLETA N° {invoiceNumber}
          </div>

          {/* Date and Patient Info */}
          <div className="bg-muted/50 p-3 rounded mb-4">
            <p className="text-sm">
              <strong>Fecha:</strong> {currentDate}
            </p>
            <p className="text-sm">
              <strong>Paciente:</strong> {account?.patients?.full_name}
            </p>
            <p className="text-sm">
              <strong>DNI:</strong> {account?.patients?.dni}
            </p>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">Descripción</th>
                <th className="border p-2 text-center w-16">Cant.</th>
                <th className="border p-2 text-right w-24">P. Unit.</th>
                <th className="border p-2 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {validConcepts.map((concept) => (
                <tr key={concept.id}>
                  <td className="border p-2">
                    {concept.payment_concepts?.name}
                  </td>
                  <td className="border p-2 text-center">{concept.quantity}</td>
                  <td className="border p-2 text-right">
                    S/ {Number(concept.unit_price).toFixed(2)}
                  </td>
                  <td className="border p-2 text-right">
                    S/ {Number(concept.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="bg-muted/50 p-3 rounded">
            <div className="flex justify-between mb-1">
              <span>Subtotal:</span>
              <span>S/ {totals.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-1 text-green-600">
              <span>Pagado:</span>
              <span>S/ {totals.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
              <span>TOTAL:</span>
              <span>S/ {totals.total.toFixed(2)}</span>
            </div>
            {totals.total - totals.paid > 0 && (
              <div className="flex justify-between text-red-600 mt-1">
                <span>Saldo Pendiente:</span>
                <span>S/ {(totals.total - totals.paid).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>¡Gracias por su preferencia!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
