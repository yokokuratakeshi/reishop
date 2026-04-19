// バリアント更新 API
// PATCH: SKUコード・有効/無効を更新

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const updateSchema = z.object({
  sku_code: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  retail_price: z.number().min(0).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { id: productId, variantId } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "不正なデータです", 422);
    }

    const variantRef = adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(productId)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .doc(variantId);

    const variantDoc = await variantRef.get();
    if (!variantDoc.exists) {
      return errorResponse("NOT_FOUND", "バリアントが見つかりません", 404);
    }

    const updateData: Record<string, unknown> = {
      updated_at: FieldValue.serverTimestamp(),
    };

    if (parsed.data.sku_code !== undefined) {
      updateData.sku_code = parsed.data.sku_code;
    }
    if (parsed.data.is_active !== undefined) {
      updateData.is_active = parsed.data.is_active;
    }
    if (parsed.data.retail_price !== undefined) {
      updateData.retail_price = parsed.data.retail_price;
    }

    await variantRef.update(updateData);

    return successResponse({ id: variantId, ...updateData });
  } catch (err) {
    console.error("バリアント更新エラー:", err);
    return errorResponse("INTERNAL_ERROR", "バリアントの更新に失敗しました", 500);
  }
}
