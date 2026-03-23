// 加盟店向け商品カタログ API
// ログイン中の加盟店が所属するステージに対応する卸価格を含めて返す

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireFranchise, successResponse, errorResponse } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { Product, ProductVariant, VariantPrice } from "@/types";


export async function GET(request: NextRequest) {
  // 加盟店権限チェック
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
      .where("is_active", "==", true)
      .orderBy("sort_order", "asc")
      .get();

    const products = await Promise.all(
      productsSnapshot.docs.map(async (doc) => {
        const product = { id: doc.id, ...doc.data() } as Product;

        // バリアントの取得
        const variantsSnapshot = await doc.ref
          .collection(SUBCOLLECTIONS.VARIANTS)
          .where("is_active", "==", true)
          .get();


        const variants = await Promise.all(
          variantsSnapshot.docs.map(async (vDoc) => {
            const variant = { id: vDoc.id, ...vDoc.data() } as ProductVariant;

            // 当該ステージの価格を取得
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

        // 有効な価格設定があるバリアントのみを返す（任意：価格未設定は除外するか、0円として出すか）
        return {
          ...product,
          variants: variants.filter(v => (v as any).wholesale_price > 0),
        };
      })
    );

    // バリアントが存在し、価格が設定されている商品のみをカタログに表示
    const catalogProducts = products.filter(p => p.variants && p.variants.length > 0);

    return successResponse(catalogProducts);
  } catch (err) {
    console.error("カタログ取得エラー:", err);
    return errorResponse("INTERNAL_ERROR", "カタログの取得に失敗しました", 500);
  }
}
