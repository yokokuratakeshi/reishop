"use client";

// 管理画面共通: APIリクエストユーティリティ
// Firebaseトークンを自動付与してAPIを呼び出す

import { auth } from "@/lib/firebase/config";

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// レスポンスのエラーを安全にパースする（非JSONレスポンス対応）
async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const err = await res.json();
    return err.error?.message ?? `API エラー (${res.status})`;
  } catch {
    return `API エラー (${res.status})`;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, { headers });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(path, { method: "DELETE", headers });
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
  const json = await res.json();
  return json.data as T;
}
