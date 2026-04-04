// 管理者自動ログイン用カスタムトークン生成API
// POST: 管理者UIDでカスタムトークンを生成して返す

import { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 管理者ユーザーをFirestoreから検索
    const usersSnapshot = await adminDb
      .collection(COLLECTIONS.USERS)
      .where("role", "==", "admin")
      .where("is_active", "==", true)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return errorResponse("NO_ADMIN", "管理者アカウントが見つかりません", 404);
    }

    const adminUser = usersSnapshot.docs[0].data();
    const uid = adminUser.uid;

    // カスタムトークンを生成（Firebase Authが検証可能なトークン）
    const customToken = await adminAuth.createCustomToken(uid, {
      role: "admin",
      franchise_id: null,
    });

    return successResponse({ customToken });
  } catch (err) {
    console.error("管理者トークン生成エラー:", err);
    return errorResponse("INTERNAL_ERROR", "トークンの生成に失敗しました", 500);
  }
}
