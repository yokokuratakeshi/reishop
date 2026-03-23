// API Routes 共通ユーティリティ
// 認証・認可チェックとレスポンス生成を統一する

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

// 標準レスポンス型
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Firebase IDトークンまたはセッションクッキーを検証し、ユーザー情報を返す
export async function verifyAuthToken(request: NextRequest): Promise<{
  uid: string;
  role: string | null;
  franchiseId: string | null;
} | null> {
  const authHeader = request.headers.get("Authorization");
  const sessionCookie = request.cookies.get("session")?.value;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return {
        uid: decoded.uid,
        role: (decoded["role"] as string) ?? null,
        franchiseId: (decoded["franchise_id"] as string) ?? null,
      };
    } catch {
      // IDトークンの検証失敗時はクッキーも試す
    }
  }

  // セッションクッキーの検証
  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      return {
        uid: decoded.uid,
        role: (decoded["role"] as string) ?? null,
        franchiseId: (decoded["franchise_id"] as string) ?? null,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// Admin ロールのみ許可するミドルウェア
export async function requireAdmin(request: NextRequest) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return {
      user: null,
      error: errorResponse("UNAUTHORIZED", "認証が必要です", 401),
    };
  }
  if (user.role !== "admin") {
    return {
      user: null,
      error: errorResponse("FORBIDDEN", "管理者権限が必要です", 403),
    };
  }
  return { user, error: null };
}
// 日付データを安全にISO文字列に変換する（Timestamp | Date | string | number）
export function formatDateToISO(dateData: any): string | null {
  if (!dateData) return null;
  
  try {
    if (typeof dateData.toDate === "function") {
      return dateData.toDate().toISOString();
    }
    const date = new Date(dateData);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

// Franchise ロールのみ許可するミドルウェア
export async function requireFranchise(request: NextRequest) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return {
      user: null,
      error: errorResponse("UNAUTHORIZED", "認証が必要です", 401),
    };
  }
  if (user.role !== "franchise") {
    return {
      user: null,
      error: errorResponse("FORBIDDEN", "加盟店権限が必要です", 403),
    };
  }
  return { user, error: null };
}
