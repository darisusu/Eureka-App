"use client";

import { useCartStore } from "@/store/cart.store";
import type { MenuItem } from "@/type";
import { Plus, X } from "lucide-react";
import { useState } from "react";

const MenuCard = ({
  item: { id, image_url, name, price, description, category_id },
}: {
  item: MenuItem;
}) => {
  const { addItem } = useCartStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");

  const handleOpen = () => {
    setSpecialRequest("");
    setIsModalVisible(true);
  };

  const handleAddToCart = () => {
    addItem({
      id,
      name,
      price,
      image_url: image_url ?? "",
      specialRequest: specialRequest.trim() || undefined,
      categoryId: category_id ?? undefined,
    });
    setIsModalVisible(false);
    setSpecialRequest("");
  };

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
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm">
            <div className="flex items-center gap-x-4">
              {image_url ? (
                <img
                  src={image_url}
                  alt={name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="base-bold text-dark-100 line-clamp-2">{name}</p>
                <p className="paragraph-bold text-primary mt-1">${price}</p>
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

            <p className="paragraph-regular text-gray-200 mt-4">
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
                className="bg-primary px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
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
