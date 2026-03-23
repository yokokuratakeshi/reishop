"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Printer,
  FilePlus,
  Loader2
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, apiPost } from "@/lib/utils/apiClient";
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<any[]>(`/api/admin/invoices?yearMonth=${yearMonth}&status=${statusFilter}`);
      setInvoices(data);
    } catch (error) {
      console.error(error);
      toast.error("請求一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [yearMonth, statusFilter]);

  const handleGenerateInvoices = async () => {
    if (!confirm(`${yearMonth} 分の請求書を一括生成しますか？`)) return;
    
    setIsGenerating(true);
    try {
      const res = await apiPost<any>("/api/admin/invoices/generate", { yearMonth });
      toast.success(res.message);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || "請求書の生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "下書き", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Clock },
    issued: { label: "発行済", color: "bg-blue-50 text-blue-700 border-blue-200", icon: FileText },
    paid: { label: "支払済", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            請求管理
          </h1>
          <p className="text-muted-foreground">加盟店への請求書発行と入金状態を管理します</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            type="month" 
            value={yearMonth} 
            onChange={(e) => setYearMonth(e.target.value)}
            className="w-40 h-10 rounded-xl"
          />
          <Button 
            onClick={handleGenerateInvoices} 
            disabled={isGenerating}
            className="rounded-xl shadow-sm bg-primary hover:bg-primary/90 transition-all font-bold gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
            請求書を一括生成
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              絞り込み
            </CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                <SelectTrigger className="w-full md:w-40 h-10 rounded-xl bg-background border-border/50">
                  <SelectValue placeholder="全ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ステータス</SelectItem>
                  {Object.entries(INVOICE_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[120px] font-bold py-4 pl-6">対象月</TableHead>
                <TableHead className="font-bold py-4">加盟店名</TableHead>
                <TableHead className="font-bold py-4 text-center">ステータス</TableHead>
                <TableHead className="font-bold py-4 text-right">請求金額 (税込)</TableHead>
                <TableHead className="font-bold py-4 text-center">期限</TableHead>
                <TableHead className="w-[80px] py-4 pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                    <TableCell className="pr-6"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground opacity-50">
                      <FileText className="w-12 h-12 mb-2" />
                      <p>{yearMonth} の請求データはありません</p>
                      <p className="text-sm">「請求書を一括生成」ボタンから作成してください</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const status = statusMap[invoice.status] || { label: invoice.status, color: "bg-gray-100", icon: AlertCircle };
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors border-border/30">
                      <TableCell className="pl-6 font-medium">{invoice.year_month}</TableCell>
                      <TableCell>
                        <span className="font-bold text-sm">{invoice.franchise_name}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", status.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("ja-JP") : "-"}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Link 
                          href={`/admin/invoices/${invoice.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon" }),
                            "rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                          )}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
