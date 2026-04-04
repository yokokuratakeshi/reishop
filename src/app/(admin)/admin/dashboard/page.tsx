"use client";

// 管理者ダッシュボード画面
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Store, 
  Layers, 
  TrendingUp, 
  Clock,
  ArrowRight,
  ClipboardList,
  AlertCircle,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/utils/apiClient";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type DashboardStats = {
  stats: {
    totalOrders: number;
    totalFranchises: number;
    totalProducts: number;
    totalSales: number;
    pendingOrders: number;
    salesByMonth: Array<{ month: string; amount: number }>;
    salesByCategory: Array<{ name: string; value: number }>;
  };
  recentOrders: Array<{
    id: string;
    order_number: string;
    franchise_name: string;
    status: string;
    total_amount: number;
    created_at: string;
  }>;
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "受付済", color: "bg-blue-100 text-blue-700" },
  processing: { label: "処理中", color: "bg-yellow-100 text-yellow-700" },
  shipped: { label: "出荷済", color: "bg-purple-100 text-purple-700" },
  completed: { label: "完了", color: "bg-green-100 text-green-700" },
  cancelled: { label: "中止", color: "bg-red-100 text-red-700" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await apiGet<DashboardStats>("/api/admin/dashboard/stats");
        setData(stats);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="p-8 space-y-8 bg-neutral-50/50 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            ダッシュボード
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">システムの概況と最近のアクティビティ</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">今日の日付</p>
          <p className="text-lg font-black">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="総売上" 
          value={formatCurrency(stats?.totalSales || 0)} 
          icon={TrendingUp} 
          description="全期間の受注合計（税込）"
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          title="未処理オーダー" 
          value={stats?.pendingOrders || 0} 
          unit="件"
          icon={Clock} 
          description="新規受付の注文"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          title="登録加盟店" 
          value={stats?.totalFranchises || 0} 
          unit="店舗"
          icon={Store} 
          description="アクティブな加盟店数"
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
        <StatCard 
          title="取り扱い商品" 
          value={stats?.totalProducts || 0} 
          unit="SKU"
          icon={ShoppingBag} 
          description="マスタ登録済み商品数"
          color="text-amber-500"
          bgColor="bg-amber-50"
        />
      </div>

      {/* チャートセクション */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border/10 px-6 py-5">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              売上推移（直近6ヶ月）
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.salesByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(value) => value >= 10000 ? `¥${(value / 10000).toLocaleString()}万` : `¥${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), "売上"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="border-b border-border/10 px-6 py-5">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              カテゴリ別比率
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.salesByCategory || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(stats?.salesByCategory || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: any) => [formatCurrency(Number(value || 0)), "売上"]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 直近の注文リスト */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 px-6 py-5">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              直近の注文
            </CardTitle>
            <Link 
              href="/admin/orders"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "font-bold text-primary hover:text-primary hover:bg-primary/5")}
            >
              すべて見る <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {data?.recentOrders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  注文データがありません
                </div>
              ) : (
                data?.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">{order.order_number}</span>
                        <span className="font-black text-sm">{order.franchise_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right flex flex-col items-end">
                        <span className="text-sm font-black text-primary">{formatCurrency(order.total_amount)}</span>
                        <Badge variant="secondary" className={cn("mt-1 text-[10px] font-bold px-2 py-0 border-none", statusMap[order.status]?.color || "bg-gray-100")}>
                          {statusMap[order.status]?.label || order.status}
                        </Badge>
                      </div>
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-full w-8 h-8 border-border/50 hover:bg-primary hover:text-white transition-all")}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* クイックリンク */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-2xl bg-primary text-primary-foreground p-6 overflow-hidden relative">
            <div className="relative z-10 space-y-4">
              <h3 className="text-lg font-black">クイックアクション</h3>
              <div className="grid grid-cols-1 gap-2">
                <QuickLink 
                  icon={ShoppingBag} 
                  label="新商品を追加" 
                  href="/admin/products"
                />
                <QuickLink 
                  icon={Layers} 
                  label="カテゴリを編集" 
                  href="/admin/categories"
                />
                <QuickLink 
                  icon={Store} 
                  label="店舗情報を確認" 
                  href="/admin/franchises"
                />
              </div>
            </div>
            {/* 装飾用サークル */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </Card>

          <Card className="border-none shadow-sm rounded-2xl p-6 bg-card border-l-4 border-l-primary">
            <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-primary" />
              システム通知
            </h3>
            <p className="text-sm font-medium">
              現在、システムは正常に稼働しています。加盟店からの注文が 
              <span className="text-primary font-bold mx-1">{stats?.pendingOrders || 0}件</span> 
              保留中です。
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function StatCard({ title, value, unit, icon: Icon, description, color, bgColor }: { title: string, value: string | number, unit?: string, icon: any, description: string, color: string, bgColor: string }) {
  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <p className={cn("text-2xl font-black", color)}>{value}</p>
              {unit && <span className="text-xs font-bold text-muted-foreground">{unit}</span>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">{description}</p>
          </div>
          <div className={cn("p-3 rounded-xl", bgColor)}>
            <Icon className={cn("w-6 h-6", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickLink({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-bold"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
