"use client";

import type { Category } from "@/type";
import cn from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const Filter = ({ categories }: { categories: Category[] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(searchParams.get("category") ?? "");

  const filterData: { $id: string; name: string }[] = [
    { $id: "all", name: "All" },
    ...categories,
  ];

  const handlePress = (id: string) => {
    setActive(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") {
      params.delete("category");
    } else {
      params.set("category", id);
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex overflow-x-auto gap-2 pb-3 scrollbar-hide">
      {filterData.map((item) => (
        <button
          key={item.$id}
          onClick={() => handlePress(item.$id)}
          className={cn(
            "filter flex-shrink-0 transition-colors",
            active === item.$id ? "bg-amber-500" : "bg-white"
          )}
        >
          <span
            className={cn(
              "body-medium",
              active === item.$id ? "text-white" : "text-gray-200"
            )}
          >
            {item.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Filter;
