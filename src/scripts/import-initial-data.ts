import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { adminDb } from "../lib/firebase/admin";
import { COLLECTIONS, SUBCOLLECTIONS } from "../lib/constants";
import { FieldValue } from "firebase-admin/firestore";
import * as dotenv from "dotenv";

// .env.local を絶対パスで読み込む
dotenv.config({ path: "/Users/yokokuratakeshi/Downloads/antigravity-config/fc-ordering-tool/.env.local" });

/**
 * 商品名を「商品名」「カラー」「ロゴ」「サイズ」「プラン」に分解する
 */
function decompose(fullName: string, sizeRow: string) {
  let name = fullName;
  let plan = "";
  let color = "";
  let size = sizeRow || "";
  let logo = "";

  // 1. 【...】(プラン) の抽出
  const planMatch = name.match(/^【(.*?)】/);
  if (planMatch) {
    plan = planMatch[1];
    name = name.replace(/^【(.*?)】/, "");
  }

  // 2. 文字列内の色名の抽出 (黒, 白, 紺, 赤, 青, 透)
  const colors = ["黒", "白", "紺", "赤", "青", "透", "透明"];
  for (const c of colors) {
    if (name.includes(c)) {
      color = c;
      name = name.replace(c, "");
      break;
    }
  }

  // 3. ロゴ情報の抽出
  if (name.includes("大ロゴ入り")) {
    logo = "大ロゴ入り";
    name = name.replace("大ロゴ入り", "");
  }
  if (name.includes("背面ロゴ")) {
    logo = "背面ロゴ";
    name = name.replace("背面ロゴ", "");
  }

  // 4. アンダーシャツ等の「性別」抽出
  if (name.startsWith("女_") || name.startsWith("女 ")) {
    name = name.replace(/^女[ _]/, "女性用 ");
  }

  // 5. ゴミ取り (アンダースコアや不要な空白)
  name = name.replace(/_/g, " ").trim();
  
  // 6. サイズの正規化
  size = size.replace(/ウエア|ネックレス|アンクレット|ブレスレット/g, "").trim();
  if (size.includes(name)) {
      size = size.replace(name, "").trim();
  }
  size = size.replace(/^[ _\-]*/, "").trim(); // 先頭の記号を削除

  return { name, plan, color, size, logo };
}

async function main() {
  console.log("🚀 Starting SMART data import (decomposing names)...");

  try {
    // ステージ情報の取得
    const stagesSnap = await adminDb.collection(COLLECTIONS.STAGES).get();
    const stageIds: Record<string, string> = {};
    stagesSnap.docs.forEach(doc => stageIds[doc.data().name] = doc.id);

    // 商品 CSV の読み込み
    const productCsvPath = path.join(process.cwd(), "import_products.csv.csv");
    const productCsv = fs.readFileSync(productCsvPath, "utf-8");
    const productResults = Papa.parse(productCsv, { header: true, skipEmptyLines: true });

    // データの集約 (Decomposed Name + Color + Logo でグループ化)
    const productGroups: Record<string, any> = {};

    for (const row of productResults.data as any[]) {
      const fullName = row["商品名"];
      if (!fullName) continue;

      const { name, plan, color, size, logo } = decompose(fullName, row["サイズ"]);
      
      // グループ化のキー (分解後の名前 + プラン + カラー + ロゴ)
      const groupKey = `${name}_${plan}_${color}_${logo}`;
      
      if (!productGroups[groupKey]) {
        productGroups[groupKey] = {
          baseName: name,
          plan: plan,
          color: color,
          logo: logo,
          fullName: fullName, // デバッグ用
          category: row["カテゴリー"] || row["カテゴリ"] || "未分類",
          retail_price: parseInt(row["販売定価"]) || 0,
          variants: {} as Record<string, any>
        };
      }

      // バリアント (サイズ別)
      const variantKey = size || "default";
      if (!productGroups[groupKey].variants[variantKey]) {
        productGroups[groupKey].variants[variantKey] = {
          size: size,
          prices: {} as Record<string, number>
        };
      }

      // 価格 (ステージ別)
      const stageName = row["期"];
      const wholesalePrice = parseInt(row["FC卸"]) || 0;
      if (stageName && wholesalePrice) {
        productGroups[groupKey].variants[variantKey].prices[stageName] = wholesalePrice;
      }
    }

    // Firestore への書き出し (バッチを使用)
    let count = 0;
    for (const p of Object.values(productGroups)) {
      // 1. カテゴリ解決
      const catSnap = await adminDb.collection(COLLECTIONS.CATEGORIES).where("name", "==", p.category).get();
      let catId = "";
      if (!catSnap.empty) {
        catId = catSnap.docs[0].id;
      } else {
        const newCat = await adminDb.collection(COLLECTIONS.CATEGORIES).add({
          name: p.category,
          sort_order: 0,
          created_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        });
        catId = newCat.id;
      }

      // 2. 商品本体の登録/更新
      // 表示名は "名前 + プラ名" またはそのまま
      const displayName = p.plan ? `${p.baseName}（${p.plan}）` : p.baseName;
      
      const existingProductSnap = await adminDb.collection(COLLECTIONS.PRODUCTS)
        .where("name", "==", displayName)
        .where("category_id", "==", catId)
        .get();

      let productRef;
      const productData = {
        name: displayName,
        category_id: catId,
        category_name: p.category,
        product_type: p.category.includes("ウエア") || p.category.includes("半袖") ? "apparel" : "accessory",
        retail_price: p.retail_price,
        description: "",
        image_url: null,
        has_variants: true,
        sort_order: 0,
        is_active: true,
        updated_at: FieldValue.serverTimestamp(),
      };

      if (!existingProductSnap.empty) {
        productRef = existingProductSnap.docs[0].ref;
        await productRef.update(productData);
      } else {
        productRef = await adminDb.collection(COLLECTIONS.PRODUCTS).add({
          ...productData,
          created_at: FieldValue.serverTimestamp(),
        });
      }

      // 3. バリアントの登録/更新
      for (const v of Object.values(p.variants) as any[]) {
        const attribute_values: Record<string, string> = {};
        if (v.size) attribute_values["サイズ"] = v.size;
        if (p.color) attribute_values["カラー"] = p.color;
        if (p.logo) attribute_values["ロゴ"] = p.logo;

        // SKU は適当に生成 (既存があればそれを生かしたいが、今回は単純化)
        const variantsRef = productRef.collection(SUBCOLLECTIONS.VARIANTS);
        const sku = `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        
        // 既存属性値で検索
        let variantRef;
        const vSnap = await variantsRef.where("attribute_values", "==", attribute_values).get();
        
        if (!vSnap.empty) {
          variantRef = vSnap.docs[0].ref;
          await variantRef.update({
            updated_at: FieldValue.serverTimestamp(),
          });
        } else {
          variantRef = await variantsRef.add({
            sku_code: sku,
            attribute_values,
            is_active: true,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        // 4. 価格の登録/更新
        for (const [stageName, price] of Object.entries(v.prices as Record<string, number>)) {
          const stageId = stageIds[stageName];
          if (!stageId) continue;

          const pricesRef = variantRef.collection(SUBCOLLECTIONS.PRICES);
          const priceSnap = await pricesRef.where("stage_id", "==", stageId).get();
          
          const priceData = {
            stage_id: stageId,
            stage_name: stageName,
            wholesale_price: price,
            is_active: true,
            updated_at: FieldValue.serverTimestamp(),
          };

          if (!priceSnap.empty) {
            await priceSnap.docs[0].ref.update(priceData);
          } else {
            await pricesRef.add({
              ...priceData,
              created_at: FieldValue.serverTimestamp(),
            });
          }
        }
      }
      count++;
      if (count % 10 === 0) console.log(`...Processed ${count} products`);
    }

    console.log(`\n🎉 SMART Import completed! Processed ${count} decomposed products.`);
  } catch (err) {
    console.error("❌ Import failed:", err);
    process.exit(1);
  }
}

main();
