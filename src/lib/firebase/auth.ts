// 認証ヘルパー関数
// ログイン・ログアウト・カスタムクレーム取得などを提供

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "./config";

// メール・パスワードでサインイン
export const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);

  // カスタムクレーム（role等）を確実に反映するためトークンを強制リフレッシュ
  const idToken = await userCredential.user.getIdToken(true);

  // サーバーサイドセッションの設定
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  return userCredential;
};

// Googleでサインイン
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const idToken = await userCredential.user.getIdToken();

  // サーバーサイドセッションの設定
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  return userCredential;
};

// サインアウト
export const logout = async () => {
  // サーバーサイドセッションの削除
  await fetch("/api/auth/session", { method: "DELETE" });
  return firebaseSignOut(auth);
};

// IDトークンを取得（API呼び出し時の認証ヘッダー用）
export async function getIdToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
}

// カスタムクレームを含むIDトークンを強制リフレッシュして取得
export async function getIdTokenWithClaims(): Promise<{
  token: string;
  role: string | null;
  franchiseId: string | null;
} | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  // force=true でカスタムクレームを最新に更新する
  const token = await currentUser.getIdToken(true);
  const decodedToken = await currentUser.getIdTokenResult(true);

  return {
    token,
    role: (decodedToken.claims["role"] as string) ?? null,
    franchiseId: (decodedToken.claims["franchise_id"] as string) ?? null,
  };
}

// 認証状態の変化を監視
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
