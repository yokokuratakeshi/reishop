"use client";

import { useState, useEffect, use, useCallback } from "react";
import { 
  FileText, 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Building2,
  Receipt,
  Download,
  Calendar
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/utils/apiClient";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FranchiseInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<any>(`/api/franchise/invoices/${id}`);
      setInvoice(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "請求詳細の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    issued: { label: "発行済", color: "bg-blue-50 text-blue-700 border-blue-200", icon: FileText },
    paid: { label: "支払済", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!invoice) return <div className="p-6 text-center">請求書が見つかりません</div>;

  const status = statusMap[invoice.status] || { label: invoice.status, color: "bg-gray-100", icon: AlertCircle };
  const StatusIcon = status.icon;

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto pb-20">
      {/* 操作バー - 印刷時は非表示 */}
      <div className="flex items-center justify-between print:hidden">
        <Link 
          href="/invoices"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }), 
            "rounded-full gap-2 text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          一覧に戻る
        </Link>
        <Button 
          variant="outline" 
          size="sm"
          className="rounded-full border-primary text-primary hover:bg-primary/5 gap-2 font-bold"
          onClick={() => window.print()}
        >
          <Printer className="w-4 h-4" />
          PDFを保存 / 印刷
        </Button>
      </div>

      {/* 請求書本体 */}
      <Card className="border-none shadow-sm bg-card overflow-hidden print:shadow-none print:border rounded-3xl">
        <CardHeader className="bg-primary/5 pb-6 border-b border-primary/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xs">FC</div>
                <span className="text-sm font-bold tracking-tight">本部事務局 請求書</span>
              </div>
              <h2 className="text-xl font-black">Invoice</h2>
              <p className="text-[10px] text-muted-foreground font-mono">#{invoice.id.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border-2", status.color)}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8 text-sm md:text-base">
          {/* 基本情報 */}
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">宛先</div>
              <h3 className="text-xl font-bold border-b-2 border-primary/20 pb-2">{invoice.franchise_name} 御中</h3>
              <p className="text-sm font-medium mt-1">{invoice.year_month} 分 ご請求分</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">発行日</p>
                <p className="font-bold text-xs">{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString("ja-JP") : "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">お支払期限</p>
                <p className="font-bold text-xs text-destructive">{new Date(invoice.due_date).toLocaleDateString("ja-JP")}</p>
              </div>
            </div>
          </div>

          {/* 金額サマリー */}
          <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-inner text-center space-y-1">
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">ご請求金額 (税込)</p>
            <p className="text-3xl font-black tracking-tight">{formatCurrency(invoice.total_amount)}</p>
            <div className="flex justify-center gap-4 text-[10px] opacity-80 mt-2 pt-2 border-t border-primary-foreground/20">
              <span>小計: {formatCurrency(invoice.subtotal_amount)}</span>
              <span>消費税: {formatCurrency(invoice.tax_amount)}</span>
            </div>
          </div>

          {/* 明細 */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Receipt className="w-3 h-3" />
              明細一覧
            </p>
            <div className="divide-y divide-border/50">
              {invoice.items?.map((item: any) => (
                <div key={item.id} className="py-3 flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-muted-foreground">Order #{item.order_number}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(item.ordered_at).toLocaleDateString("ja-JP")}</p>
                  </div>
                  <p className="font-bold text-sm">{formatCurrency(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 署名 */}
          <div className="pt-8 text-right space-y-1">
            <p className="text-[10px] text-muted-foreground italic mb-4">※ 本請求書はシステムにより自動発行されています。</p>
            <p className="font-bold text-xs">株式会社 フランチャイズ本部</p>
            <p className="text-[10px] text-muted-foreground">東京都渋谷区神宮前 0-0-0</p>
          </div>
        </CardContent>
      </Card>
      
      {/* 印刷用CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
          }
          aside, nav, header, button, .print\\:hidden, .sonner {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
