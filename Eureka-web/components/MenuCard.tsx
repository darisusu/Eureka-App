"use client";

import {
  CATEGORY_ITEM_LIMIT,
  CATEGORY_ITEM_LIMIT_NAMES,
  SET_MEAL_UPGRADE_EXCLUDED_CATEGORIES,
  SET_MEAL_UPGRADE_PRICE,
} from "@/lib/config";
import { getDrinkMenuItems, getSetMealUpgradeItem } from "@/lib/supabase";
import { useCartStore } from "@/store/cart.store";
import type { MenuItem } from "@/type";
import { Plus, X } from "lucide-react";
import { useState } from "react";

const MenuCard = ({
  item: { id, image_url, name, price, description, category_id },
  categoryName,
}: {
  item: MenuItem;
  categoryName?: string;
}) => {
  const { addItem } = useCartStore();
  const restrictedQty = useCartStore((state) =>
    state.items
      .filter((i) => i.categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(i.categoryName))
      .reduce((sum, i) => sum + i.quantity, 0)
  );
  const isRestricted = !!categoryName && CATEGORY_ITEM_LIMIT_NAMES.includes(categoryName);
  const isAtLimit = isRestricted && restrictedQty >= CATEGORY_ITEM_LIMIT;
  const showUpgrade = !!categoryName && !SET_MEAL_UPGRADE_EXCLUDED_CATEGORIES.includes(categoryName);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");
  const [drinkOptions, setDrinkOptions] = useState<MenuItem[]>([]);
  const [upgradeItemId, setUpgradeItemId] = useState<string | null>(null);
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(null);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  const handleOpen = () => {
    setSpecialRequest("");
    setSelectedDrinkId(null);
    setIsModalVisible(true);
    if (showUpgrade && drinkOptions.length === 0 && !loadingUpgrade) {
      setLoadingUpgrade(true);
      Promise.all([getDrinkMenuItems(), getSetMealUpgradeItem()])
        .then(([drinks, upgradeItem]) => {
          setDrinkOptions(drinks as MenuItem[]);
          setUpgradeItemId(upgradeItem?.id ?? null);
        })
        .catch(() => {})
        .finally(() => setLoadingUpgrade(false));
    }
  };

  const handleAddToCart = () => {
    if (isAtLimit) return;
    addItem({
      id,
      name,
      price,
      image_url: image_url ?? "",
      specialRequest: specialRequest.trim() || undefined,
      categoryId: category_id ?? undefined,
      categoryName: categoryName ?? undefined,
    });

    if (selectedDrinkId && upgradeItemId) {
      const drink = drinkOptions.find((d) => d.id === selectedDrinkId);
      if (drink) {
        addItem({
          id: upgradeItemId,
          name: "Set Meal Upgrade",
          price: SET_MEAL_UPGRADE_PRICE,
          image_url: "",
          specialRequest: drink.name,
          categoryId: undefined,
          categoryName: undefined,
        });
      }
    }

    setIsModalVisible(false);
    setSpecialRequest("");
    setSelectedDrinkId(null);
  };

  const upgradeAvailable = !loadingUpgrade && !!upgradeItemId && drinkOptions.length > 0;

  return (
    <>
      <div className="menu-card h-[260px]">
        <div className="relative">
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              className="w-full h-36 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-full h-36 rounded-2xl bg-gray-100" />
          )}
          <button
            onClick={handleOpen}
            className="absolute right-3 bottom-3 bg-primary rounded-full w-10 h-10 flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Plus size={20} color="white" />
          </button>
        </div>
        <div className="mt-3 flex-1">
          <p className="base-bold text-dark-100 line-clamp-2">{name}</p>
          <p className="h3-bold text-dark-100 mt-2">${price}</p>
        </div>
      </div>

      {isModalVisible && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-x-4">
              {image_url ? (
                <img
                  src={image_url}
                  alt={name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : null}
              <div className="flex items-baseline gap-x-2 flex-1 min-w-0">
                <p className="base-bold text-dark-100 line-clamp-1 flex-1 min-w-0">{name}</p>
                <p className="paragraph-bold text-primary whitespace-nowrap">${price}</p>
              </div>
              <button
                onClick={() => setIsModalVisible(false)}
                className="p-1 flex-shrink-0"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {!!description && (
              <p className="paragraph-regular text-gray-200 mt-3">{description}</p>
            )}

            {isRestricted && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${isAtLimit ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                {isAtLimit
                  ? `You've reached the ${CATEGORY_ITEM_LIMIT}-item limit for Fish Soup & Zichar orders.`
                  : `Fish Soup & Zichar: max ${CATEGORY_ITEM_LIMIT} items per order (${restrictedQty}/${CATEGORY_ITEM_LIMIT} used).`}
              </div>
            )}

            {showUpgrade && (loadingUpgrade || upgradeAvailable) && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="paragraph-bold text-dark-100">Set Meal Upgrade</p>
                  <span className="text-sm font-semibold text-primary">+${SET_MEAL_UPGRADE_PRICE.toFixed(2)}</span>
                </div>
                {loadingUpgrade ? (
                  <p className="text-sm text-gray-400">Loading drinks...</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`upgrade-${id}`}
                        checked={selectedDrinkId === null}
                        onChange={() => setSelectedDrinkId(null)}
                        className="accent-primary w-4 h-4 flex-shrink-0"
                      />
                      <span className="body-regular text-gray-400">Skip</span>
                    </label>
                    {drinkOptions.map((drink) => (
                      <label key={drink.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`upgrade-${id}`}
                          checked={selectedDrinkId === drink.id}
                          onChange={() => setSelectedDrinkId(drink.id)}
                          className="accent-primary w-4 h-4 flex-shrink-0"
                        />
                        <span className="body-regular text-dark-100">{drink.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="body-regular text-gray-200 mt-4">
              Note to restaurant / Special Request (optional)
            </p>
            <textarea
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-5 resize-none outline-none focus:border-primary"
              placeholder="Add your request (subject to restaurant discretion)"
              maxLength={200}
              rows={3}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
            />

            <div className="flex justify-end gap-x-3 mt-5">
              <button
                onClick={() => setIsModalVisible(false)}
                className="px-4 py-2"
              >
                <span className="paragraph-bold text-gray-200">Cancel</span>
              </button>
              <button
                onClick={handleAddToCart}
                disabled={isAtLimit}
                className="bg-primary px-4 py-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="paragraph-bold text-white">Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuCard;
