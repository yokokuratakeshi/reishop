// Firebase Admin SDK の初期化（サーバーサイド専用）
// API Routes や Server Actions でのみ使用する

import { initializeApp, getApps, cert, App, ServiceAccount } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App;

function initializeAdminApp(): App {
  // 既に初期化済みなら既存のインスタンスを返す
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    // 環境変数の改行エスケープを処理する
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  return initializeApp({ credential: cert(serviceAccount) });
}

adminApp = initializeAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);

export default adminApp;
