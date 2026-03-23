// Firestore ヘルパー関数
// よく使うCRUD操作をラップして型安全に扱えるようにする

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";

// コレクションの全ドキュメントを取得
export async function getCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const ref = collection(db, collectionName);
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
}

// 単一ドキュメントを取得
export async function getDocument<T>(
  collectionName: string,
  documentId: string
): Promise<T | null> {
  const ref = doc(db, collectionName, documentId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as T;
}

// ドキュメントを追加（IDは自動生成）
export async function addDocument<T extends WithFieldValue<DocumentData>>(
  collectionName: string,
  data: T
): Promise<string> {
  const ref = collection(db, collectionName);
  const docRef = await addDoc(ref, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

// ドキュメントを更新
export async function updateDocument(
  collectionName: string,
  documentId: string,
  data: Partial<DocumentData>
): Promise<void> {
  const ref = doc(db, collectionName, documentId);
  await updateDoc(ref, {
    ...data,
    updated_at: serverTimestamp(),
  });
}

// ドキュメントを削除（物理削除）
export async function deleteDocument(
  collectionName: string,
  documentId: string
): Promise<void> {
  const ref = doc(db, collectionName, documentId);
  await deleteDoc(ref);
}

// サブコレクションの全ドキュメントを取得
export async function getSubCollection<T>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  const ref = collection(db, parentCollection, parentId, subCollection);
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
}

// サブコレクションにドキュメントを追加
export async function addSubDocument<T extends WithFieldValue<DocumentData>>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  data: T
): Promise<string> {
  const ref = collection(db, parentCollection, parentId, subCollection);
  const docRef = await addDoc(ref, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

export { orderBy, where, Timestamp };
