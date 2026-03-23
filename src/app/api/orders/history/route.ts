// 加盟店別発注履歴取得 API

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireFranchise, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  // 加盟店権限チェック
  const { user, error } = await requireFranchise(request);
  if (error) return error;

  try {
    const ordersSnapshot = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .where("franchise_id", "==", user.franchiseId)
      .orderBy("ordered_at", "desc")
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return successResponse(orders);
  } catch (err) {
    console.error("発注履歴取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "履歴の取得に失敗しました", 500);
  }
}
