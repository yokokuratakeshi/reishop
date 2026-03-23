// 認証状態を管理するフック
// ロールと加盟店IDを含む認証情報を提供する

"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChange } from "@/lib/firebase/auth";

interface AuthState {
  user: User | null;
  role: "admin" | "franchise" | null;
  franchiseId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    franchiseId: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Firebaseの認証状態変化を監視
    const unsubscribe = onAuthStateChange(async (user) => {
      if (!user) {
        setState({
          user: null,
          role: null,
          franchiseId: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      // カスタムクレームからロールと加盟店IDを取得
      const tokenResult = await user.getIdTokenResult();
      const role = (tokenResult.claims["role"] as "admin" | "franchise") ?? null;
      const franchiseId = (tokenResult.claims["franchise_id"] as string) ?? null;

      setState({
        user,
        role,
        franchiseId,
        isLoading: false,
        isAuthenticated: true,
      });
    });

    // クリーンアップ: コンポーネントのアンマウント時に監視を解除
    return () => unsubscribe();
  }, []);

  return state;
}
