import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

/**
 * 商品画像を Firebase Storage にアップロードする
 * @param productId 商品ID
 * @param file アップロードするファイル
 * @returns ダウンロードURL
 */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const fileName = `${Date.now()}.${extension}`;
  const storagePath = `products/${productId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}

/**
 * 古い画像を削除する（オプション）
 * @param url 削除する画像のフルURL
 */
export async function deleteProductImage(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Failed to delete old image:", error);
  }
}
