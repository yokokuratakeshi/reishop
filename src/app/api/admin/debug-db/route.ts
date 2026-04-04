import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

/**
 * データベースの状態を確認するためのデバッグ用API
 * 管理者権限が必要
 */
export async function GET(request: NextRequest) {
  const { error, user } = await requireAdmin(request);
  if (error) return error;

  try {
    const collections = ["products", "stages", "franchises", "categories", "orders", "users"];
    const results: Record<string, any> = {};

    for (const c of collections) {
      const snap = await adminDb.collection(c).get();
      results[c] = {
        count: snap.size,
        first_id: snap.empty ? null : snap.docs[0].id,
        sample: snap.empty ? null : snap.docs[0].data(),
      };
    }

    return NextResponse.json({
      success: true,
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, // サーバー側の設定値を確認
      clientProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      currentUserUID: user?.uid,
      dbStatus: results
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack,
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
    }, { status: 500 });
  }
}
