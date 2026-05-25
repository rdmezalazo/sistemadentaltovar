import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, setMonth, setYear } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Calendar, Building2, TrendingUp, CreditCard, Banknote, Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncomeRow {
  rowNumber: number;
  fecha: string;
  nombrePaciente: string;
  tratamiento: string;
  doctor: string;
  preTotal: number;
  aCuenta: number;
  saldo: number;
  boletaInterna: string;
  boletaElectronica: string;
  yape: number;
  transferencia: number;
  efectivo: number;
  total: number;
}

const IncomeReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const selectedMonth = format(selectedDate, "yyyy-MM");

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
  });

  // Fetch income data from account_concepts that are paid in the selected month
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["income-report-accounts", selectedMonth, selectedBranch],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1, 1));
      const endDate = endOfMonth(new Date(year, month - 1, 1));

      // Fetch paid account concepts within the date range
      const { data: paidConcepts, error: conceptsError } = await supabase
        .from("account_concepts")
        .select(`
          id,
          subtotal,
          paid_amount,
          status,
          payment_method,
          payment_date,
          payment_concepts(name),
          accounts(
            id,
            account_number,
            internal_invoice_number,
            electronic_invoice_number,
            created_at,
            patients(full_name),
            appointments(
              appointment_date,
              treatment,
              diagnosis,
              branch_id,
              branches(name)
            ),
            profiles!accounts_created_by_fkey(full_name)
          )
        `)
        .eq("status", "paid")
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString())
        .order("payment_date", { ascending: true });

      if (conceptsError) throw conceptsError;

      // Filter by branch if needed
      if (selectedBranch !== "all") {
        return paidConcepts?.filter((concept: any) => 
          concept.accounts?.appointments?.branch_id === selectedBranch
        ) || [];
      }

      return paidConcepts;
    },
  });

  // Process data into rows - one row per paid concept
  const processedData: IncomeRow[] = [];
  let rowIndex = 1;

  accountsData?.forEach((concept: any) => {
    const account = concept.accounts;
    if (!account) return;

    const method = (concept.payment_method || "").toLowerCase().trim();
    const paidAmount = Number(concept.paid_amount) || 0;
    
    let yape = 0;
    let transferencia = 0;
    let efectivo = 0;

    if (method.includes("yape")) yape = paidAmount;
    else if (method.includes("transfer")) transferencia = paidAmount;
    else if (method.includes("efectivo") || method.includes("contado") || method.includes("cash")) efectivo = paidAmount;
    else if (paidAmount > 0) efectivo = paidAmount; // Default: count paid amounts as efectivo if no method matches

    processedData.push({
      rowNumber: rowIndex++,
      fecha: concept.payment_date ? format(new Date(concept.payment_date), "dd") : "",
      nombrePaciente: account.patients?.full_name || "",
      tratamiento: concept.payment_concepts?.name || "",
      doctor: account.profiles?.full_name || "",
      preTotal: Number(concept.subtotal) || 0,
      aCuenta: paidAmount,
      saldo: (Number(concept.subtotal) || 0) - paidAmount,
      boletaInterna: account.internal_invoice_number || account.account_number || "",
      boletaElectronica: account.electronic_invoice_number || "",
      yape,
      transferencia,
      efectivo,
      total: paidAmount,
    });
  });

  // Calculate totals only from real data
  const totals = processedData.reduce(
    (acc, row) => ({
      preTotal: acc.preTotal + row.preTotal,
      aCuenta: acc.aCuenta + row.aCuenta,
      saldo: acc.saldo + row.saldo,
      yape: acc.yape + row.yape,
      transferencia: acc.transferencia + row.transferencia,
      efectivo: acc.efectivo + row.efectivo,
      total: acc.total + row.total,
    }),
    { preTotal: 0, aCuenta: 0, saldo: 0, yape: 0, transferencia: 0, efectivo: 0, total: 0 }
  );

  // Generate month names for the calendar picker
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(new Date(), calendarYear), monthIndex);
    setSelectedDate(newDate);
    setCalendarOpen(false);
  };

  const exportToCSV = () => {
    const headers = [
      "FECHA", "NOMBRE PACIENTE", "TRATAMIENTO", "DR.", "PRE/TOTAL", "A/C", "SALDO",
      "N° BOL. INT.", "N°BOL. ELEC", "YAPE", "TRANSF.", "EFECTIVO", "TOTAL",
    ];

    const rows = processedData.map((row) => [
      row.fecha,
      `"${row.nombrePaciente}"`,
      `"${row.tratamiento}"`,
      `"${row.doctor}"`,
      row.preTotal.toFixed(2),
      row.aCuenta.toFixed(2),
      row.saldo.toFixed(2),
      row.boletaInterna,
      row.boletaElectronica,
      row.yape.toFixed(2),
      row.transferencia.toFixed(2),
      row.efectivo.toFixed(2),
      row.total.toFixed(2),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      ["TOTAL", "", "", "", totals.preTotal.toFixed(2), totals.aCuenta.toFixed(2), totals.saldo.toFixed(2),
       "", "", totals.yape.toFixed(2), totals.transferencia.toFixed(2), totals.efectivo.toFixed(2), totals.total.toFixed(2)],
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-ingresos-${selectedMonth}.csv`;
    a.click();
  };

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });
  const branchName = selectedBranch === "all"
    ? "Todas las sedes"
    : branches?.find((b) => b.id === selectedBranch)?.name || "";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporte de Ingresos</h1>
          <p className="text-muted-foreground mt-1">
            Visualiza y exporta los ingresos por mes y sede
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingresos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              S/ {isLoading ? "..." : totals.total.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yape
            </CardTitle>
            <Smartphone className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              S/ {isLoading ? "..." : totals.yape.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transferencia
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              S/ {isLoading ? "..." : totals.transferencia.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Efectivo
            </CardTitle>
            <Banknote className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              S/ {isLoading ? "..." : totals.efectivo.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">Período:</span>
              </div>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(selectedDate, "MMMM yyyy", { locale: es }).charAt(0).toUpperCase() + 
                     format(selectedDate, "MMMM yyyy", { locale: es }).slice(1)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 pointer-events-auto" align="start">
                  <div className="space-y-4">
                    {/* Year selector */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarYear(calendarYear - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-semibold text-lg">{calendarYear}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCalendarYear(calendarYear + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Month grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {monthNames.map((month, index) => {
                        const isSelected = 
                          selectedDate.getMonth() === index && 
                          selectedDate.getFullYear() === calendarYear;
                        
                        return (
                          <Button
                            key={month}
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            className={cn(
                              "h-9",
                              isSelected && "bg-primary text-primary-foreground"
                            )}
                            onClick={() => handleMonthSelect(index)}
                          >
                            {month.slice(0, 3)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Only show branch selector if user is admin or has no branch assigned */}
            {(isAdmin || !userBranchId) && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Sede:</span>
                </div>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Seleccionar" />
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
              </div>
            )}
            {/* Show current branch info for non-admin users */}
            {!isAdmin && userBranchId && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Sede:</span>
                </div>
                <span className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                  {branches?.find((b) => b.id === userBranchId)?.name || "Tu sede"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-center text-lg">
            Ingresos - {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {branchName && `• ${branchName}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-center w-[50px]">Día</TableHead>
                  <TableHead className="font-semibold min-w-[140px]">Paciente</TableHead>
                  <TableHead className="font-semibold min-w-[120px]">Tratamiento</TableHead>
                  <TableHead className="font-semibold min-w-[100px]">Doctor</TableHead>
                  <TableHead className="font-semibold text-right w-[80px]">Precio</TableHead>
                  <TableHead className="font-semibold text-right w-[70px]">A/Cuenta</TableHead>
                  <TableHead className="font-semibold text-right w-[70px]">Saldo</TableHead>
                  <TableHead className="font-semibold text-center w-[100px]">Bol. Int.</TableHead>
                  <TableHead className="font-semibold text-center w-[90px]">Bol. Elec.</TableHead>
                  <TableHead className="font-semibold text-right w-[70px] text-purple-600">Yape</TableHead>
                  <TableHead className="font-semibold text-right w-[70px] text-blue-600">Transf.</TableHead>
                  <TableHead className="font-semibold text-right w-[80px] text-amber-600">Efectivo</TableHead>
                  <TableHead className="font-semibold text-right w-[80px] text-green-600">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 13 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : processedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      No hay ingresos registrados para este período
                    </TableCell>
                  </TableRow>
                ) : (
                  processedData.map((row, index) => (
                    <TableRow 
                      key={index} 
                      className={`hover:bg-muted/30 transition-colors ${index % 2 === 1 ? "bg-muted/20" : ""}`}
                    >
                      <TableCell className="text-center font-medium">{row.fecha}</TableCell>
                      <TableCell className="font-medium">{row.nombrePaciente}</TableCell>
                      <TableCell className="text-sm">{row.tratamiento}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.doctor}</TableCell>
                      <TableCell className="text-right text-sm">
                        {row.preTotal > 0 ? row.preTotal.toFixed(2) : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {row.aCuenta > 0 ? row.aCuenta.toFixed(2) : ""}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {row.saldo > 0 ? row.saldo.toFixed(2) : ""}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{row.boletaInterna}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">{row.boletaElectronica}</TableCell>
                      <TableCell className="text-right text-purple-600 font-medium">
                        {row.yape > 0 ? row.yape.toFixed(2) : ""}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {row.transferencia > 0 ? row.transferencia.toFixed(2) : ""}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">
                        {row.efectivo > 0 ? row.efectivo.toFixed(2) : ""}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {row.total > 0 ? row.total.toFixed(2) : ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {!isLoading && processedData.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right">TOTALES</TableCell>
                    <TableCell className="text-right">{totals.preTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{totals.aCuenta.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{totals.saldo.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-purple-600">{totals.yape.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-blue-600">{totals.transferencia.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-amber-600">{totals.efectivo.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-600 text-base">{totals.total.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomeReport;
