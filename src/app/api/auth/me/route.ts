// ログイン中のユーザー情報を取得する API

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuthToken, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const user = await verifyAuthToken(request);
  if (!user) {
    return errorResponse("UNAUTHORIZED", "認証が必要です", 401);
  }

  try {
    // ユーザー基本情報の取得（Firestore の users コレクション）
    const userDoc = await adminDb.collection(COLLECTIONS.USERS).doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : { role: user.role };

    let franchiseData = null;
    if (user.franchiseId) {
      const franchiseDoc = await adminDb.collection(COLLECTIONS.FRANCHISES).doc(user.franchiseId).get();
      if (franchiseDoc.exists) {
        franchiseData = { id: franchiseDoc.id, ...franchiseDoc.data() };
      }
    }

    return successResponse({
      uid: user.uid,
      role: user.role,
      user_data: userData,
      franchise: franchiseData,
    });
  } catch (err) {
    console.error("ユーザー情報取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "情報の取得に失敗しました", 500);
  }
}
