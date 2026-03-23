// テスト注文データ生成スクリプト
import * as dotenv from "dotenv";
import * as path from "path";

// 1. まず最初に .env.local を読み込む
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// 2. その後に Firebase 関連をインポートする
async function seedOrder() {
  try {
    const { adminDb } = await import("../lib/firebase/admin");
    const { COLLECTIONS } = await import("../lib/constants");

    console.log("Seeding test order...");

    // 1. 加盟店を取得
    const franchisesSnapshot = await adminDb.collection(COLLECTIONS.FRANCHISES).limit(1).get();
    if (franchisesSnapshot.empty) {
      console.error("No franchises found. Please run seed-master.ts first.");
      return;
    }
    const franchiseDoc = franchisesSnapshot.docs[0];
    const franchiseId = franchiseDoc.id;
    console.log(`Using franchise: ${franchiseDoc.data().name} (${franchiseId})`);

    // 2. 商品を取得
    const productsSnapshot = await adminDb.collection(COLLECTIONS.PRODUCTS).limit(2).get();
    if (productsSnapshot.empty) {
      console.error("No products found. Please run seed-master.ts first.");
      return;
    }

    const items = [];
    let totalAmount = 0;
    let totalQuantity = 0;

    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      const variantsSnapshot = await productDoc.ref.collection("variants").limit(1).get();
      
      if (!variantsSnapshot.empty) {
        const variantDoc = variantsSnapshot.docs[0];
        const variantData = variantDoc.data();
        
        // 価格を取得 (stage_1 と仮定)
        const price = variantData.prices?.stage_1 || 1000;
        const qty = 2;
        
        items.push({
          product_id: productDoc.id,
          product_name: productData.name,
          variant_id: variantDoc.id,
          sku_code: variantData.sku_code || `SKU-${productDoc.id.slice(0,4)}`,
          attribute_values: variantData.attribute_values || {},
          wholesale_price: price,
          quantity: qty,
        });
        
        totalAmount += price * qty;
        totalQuantity += qty;
      }
    }

    // 3. 注文を作成
    const orderData = {
      order_number: `ORD-${Date.now().toString().slice(-6)}`,
      franchise_id: franchiseId,
      status: "pending",
      total_amount: totalAmount,
      total_quantity: totalQuantity,
      items: items,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const orderRef = await adminDb.collection(COLLECTIONS.ORDERS).add(orderData);
    console.log(`Successfully created test order: ${orderRef.id}`);
    console.log(`Order Number: ${orderData.order_number}`);

  } catch (error) {
    console.error("Error seeding order:", error);
  }
}

seedOrder();
