import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireFranchise, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * ログイン中の加盟店自体のプロフィール情報を取得する
 */
export async function GET(request: NextRequest) {
  const { error, user } = await requireFranchise(request);
  if (error) return error;
  if (!user.franchiseId) {
    return errorResponse("NOT_FOUND", "店舗情報が見つかりません", 404);
  }

  try {
    const doc = await adminDb.collection(COLLECTIONS.FRANCHISES).doc(user.franchiseId).get();
    
    if (!doc.exists) {
      return errorResponse("NOT_FOUND", "店舗データが存在しません", 404);
    }

    return successResponse({
      id: doc.id,
      ...doc.data()
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    return errorResponse("INTERNAL_ERROR", "プロフィールの取得に失敗しました", 500);
  }
}
