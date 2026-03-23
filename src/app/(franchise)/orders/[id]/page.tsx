"use client";

// 加盟店別発注詳細画面

import { useState, useEffect } from "react";
import { Package, ChevronLeft, MapPin, Calendar, CreditCard, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiGet } from "@/lib/utils/apiClient";
import { formatCurrency, formatDate, formatAttributeValues } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Order, OrderItem } from "@/types";

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order & { items: OrderItem[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrderDetail = async () => {
    try {
      // 注文詳細API（バックエンド未実装の場合は新規作成が必要）
      const data = await apiGet<Order & { items: OrderItem[] }>(`/api/orders/${id}`);
      setOrder(data);
    } catch {
      toast.error("詳細の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrderDetail();
  }, [id]);

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );

  if (!order) return <p className="text-center py-20 text-muted-foreground">注文が見つかりません</p>;

  return (
    <div className="space-y-6 pb-20 page-enter">
      <div className="flex items-center gap-2">
        <Link href="/orders" className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">発注詳細</h1>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">#{order.order_number}</span>
            <StatusBadge status={order.status} />
          </div>
          <CardTitle className="text-lg font-bold mt-2">
            合計 {formatCurrency(order.total_amount)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{formatDate(order.ordered_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{order.total_quantity}点の商品</span>
            </div>
          </div>
          {order.note && (
            <div className="bg-muted p-2.5 rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">備考</p>
              <p className="text-xs text-foreground whitespace-pre-wrap">{order.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Tag className="w-4 h-4" />
          注文商品一覧
        </h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center p-3 bg-card rounded-2xl shadow-sm">
            <div>
              <p className="text-sm font-bold">{item.product_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatAttributeValues(item.attribute_values)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {formatCurrency(item.wholesale_price)} × {item.quantity}
              </p>
            </div>
            <p className="text-sm font-black text-primary">
              {formatCurrency(item.subtotal)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] || status;
  let color = "bg-neutral-100 text-neutral-600";

  switch (status) {
    case "pending": color = "bg-blue-50 text-blue-600"; break;
    case "processing": color = "bg-amber-50 text-amber-600"; break;
    case "shipped": color = "bg-indigo-50 text-indigo-600"; break;
    case "completed": color = "bg-emerald-50 text-emerald-600"; break;
    case "cancelled": color = "bg-rose-50 text-rose-600"; break;
  }

  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase", color)}>
      {label}
    </span>
  );
}
