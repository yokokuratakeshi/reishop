"use client";

// 管理者向け発注詳細画面
import { useState, useEffect, use } from "react";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MapPin,
  Calendar,
  Building2,
  Hash,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/utils/apiClient";
import { formatCurrency, formatDate, formatAttributeValues } from "@/lib/utils/format";
import Link from "next/link";
import { cn } from "@/lib/utils";

type OrderItem = {
  product_id: string;
  product_name: string;
  variant_id: string;
  sku_code: string;
  attribute_values: Record<string, string>;
  wholesale_price: number;
  quantity: number;
};

type OrderDetail = {
  id: string;
  order_number: string;
  franchise_id: string;
  franchise_name: string;
  status: string;
  total_amount: number;
  total_quantity: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "受付済", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  processing: { label: "処理中", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertCircle },
  shipped: { label: "出荷済", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Truck },
  completed: { label: "完了", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "キャンセル", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<OrderDetail>(`/api/admin/orders/${id}`);
      setOrder(data);
    } catch (error) {
      console.error("Failed to fetch order detail:", error);
      toast.error("注文詳細の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return;
    try {
      setIsUpdating(true);
      await apiPatch(`/api/admin/orders/${id}`, { status: newStatus });
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`ステータスを「${statusMap[newStatus].label}」に更新しました`);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("ステータスの更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-20 text-center">
        <p className="text-muted-foreground">注文が見つかりませんでした</p>
        <Link 
          href="/admin/orders" 
          className={cn(buttonVariants({ variant: "default" }), "mt-4")}
        >
          一覧に戻る
        </Link>
      </div>
    );
  }

  const statusInfo = statusMap[order.status] || { label: order.status, color: "bg-gray-100", icon: AlertCircle };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="p-6 space-y-6 pb-20 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/orders"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">注文詳細</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左側：注文内容と商品リスト */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Package className="w-5 h-5" />
                  <CardTitle className="text-base font-bold underline underline-offset-4 decoration-2 decoration-primary/30">商品リスト</CardTitle>
                </div>
                <Badge className="font-bold bg-primary/10 text-primary border-primary/20">{order.total_quantity} 点</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 border-border/50">
                    <TableHead className="font-bold text-xs py-3 pl-6">商品・規格</TableHead>
                    <TableHead className="font-bold text-xs text-center py-3">単価</TableHead>
                    <TableHead className="font-bold text-xs text-center py-3">数量</TableHead>
                    <TableHead className="font-bold text-xs text-right py-3 pr-6">小計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index} className="border-border/30 hover:bg-muted/5 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <p className="font-bold text-sm text-foreground">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatAttributeValues(item.attribute_values)}</p>
                        <p className="text-[9px] font-mono text-muted-foreground/60">{item.sku_code}</p>
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        {formatCurrency(item.wholesale_price || 0)}
                      </TableCell>
                      <TableCell className="text-center font-bold text-sm">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-bold text-primary">
                        {formatCurrency((item.wholesale_price || 0) * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="bg-muted/10 px-6 py-6 flex justify-end items-end gap-10">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">合計数量</span>
                <span className="text-lg font-bold">{order.total_quantity} 点</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider">合計金額（税込）</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(order.total_amount)}</span>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* 右側：注文ステータスと情報 */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                現在のステータス
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={cn("p-4 rounded-xl border flex flex-col items-center gap-3", statusInfo.color)}>
                <StatusIcon className="w-10 h-10" />
                <span className="text-lg font-black">{statusInfo.label}</span>
              </div>
              
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground ml-1">ステータスを変更</p>
                <Select 
                  disabled={isUpdating} 
                  onValueChange={handleStatusChange} 
                  value={order.status}
                >
                  <SelectTrigger className="w-full h-11 rounded-xl bg-muted/50 border-none font-bold">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusMap).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="font-medium">{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                注文情報
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/30">
                <div className="px-5 py-3 flex justify-between items-center bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">注文番号</span>
                  </div>
                  <span className="text-xs font-mono font-bold">{order.order_number}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center bg-card/50">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">加盟店</span>
                  </div>
                  <span className="text-xs font-black">{order.franchise_name}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">注文日時</span>
                  </div>
                  <span className="text-xs font-medium">{formatDate(order.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
