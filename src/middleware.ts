// ロールベースアクセス制御ミドルウェア
// Firebase Auth のセッションCookieを使いサーバーサイドでルートを保護する

import { NextRequest, NextResponse } from "next/server";

// 保護するルートの定義
const ADMIN_ROUTES = ["/admin"];
const FRANCHISE_ROUTES = ["/catalog", "/cart", "/checkout", "/history", "/orders"];
const AUTH_ROUTES = ["/login", "/admin-login", "/admin-register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session")?.value;

  // セッションCookieなし = 未認証
  const isAuthenticated = !!sessionCookie;

  // ルートへのアクセスは店舗ログインへ
  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // 認証済みなら適切な初期画面へ（TODO: 本来はロール判定が必要だが、今は一律 /login 経由でリダイレクトされる想定）
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 認証不要ルート（ログイン・登録）はスキップ
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 管理画面へのアクセス: 未認証なら /admin-login へ
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
  }

  // 発注画面へのアクセス: 未認証なら /login へ
  if (FRANCHISE_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // APIルートと静的ファイルを除外する
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
