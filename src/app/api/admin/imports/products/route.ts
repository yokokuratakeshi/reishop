import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin, successResponse, errorResponse, formatDateToISO } from "@/lib/utils/api";
import { COLLECTIONS, SUBCOLLECTIONS } from "@/lib/constants";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const productImportRowSchema = z.object({
  name: z.string().min(1, "商品名は必須です"),
  category: z.string().optional().nullable(),
  product_type: z.enum(["apparel", "accessory", "non_apparel"]).default("apparel"),
  retail_price: z.coerce.number().optional().nullable(),
  sku_code: z.string().min(1, "SKUコードは必須です"),
  attr1_name: z.string().optional().nullable(),
  attr1_val: z.string().optional().nullable(),
  attr2_name: z.string().optional().nullable(),
  attr2_val: z.string().optional().nullable(),
  // ステージ価格用（動的キーを許容するため Schema では型のみ定義）
}).passthrough();

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return errorResponse("BAD_REQUEST", "リクエストボディは配列形式である必要があります", 400);
    }

    // マスタデータの取得
    const [categoriesSnap, stagesSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.CATEGORIES).get(),
      adminDb.collection(COLLECTIONS.STAGES).get(),
    ]);

    const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    const stages = stagesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

    // 商品名でグループ化（バリアントをまとめるため）
    const productGroups: Record<string, any[]> = {};
    body.forEach(row => {
      // 日本語ヘッダーのマッピング
      const mappedRow: any = { ...row };
      const mappings: Record<string, string> = {
        "商品名": "name",
        "カテゴリー": "category",
        "カテゴリ": "category",
        "種別": "product_type",
        "商品タイプ": "product_type",
        "定価": "retail_price",
        "小売価格": "retail_price",
        "SKUコード": "sku_code",
        "属性1名": "attr1_name",
        "属性1値": "attr1_val",
        "属性2名": "attr2_name",
        "属性2値": "attr2_val"
      };

      Object.entries(mappings).forEach(([jp, en]) => {
        if (row[jp] !== undefined && row[en] === undefined) {
          mappedRow[en] = row[jp];
        }
      });

      // 商品タイプの日本語変換
      if (mappedRow.product_type === "アパレル") mappedRow.product_type = "apparel";
      if (mappedRow.product_type === "アクセサリー") mappedRow.product_type = "accessory";
      if (mappedRow.product_type === "非アパレル") mappedRow.product_type = "non_apparel";

      const name = mappedRow.name || "Unknown";
      if (!productGroups[name]) productGroups[name] = [];
      productGroups[name].push(mappedRow);
    });

    let successCount = 0;
    const errors: string[] = [];

    for (const [productName, rows] of Object.entries(productGroups)) {
      try {
        // 代表行から商品基本情報を取得
        const proto = productImportRowSchema.parse(rows[0]);
        
        // カテゴリの解決
        let categoryId = "";
        let categoryName = "未分類";
        if (proto.category) {
          const cat = categories.find(c => c.name === proto.category || c.id === proto.category);
          if (cat) {
            categoryId = cat.id;
            categoryName = cat.name;
          }
        }

        const now = FieldValue.serverTimestamp();
        
        // 1. 商品本体の取得または作成
        const productsRef = adminDb.collection(COLLECTIONS.PRODUCTS);
        const existingProductSnap = await productsRef.where("name", "==", productName).limit(1).get();
        
        let productId: string;
        if (!existingProductSnap.empty) {
          productId = existingProductSnap.docs[0].id;
          await existingProductSnap.docs[0].ref.update({
            category_id: categoryId,
            category_name: categoryName,
            product_type: proto.product_type,
            retail_price: proto.retail_price,
            updated_at: now,
          });
        } else {
          const newProduct = await productsRef.add({
            name: productName,
            category_id: categoryId,
            category_name: categoryName,
            product_type: proto.product_type,
            retail_price: proto.retail_price,
            description: "",
            image_url: null,
            has_variants: true,
            sort_order: 0,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
          productId = newProduct.id;
        }

        const productDocRef = adminDb.collection(COLLECTIONS.PRODUCTS).doc(productId);

        // 2. バリアントのインポート
        for (const row of rows) {
          const parsed = productImportRowSchema.parse(row);
          
          const attribute_values: Record<string, string> = {};
          if (parsed.attr1_name && parsed.attr1_val) attribute_values[parsed.attr1_name] = parsed.attr1_val;
          if (parsed.attr2_name && parsed.attr2_val) attribute_values[parsed.attr2_name] = parsed.attr2_val;

          // SKUで既存バリアントを確認
          const variantsRef = productDocRef.collection(SUBCOLLECTIONS.VARIANTS);
          const existingVariantSnap = await variantsRef.where("sku_code", "==", parsed.sku_code).limit(1).get();
          
          let variantId: string;
          if (!existingVariantSnap.empty) {
            variantId = existingVariantSnap.docs[0].id;
            await existingVariantSnap.docs[0].ref.update({
              attribute_values,
              updated_at: now,
            });
          } else {
            const newVariant = await variantsRef.add({
              sku_code: parsed.sku_code,
              attribute_values,
              is_active: true,
              created_at: now,
              updated_at: now,
            });
            variantId = newVariant.id;
          }

          const variantDocRef = variantsRef.doc(variantId);

          // 3. ステージ別価格のインポート
          for (const stage of stages) {
            // "price_stage_0" や "卸単価(S1)" などのキーを探す
            // ここでは簡易的に "price_" + stage.id または stage.name を含むキーを探す
            const priceKey = Object.keys(row).find(k => 
              k.includes(stage.id) || k.includes(stage.name) || k.toLowerCase().includes("price")
            );
            
            const priceVal = priceKey ? parseFloat(row[priceKey]) : null;
            if (priceVal !== null && !isNaN(priceVal)) {
              const pricesRef = variantDocRef.collection(SUBCOLLECTIONS.PRICES);
              const pSnap = await pricesRef.where("stage_id", "==", stage.id).limit(1).get();
              
              const priceData = {
                stage_id: stage.id,
                stage_name: stage.name,
                wholesale_price: priceVal,
                is_active: true,
                updated_at: now,
              };

              if (!pSnap.empty) {
                await pSnap.docs[0].ref.update(priceData);
              } else {
                await pricesRef.add({ ...priceData, created_at: now });
              }
            }
          }
        }
        successCount++;
      } catch (e: any) {
        errors.push(`${productName}: ${e.message}`);
      }
    }

    return successResponse({
      successCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    console.error("Product import error:", err);
    return errorResponse("INTERNAL_ERROR", `インポートに失敗しました: ${err.message}`, 500);
  }
}
