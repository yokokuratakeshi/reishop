import { adminDb } from "../lib/firebase/admin";
import { COLLECTIONS } from "../lib/constants";

async function clearData() {
  console.log("🧹 Clearing products and categories for a clean start...");
  
  const productSnap = await adminDb.collection(COLLECTIONS.PRODUCTS).get();
  const catSnap = await adminDb.collection(COLLECTIONS.CATEGORIES).get();

  const batch = adminDb.batch();
  productSnap.docs.forEach(doc => batch.delete(doc.ref));
  catSnap.docs.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
  console.log("✅ Cleared!");
}

clearData();
