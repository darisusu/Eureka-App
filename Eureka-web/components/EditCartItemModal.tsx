"use client";

import {
  CATEGORY_ITEM_LIMIT,
  CATEGORY_ITEM_LIMIT_NAMES,
  SET_MEAL_UPGRADE_EXCLUDED_CATEGORIES,
  SET_MEAL_UPGRADE_PRICE,
} from "@/lib/config";
import { getDrinkMenuItems, getSetMealUpgradeItem } from "@/lib/supabase";
import { useCartStore } from "@/store/cart.store";
import type { CartItemType, MenuItem } from "@/type";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

const EditCartItemModal = ({
  item,
  onClose,
}: {
  item: CartItemType;
  onClose: () => void;
}) => {
  const { updateItem } = useCartStore();
  const restrictedQty = useCartStore((state) =>
    state.items
      .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
      .reduce((sum, i) => sum + i.quantity, 0)
  );

  const isRestricted = !!item.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(item.categoryName);
  const showUpgrade =
    !!item.categoryName && !SET_MEAL_UPGRADE_EXCLUDED_CATEGORIES.includes(item.categoryName);

  const [specialRequest, setSpecialRequest] = useState(item.specialRequest ?? "");
  const [quantity, setQuantity] = useState(item.quantity);
  const [drinkOptions, setDrinkOptions] = useState<MenuItem[]>([]);
  const [upgradeItemId, setUpgradeItemId] = useState<string | null>(null);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null | undefined>(undefined);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  // Compute the max allowed quantity for restricted items
  const otherRestrictedQty = isRestricted
    ? restrictedQty - item.quantity
    : 0;
  const maxQty = isRestricted ? CATEGORY_ITEM_LIMIT - otherRestrictedQty : 99;

  useEffect(() => {
    if (!showUpgrade) return;
    setLoadingUpgrade(true);
    Promise.all([getDrinkMenuItems(), getSetMealUpgradeItem()])
      .then(([drinks, upgradeItemData]) => {
        const drinkList = drinks as MenuItem[];
        setDrinkOptions(drinkList);
        setUpgradeItemId(upgradeItemData?.id ?? null);
        // Pre-select the drink that was previously chosen
        if (item.upgrade?.drinkName) {
          const match = drinkList.find((d) => d.name === item.upgrade!.drinkName);
          setSelectedDrinkId(match?.id ?? null);
        } else {
          setSelectedDrinkId(null);
        }
      })
      .catch(() => setSelectedDrinkId(null))
      .finally(() => setLoadingUpgrade(false));
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upgradeAvailable = !loadingUpgrade && !!upgradeItemId && drinkOptions.length > 0;
  const selectedDrink = selectedDrinkId ? drinkOptions.find((d) => d.id === selectedDrinkId) : null;
  const effectiveUnitPrice = item.price + (selectedDrink && upgradeAvailable ? SET_MEAL_UPGRADE_PRICE : 0);

  const handleSave = () => {
    const upgrade =
      selectedDrink && upgradeItemId
        ? { upgradeItemId, drinkName: selectedDrink.name }
        : undefined;
    updateItem(item.id, item.specialRequest, item.upgrade?.drinkName, {
      specialRequest: specialRequest.trim() || undefined,
      upgrade,
      quantity,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-x-4">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
          ) : null}
          <div className="flex items-baseline gap-x-2 flex-1 min-w-0">
            <p className="base-bold text-dark-100 line-clamp-1 flex-1 min-w-0">{item.name}</p>
            <p className="paragraph-bold text-primary whitespace-nowrap">${item.price.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="p-1 flex-shrink-0">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Quantity */}
        <div className="mt-4 flex items-center justify-between">
          <p className="paragraph-bold text-dark-100">Quantity</p>
          <div className="flex items-center gap-x-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="cart-item__actions"
            >
              <Minus size={10} color="#FF9C01" />
            </button>
            <span className="base-bold text-dark-100 w-5 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              className="cart-item__actions disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={10} color="#FF9C01" />
            </button>
          </div>
        </div>

        {isRestricted && (
          <p className="text-xs text-amber-600 mt-1 text-right">
            Max {CATEGORY_ITEM_LIMIT} items for Fish Soup &amp; Zichar
          </p>
        )}

        {/* Drink upgrade */}
        {showUpgrade && (loadingUpgrade || upgradeAvailable) && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="paragraph-bold text-dark-100">
                Make it a set (+${SET_MEAL_UPGRADE_PRICE.toFixed(2)})
              </p>
              <p className="text-xs text-gray-400">Choose max 1 (optional)</p>
            </div>
            {loadingUpgrade ? (
              <p className="text-sm text-gray-400 mt-2">Loading drinks...</p>
            ) : (
              <div className="flex flex-col mt-2">
                {drinkOptions.map((drink) => (
                  <label
                    key={drink.id}
                    className="flex items-center gap-3 py-2.5 cursor-pointer border-b border-gray-100"
                  >
                    <input
                      type="radio"
                      name={`edit-upgrade-${item.id}`}
                      checked={selectedDrinkId === drink.id}
                      onChange={() => setSelectedDrinkId(drink.id)}
                      className="accent-primary w-4 h-4 flex-shrink-0"
                    />
                    <span className="body-regular text-dark-100 flex-1">{drink.name}</span>
                  </label>
                ))}
                <label className="flex items-center gap-3 py-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`edit-upgrade-${item.id}`}
                    checked={selectedDrinkId === null}
                    onChange={() => setSelectedDrinkId(null)}
                    className="accent-primary w-4 h-4 flex-shrink-0"
                  />
                  <span className="body-regular text-gray-400">No thanks</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Special request */}
        <p className="body-regular text-gray-200 mt-4">Special request</p>
        <textarea
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-5 resize-none outline-none focus:border-primary"
          placeholder="(Subject to availability)"
          maxLength={200}
          rows={3}
          value={specialRequest}
          onChange={(e) => setSpecialRequest(e.target.value)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-x-3 mt-5">
          <button onClick={onClose} className="px-4 py-2">
            <span className="paragraph-bold text-gray-200">Cancel</span>
          </button>
          <button
            onClick={handleSave}
            className="bg-primary px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="paragraph-bold text-white">
              Save — ${(effectiveUnitPrice * quantity).toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCartItemModal;
