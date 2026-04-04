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
      // 日時のパースを極めて堅牢にする
      let rawDate = data.ordered_at || data.created_at || null;
      let timestamp = 0;
      
      if (rawDate) {
        if (typeof rawDate.toDate === 'function') {
          timestamp = rawDate.toDate().getTime();
        } else if (rawDate instanceof Date) {
          timestamp = rawDate.getTime();
        } else if (rawDate.seconds) { // 純粋なJSONオブジェクト（Firestore Timestampのシリアライズ後）
          timestamp = rawDate.seconds * 1000;
        } else if (typeof rawDate === 'string') {
          timestamp = new Date(rawDate).getTime();
        }
      }

      return {
        id: doc.id,
        ...data,
        _sort_timestamp: timestamp // ソート用の内部値
      };
    });

    // メモリ上で降順（新しい順）に並べ替え
    orders.sort((a, b) => b._sort_timestamp - a._sort_timestamp);

    return successResponse(orders);
  } catch (err) {
    console.error("発注履歴取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "履歴の取得に失敗しました", 500);
  }
}
