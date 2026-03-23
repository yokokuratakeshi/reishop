import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const orderImportRowSchema = z.object({
  order_number: z.string().min(1, "発注番号は必須です"),
  franchise_code: z.string().min(1, "店舗コードは必須です"),
  ordered_at: z.string().min(1, "発注日は必須です"),
  status: z.string().default("pending"),
  sku_code: z.string().min(1, "SKUコードは必須です"),
  quantity: z.coerce.number().min(1, "数量は1以上で入力してください"),
  wholesale_price: z.coerce.number().min(0, "卸単価は0以上で入力してください"),
});

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return errorResponse("BAD_REQUEST", "リクエストボディは配列形式である必要があります", 400);
    }

    // 1. マスタデータの準備 (加盟店とSKUの紐付け)
    const [franchisesSnap, variantsSnap, productsSnap, stagesSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.FRANCHISES).get(),
      adminDb.collectionGroup(SUBCOLLECTIONS.VARIANTS).get(),
      adminDb.collection(COLLECTIONS.PRODUCTS).get(),
      adminDb.collection(COLLECTIONS.STAGES).get(),
    ]);

    const franchiseMap = Object.fromEntries(
      franchisesSnap.docs.map(d => [d.data().franchise_code, { id: d.id, name: d.data().name, no: d.data().no, stage_id: d.data().stage_id }])
    );
    const productNameMap = Object.fromEntries(productsSnap.docs.map(d => [d.id, d.data().name]));
    const stageNameMap = Object.fromEntries(stagesSnap.docs.map(d => [d.id, d.data().name]));

    const skuMap: Record<string, any> = {};
    for (const vDoc of variantsSnap.docs) {
      const productId = vDoc.ref.parent.parent?.id;
      if (productId) {
        skuMap[vDoc.data().sku_code] = {
          productId,
          variantId: vDoc.id,
          productName: productNameMap[productId] || "不明",
          attribute_values: vDoc.data().attribute_values,
        };
      }
    }

    // 2. 発注番号でグループ化
    const orderGroups: Record<string, any[]> = {};
    body.forEach(row => {
      const num = row.order_number || "Unknown";
      if (!orderGroups[num]) orderGroups[num] = [];
      orderGroups[num].push(row);
    });

    let successCount = 0;
    const errors: string[] = [];

    for (const [orderNumber, items] of Object.entries(orderGroups)) {
      try {
        const proto = items[0];
        const franchise = franchiseMap[proto.franchise_code];
        if (!franchise) {
          errors.push(`${orderNumber}: 店舗コード ${proto.franchise_code} が見つかりません`);
          continue;
        }

        const orderedAt = new Date(proto.ordered_at);
        if (isNaN(orderedAt.getTime())) {
          errors.push(`${orderNumber}: 発注日の形式が不正です (${proto.ordered_at})`);
          continue;
        }

        // 受注ドキュメントの作成（既存チェックは簡易化のため新規作成またはマージ）
        const orderRef = adminDb.collection(COLLECTIONS.ORDERS).doc(); // ランダムIDだが、既にある場合は order_number で検索して更新も検討可能
        // 今回は order_number で既存を検索
        const existingOrderSnap = await adminDb.collection(COLLECTIONS.ORDERS).where("order_number", "==", orderNumber).limit(1).get();
        
        let targetOrderRef = orderRef;
        if (!existingOrderSnap.empty) {
          targetOrderRef = existingOrderSnap.docs[0].ref;
        }

        const now = FieldValue.serverTimestamp();
        let totalAmount = 0;
        let totalQuantity = 0;
        const processedItems = [];

        for (const itemRow of items) {
          const skuInfo = skuMap[itemRow.sku_code];
          if (!skuInfo) {
            throw new Error(`SKUコード ${itemRow.sku_code} が見つかりません`);
          }

          const qty = parseInt(itemRow.quantity);
          const price = parseFloat(itemRow.wholesale_price);
          const subtotal = qty * price;

          totalAmount += subtotal;
          totalQuantity += qty;

          processedItems.push({
            product_id: skuInfo.productId,
            product_name: skuInfo.productName,
            variant_id: skuInfo.variantId,
            sku_code: itemRow.sku_code,
            attribute_values: skuInfo.attribute_values,
            wholesale_price: price,
            quantity: qty,
            subtotal: subtotal,
          });
        }

        const orderData = {
          order_number: orderNumber,
          franchise_id: franchise.id,
          franchise_name: franchise.name,
          franchise_no: franchise.no,
          stage_id: franchise.stage_id,
          stage_name: stageNameMap[franchise.stage_id] || "不明",
          status: proto.status || "pending",
          total_amount: totalAmount,
          total_quantity: totalQuantity,
          item_count: processedItems.length,
          ordered_at: Timestamp.fromDate(orderedAt),
         updated_at: now,
         created_at: now,
       };

        if (!existingOrderSnap.empty) {
          delete (orderData as any).created_at; // 更新時は作成日を保持
        }

        await targetOrderRef.set(orderData, { merge: true });

        // 明細サブコレクションの更新（一旦削除して再登録するか、追加するか）
        // 簡易化のため一旦既存を全削除（移行用なのでそれほど多くない想定）
        const existingItems = await targetOrderRef.collection(SUBCOLLECTIONS.ITEMS).get();
        const itemBatch = adminDb.batch();
        existingItems.forEach(doc => itemBatch.delete(doc.ref));
        await itemBatch.commit();

        const newItemBatch = adminDb.batch();
        processedItems.forEach(item => {
          newItemBatch.set(targetOrderRef.collection(SUBCOLLECTIONS.ITEMS).doc(), item);
        });
        await newItemBatch.commit();

        successCount++;
      } catch (e: any) {
        errors.push(`${orderNumber}: ${e.message}`);
      }
    }

    return successResponse({
      successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    console.error("Order import error:", err);
    return errorResponse("INTERNAL_ERROR", `インポートに失敗しました: ${err.message}`, 500);
  }
}
