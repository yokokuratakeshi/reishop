// ステージ別価格設定 API
// PUT: バリアントの全ステージ別価格を一括設定

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const pricesSchema = z.object({
  prices: z.array(
    z.object({
      stage_id: z.string().min(1),
      stage_name: z.string().min(1),
      wholesale_price: z.number().min(0),
    })
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: productId, variantId } = await params;
  try {
    const body = await request.json();
    const parsed = pricesSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    const variantRef = adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(productId)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .doc(variantId);

    // 既存の価格を削除してから再登録（全件置き換え）
    const existingPrices = await variantRef.collection(SUBCOLLECTIONS.PRICES).get();
    const batch = adminDb.batch();
    existingPrices.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // 新しい価格を登録
    for (const price of parsed.data.prices) {
      await variantRef.collection(SUBCOLLECTIONS.PRICES).add({
        ...price,
        is_active: true,
        created_at: FieldValue.serverTimestamp(),
      });
    }

    return successResponse({ updated_count: parsed.data.prices.length });
  } catch (err) {
    console.error("価格設定エラー:", err);
    return errorResponse("INTERNAL_ERROR", "価格設定に失敗しました", 500);
  }
}
