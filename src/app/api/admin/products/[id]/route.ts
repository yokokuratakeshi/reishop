// 商品個別操作 API（パフォーマンス最適化版）
// GET: 詳細取得（属性・バリアント・価格含む） / PUT: 編集 / DELETE: 論理削除

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const updateProductSchema = z.object({
  category_id: z.string().optional(),
  category_name: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  image_url: z.string().nullable().optional(),
  retail_price: z.number().min(0).nullable().optional(),
  retail_price_tax_incl: z.number().min(0).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// 商品詳細取得（属性・バリアント・価格を含む）- 最適化版
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  try {
    const productRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc(id);

    // === 最適化: 商品・属性・バリアントを並列取得 ===
    const [productDoc, attributesSnapshot, variantsSnapshot] = await Promise.all([
      productRef.get(),
      productRef.collection(SUBCOLLECTIONS.ATTRIBUTES).orderBy("sort_order", "asc").get(),
      productRef.collection(SUBCOLLECTIONS.VARIANTS).get(),
    ]);

    if (!productDoc.exists) {
      return errorResponse("NOT_FOUND", "商品が見つかりません", 404);
    }

    // === 最適化: オプションと価格を並列で一括取得 ===
    const optionPromises = attributesSnapshot.docs.map((attrDoc) =>
      attrDoc.ref.collection(SUBCOLLECTIONS.OPTIONS).orderBy("sort_order", "asc").get()
    );
    const pricePromises = variantsSnapshot.docs.map((varDoc) =>
      varDoc.ref.collection(SUBCOLLECTIONS.PRICES).get()
    );

    // 全サブコレクションを一括並列取得
    const [optionResults, priceResults] = await Promise.all([
      Promise.all(optionPromises),
      Promise.all(pricePromises),
    ]);

    // 属性 + オプションを結合
    const attributes = attributesSnapshot.docs.map((attrDoc, idx) => ({
      id: attrDoc.id,
      ...attrDoc.data(),
      options: optionResults[idx].docs.map((optDoc) => ({
        id: optDoc.id,
        ...optDoc.data(),
      })),
    }));

    // バリアント + 価格を結合
    // sort_order が未設定のバリアント（既存データ）は末尾に並ぶよう大きな値をフォールバック
    const variants = variantsSnapshot.docs
      .map((varDoc, idx) => ({
        id: varDoc.id,
        ...varDoc.data(),
        prices: priceResults[idx].docs.map((priceDoc) => ({
          id: priceDoc.id,
          ...priceDoc.data(),
        })),
      }))
      .sort((a, b) => {
        const aRec = a as unknown as { sort_order?: number };
        const bRec = b as unknown as { sort_order?: number };
        const aOrder = typeof aRec.sort_order === "number" ? aRec.sort_order : Number.MAX_SAFE_INTEGER;
        const bOrder = typeof bRec.sort_order === "number" ? bRec.sort_order : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });

    return successResponse({
      id: productDoc.id,
      ...productDoc.data(),
      attributes,
      variants,
    });
  } catch (err) {
    console.error("商品詳細取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "データの取得に失敗しました", 500);
  }
}

// 商品情報の更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", parsed.error.message, 422);
    }

    await adminDb.collection(COLLECTIONS.PRODUCTS).doc(id).update({
      ...parsed.data,
      updated_at: FieldValue.serverTimestamp(),
    });

    return successResponse({ id, ...parsed.data });
  } catch (err) {
    console.error("商品更新エラー:", err);
    return errorResponse("INTERNAL_ERROR", "更新に失敗しました", 500);
  }
}

// 商品の論理削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  try {
    await adminDb.collection(COLLECTIONS.PRODUCTS).doc(id).update({
      is_active: false,
      updated_at: FieldValue.serverTimestamp(),
    });
    return successResponse({ id, deleted: true });
  } catch (err) {
    console.error("商品削除エラー:", err);
    return errorResponse("INTERNAL_ERROR", "削除に失敗しました", 500);
  }
}
