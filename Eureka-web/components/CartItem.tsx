"use client";

import EditCartItemModal from "@/components/EditCartItemModal";
import { CATEGORY_ITEM_LIMIT, CATEGORY_ITEM_LIMIT_NAMES } from "@/lib/config";
import { useCartStore } from "@/store/cart.store";
import type { CartItemType } from "@/type";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const CartItem = ({ item, isLocked }: { item: CartItemType; isLocked?: boolean }) => {
  const { increaseQty, decreaseQty, removeItem } = useCartStore();
  const [isEditing, setIsEditing] = useState(false);
  const restrictedQty = useCartStore((state) =>
    state.items
      .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
      .reduce((sum, i) => sum + i.quantity, 0)
  );
  const isRestricted = !!item.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(item.categoryName);
  const isIncreaseDisabled = isLocked || (isRestricted && restrictedQty >= CATEGORY_ITEM_LIMIT);

  const fishSoupAdder = item.fishSoupConfig
    ? item.fishSoupConfig.soupOption.priceAdder
      + item.fishSoupConfig.baseOption.priceAdder
      + item.fishSoupConfig.addOns.reduce((s, a) => s + a.priceAdder, 0)
    : 0;
  const unitPrice = item.price + (item.upgrade?.upgradePrice ?? 0) + fishSoupAdder;
  const upgradeDrinkName = item.upgrade?.drinkName;

  const fishSoupLines = item.fishSoupConfig
    ? [
        `Soup: ${item.fishSoupConfig.soupOption.optionName}`,
        `Base: ${item.fishSoupConfig.baseOption.optionName}`,
        ...(item.fishSoupConfig.addOns.length > 0
          ? [`Add-ons: ${item.fishSoupConfig.addOns.map((a) => a.optionName).join(", ")}`]
          : []),
      ]
    : null;

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
          {upgradeDrinkName && (
            <p className="text-xs text-primary mt-0.5">+ {upgradeDrinkName}</p>
          )}
          {fishSoupLines && fishSoupLines.map((line, i) => (
            <p key={i} className="text-xs text-gray-400 mt-0.5 leading-snug">{line}</p>
          ))}
          <p className="paragraph-bold text-primary mt-1">${unitPrice.toFixed(2)}</p>

          <div className="flex flex-row items-center gap-x-4 mt-2">
            <button
              onClick={() => decreaseQty(item.id, item.specialRequest, upgradeDrinkName, item.fishSoupConfig)}
              disabled={isLocked}
              className="cart-item__actions disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus size={10} color="#FF9C01" />
            </button>

            <span className="base-bold text-dark-100">{item.quantity}</span>

            <button
              onClick={() => increaseQty(item.id, item.specialRequest, upgradeDrinkName, item.fishSoupConfig)}
              disabled={isIncreaseDisabled}
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

      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsEditing(true)}
          disabled={isLocked}
          className="flex-center p-1 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Edit item"
        >
          <Pencil size={16} className="text-gray-400 hover:text-primary transition-colors" />
        </button>
        <button
          onClick={() => removeItem(item.id, item.specialRequest, upgradeDrinkName, item.fishSoupConfig)}
          disabled={isLocked}
          className="flex-center p-1 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Remove item"
        >
          <Trash2 size={18} className="text-gray-400 hover:text-red-500 transition-colors" />
        </button>
      </div>

      {isEditing && (
        <EditCartItemModal item={item} onClose={() => setIsEditing(false)} />
      )}
    </div>
  );
};

export default CartItem;
