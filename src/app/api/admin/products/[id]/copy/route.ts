// 商品コピーAPI
// POST: 指定商品のデータ（属性・バリアント・価格）を複製して新商品を作成する

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAdmin(request);
  if (error) return error;

  const { id: sourceId } = await params;

  try {
    // 1. コピー元商品の取得
    const sourceDoc = await adminDb.collection(COLLECTIONS.PRODUCTS).doc(sourceId).get();
    if (!sourceDoc.exists) {
      return errorResponse("NOT_FOUND", "コピー元の商品が見つかりません", 404);
    }

    const sourceData = sourceDoc.data()!;

    // 2. 新商品ドキュメントを作成（名前に「のコピー」を付加）
    const newProductRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc();
    const newProductData = {
      ...sourceData,
      name: `${sourceData.name}（コピー）`,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    await newProductRef.set(newProductData);

    // 3. 属性のコピー
    const attributesSnapshot = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(sourceId)
      .collection(SUBCOLLECTIONS.ATTRIBUTES)
      .get();

    for (const attrDoc of attributesSnapshot.docs) {
      const attrData = attrDoc.data();
      const newAttrRef = newProductRef.collection(SUBCOLLECTIONS.ATTRIBUTES).doc(attrDoc.id);
      await newAttrRef.set({
        ...attrData,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // 属性オプションのコピー
      const optionsSnapshot = await attrDoc.ref.collection(SUBCOLLECTIONS.OPTIONS).get();
      for (const optDoc of optionsSnapshot.docs) {
        await newAttrRef.collection(SUBCOLLECTIONS.OPTIONS).doc(optDoc.id).set({
          ...optDoc.data(),
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    }

    // 4. バリアントと価格のコピー
    const variantsSnapshot = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(sourceId)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .get();

    for (const variantDoc of variantsSnapshot.docs) {
      const variantData = variantDoc.data();
      const newVariantRef = newProductRef.collection(SUBCOLLECTIONS.VARIANTS).doc(variantDoc.id);
      await newVariantRef.set({
        ...variantData,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      // 価格のコピー
      const pricesSnapshot = await variantDoc.ref.collection(SUBCOLLECTIONS.PRICES).get();
      for (const priceDoc of pricesSnapshot.docs) {
        await newVariantRef.collection(SUBCOLLECTIONS.PRICES).doc(priceDoc.id).set({
          ...priceDoc.data(),
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });
      }
    }

    return successResponse({
      id: newProductRef.id,
      name: newProductData.name,
    }, 201);
  } catch (err) {
    console.error("商品コピーエラー:", err);
    return errorResponse("INTERNAL_ERROR", "商品のコピーに失敗しました", 500);
  }
}
