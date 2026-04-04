// 全加盟店の注文一覧取得 API (Admin)
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse, formatDateToISO } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";
import { Order } from "@/types";

export async function GET(request: NextRequest) {
  // 管理者権限チェック
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    // インデックス不足エラーを回避するため、まずはフィルタリングのみを行い、
    // 並び替えはメモリ上（JavaScript）で行う
    const ordersSnapshot = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .get();

    // 加盟店情報を一括でキャッシュ（パフォーマンス向上のため）
    const franchiseIds = Array.from(new Set(ordersSnapshot.docs.map(doc => doc.data().franchise_id)));
    const franchiseMap: Record<string, string> = {};
    
    if (franchiseIds.length > 0) {
      const franchisesSnapshot = await adminDb
        .collection(COLLECTIONS.FRANCHISES)
        .where("__name__", "in", franchiseIds)
        .get();
      
      franchisesSnapshot.forEach(doc => {
        franchiseMap[doc.id] = doc.data().name;
      });
    }

    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // 日時のパースを極めて堅牢にする
      let timestamp = 0;
      const rawDate = data.ordered_at || data.created_at || null;
      if (rawDate) {
        if (typeof rawDate.toDate === 'function') {
          timestamp = rawDate.toDate().getTime();
        } else if (rawDate instanceof Date) {
          timestamp = rawDate.getTime();
        } else if (rawDate.seconds) {
          timestamp = rawDate.seconds * 1000;
        } else if (typeof rawDate === 'string') {
          timestamp = new Date(rawDate).getTime();
        }
      }

      return {
        id: doc.id,
        ...data,
        total_amount: Number(data.total_amount || 0),
        franchise_name: franchiseMap[data.franchise_id] || "不明な加盟店",
        created_at: formatDateToISO(data.created_at || data.ordered_at),
        updated_at: formatDateToISO(data.updated_at),
        _sort_timestamp: timestamp
      };
    });

    // メモリ上で降順（新しい順）に並べ替え
    orders.sort((a, b) => b._sort_timestamp - a._sort_timestamp);

    return successResponse(orders);
  } catch (err) {
    console.error("Orders fetch error:", err);
    return errorResponse("INTERNAL_ERROR", "注文一覧の取得に失敗しました", 500);
  }
}
