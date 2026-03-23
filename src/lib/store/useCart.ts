import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: () => number;
  totalQuantity: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const id = `${item.variant_id}-${Date.now()}`;
        set((state) => {
          // 同じバリアントが既にあるかチェック（オプション：数量を加算するか別アイテムにするか）
          // 今回は別の行として追加する（発注明細の柔軟性のため）
          return { items: [...state.items, { ...item, id }] };
        });
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalAmount: () => {
        return get().items.reduce(
          (sum, item) => sum + item.wholesale_price * item.quantity,
          0
        );
      },

      totalQuantity: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "fc-cart-storage", // localStorage のキー名
    }
  )
);
