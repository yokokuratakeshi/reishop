import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, ORDER_STATUS, INVOICE_STATUS, DEFAULT_TAX_RATE, SUBCOLLECTIONS } from "@/lib/constants";
import { requireAdmin, successResponse } from "@/lib/utils/api";
import { z } from "zod";

const generateSchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM 形式で指定してください"),
});

/**
 * 請求書一括生成 API
 * 指定した月の完了済み受注を集計し、加盟店ごとの請求書を作成する
 */
export async function POST(req: NextRequest) {
  try {
    // 管理者権限チェック
    const { error } = await requireAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { yearMonth } = generateSchema.parse(body);

    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 1. 指定期間の完了済み受注を取得
    // 複合インデックスエラーを避けるため、status のみで取得し日付はメモリでフィルタリング
    const ordersRes = await adminDb.collection(COLLECTIONS.ORDERS)
      .where("status", "==", ORDER_STATUS.COMPLETED)
      .get();

    const allCompletedOrders = ordersRes.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    const ordersInPeriod = allCompletedOrders.filter((order: any) => {
      const orderDate = order.created_at?.toDate?.() || new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });

    if (ordersInPeriod.length === 0) {
      return successResponse({
        success: true,
        message: `${yearMonth} の完了済み受注が見つかりませんでした。`,
        count: 0
      });
    }

    console.log(`[GenerateInvoice] Found ${allCompletedOrders.length} completed orders total.`);
    console.log(`[GenerateInvoice] Range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    console.log(`[GenerateInvoice] Orders in period: ${ordersInPeriod.length}`);

    // 2. 加盟店ごとに受注をグループ化
    const franchiseOrders: Record<string, any[]> = {};
    ordersInPeriod.forEach(order => {
      const franchiseId = order.franchise_id;
      if (!franchiseOrders[franchiseId]) {
        franchiseOrders[franchiseId] = [];
      }
      franchiseOrders[franchiseId].push(order);
    });

    let generatedCount = 0;
    const batchSize = 500;
    let batch = adminDb.batch();
    let currentBatchOpCount = 0;

    // 3. 請求書の作成
    for (const franchiseId in franchiseOrders) {
      // 既にその月の請求書が存在するかチェック
      const existingInvoices = await adminDb.collection(COLLECTIONS.INVOICES)
        .where("franchise_id", "==", franchiseId)
        .where("year_month", "==", yearMonth)
        .limit(1)
        .get();

      if (!existingInvoices.empty) continue;

      const orders = franchiseOrders[franchiseId];
      const franchiseName = orders[0].franchise_name || `店舗(${franchiseId})`;

      const subtotal = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const tax = Math.floor(subtotal * DEFAULT_TAX_RATE);
      const total = subtotal + tax;

      console.log(`[GenerateInvoice] Creating invoice for ${franchiseName} (${franchiseId}): ${orders.length} orders`);

      const invoiceRef = adminDb.collection(COLLECTIONS.INVOICES).doc();
      const invoiceData = {
        franchise_id: franchiseId,
        franchise_name: franchiseName,
        year_month: yearMonth,
        subtotal_amount: subtotal,
        tax_amount: tax,
        total_amount: total,
        status: INVOICE_STATUS.DRAFT,
        due_date: new Date(year, month, 25), // 翌月25日をデフォルト期限とする
        created_at: new Date(),
        updated_at: new Date(),
      };

      batch.set(invoiceRef, invoiceData);
      currentBatchOpCount++;

      // 4. 請求明細（受注との紐付け）の作成
      for (const order of orders) {
        const itemRef = invoiceRef.collection(SUBCOLLECTIONS.ITEMS).doc();
        batch.set(itemRef, {
          order_id: order.id,
          order_number: order.order_number,
          amount: order.total_amount,
          ordered_at: order.created_at,
        });
        currentBatchOpCount++;

        if (currentBatchOpCount >= batchSize - 10) {
          await batch.commit();
          batch = adminDb.batch();
          currentBatchOpCount = 0;
        }
      }

      generatedCount++;

      if (currentBatchOpCount >= batchSize - 10) {
        await batch.commit();
        batch = adminDb.batch();
        currentBatchOpCount = 0;
      }
    }

    if (currentBatchOpCount > 0) {
      await batch.commit();
    }

    return successResponse({
      success: true,
      message: `${generatedCount} 件の請求書を生成しました。`,
      count: generatedCount
    });

  } catch (error) {
    console.error("Invoice generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "請求書の生成に失敗しました。" }, { status: 500 });
  }
}
