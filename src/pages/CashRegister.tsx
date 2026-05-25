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
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Download, TrendingUp, TrendingDown, Wallet, Calendar, Building2 } from "lucide-react";

interface CashRow {
  fecha: string;
  detalle: string;
  ingresos: number;
  egresos: number;
  boletaInterna: string;
  boletaElectronica: string;
  tipo: "income" | "expense";
}

const CashRegister = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
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

  // Fetch income from paid account_concepts within the selected month
  const { data: paidConceptsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ["cash-register-accounts", selectedMonth, selectedBranch],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1, 1));
      const endDate = endOfMonth(new Date(year, month - 1, 1));

      const { data, error } = await supabase
        .from("account_concepts")
        .select(`
          id,
          subtotal,
          paid_amount,
          status,
          payment_date,
          payment_concepts(name),
          accounts(
            id,
            account_number,
            internal_invoice_number,
            electronic_invoice_number,
            patients(full_name),
            appointments(branch_id)
          )
        `)
        .eq("status", "paid")
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString())
        .order("payment_date", { ascending: true });

      if (error) throw error;

      if (selectedBranch !== "all") {
        return data?.filter((concept: any) => 
          concept.accounts?.appointments?.branch_id === selectedBranch
        ) || [];
      }

      return data;
    },
  });

  // Fetch expenses
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ["cash-register-expenses", selectedMonth, selectedBranch],
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1, 1));
      const endDate = endOfMonth(new Date(year, month - 1, 1));

      let query = supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", startDate.toISOString().split("T")[0])
        .lte("expense_date", endDate.toISOString().split("T")[0])
        .order("expense_date", { ascending: true });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Process income rows from paid concepts
  const incomeRows: CashRow[] = [];
  paidConceptsData?.forEach((concept: any) => {
    const account = concept.accounts;
    if (!account) return;
    
    incomeRows.push({
      fecha: concept.payment_date ? format(new Date(concept.payment_date), "dd/MM/yyyy") : "",
      detalle: `${account.patients?.full_name || "Paciente"} - ${concept.payment_concepts?.name || "Tratamiento"}`,
      ingresos: Number(concept.paid_amount) || 0,
      egresos: 0,
      boletaInterna: account.internal_invoice_number || account.account_number || "",
      boletaElectronica: account.electronic_invoice_number || "",
      tipo: "income",
    });
  });

  // Process expense rows
  const expenseRows: CashRow[] = [];
  expensesData?.forEach((expense: any) => {
    expenseRows.push({
      fecha: expense.expense_date ? format(new Date(expense.expense_date), "dd/MM/yyyy") : "",
      detalle: expense.description || "Gasto",
      ingresos: 0,
      egresos: Number(expense.total) || 0,
      boletaInterna: "",
      boletaElectronica: "",
      tipo: "expense",
    });
  });

  // Combine and sort all rows by date
  const allRows: CashRow[] = [...incomeRows, ...expenseRows].sort((a, b) => {
    const dateA = a.fecha.split("/").reverse().join("-");
    const dateB = b.fecha.split("/").reverse().join("-");
    return dateA.localeCompare(dateB);
  });

  // Calculate totals
  const totalIngresos = allRows.reduce((sum, row) => sum + row.ingresos, 0);
  const totalEgresos = allRows.reduce((sum, row) => sum + row.egresos, 0);
  const cajaTotal = totalIngresos - totalEgresos;

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: es }),
    };
  });

  const exportToCSV = () => {
    const headers = ["FECHA", "DETALLE", "INGRESOS", "EGRESOS", "BOLETA INTERNA", "BOLETA ELECTRONICA"];
    const rows = allRows.map((row) => [
      row.fecha,
      `"${row.detalle}"`,
      row.ingresos > 0 ? row.ingresos.toFixed(2) : "",
      row.egresos > 0 ? row.egresos.toFixed(2) : "",
      row.boletaInterna,
      row.boletaElectronica,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      ["SUB TOTAL", "", totalIngresos.toFixed(2), totalEgresos.toFixed(2), "", ""].join(","),
      ["CAJA TOTAL", cajaTotal.toFixed(2), "", "", "", ""].join(","),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caja-${selectedMonth}.csv`;
    a.click();
  };

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthName = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });
  const branchName = selectedBranch === "all"
    ? "Todas las sedes"
    : branches?.find((b) => b.id === selectedBranch)?.name || "";

  const isLoading = loadingAccounts || loadingExpenses;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Caja</h1>
          <p className="text-muted-foreground mt-1">
            Control de ingresos y egresos del mes
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingresos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              S/ {isLoading ? "..." : totalIngresos.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Egresos
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              S/ {isLoading ? "..." : totalEgresos.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${cajaTotal >= 0 ? "border-l-primary" : "border-l-orange-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance del Mes
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cajaTotal >= 0 ? "text-primary" : "text-orange-600"}`}>
              S/ {isLoading ? "..." : cajaTotal.toFixed(2)}
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
                <span className="text-sm font-medium">Mes:</span>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            Caja - {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {branchName && `• ${branchName}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold w-[100px]">Fecha</TableHead>
                  <TableHead className="font-semibold min-w-[280px]">Detalle</TableHead>
                  <TableHead className="font-semibold text-right w-[110px]">Ingresos</TableHead>
                  <TableHead className="font-semibold text-right w-[110px]">Egresos</TableHead>
                  <TableHead className="font-semibold text-center w-[130px]">Boleta Int.</TableHead>
                  <TableHead className="font-semibold text-center w-[130px]">Boleta Elec.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : allRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No hay movimientos registrados para este período
                    </TableCell>
                  </TableRow>
                ) : (
                  allRows.map((row, index) => (
                    <TableRow 
                      key={index} 
                      className={`hover:bg-muted/30 transition-colors ${
                        row.tipo === "income" ? "bg-green-50/50 dark:bg-green-950/10" : "bg-red-50/50 dark:bg-red-950/10"
                      }`}
                    >
                      <TableCell className="font-medium text-sm">{row.fecha}</TableCell>
                      <TableCell className="text-sm">{row.detalle}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {row.ingresos > 0 ? `S/ ${row.ingresos.toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {row.egresos > 0 ? `S/ ${row.egresos.toFixed(2)}` : ""}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {row.boletaInterna}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {row.boletaElectronica}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals Footer */}
          {!isLoading && allRows.length > 0 && (
            <div className="border-t bg-muted/30 p-4">
              <div className="flex flex-wrap justify-end gap-6">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Ingresos</p>
                  <p className="text-lg font-bold text-green-600">S/ {totalIngresos.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Egresos</p>
                  <p className="text-lg font-bold text-red-600">S/ {totalEgresos.toFixed(2)}</p>
                </div>
                <div className="text-right border-l pl-6">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className={`text-xl font-bold ${cajaTotal >= 0 ? "text-primary" : "text-orange-600"}`}>
                    S/ {cajaTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CashRegister;
