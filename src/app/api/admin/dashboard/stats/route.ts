// 管理者ダッシュボード統計 API
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  // 管理者権限チェック
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    // 1. 各種カウント取得
    const [ordersSnap, franchisesSnap, productsSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.ORDERS).get(),
      adminDb.collection(COLLECTIONS.FRANCHISES).get(),
      adminDb.collection(COLLECTIONS.PRODUCTS).get(),
    ]);

    const totalOrders = ordersSnap.size;
    const totalFranchises = franchisesSnap.size;
    const totalProducts = productsSnap.size;

    // 2. 詳細分析用データ
    let totalSales = 0;
    let pendingOrders = 0;
    const monthlyMap: Record<string, number> = {};
    const categoryMap: Record<string, number> = {};

    // 直近6ヶ月のキーを初期化（データがなくても0を表示するため）
    const nowObj = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowObj.getFullYear(), nowObj.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }
    
    ordersSnap.forEach(doc => {
      const data = doc.data();
      const createdAt = data.created_at?.toDate?.() || new Date(data.created_at);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;

      if (data.status === "pending") pendingOrders++;
      
      if (data.status !== "cancelled") {
        const amount = data.total_amount || 0;
        totalSales += amount;

        // 月別集計
        if (monthlyMap[monthKey] !== undefined) {
          monthlyMap[monthKey] += amount;
        }

        // カテゴリ別集計（注文アイテムから集計）
        // ※ 簡易化のため、注文データの最初の商品カテゴリを使用するか、
        // 本来は order_items を全スキャンすべきだが、ここでは代表値として処理
        const categoryName = data.items?.[0]?.category_name || "その他";
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + amount;
      }
    });

    const salesByMonth = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));

    const salesByCategory = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 3. 直近の注文（5件）
    const recentOrdersSnap = await adminDb
      .collection(COLLECTIONS.ORDERS)
      .orderBy("created_at", "desc")
      .limit(5)
      .get();

    // 加盟店名を紐付け
    const franchiseMap: Record<string, string> = {};
    franchisesSnap.forEach(doc => {
      franchiseMap[doc.id] = doc.data().name;
    });

    const recentOrders = recentOrdersSnap.docs.map(doc => {
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
        totalOrders,
        totalFranchises,
        totalProducts,
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
