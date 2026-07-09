"use client";

import CartLink from "./CartLink";
import { useCartCount } from "../hooks/useCartCount";

function CartNav() {
  const productCount = useCartCount();
  return <CartLink productCount={productCount} />;
}

export default CartNav;
