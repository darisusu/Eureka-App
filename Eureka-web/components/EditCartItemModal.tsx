"use client";

import {
  CATEGORY_ITEM_LIMIT,
  CATEGORY_ITEM_LIMIT_NAMES,
  SET_MEAL_UPGRADE_EXCLUDED_CATEGORIES,
  SPECIAL_REQUEST_EXCLUDED_CATEGORIES,
} from "@/lib/config";
import { baseSummary, fishSoupPriceAdder } from "@/lib/fishSoup";
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
    !!item.categoryName &&
    !SET_MEAL_UPGRADE_EXCLUDED_CATEGORIES.includes(item.categoryName);
  const showSpecialRequest =
    !item.categoryName || !SPECIAL_REQUEST_EXCLUDED_CATEGORIES.includes(item.categoryName);

  const [specialRequest, setSpecialRequest] = useState(item.specialRequest ?? "");
  const [quantity, setQuantity] = useState(item.quantity);
  const [drinkOptions, setDrinkOptions] = useState<MenuItem[]>([]);
  const [upgradeItem, setUpgradeItem] = useState<{ id: string; price: number } | null>(null);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null | undefined>(undefined);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  const otherRestrictedQty = isRestricted ? restrictedQty - item.quantity : 0;
  const maxQty = isRestricted ? CATEGORY_ITEM_LIMIT - otherRestrictedQty : 99;

  useEffect(() => {
    if (!showUpgrade) return;
    setLoadingUpgrade(true);
    Promise.all([getDrinkMenuItems(), getSetMealUpgradeItem()])
      .then(([drinks, fetchedUpgradeItem]) => {
        const drinkList = drinks as MenuItem[];
        setDrinkOptions(drinkList);
        setUpgradeItem(fetchedUpgradeItem);
        if (item.upgrade?.drinkName) {
          const match = drinkList.find((d) => d.name === item.upgrade!.drinkName);
          setSelectedDrinkId(match?.id ?? null);
        } else {
          setSelectedDrinkId(null);
        }
      })
      .catch(() => setSelectedDrinkId(null))
      .finally(() => setLoadingUpgrade(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upgradeAvailable = !loadingUpgrade && !!upgradeItem && drinkOptions.length > 0;
  const upgradePrice = upgradeItem?.price ?? (item.upgrade?.upgradePrice ?? 0);
  const selectedDrink = selectedDrinkId ? drinkOptions.find((d) => d.id === selectedDrinkId) : null;
  const effectiveUnitPrice = item.price
    + (selectedDrink && upgradeAvailable ? upgradePrice : 0)
    + fishSoupPriceAdder(item.fishSoupConfig);

  const handleSave = () => {
    const upgrade =
      selectedDrink && upgradeItem && upgradeAvailable
        ? { upgradeItemId: upgradeItem.id, drinkName: selectedDrink.name, upgradePrice: upgradeItem.price }
        : undefined;
    updateItem(item.id, item.specialRequest, item.upgrade?.drinkName, {
      specialRequest: showSpecialRequest ? (specialRequest.trim() || undefined) : undefined,
      upgrade,
      quantity,
      fishSoupConfig: item.fishSoupConfig,
    }, item.fishSoupConfig);
    onClose();
  };

  const fishSoupBase = item.fishSoupConfig ? baseSummary(item.fishSoupConfig) : "";
  const fishSoupLines = item.fishSoupConfig
    ? [
        ...(item.fishSoupConfig.soupOption ? [`Soup: ${item.fishSoupConfig.soupOption.optionName}`] : []),
        ...(fishSoupBase ? [`Base: ${fishSoupBase}`] : []),
        ...(item.fishSoupConfig.addOns.length > 0
          ? [`Add-ons: ${item.fishSoupConfig.addOns.map((a) => a.optionName).join(", ")}`]
          : []),
      ]
    : null;

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

        {/* Fish Soup config summary (read-only) */}
        {fishSoupLines && (
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-1">Your selection</p>
            {fishSoupLines.map((line, i) => (
              <p key={i} className="text-sm text-dark-100 leading-snug">{line}</p>
            ))}
            <p className="text-xs text-gray-400 mt-1.5">Remove and re-add to change options.</p>
          </div>
        )}

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
          <div className="flex justify-end mt-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700 font-medium">
              Fish Soup &amp; Zichar · {otherRestrictedQty + quantity}/{CATEGORY_ITEM_LIMIT}
            </span>
          </div>
        )}

        {/* Drink upgrade (non-fish-soup items only) */}
        {showUpgrade && (loadingUpgrade || upgradeAvailable) && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="paragraph-bold text-dark-100">
                Make it a set (+${upgradePrice.toFixed(2)})
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

        {showSpecialRequest && (
          <>
            <p className="body-regular text-gray-200 mt-4">Special request</p>
            <textarea
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-base leading-5 resize-none outline-none focus:border-primary"
              placeholder="(Subject to availability)"
              maxLength={200}
              rows={3}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
            />
          </>
        )}

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
