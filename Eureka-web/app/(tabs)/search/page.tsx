"use client";

import Filter from "@/components/Filter";
import MenuCard from "@/components/MenuCard";
import SearchBar from "@/components/SearchBar";
import { getCategories, getDeptConfig, getMenu } from "@/lib/supabase";
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
  const [maxWait, setMaxWait] = useState<number | null>(null);

  useEffect(() => {
    getCategories().then((data) => {
      setCategories(data as Category[]);
      const ids = (data as Category[]).map((c) => c.id);
      if (ids.length) {
        getDeptConfig(ids)
          .then((configs) => {
            if (configs.length) {
              setMaxWait(Math.max(...configs.map((c) => c.maxWaitMinutes)));
            }
          })
          .catch(() => null);
      }
    }).catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    getMenu({ category, query })
      .then((data) => setMenu(data as MenuItem[]))
      .catch(() => setMenu([]))
      .finally(() => setLoading(false));
  }, [category, query]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mt-5 mb-2 flex flex-col gap-4 px-5">
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-3">
              <p className="paragraph-regular text-gray-200">
                Estimated time{" "}
                <span className="paragraph-bold text-primary">
                  {maxWait != null ? maxWait : "—"}
                </span>{" "}
                min
              </p>
            </div>
          </div>
          <SearchBar />
          <Filter categories={categories} />
        </div>

        <div className="grid grid-cols-2 gap-7 px-5 pb-40">
          {loading ? (
            <p className="col-span-2 paragraph-medium text-gray-200 text-center py-8">
              Loading...
            </p>
          ) : menu.length === 0 ? (
            <p className="col-span-2 paragraph-medium text-gray-200 text-center py-8">
              No results found.
            </p>
          ) : (
            menu.map((item) => <MenuCard key={item.id} item={item} />)
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
