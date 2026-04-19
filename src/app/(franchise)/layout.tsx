"use client";

import { useCart } from "@/lib/store/useCart";
import { ShoppingCart, User, Package, ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/utils/apiClient";

export default function FranchiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cart = useCart();
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [storeName, setStoreName] = useState<string>("");

  // カート数量はカート変更時に更新（ハイドレーションエラー防止のためマウント後に取得）
  useEffect(() => {
    setCartCount(cart.totalQuantity());
  }, [cart]);

  // 店舗名はマウント時のみ取得（カート変更のたびにAPIを叩かないよう分離）
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiGet<any>("/api/franchise/profile");
        if (res && res.name) {
          setStoreName(res.name);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md shadow-sm">
        <div className="px-4 h-14 flex items-center justify-between max-w-2xl mx-auto">
          <Link href="/catalog" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: "var(--primary)" }}
            >
              FC
            </div>
            <span className="font-semibold text-foreground text-sm" style={{ fontFamily: "var(--font-heading)" }}>
              発注システム
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link 
              href="/catalog" 
              className={cn("p-2 rounded-full transition-colors", pathname === "/catalog" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}
              title="商品カタログ"
            >
              <Package className="w-5 h-5" />
            </Link>
            
            <Link
              href="/orders"
              className={cn("p-2 rounded-full transition-colors", pathname.startsWith("/orders") ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}
              title="発注履歴"
            >
              <ClipboardList className="w-5 h-5" />
            </Link>

            <Link
              href="/cart"
              className={cn("relative p-2 rounded-full transition-colors", pathname === "/cart" ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}
              title="カート"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-1 pl-2 border-l border-border/50">
              {storeName && (
                <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                  {storeName}
                </span>
              )}
              <button 
                onClick={async () => {
                  const { logout } = await import("@/lib/firebase/auth");
                  await logout();
                  window.location.assign("/login");
                }}
                className="p-2 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                title="ログアウト"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
