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

    let successCount = 0;
    const errors: string[] = [];

    // ヘッダーのマッピング定義
    const mappings: Record<string, string> = {
      "発注番号": "order_number",
      "注文番号": "order_number",
      "受注番号": "order_number",
      "店舗コード": "franchise_code",
      "加盟店コード": "franchise_code",
      "No": "franchise_code",
      "発注日": "ordered_at",
      "注文日": "ordered_at",
      "日付": "ordered_at",
      "SKUコード": "sku_code",
      "SKU": "sku_code",
      "商品コード": "sku_code",
      "数量": "quantity",
      "個数": "quantity",
      "単価": "wholesale_price",
      "卸単価": "wholesale_price",
      "ステータス": "status"
    };

    // グループ化の前に各行をマッピング
    const mappedBody = body.map((row, index) => {
      const mappedRow: any = { ...row };
      Object.entries(mappings).forEach(([jp, en]) => {
        if (row[jp] !== undefined && row[en] === undefined) {
          mappedRow[en] = row[jp];
        }
      });
      return mappedRow;
    });

    // 2. 発注番号でグループ化
    const orderGroups: Record<string, any[]> = {};
    mappedBody.forEach(row => {
      const num = row.order_number || "Unknown";
      if (!orderGroups[num]) orderGroups[num] = [];
      orderGroups[num].push(row);
    });

    for (const [orderNumber, rowItems] of Object.entries(orderGroups)) {
      try {
        const protoRaw = rowItems[0];
        const parsed = orderImportRowSchema.safeParse(protoRaw);
        
        if (!parsed.success) {
          throw new Error(`データの形式が正しくありません: ${parsed.error.issues.map(i => i.message).join(", ")}`);
        }
        
        const proto = parsed.data;
        const franchise = franchiseMap[proto.franchise_code];
        if (!franchise) {
          throw new Error(`店舗コード "${proto.franchise_code}" が登録されていません。先に店舗データをインポートしてください。`);
        }

        const orderedAt = new Date(proto.ordered_at);
        if (isNaN(orderedAt.getTime())) {
          throw new Error(`発注日の形式が不正です (${proto.ordered_at})`);
        }

        // 受注ドキュメントの検索と作成
        const existingOrderSnap = await adminDb.collection(COLLECTIONS.ORDERS).where("order_number", "==", orderNumber).limit(1).get();
        let targetOrderRef = adminDb.collection(COLLECTIONS.ORDERS).doc();
        
        if (!existingOrderSnap.empty) {
          targetOrderRef = existingOrderSnap.docs[0].ref;
        }

        const now = FieldValue.serverTimestamp();
        let totalAmount = 0;
        let totalQuantity = 0;
        const processedItems = [];

        for (const itemRow of rowItems) {
          const skuInfo = skuMap[itemRow.sku_code];
          if (!skuInfo) {
            throw new Error(`SKUコード "${itemRow.sku_code}" が商品マスタに見つかりません`);
          }

          const qty = Number(itemRow.quantity);
          const price = Number(itemRow.wholesale_price);
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
          franchise_no: franchise.no || null,
          stage_id: franchise.stage_id,
          stage_name: stageNameMap[franchise.stage_id] || "不明",
          status: proto.status || "pending",
          total_amount: totalAmount,
          total_quantity: totalQuantity,
          item_count: processedItems.length,
          main_category_name: rowItems[0]?.category_name || processedItems[0]?.product_name || "その他",
          ordered_at: Timestamp.fromDate(orderedAt),
          updated_at: now,
          created_at: now,
        };

        if (!existingOrderSnap.empty) {
          delete (orderData as any).created_at;
        }

        await targetOrderRef.set(orderData, { merge: true });

        // 明細の一旦削除と再登録
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
      errors: errors.slice(0, 20),
    });
  } catch (err: any) {
    console.error("Order import error:", err);
    return errorResponse("INTERNAL_ERROR", `インポートに失敗しました: ${err.message}`, 500);
  }
}
