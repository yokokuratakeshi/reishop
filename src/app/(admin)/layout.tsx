"use client";

// 管理画面 共通レイアウト（サイドバー付き）

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, LayoutDashboard, ShoppingBag, Tags, Layers, Store, ClipboardList, Receipt } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "ダッシュボード", href: "/admin/dashboard" },
    { label: "商品管理", href: "/admin/products" },
    { label: "カテゴリ管理", href: "/admin/categories" },
    { label: "ステージ管理", href: "/admin/stages" },
    { label: "加盟店管理", href: "/admin/franchises" },
    { label: "発注一覧", href: "/admin/orders" },
    { label: "請求書管理", href: "/admin/invoices" },
  ];

  return (

    <div className="flex min-h-screen bg-background">
      {/* サイドバー（Phase 2 で実装） */}
      <aside
        className="w-64 min-h-screen flex-shrink-0 hidden lg:flex flex-col"
        style={{ backgroundColor: "var(--sidebar)", color: "var(--sidebar-foreground)" }}
      >
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: "var(--primary)" }}
            >
              FC
            </div>
            <span className="font-semibold text-white text-sm">発注管理システム</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wider px-3 py-2">メニュー</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium" 
                    : "hover:bg-neutral-800 hover:text-white text-neutral-400"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={async () => {
              const { logout } = await import("@/lib/firebase/auth");
              await logout();
              window.location.href = "/login";
            }}
            className="flex items-center w-full px-3 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto">
        {/* ヘッダーを追加 */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-end">
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                const { logout } = await import("@/lib/firebase/auth");
                await logout();
                window.location.href = "/login";
              }}
              className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
              title="ログアウト"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
