// ロールベースアクセス制御ミドルウェア
// Firebase Auth のセッションCookieを使いサーバーサイドでルートを保護する

import { NextRequest, NextResponse } from "next/server";

// 保護するルートの定義
const ADMIN_ROUTES = ["/admin"];
const FRANCHISE_ROUTES = ["/catalog", "/cart", "/checkout", "/history"];
const AUTH_ROUTES = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session")?.value;

  // セッションCookieなし = 未認証
  const isAuthenticated = !!sessionCookie;

  // ルートへのアクセスはログイン画面へ
  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // 認証済みならセッション情報に基づいてリダイレクト（後でロール判定を追加）
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 管理画面へのアクセス: 未認証なら /login へ
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 発注画面へのアクセス: 未認証なら /login へ
  if (FRANCHISE_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ログイン画面: 認証済みなら /login のまま（ロールに応じたリダイレクトはクライアントで処理）
  return NextResponse.next();
}

export const config = {
  // APIルートと静的ファイルを除外する
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
