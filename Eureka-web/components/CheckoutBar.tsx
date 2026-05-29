"use client";

import { useCartStore } from "@/store/cart.store";
import { ShoppingBag } from "lucide-react";

export const CHECKOUT_BAR_HEIGHT = 80;

const CheckoutBar = ({ onOpen }: { onOpen: () => void }) => {
  const items = useCartStore((state) => state.items);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = getTotalPrice();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-5xl mx-auto">
      <button
        onClick={onOpen}
        className="w-full bg-primary rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-lg shadow-black/20 hover:opacity-95 active:opacity-90 transition-opacity"
        aria-label={`View cart: ${totalItems} items, $${totalPrice.toFixed(2)}`}
      >
        <div className="flex items-center gap-2.5">
          <ShoppingBag size={18} className="text-white" />
          <span className="text-white text-sm font-semibold">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold">${totalPrice.toFixed(2)}</span>
          <span className="text-white/70 text-sm">View cart</span>
        </div>
      </button>
    </div>
  );
};

export default CheckoutBar;
