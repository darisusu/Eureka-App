"use client";

import { isCategoryAvailable } from "@/lib/time";
import type { Category } from "@/type";
import cn from "clsx";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const Filter = ({ categories }: { categories: Category[] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(searchParams.get("category") ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filterData: (Category | { id: string; name: string; available_from: null; available_until: null })[] = [
    { id: "", name: "All", available_from: null, available_until: null },
    ...categories,
  ];

  const handlePress = (id: string) => {
    setActive(id);
    const params = new URLSearchParams(searchParams.toString());
    if (!id) {
      params.delete("category");
    } else {
      params.set("category", id);
    }
    router.push(`/search?${params.toString()}`);
  };

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="border-b border-gray-200/80 bg-white">
        <div className="max-w-5xl mx-auto flex items-center">
          <button
            onClick={() => scroll("left")}
            className="flex-shrink-0 px-2 py-2 text-gray-400 hover:text-dark-100 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto overflow-y-hidden scrollbar-hide flex-1"
          >
            {filterData.map((item) => {
              const available = isCategoryAvailable(item.available_from, item.available_until);
              const isActive = active === item.id;
              return (
                <button
                  key={item.id || "all"}
                  onClick={() => handlePress(item.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1 px-4 py-2 -mb-px border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? "border-primary text-dark-100 font-bold"
                      : available
                      ? "border-transparent text-gray-400 font-medium hover:text-dark-100"
                      : "border-transparent text-gray-300 font-medium cursor-pointer"
                  )}
                >
                  {!available && <Clock size={11} className="text-gray-300 flex-shrink-0" />}
                  <span className="body-medium">{item.name}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scroll("right")}
            className="flex-shrink-0 px-2 py-2 text-gray-400 hover:text-dark-100 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="absolute top-full left-0 right-0 h-3 bg-gradient-to-b from-black/[0.06] to-transparent pointer-events-none z-10" />
    </div>
  );
};

export default Filter;
