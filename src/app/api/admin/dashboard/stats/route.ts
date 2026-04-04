// 管理者ダッシュボード統計 API（パフォーマンス最適化版）
// カウントクエリとリミット付きクエリで必要最小限のデータを取得

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    // 直近6ヶ月の起点を計算
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // === 最適化: 5つのクエリを並列実行 ===
    const [
      franchisesSnap,
      productsSnap,
      recentOrdersSnap,
      ordersForStatsSnap,
      allOrdersSnap,
    ] = await Promise.all([
      // 加盟店カウント（軽量：ドキュメントIDのみ）
      adminDb.collection(COLLECTIONS.FRANCHISES).select().get(),
      // 商品カウント（軽量：ドキュメントIDのみ）
      adminDb.collection(COLLECTIONS.PRODUCTS).select().get(),
      // 直近の注文5件（表示用）
      adminDb.collection(COLLECTIONS.ORDERS).orderBy("created_at", "desc").limit(5).get(),
      // 直近6ヶ月の注文（統計用）
      adminDb.collection(COLLECTIONS.ORDERS)
        .where("created_at", ">=", sixMonthsAgo)
        .get(),
      // 全注文のカウントと合計用（軽量フィールドのみ）
      adminDb.collection(COLLECTIONS.ORDERS)
        .select("status", "total_amount")
        .get(),
    ]);

    // 全体統計（軽量データから計算）
    let totalSales = 0;
    let pendingOrders = 0;
    allOrdersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === "pending") pendingOrders++;
      if (data.status !== "cancelled") {
        totalSales += data.total_amount || 0;
      }
    });

    // 月別・カテゴリ別集計（直近6ヶ月分のみ）
    const monthlyMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};

    // 直近6ヶ月のキーを初期化
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }

    ordersForStatsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === "cancelled") return;

      // 日付の取得（created_at または ordered_at）
      const dateValue = data.created_at || data.ordered_at;
      const createdAt = dateValue?.toDate?.() || new Date(dateValue);
      
      if (isNaN(createdAt.getTime())) return;

      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
      const amount = Number(data.total_amount || 0);

      if (monthlyMap[monthKey] !== undefined) {
        monthlyMap[monthKey] += amount;
      }

      // カテゴリ名（ドキュメントに記録されている場合はそれを使用、なければ「その他」）
      // 注意: 現在のデータ構造では明細サブコレクションにあるため、
      // 注文時に代表カテゴリを記録する運用が望ましい。
      const categoryName = data.main_category_name || data.items?.[0]?.category_name || "その他";
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + amount;
    });

    const salesByMonth = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));

    const salesByCategory = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // 加盟店名マップ（直近注文表示用）
    const franchiseIds = [...new Set(recentOrdersSnap.docs.map((d) => d.data().franchise_id).filter(Boolean))];
    let franchiseMap: Record<string, string> = {};
    if (franchiseIds.length > 0) {
      // Firestoreのin句は最大30件なのでスライス
      const franchiseSnap = await adminDb
        .collection(COLLECTIONS.FRANCHISES)
        .where("__name__", "in", franchiseIds.slice(0, 30))
        .get();
      franchiseSnap.forEach((doc) => {
        franchiseMap[doc.id] = doc.data().name;
      });
    }

    const recentOrders = recentOrdersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        order_number: data.order_number,
        franchise_name: franchiseMap[data.franchise_id] || "不明",
        status: data.status,
        total_amount: data.total_amount,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
      };
    });

    return successResponse({
      stats: {
        totalOrders: allOrdersSnap.size,
        totalFranchises: franchisesSnap.size,
        totalProducts: productsSnap.size,
        totalSales,
        pendingOrders,
        salesByMonth,
        salesByCategory,
      },
      recentOrders,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return errorResponse("INTERNAL_ERROR", "ダッシュボード統計の取得に失敗しました", 500);
  }
}
