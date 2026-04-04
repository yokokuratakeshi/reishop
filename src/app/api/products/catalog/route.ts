// 加盟店向け商品カタログ API（最適化版）
// collectionGroupを使わず、商品単位でPromise.allで並列取得する

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireFranchise, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { Product, ProductVariant, VariantPrice } from "@/types";

export async function GET(request: NextRequest) {
  const { user, error } = await requireFranchise(request);
  if (error) return error;

  try {
    // 加盟店情報の取得（ステージIDの確認）
    const franchiseDoc = await adminDb
      .collection(COLLECTIONS.FRANCHISES)
      .doc(user.franchiseId!)
      .get();

    if (!franchiseDoc.exists) {
      return errorResponse("NOT_FOUND", "加盟店情報が見つかりません", 404);
    }

    const { stage_id } = franchiseDoc.data()!;
    if (!stage_id) {
      return errorResponse("BAD_REQUEST", "所属ステージが設定されていません", 400);
    }

    // 商品一覧の取得
    const productsSnapshot = await adminDb
      .collection(COLLECTIONS.PRODUCTS)
      .orderBy("sort_order", "asc")
      .get();

    const activeProducts = productsSnapshot.docs.filter(doc => doc.data().is_active !== false);

    // 全商品のバリアントを並列取得（N+1だが並列実行で高速化）
    const products = await Promise.all(
      activeProducts.map(async (doc) => {
        const product = { id: doc.id, ...doc.data() } as Product;

        // バリアント取得
        const variantsSnapshot = await doc.ref
          .collection(SUBCOLLECTIONS.VARIANTS)
          .where("is_active", "==", true)
          .get();

        // 全バリアントの価格を並列取得
        const variants = await Promise.all(
          variantsSnapshot.docs.map(async (vDoc) => {
            const variant = { id: vDoc.id, ...vDoc.data() } as ProductVariant;

            const pricesSnapshot = await vDoc.ref
              .collection(SUBCOLLECTIONS.PRICES)
              .where("stage_id", "==", stage_id)
              .where("is_active", "==", true)
              .limit(1)
              .get();

            const priceData = pricesSnapshot.empty
              ? null
              : (pricesSnapshot.docs[0].data() as VariantPrice);

            return {
              ...variant,
              wholesale_price: priceData?.wholesale_price ?? 0,
            };
          })
        );

        return {
          ...product,
          variants: variants.filter(v => (v as any).wholesale_price > 0),
        };
      })
    );

    const catalogProducts = products.filter(p => p.variants && p.variants.length > 0);
    return successResponse(catalogProducts);
  } catch (err) {
    console.error("カタログ取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "カタログの取得に失敗しました", 500);
  }
}
