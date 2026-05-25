import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Eye, FileText, Receipt } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AccountDetailDialog } from "@/components/accounts/AccountDetailDialog";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  paid: "bg-green-500/10 text-green-600 border-green-500/30",
  partial: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  partial: "Parcial",
};

const Accounts = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["accounts", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("accounts")
        .select(
          `
          *,
          patients (id, full_name, dni, phone),
          appointments (id, appointment_date, treatment)
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        return data.filter(
          (account) =>
            account.patients?.full_name?.toLowerCase().includes(searchLower) ||
            account.patients?.dni?.includes(search) ||
            account.account_number?.toLowerCase().includes(searchLower)
        );
      }

      return data;
    },
  });

  const handleViewAccount = (account: any) => {
    setSelectedAccount(account);
    setDetailDialogOpen(true);
  };

  // Calculate summary stats
  const stats = accounts?.reduce(
    (acc, account) => {
      acc.total += Number(account.total_amount);
      acc.paid += Number(account.paid_amount);
      acc.pending += Number(account.balance);
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  ) || { total: 0, paid: 0, pending: 0 };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Cuentas</h1>
        <p className="text-muted-foreground mt-1">
          Administra cuentas de pacientes y pagos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Facturado</CardDescription>
            <CardTitle className="text-2xl">S/ {stats.total.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cobrado</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              S/ {stats.paid.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Pendiente</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              S/ {stats.pending.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Lista de Cuentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, DNI o N° cuenta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Cuenta</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Boleta Int.</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && accounts?.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-8"
                    >
                      No se encontraron cuentas
                    </TableCell>
                  </TableRow>
                )}
                {accounts?.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.account_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.patients?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          DNI: {account.patients?.dni}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(account.created_at), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      S/ {Number(account.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      S/ {Number(account.paid_amount).toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        Number(account.balance) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      S/ {Number(account.balance).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={statusColors[account.status]}
                      >
                        {statusLabels[account.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {account.internal_invoice_number ? (
                        <span className="flex items-center justify-center gap-1 text-xs">
                          <FileText className="h-3 w-3" />
                          {account.internal_invoice_number}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewAccount(account)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedAccount && (
        <AccountDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          account={selectedAccount}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default Accounts;
