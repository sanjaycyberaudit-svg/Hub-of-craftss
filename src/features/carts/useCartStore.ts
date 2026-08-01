import { create } from "zustand";
import { persistNSync } from "persist-and-sync";

export type OptionSelections = Record<string, string>;

export type CartItem = {
  quantity: number;
  /** Legacy single-group selection (first group value). */
  size?: string;
  /** Multi-group selections keyed by group id. */
  selections?: OptionSelections;
};

export type CartItems = { [productId: string]: CartItem };
export type ProductData = { productId: string; quantity: number };

type CartStore = {
  cart: CartItems;
  addProductToCart: (
    id: string,
    quantity: number,
    sizeOrSelections?: string | OptionSelections,
  ) => void;
  setProductQuantity: (
    id: string,
    quantity: number,
    sizeOrSelections?: string | OptionSelections,
  ) => void;
  setProductSize: (id: string, size: string) => void;
  setProductSelections: (id: string, selections: OptionSelections) => void;
  replaceCart: (cart: CartItems) => void;
  removeProduct: (id: string) => void;
  removeAllProducts: () => void;
};

function normalizeSelections(
  sizeOrSelections?: string | OptionSelections,
  existing?: CartItem,
): Pick<CartItem, "size" | "selections"> {
  if (sizeOrSelections && typeof sizeOrSelections === "object") {
    const selections: OptionSelections = {};
    for (const [key, value] of Object.entries(sizeOrSelections)) {
      const normalized = String(value ?? "")
        .trim()
        .toUpperCase();
      if (normalized) selections[key] = normalized;
    }
    const first = Object.values(selections)[0];
    return {
      selections,
      ...(first ? { size: first } : {}),
    };
  }

  if (typeof sizeOrSelections === "string" && sizeOrSelections.trim()) {
    const size = sizeOrSelections.trim().toUpperCase();
    return {
      size,
      selections: existing?.selections,
    };
  }

  return {
    ...(existing?.size ? { size: existing.size } : {}),
    ...(existing?.selections ? { selections: existing.selections } : {}),
  };
}

const useCartStore = create<CartStore>(
  persistNSync(
    (set) => ({
      cart: {},
      addProductToCart: (id, quantity, sizeOrSelections) => {
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
                ...normalizeSelections(sizeOrSelections, existingProduct),
              },
            },
          };
        });
      },
      setProductQuantity: (id, quantity, sizeOrSelections) =>
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
                ...normalizeSelections(sizeOrSelections, existingProduct),
              },
            },
          };
        }),
      setProductSize: (id, size) =>
        set((state) => {
          const existingProduct = state.cart[id];
          const normalized = String(size ?? "")
            .trim()
            .toUpperCase();
          return {
            cart: {
              ...state.cart,
              [id]: {
                quantity: existingProduct?.quantity ?? 0,
                size: normalized,
                selections: existingProduct?.selections,
              },
            },
          };
        }),
      setProductSelections: (id, selections) =>
        set((state) => {
          const existingProduct = state.cart[id];
          const normalized = normalizeSelections(selections, existingProduct);
          return {
            cart: {
              ...state.cart,
              [id]: {
                quantity: existingProduct?.quantity ?? 0,
                ...normalized,
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
