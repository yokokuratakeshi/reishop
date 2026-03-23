// 発注確定 API
// 加盟店からの発注データを受け取り、Firestore に保存する

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireFranchise, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS, ORDER_STATUS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const orderItemSchema = z.object({
  product_id: z.string(),
  product_name: z.string(),
  variant_id: z.string(),
  sku_code: z.string(),
  attribute_values: z.record(z.string(), z.string()),
  wholesale_price: z.number(),
  quantity: z.number().min(1),
});

const orderSchema = z.object({
  items: z.array(orderItemSchema),
  total_amount: z.number(),
  item_count: z.number(),
  total_quantity: z.number(),
  note: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  // 加盟店権限チェック
  const { user, error } = await requireFranchise(request);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const { items, total_amount, item_count, total_quantity, note } = parsed.data;

    // 加盟店情報の取得
    const franchiseDoc = await adminDb
      .collection(COLLECTIONS.FRANCHISES)
      .doc(user.franchiseId!)
      .get();

    if (!franchiseDoc.exists) {
      return errorResponse("NOT_FOUND", "加盟店情報が見つかりません", 404);
    }

    const fData = franchiseDoc.data()!;
    const now = FieldValue.serverTimestamp();

    // 注文番号の生成 (ORD-YYYY-MM-DD-Random)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const order_number = `ORD-${today}-${random}`;

    // トランザクションで保存
    const orderId = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection(COLLECTIONS.ORDERS).doc();
      
      const orderData = {
        order_number,
        franchise_id: user.franchiseId,
        franchise_name: fData.name,
        franchise_no: fData.no || 0,
        stage_id: fData.stage_id,
        stage_name: fData.stage_name,
        status: ORDER_STATUS.PENDING,
        total_amount,
        item_count,
        total_quantity,
        note: note || "",
        ordered_at: now,
        updated_at: now,
      };

      transaction.set(orderRef, orderData);

      // 明細の追加
      for (const item of items) {
        const itemRef = orderRef.collection(SUBCOLLECTIONS.ITEMS).doc();
        transaction.set(itemRef, {
          ...item,
          subtotal: item.wholesale_price * item.quantity,
          created_at: now,
        });
      }

      return orderRef.id;
    });

    return successResponse({ id: orderId, order_number }, 201);
  } catch (err) {
    console.error("発注確定エラー:", err);
    return errorResponse("INTERNAL_ERROR", "発注処理に失敗しました", 500);
  }
}
