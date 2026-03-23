// 商品個別操作 API および属性・バリアント管理 API
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
  product_type: z.enum(["apparel", "accessory", "non_apparel"]).optional(),
  retail_price: z.number().min(0).nullable().optional(),
  retail_price_tax_incl: z.number().min(0).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

// 商品詳細取得（属性・バリアント・価格を含む）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { id } = await params;
  try {
    const productDoc = await adminDb.collection(COLLECTIONS.PRODUCTS).doc(id).get();
    if (!productDoc.exists) {
      return errorResponse("NOT_FOUND", "商品が見つかりません", 404);
    }

    // 属性グループを取得
    const attributesSnapshot = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(id)
      .collection(SUBCOLLECTIONS.ATTRIBUTES)
      .orderBy("sort_order", "asc")
      .get();

    const attributes = await Promise.all(
      attributesSnapshot.docs.map(async (attrDoc) => {
        // 各属性のオプションを取得
        const optionsSnapshot = await attrDoc.ref
          .collection(SUBCOLLECTIONS.OPTIONS)
          .orderBy("sort_order", "asc")
          .get();
        const options = optionsSnapshot.docs.map((optDoc) => ({
          id: optDoc.id,
          ...optDoc.data(),
        }));
        return { id: attrDoc.id, ...attrDoc.data(), options };
      })
    );

    // バリアントを取得
    const variantsSnapshot = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(id)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .get();

    const variants = await Promise.all(
      variantsSnapshot.docs.map(async (varDoc) => {
        // 各バリアントのステージ別価格を取得
        const pricesSnapshot = await varDoc.ref
          .collection(SUBCOLLECTIONS.PRICES)
          .get();
        const prices = pricesSnapshot.docs.map((priceDoc) => ({
          id: priceDoc.id,
          ...priceDoc.data(),
        }));
        return { id: varDoc.id, ...varDoc.data(), prices };
      })
    );

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
