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
    // 全注文を新しい順に取得
    const ordersSnapshot = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .orderBy("created_at", "desc")
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
      return {
        id: doc.id,
        ...data,
        total_amount: Number(data.total_amount || 0),
        franchise_name: franchiseMap[data.franchise_id] || "不明な加盟店",
        created_at: formatDateToISO(data.created_at || data.ordered_at),
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
      };
    });

    return successResponse(orders);
  } catch (err) {
    console.error("Orders fetch error:", err);
    return errorResponse("INTERNAL_ERROR", "注文一覧の取得に失敗しました", 500);
  }
}
