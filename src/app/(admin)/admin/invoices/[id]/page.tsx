"use client";

import { useState, useEffect, use } from "react";
import { 
  FileText, 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Building2,
  Receipt,
  Download,
  Save,
  Loader2
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPatch } from "@/lib/utils/apiClient";
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<any>(`/api/admin/invoices/${id}`);
      setInvoice(data);
    } catch (error) {
      console.error(error);
      toast.error("請求詳細の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await apiPatch(`/api/admin/invoices/${id}`, { status: newStatus });
      toast.success("ステータスを更新しました");
      fetchInvoice();
    } catch (error: any) {
      toast.error(error.message || "更新に失敗しました");
    } finally {
      setIsUpdating(false);
    }
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "下書き", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
    issued: { label: "発行済", color: "bg-blue-50 text-blue-700 border-blue-200", icon: FileText },
    paid: { label: "支払済", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full roudned-xl" />
          <Skeleton className="h-32 w-full roudned-xl" />
          <Skeleton className="h-32 w-full roudned-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!invoice) return <div className="p-6 text-center">請求書が見つかりません</div>;

  const status = statusMap[invoice.status] || { label: invoice.status, color: "bg-gray-100", icon: AlertCircle };
  const StatusIcon = status.icon;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* 操作バー - 印刷時は非表示 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <Link 
          href="/admin/invoices"
          className={cn(buttonVariants({ variant: "ghost" }), "rounded-full gap-2")}
        >
          <ArrowLeft className="w-4 h-4" />
          一覧に戻る
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">ステータス:</span>
            <Select 
              value={invoice.status} 
              onValueChange={(val) => val && handleUpdateStatus(val)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-32 h-10 rounded-xl bg-background border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            className="rounded-xl border-primary text-primary hover:bg-primary/5 gap-2"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            PDF / 印刷
          </Button>
        </div>
      </div>

      {/* 請求書本体 */}
      <Card className="border-none shadow-lg bg-card overflow-hidden print:shadow-none print:border">
        <CardHeader className="bg-primary/5 pb-8 border-b border-primary/10">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">FC</div>
                <span className="text-xl font-bold tracking-tight">フランチャイズ発注管理システム</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">請求書発行元: 本部事務局</p>
            </div>
            <div className="text-right space-y-1">
              <h2 className="text-3xl font-black text-primary opacity-50 uppercase tracking-widest">Invoice</h2>
              <p className="text-sm font-mono font-bold text-muted-foreground">ID: {invoice.id.toUpperCase()}</p>
              <Badge variant="outline" className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-base font-bold border-2", status.color)}>
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">請求先</span>
              </div>
              <div className="pl-6 border-l-4 border-primary">
                <h3 className="text-2xl font-bold">{invoice.franchise_name} 御中</h3>
                <p className="text-muted-foreground mt-2">対象月: {invoice.year_month}</p>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-4">
              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">作成日:</span>
                  <span className="font-bold">{new Date(invoice.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">支払期限:</span>
                  <span className="font-bold text-destructive underline">{new Date(invoice.due_date).toLocaleDateString("ja-JP")}</span>
                </div>
                {invoice.issued_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">発行日:</span>
                    <span className="font-bold">{new Date(invoice.issued_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 金額サマリー */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-primary/20 rounded-2xl overflow-hidden bg-primary/5">
            <div className="p-6 text-center border-r-2 border-primary/20">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">小計 (税抜)</p>
              <p className="text-2xl font-bold">{formatCurrency(invoice.subtotal_amount)}</p>
            </div>
            <div className="p-6 text-center border-r-2 border-primary/20">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">消費税 (10%)</p>
              <p className="text-2xl font-bold">{formatCurrency(invoice.tax_amount)}</p>
            </div>
            <div className="p-6 text-center bg-primary text-primary-foreground">
              <p className="text-xs font-bold opacity-80 uppercase mb-1">ご請求金額 (税込)</p>
              <p className="text-3xl font-black">{formatCurrency(invoice.total_amount)}</p>
            </div>
          </div>

          {/* 明細テーブル */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Receipt className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">請求明細（対象受注一覧）</span>
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">受注日時</TableHead>
                    <TableHead className="font-bold">受注番号</TableHead>
                    <TableHead className="font-bold text-right">受注金額 (税込)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items?.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm font-medium">
                        {new Date(item.ordered_at).toLocaleString("ja-JP")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.order_number}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 備考・署名 */}
          <div className="pt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-xs font-bold text-muted-foreground uppercase">備考</p>
              <div className="h-24 p-4 bg-muted/30 rounded-xl text-sm text-muted-foreground italic border-t-2 border-muted">
                お振込み手数料は貴社にてご負担いただけますようお願い申し上げます。
              </div>
            </div>
            <div className="flex flex-col items-end justify-end space-y-2">
              <div className="w-48 h-24 border-2 border-dashed border-muted rounded-xl flex items-center justify-center text-muted-foreground text-xs italic">
                (社印)
              </div>
              <p className="font-bold text-sm">株式会社 フランチャイズ本部</p>
              <p className="text-xs text-muted-foreground">東京都渋谷区神宮前 0-0-0</p>
            </div>
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
          aside, nav, header, button, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
