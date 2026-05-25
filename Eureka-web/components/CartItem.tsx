"use client";

import { useCartStore } from "@/store/cart.store";
import type { CartItemType } from "@/type";
import { Minus, Plus, Trash2 } from "lucide-react";

const CartItem = ({ item, isLocked }: { item: CartItemType; isLocked?: boolean }) => {
  const { increaseQty, decreaseQty, removeItem } = useCartStore();

  return (
    <div className="cart-item">
      <div className="flex flex-row items-center gap-x-3">
        <div className="cart-item__image">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-4/5 h-4/5 rounded-lg object-cover"
            />
          ) : null}
        </div>

        <div>
          <p className="base-bold text-dark-100">{item.name}</p>
          <p className="paragraph-bold text-primary mt-1">${item.price}</p>

          <div className="flex flex-row items-center gap-x-4 mt-2">
            <button
              onClick={() => decreaseQty(item.id, item.specialRequest)}
              disabled={isLocked}
              className="cart-item__actions disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={10} color="#FF9C01" />
            </button>

            <span className="base-bold text-dark-100">{item.quantity}</span>

            <button
              onClick={() => increaseQty(item.id, item.specialRequest)}
              disabled={isLocked}
              className="cart-item__actions disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={10} color="#FF9C01" />
            </button>
          </div>

          {!!item.specialRequest && (
            <p className="text-gray-200 text-xs mt-2">{item.specialRequest}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => removeItem(item.id, item.specialRequest)}
        disabled={isLocked}
        className="flex-center p-1 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 size={20} className="text-gray-400 hover:text-red-500 transition-colors" />
      </button>
    </div>
  );
};

export default CartItem;
