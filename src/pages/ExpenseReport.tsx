import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Download, FileSpreadsheet, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";

interface ExpenseRow {
  id: string;
  fecha: string;
  detalle: string;
  operatorio: number;
  endo: number;
  orto: number;
  implan: number;
  coronas: number;
  equipo: number;
  reparac: number;
  limpieza: number;
  sueldos: number;
  impuestos: number;
  labora: number;
  servicios: number;
  otros: number;
  total: number;
}

const ExpenseReport = () => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch current user's branch from their profile
  useEffect(() => {
    const fetchUserBranch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("branch_id, role")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile) {
          setUserBranchId(profile.branch_id);
          setIsAdmin(profile.role === "admin" || profile.role === "gerencia");
          // If user has a branch assigned and is not admin, auto-select it
          if (profile.branch_id && profile.role !== "admin" && profile.role !== "gerencia") {
            setSelectedBranch(profile.branch_id);
          }
        }
      }
    };
    fetchUserBranch();
  }, []);

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

  const { data: expenseData, isLoading } = useQuery({
    queryKey: ["expenses", selectedMonth, selectedBranch],
    queryFn: async () => {
      const startDate = startOfMonth(new Date(selectedMonth));
      const endDate = endOfMonth(new Date(selectedMonth));

      let query = supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", format(startDate, "yyyy-MM-dd"))
        .lte("expense_date", format(endDate, "yyyy-MM-dd"))
        .order("expense_date");

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const processedData: ExpenseRow[] = expenseData?.map((expense: any) => ({
    id: expense.id,
    fecha: format(new Date(expense.expense_date), "dd"),
    detalle: expense.description,
    operatorio: Number(expense.operatory || 0),
    endo: Number(expense.endodontics || 0),
    orto: Number(expense.orthodontics || 0),
    implan: Number(expense.implants || 0),
    coronas: Number(expense.crowns || 0),
    equipo: Number(expense.equipment || 0),
    reparac: Number(expense.repairs || 0),
    limpieza: Number(expense.cleaning || 0),
    sueldos: Number(expense.salaries || 0),
    impuestos: Number(expense.taxes || 0),
    labora: Number(expense.laboratory || 0),
    servicios: Number(expense.services || 0),
    otros: Number(expense.other || 0),
    total: Number(expense.total || 0),
  })) || [];

  const totals = processedData.reduce(
    (acc, row) => ({
      operatorio: acc.operatorio + row.operatorio,
      endo: acc.endo + row.endo,
      orto: acc.orto + row.orto,
      implan: acc.implan + row.implan,
      coronas: acc.coronas + row.coronas,
      equipo: acc.equipo + row.equipo,
      reparac: acc.reparac + row.reparac,
      limpieza: acc.limpieza + row.limpieza,
      sueldos: acc.sueldos + row.sueldos,
      impuestos: acc.impuestos + row.impuestos,
      labora: acc.labora + row.labora,
      servicios: acc.servicios + row.servicios,
      otros: acc.otros + row.otros,
      total: acc.total + row.total,
    }),
    {
      operatorio: 0,
      endo: 0,
      orto: 0,
      implan: 0,
      coronas: 0,
      equipo: 0,
      reparac: 0,
      limpieza: 0,
      sueldos: 0,
      impuestos: 0,
      labora: 0,
      servicios: 0,
      otros: 0,
      total: 0,
    }
  );

  const exportToCSV = () => {
    const headers = [
      "FECHA",
      "DETALLE",
      "OPERATORI",
      "ENDO",
      "ORTO",
      "IMPLAN",
      "CORONAS",
      "EQUIPO",
      "REPARAC.",
      "LIMPIEZA",
      "SUELDOS",
      "IMPUESTOS",
      "LABORA.",
      "SERVICIOS",
      "OTROS",
      "TOTAL",
    ];

    const rows = processedData.map((row) => [
      row.fecha,
      row.detalle,
      row.operatorio.toFixed(2),
      row.endo.toFixed(2),
      row.orto.toFixed(2),
      row.implan.toFixed(2),
      row.coronas.toFixed(2),
      row.equipo.toFixed(2),
      row.reparac.toFixed(2),
      row.limpieza.toFixed(2),
      row.sueldos.toFixed(2),
      row.impuestos.toFixed(2),
      row.labora.toFixed(2),
      row.servicios.toFixed(2),
      row.otros.toFixed(2),
      row.total.toFixed(2),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      [
        "TOTAL",
        "",
        totals.operatorio.toFixed(2),
        totals.endo.toFixed(2),
        totals.orto.toFixed(2),
        totals.implan.toFixed(2),
        totals.coronas.toFixed(2),
        totals.equipo.toFixed(2),
        totals.reparac.toFixed(2),
        totals.limpieza.toFixed(2),
        totals.sueldos.toFixed(2),
        totals.impuestos.toFixed(2),
        totals.labora.toFixed(2),
        totals.servicios.toFixed(2),
        totals.otros.toFixed(2),
        totals.total.toFixed(2),
      ],
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-egresos-${selectedMonth}.csv`;
    a.click();

    toast({
      title: "Reporte exportado",
      description: "El archivo CSV se ha descargado correctamente",
    });
  };

  const handleEdit = (expense: any) => {
    const expenseToEdit = expenseData?.find((e: any) => e.id === expense.id);
    setSelectedExpense(expenseToEdit);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este egreso?")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Egreso eliminado",
        description: "El egreso se eliminó correctamente",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo eliminar el egreso",
      });
    }
  };

  const monthName = format(new Date(selectedMonth), "MMMM yyyy", { locale: es }).toUpperCase();
  const branchName = selectedBranch === "all"
    ? "TODAS LAS SEDES"
    : branches?.find((b) => b.id === selectedBranch)?.name.toUpperCase() || "";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reporte de Egresos</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza y exporta los egresos por mes y sede
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setSelectedExpense(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Registrar Egreso
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">MES</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SEDE</label>
            {/* Only show branch selector if user is admin or has no branch assigned */}
            {(isAdmin || !userBranchId) ? (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sedes</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                {branches?.find((b) => b.id === userBranchId)?.name || "Tu sede"}
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-5 h-5 text-destructive" />
            <div>
              <span className="font-semibold">MES: {monthName}</span>
              <span className="mx-3">|</span>
              <span className="font-semibold">SEDE: {branchName}</span>
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-destructive text-destructive-foreground hover:bg-destructive">
                  <TableHead className="text-destructive-foreground font-bold text-center w-[60px]">FECHA</TableHead>
                  <TableHead className="text-destructive-foreground font-bold min-w-[150px]">DETALLE</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">OPERATORI</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">ENDO</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">ORTO</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">IMPLAN</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">CORONAS</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">EQUIPO</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">REPARAC.</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">LIMPIEZA</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">SUELDOS</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">IMPUESTOS</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">LABORA.</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">SERVICIOS</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[90px]">OTROS</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-right min-w-[100px]">TOTAL</TableHead>
                  <TableHead className="text-destructive-foreground font-bold text-center w-[100px]">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8">
                      Cargando datos...
                    </TableCell>
                  </TableRow>
                ) : processedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                      No hay datos para el período seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  processedData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-center text-sm">{row.fecha}</TableCell>
                      <TableCell className="font-medium text-sm">{row.detalle}</TableCell>
                      <TableCell className="text-right text-sm">{row.operatorio > 0 ? row.operatorio.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.endo > 0 ? row.endo.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.orto > 0 ? row.orto.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.implan > 0 ? row.implan.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.coronas > 0 ? row.coronas.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.equipo > 0 ? row.equipo.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.reparac > 0 ? row.reparac.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.limpieza > 0 ? row.limpieza.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.sueldos > 0 ? row.sueldos.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.impuestos > 0 ? row.impuestos.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.labora > 0 ? row.labora.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.servicios > 0 ? row.servicios.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{row.otros > 0 ? row.otros.toFixed(2) : "-"}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">{row.total.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2} className="text-center">TOTAL</TableCell>
                  <TableCell className="text-right">{totals.operatorio > 0 ? totals.operatorio.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.endo > 0 ? totals.endo.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.orto > 0 ? totals.orto.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.implan > 0 ? totals.implan.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.coronas > 0 ? totals.coronas.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.equipo > 0 ? totals.equipo.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.reparac > 0 ? totals.reparac.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.limpieza > 0 ? totals.limpieza.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.sueldos > 0 ? totals.sueldos.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.impuestos > 0 ? totals.impuestos.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.labora > 0 ? totals.labora.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.servicios > 0 ? totals.servicios.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right">{totals.otros > 0 ? totals.otros.toFixed(2) : "-"}</TableCell>
                  <TableCell className="text-right text-lg">{totals.total.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <div className="mt-6 p-6 bg-destructive/10 rounded-lg border-2 border-destructive">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">EGRESOS TOTAL</span>
            <span className="text-3xl font-bold text-destructive">
              {totals.total.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={selectedExpense}
      />
    </div>
  );
};

export default ExpenseReport;