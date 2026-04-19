// バリアント自動生成 API（追加モード対応）
// POST: 属性の組み合わせからバリアントを自動生成する
// 既存バリアントは保持し、新しい組み合わせのみ追加する

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

// SKUコードを生成
function generateSkuCode(productId: string, index: number): string {
  const shortId = productId.slice(0, 4).toUpperCase();
  const paddedIndex = String(index + 1).padStart(3, "0");
  return `${shortId}-${paddedIndex}`;
}

// attribute_valuesを比較用キーに変換（例: {"カラー":"白","サイズ":"M"} → "カラー:白|サイズ:M"）
function attributeValuesToKey(values: Record<string, string>): string {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
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

    // 商品全体の retail_price を取得し、新規バリアントのデフォルト販売定価として使う
    const productSnap = await adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId).get();
    const defaultRetailPrice = (productSnap.data()?.retail_price as number | null | undefined) ?? null;

    // 既存バリアントを取得（削除しない）
    const existingVariants = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(productId)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .get();

    // 既存バリアントの属性組み合わせをSetで管理
    const existingKeys = new Set<string>();
    existingVariants.docs.forEach((doc) => {
      const data = doc.data();
      if (data.attribute_values) {
        existingKeys.add(attributeValuesToKey(data.attribute_values));
      }
    });

    // 全属性の組み合わせを生成
    const combinations = cartesianProduct(parsed.data.attributes);

    // 属性なし商品の場合
    if (combinations.length === 0 || (combinations.length === 1 && Object.keys(combinations[0]).length === 0)) {
      if (existingVariants.empty) {
        // 既存がなければ1件作成
        const variantRef = adminDb
          .collection(COLLECTIONS.PRODUCTS)
          .doc(productId)
          .collection(SUBCOLLECTIONS.VARIANTS)
          .doc();

        await variantRef.set({
          sku_code: generateSkuCode(productId, 0),
          attribute_values: {},
          is_active: true,
          sort_order: 0,
          retail_price: defaultRetailPrice,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });

        await adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId).update({
          has_variants: false,
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      return successResponse({ generated_count: 0, added_count: 0, variants: [] }, 201);
    }

    // 新しい組み合わせのみをフィルタリング
    const newCombinations = combinations.filter(
      (combo) => !existingKeys.has(attributeValuesToKey(combo))
    );

    // SKUのインデックスは既存数から続きの番号を使う
    const startIndex = existingVariants.size;

    // 新しいバリアントのみ追加
    const generatedVariants: { id: string; sku_code: string; attribute_values: Record<string, string> }[] = [];
    for (let i = 0; i < newCombinations.length; i++) {
      const combination = newCombinations[i];
      const variantRef = adminDb
        .collection(COLLECTIONS.PRODUCTS)
        .doc(productId)
        .collection(SUBCOLLECTIONS.VARIANTS)
        .doc();

      const skuCode = generateSkuCode(productId, startIndex + i);
      await variantRef.set({
        sku_code: skuCode,
        attribute_values: combination,
        is_active: true,
        sort_order: startIndex + i,
        retail_price: defaultRetailPrice,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      generatedVariants.push({
        id: variantRef.id,
        sku_code: skuCode,
        attribute_values: combination,
      });
    }

    // has_variants を更新
    const totalVariants = existingVariants.size + newCombinations.length;
    await adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId).update({
      has_variants: totalVariants > 1,
      updated_at: FieldValue.serverTimestamp(),
    });

    return successResponse(
      {
        generated_count: combinations.length,
        added_count: newCombinations.length,
        skipped_count: combinations.length - newCombinations.length,
        variants: generatedVariants,
      },
      201
    );
  } catch (err) {
    console.error("バリアント生成エラー:", err);
    return errorResponse("INTERNAL_ERROR", "バリアント生成に失敗しました", 500);
  }
}
