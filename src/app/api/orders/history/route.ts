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
    // インデックス不足エラーを回避するため、まずはフィルタリングのみを行い、
    // 並び替えはメモリ上（JavaScript）で行う
    const ordersSnapshot = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .where("franchise_id", "==", user.franchiseId)
      .get();

    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // created_at が欠落している、あるいは Timestamp 型でない場合のフォールバック
        created_at: data.created_at || null
      };
    });

    // メモリ上で降順（新しい順）に並べ替え
    orders.sort((a, b) => {
      const dateA = a.created_at?.toDate ? a.created_at.toDate().getTime() : (a.created_at instanceof Date ? a.created_at.getTime() : 0);
      const dateB = b.created_at?.toDate ? b.created_at.toDate().getTime() : (b.created_at instanceof Date ? b.created_at.getTime() : 0);
      return dateB - dateA;
    });

    return successResponse(orders);
  } catch (err) {
    console.error("発注履歴取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "履歴の取得に失敗しました", 500);
  }
}
