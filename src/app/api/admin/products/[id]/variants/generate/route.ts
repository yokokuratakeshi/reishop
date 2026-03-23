// バリアント自動生成 API
// POST: 属性の組み合わせからバリアントを自動生成する

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const generateVariantsSchema = z.object({
  attributes: z.array(
    z.object({
      name: z.string(),
      options: z.array(z.string()),
    })
  ),
});

// 属性オプションの全組み合わせを生成する（直積）
function cartesianProduct(
  arrays: { name: string; options: string[] }[]
): Record<string, string>[] {
  if (arrays.length === 0) return [{}];

  return arrays.reduce(
    (acc: Record<string, string>[], { name, options }) => {
      const result: Record<string, string>[] = [];
      for (const existing of acc) {
        for (const option of options) {
          result.push({ ...existing, [name]: option });
        }
      }
      return result;
    },
    [{}]
  );
}

// SKUコードを生成（例: 白/M/背面ロゴ → "WHT-M-BACK"）
function generateSkuCode(productId: string, index: number): string {
  const shortId = productId.slice(0, 4).toUpperCase();
  const paddedIndex = String(index + 1).padStart(3, "0");
  return `${shortId}-${paddedIndex}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id: productId } = await params;
  try {
    const body = await request.json();
    const parsed = generateVariantsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    // 既存バリアントを削除してから再生成する
    const existingVariants = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(productId)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .get();

    const batch = adminDb.batch();
    existingVariants.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // 全属性の組み合わせを生成
    const combinations = cartesianProduct(parsed.data.attributes);

    // バリアントの生成が0件の場合（属性なし商品）は空配列で返す
    if (combinations.length === 0 || (combinations.length === 1 && Object.keys(combinations[0]).length === 0)) {
      // 属性なし商品のバリアント（1件のみ）
      const variantRef = adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .doc(productId)
        .collection(SUBCOLLECTIONS.VARIANTS)
        .doc();

      await variantRef.set({
        sku_code: generateSkuCode(productId, 0),
        attribute_values: {},
        is_active: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // has_variants を更新
      await adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId).update({
        has_variants: false,
        updated_at: FieldValue.serverTimestamp(),
      });

      return successResponse({ generated_count: 1, variants: [] }, 201);
    }

    // バリアントを一括作成
    const generatedVariants: { id: string; sku_code: string; attribute_values: Record<string, string> }[] = [];
    for (let i = 0; i < combinations.length; i++) {
      const combination = combinations[i];
      const variantRef = adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .doc(productId)
        .collection(SUBCOLLECTIONS.VARIANTS)
        .doc();

      const skuCode = generateSkuCode(productId, i);
      await variantRef.set({
        sku_code: skuCode,
        attribute_values: combination,
        is_active: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      generatedVariants.push({
        id: variantRef.id,
        sku_code: skuCode,
        attribute_values: combination,
      });
    }

    // has_variants を true に更新
    await adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId).update({
      has_variants: true,
      updated_at: FieldValue.serverTimestamp(),
    });

    return successResponse(
      { generated_count: generatedVariants.length, variants: generatedVariants },
      201
    );
  } catch (err) {
    console.error("バリアント生成エラー:", err);
    return errorResponse("INTERNAL_ERROR", "バリアント生成に失敗しました", 500);
  }
}
