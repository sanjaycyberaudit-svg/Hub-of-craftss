import { create } from "zustand";
import { persistNSync } from "persist-and-sync";

export type CartItem = {
  quantity: number;
  size?: string;
};

export type CartItems = { [productId: string]: CartItem };
export type ProductData = { productId: string; quantity: number };

type CartStore = {
  cart: CartItems;
  addProductToCart: (id: string, quantity: number, size?: string) => void;
  setProductQuantity: (id: string, quantity: number, size?: string) => void;
  setProductSize: (id: string, size: string) => void;
  replaceCart: (cart: CartItems) => void;
  removeProduct: (id: string) => void;
  removeAllProducts: () => void;
};

const useCartStore = create<CartStore>(
  persistNSync(
    (set) => ({
      cart: {},
      addProductToCart: (id, quantity, size) => {
        set((state) => {
          const existingProduct = state.cart[id];
          if (!existingProduct && quantity <= 0) return state;

          const newQuantity = existingProduct
            ? existingProduct.quantity + quantity
            : quantity;

          if (newQuantity <= 0) {
            const updatedCart = { ...state.cart };
            delete updatedCart[id];
            return { cart: updatedCart };
          }

          return {
            cart: {
              ...state.cart,
              [id]: {
                quantity: newQuantity,
                ...(size
                  ? { size }
                  : existingProduct?.size
                    ? { size: existingProduct.size }
                    : {}),
              },
            },
          };
        });
      },
      setProductQuantity: (id, quantity, size) =>
        set((state) => {
          if (quantity <= 0) {
            const updatedCart = { ...state.cart };
            delete updatedCart[id];
            return { cart: updatedCart };
          }
          const existingProduct = state.cart[id];
          return {
            cart: {
              ...state.cart,
              [id]: {
                quantity,
                ...(size
                  ? { size }
                  : existingProduct?.size
                    ? { size: existingProduct.size }
                    : {}),
              },
            },
          };
        }),
      setProductSize: (id, size) =>
        set((state) => {
          const existingProduct = state.cart[id];
          return {
            cart: {
              ...state.cart,
              [id]: {
                quantity: existingProduct?.quantity ?? 0,
                size,
              },
            },
          };
        }),
      replaceCart: (cart) => set({ cart }),
      removeProduct: (id) =>
        set((state) => {
          const updatedCart = { ...state.cart };
          delete updatedCart[id];
          return {
            cart: updatedCart,
          };
        }),
      removeAllProducts: () => set(() => ({ cart: {} })),
    }),
    { name: "cart", storage: "cookies" },
  ),
);

export const calcProductCountStorage = (cartItems: CartItems) => {
  if (!cartItems) return 0;
  return Object.values(cartItems).reduce((acc, cur) => acc + cur.quantity, 0);
};

export default useCartStore;
