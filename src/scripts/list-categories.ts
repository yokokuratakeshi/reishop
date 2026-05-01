import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./src/lib/firebase/service-account.json', 'utf8'));

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = getFirestore();

async function main() {
  const snapshot = await db.collection('categories').get();
  const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(JSON.stringify(categories, null, 2));
}

main().catch(console.error);
