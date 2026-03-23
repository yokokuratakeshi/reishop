"use client";

// 加盟店別発注履歴画面

import { useState, useEffect } from "react";
import { History, Package, ChevronRight, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiGet } from "@/lib/utils/apiClient";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import Link from "next/link";
import { Order } from "@/types";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const data = await apiGet<Order[]>("/api/orders/history");
      setOrders(data);
    } catch {
      toast.error("履歴の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6 pb-20 page-enter">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">発注履歴</h1>
        <p className="text-xs text-muted-foreground">過去の注文内容を確認できます</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">注文履歴がありません</p>
          <Link href="/catalog" className="text-primary text-sm font-bold mt-4 inline-block">
            カタログを見る
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="border-none shadow-sm bg-card hover:shadow-md transition-shadow cursor-pointer rounded-2xl overflow-hidden mb-3">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{order.order_number}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm font-bold mt-1">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.item_count}品 / {order.total_quantity}点
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(order.ordered_at)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] || status;
  let variant: "default" | "secondary" | "outline" | "destructive" = "outline";

  switch (status) {
    case "pending": variant = "secondary"; break;
    case "processing": variant = "default"; break;
    case "shipped": variant = "outline"; break;
    case "completed": variant = "default"; break;
    case "cancelled": variant = "destructive"; break;
  }

  return (
    <Badge variant={variant} className="text-[9px] px-1.5 h-4 font-bold border-none uppercase">
      {label}
    </Badge>
  );
}
