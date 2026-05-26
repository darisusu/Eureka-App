"use client";

import Filter from "@/components/Filter";
import MenuCard from "@/components/MenuCard";
import SearchBar from "@/components/SearchBar";
import { formatWindow, isCategoryAvailable } from "@/lib/time";
import { getCategories, getMenu } from "@/lib/supabase";
import type { Category, MenuItem } from "@/type";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SearchInner() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const query = searchParams.get("query") ?? "";

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data as Category[]))
      .catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    getMenu({ category, query })
      .then((data) => setMenu(data as MenuItem[]))
      .catch(() => setMenu([]))
      .finally(() => setLoading(false));
  }, [category, query]);

  return (
    <div className="min-h-screen">
      <div className="bg-white sticky top-[84px] z-30">
        <div className="max-w-5xl mx-auto pt-5 pb-2 px-5">
          <SearchBar />
        </div>
        <Filter categories={categories} />
      </div>

      <div className="bg-primary/15 min-h-screen">
        <div className="max-w-5xl mx-auto px-5 pt-6 pb-40">
          {loading ? (
            <p className="paragraph-medium text-gray-400 text-center py-8">
              Loading...
            </p>
          ) : menu.length === 0 ? (
            <p className="paragraph-medium text-gray-400 text-center py-8">
              No results found.
            </p>
          ) : (
            (category ? categories.filter((c) => c.id === category) : categories)
              .map((cat) => ({
                category: cat,
                items: menu.filter((item) => item.category_id === cat.id),
              }))
              .map((group) => {
                const available = isCategoryAvailable(
                  group.category.available_from,
                  group.category.available_until
                );
                return (
                <div key={group.category.id} className={`mb-10${!available ? " opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-baseline gap-2 mb-4">
                    <h2 className="h2-bold text-dark-100">
                      {group.category.name}
                    </h2>
                    {(group.category.available_from && group.category.available_until) && (
                      <span className="text-sm text-gray-400">
                        Available {formatWindow(group.category.available_from, group.category.available_until)}
                      </span>
                    )}
                  </div>
                  {group.items.length === 0 ? (
                    <p className="paragraph-medium text-gray-400">
                      No menu items at the moment.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <MenuCard key={item.id} item={item} categoryName={group.category.name} />
                      ))}
                    </div>
                  )}
                </div>
              );
              })
          )}
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
