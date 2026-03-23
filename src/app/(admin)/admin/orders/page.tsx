"use client";

// 管理者向け発注一覧画面
import { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Eye, 
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  XCircle
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/utils/apiClient";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CsvImportButton } from "@/components/admin/csv-import-button";

type AdminOrder = {
  id: string;
  order_number: string;
  franchise_id: string;
  franchise_name: string;
  status: string;
  total_amount: number;
  total_quantity: number;
  created_at: string;
};

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "受付済", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  processing: { label: "処理中", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertCircle },
  shipped: { label: "出荷済", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck },
  completed: { label: "完了", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<AdminOrder[]>("/api/admin/orders");
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("注文一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.franchise_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            発注管理
          </h1>
          <p className="text-muted-foreground">全加盟店からの注文状況を確認・管理します</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportButton
            title="受注データCSVインポート"
            description="過去の受注履歴を一括で登録・更新します。店舗コードとSKUコードを元に、自動的に加盟店と商品が紐付けられます。"
            onImport={async (data) => {
              const res = await apiPost<{ successCount: number; errorCount: number; errors: string[] }>(
                "/api/admin/imports/orders",
                data
              );
              fetchOrders();
              return {
                success: res.errorCount === 0,
                message: `${res.successCount} 件の受注データを処理しました${res.errorCount > 0 ? `（${res.errorCount} 件のエラー）` : ""}`,
              };
            }}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-3 px-6 pt-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="注文番号・加盟店名で検索..." 
                className="pl-9 h-11 rounded-xl bg-muted/50 border-none focus-visible:ring-primary" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="w-full md:w-40 h-11 rounded-xl bg-muted/50 border-none">
                  <SelectValue placeholder="全ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ステータス</SelectItem>
                  {Object.entries(statusMap).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="rounded-md border-t border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[150px] font-bold py-4">注文番号</TableHead>
                  <TableHead className="font-bold py-4 text-center">加盟店</TableHead>
                  <TableHead className="font-bold py-4 text-center">注文日時</TableHead>
                  <TableHead className="font-bold py-4 text-center">ステータス</TableHead>
                  <TableHead className="font-bold py-4 text-right">合計金額</TableHead>
                  <TableHead className="w-[80px] py-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <ClipboardList className="w-12 h-12 mb-2" />
                        <p>注文データが見つかりません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const status = statusMap[order.status] || { label: order.status, color: "bg-gray-100", icon: AlertCircle };
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-border/30">
                        <TableCell className="font-medium font-mono text-xs">{order.order_number}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-sm">{order.franchise_name}</span>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link 
                            href={`/admin/orders/${order.id}`}
                            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full hover:bg-primary/10 hover:text-primary transition-all")}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
