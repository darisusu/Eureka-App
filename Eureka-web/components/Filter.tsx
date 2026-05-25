"use client";

import type { Category } from "@/type";
import cn from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const Filter = ({ categories }: { categories: Category[] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(searchParams.get("category") ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filterData: { id: string; name: string }[] = [
    { id: "", name: "All" },
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
            className="flex-shrink-0 px-2 py-3 text-gray-400 hover:text-dark-100 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>

          <div
            ref={scrollRef}
            className="flex overflow-x-auto overflow-y-hidden scrollbar-hide flex-1"
          >
            {filterData.map((item) => (
              <button
                key={item.id || "all"}
                onClick={() => handlePress(item.id)}
                className={cn(
                  "flex-shrink-0 px-5 py-3 -mb-px border-b-2 transition-colors whitespace-nowrap",
                  active === item.id
                    ? "border-primary text-dark-100 font-bold"
                    : "border-transparent text-gray-400 font-medium hover:text-dark-100"
                )}
              >
                <span className="body-medium">{item.name}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="flex-shrink-0 px-2 py-3 text-gray-400 hover:text-dark-100 transition-colors"
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
