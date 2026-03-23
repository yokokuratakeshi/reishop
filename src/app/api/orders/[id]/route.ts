// 加盟店別発注詳細取得 API

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireFranchise, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 加盟店権限チェック
  const { user, error } = await requireFranchise(request);
  if (error) return error;

  try {
    const { id } = await params;

    // 注文本体の取得
    const orderDoc = await adminDb.collection(COLLECTIONS.ORDERS).doc(id).get();

    if (!orderDoc.exists) {
      return errorResponse("NOT_FOUND", "注文が見つかりません", 404);
    }

    const orderData = orderDoc.data()!;

    // 権限チェック（自分の店舗の注文か）
    if (orderData.franchise_id !== user.franchiseId) {
      return errorResponse("FORBIDDEN", "権限がありません", 403);
    }

    // 明細の取得
    const itemsSnapshot = await orderDoc.ref
      .collection(SUBCOLLECTIONS.ITEMS)
      .get();

    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return successResponse({
      id,
      ...orderData,
      items
    });
  } catch (err) {
    console.error("発注詳細取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "情報の取得に失敗しました", 500);
  }
}
