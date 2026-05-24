"use client";

import { useCartStore } from "@/store/cart.store";
import { usePathname } from "next/navigation";

export const CHECKOUT_BAR_HEIGHT = 56;

const CheckoutBar = ({ onOpen }: { onOpen: () => void }) => {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  if (totalItems === 0 || pathname !== "/search") return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-30 max-w-sm mx-auto">
      <button
        onClick={onOpen}
        className="w-full bg-primary rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg shadow-black/20 hover:opacity-95 transition-opacity"
        style={{ minHeight: CHECKOUT_BAR_HEIGHT }}
      >
        <span className="paragraph-bold text-white">
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>
        <span className="paragraph-bold text-white">${totalPrice.toFixed(2)}</span>
      </button>
    </div>
  );
};

export default CheckoutBar;
