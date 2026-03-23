"use client";

import { useState, useEffect } from "react";
import { Receipt, FileText, ChevronRight, Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiGet } from "@/lib/utils/apiClient";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function FranchiseInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      const data = await apiGet<any[]>("/api/franchise/invoices");
      setInvoices(data);
    } catch (error) {
      console.error(error);
      toast.error("請求書の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    issued: { label: "発行済", color: "bg-blue-50 text-blue-700 border-blue-200", icon: FileText },
    paid: { label: "支払済", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  };

  return (
    <div className="space-y-6 pb-20 page-enter max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          請求・お支払い
        </h1>
        <p className="text-xs text-muted-foreground">月ごとの請求内容と支払い状況を確認できます</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">現在、公開されている請求書はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const status = statusMap[invoice.status] || { label: invoice.status, color: "bg-gray-100", icon: AlertCircle };
            const StatusIcon = status.icon;

            return (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                <Card className="border-none shadow-sm bg-card hover:shadow-md transition-all cursor-pointer rounded-2xl overflow-hidden mb-3 border-l-4 border-l-primary/10">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{invoice.year_month} 分 請求書</span>
                          <Badge variant="outline" className={cn("inline-flex items-center gap-1 px-1.5 py-0 rounded-full text-[9px] font-bold border", status.color)}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-lg font-black mt-1 text-primary">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            期限: {new Date(invoice.due_date).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
