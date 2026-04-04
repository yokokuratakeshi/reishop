// バリアント削除 API
// POST: バリアントとその価格データを削除

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const { id: productId, variantId } = await params;

    const variantRef = adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .doc(productId)
      .collection(SUBCOLLECTIONS.VARIANTS)
      .doc(variantId);

    const variantDoc = await variantRef.get();
    if (!variantDoc.exists) {
      return errorResponse("NOT_FOUND", "バリアントが見つかりません", 404);
    }

    // 関連する価格データを削除
    const pricesSnapshot = await variantRef
      .collection(SUBCOLLECTIONS.PRICES)
      .get();

    const batch = adminDb.batch();
    pricesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // バリアント本体を削除
    batch.delete(variantRef);

    await batch.commit();

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("バリアント削除エラー:", err);
    return errorResponse("INTERNAL_ERROR", "バリアントの削除に失敗しました", 500);
  }
}
