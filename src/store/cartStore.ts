// Zustand カートストア
// 加盟店の発注カートをクライアント状態で管理する

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/types";
import { MAX_CART_ITEMS } from "@/lib/constants";

interface CartStore {
  items: CartItem[];
  // カートにアイテムを追加（同じバリアントが既にある場合は数量加算）
  addItem: (item: Omit<CartItem, "id">) => void;
  // 数量を更新
  updateQuantity: (itemId: string, quantity: number) => void;
  // アイテムを削除
  removeItem: (itemId: string) => void;
  // カートを空にする
  clearCart: () => void;
  // 合計金額を取得
  getTotalAmount: () => number;
  // 合計数量を取得
  getTotalQuantity: () => number;
}

export const useCartStore = create<CartStore>()(
  // localStorageに永続化（ページリロードしてもカートが残る）
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem) => {
        const { items } = get();

        // 最大アイテム数チェック
        if (items.length >= MAX_CART_ITEMS) {
          console.warn(`カートの上限（${MAX_CART_ITEMS}件）に達しました`);
          return;
        }

        // 同じバリアントが既にカートにある場合は数量を加算する
        const existingIndex = items.findIndex(
          (item) => item.variant_id === newItem.variant_id
        );

        if (existingIndex >= 0) {
          const updatedItems = [...items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + newItem.quantity,
          };
          set({ items: updatedItems });
          return;
        }

        // 新しいアイテムとして追加
        const id = `${newItem.variant_id}-${Date.now()}`;
        set({ items: [...items, { ...newItem, id }] });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          // 数量が0以下になったらアイテムを削除
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        });
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((item) => item.id !== itemId) });
      },

      clearCart: () => set({ items: [] }),

      getTotalAmount: () => {
        return get().items.reduce(
          (total, item) => total + item.wholesale_price * item.quantity,
          0
        );
      },

      getTotalQuantity: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: "fc-cart-storage", // localStorageのキー名
    }
  )
);
