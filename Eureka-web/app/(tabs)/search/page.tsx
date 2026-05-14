"use client";

import Filter from "@/components/Filter";
import MenuCard from "@/components/MenuCard";
import SearchBar from "@/components/SearchBar";
import { getCategories, getMenu } from "@/lib/appwrite";
import useAppwrite from "@/lib/useAppwrite";
import type { Category, MenuItem } from "@/type";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SearchInner() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const query = searchParams.get("query") ?? "";

  const { data, refetch, loading } = useAppwrite({
    fn: getMenu,
    params: { category, query },
  });

  const { data: categories } = useAppwrite({ fn: getCategories });

  useEffect(() => {
    refetch({ category, query });
  }, [category, query]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mt-5 mb-2 flex flex-col gap-4 px-5">
          <div className="flex justify-between items-center gap-3">
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-3">
              <p className="paragraph-regular text-gray-200">
                Estimated time{" "}
                <span className="paragraph-bold text-primary">20</span> min
              </p>
            </div>
          </div>
          <SearchBar />
          <Filter categories={(categories as unknown as Category[]) || []} />
        </div>

        <div className="grid grid-cols-2 gap-7 px-5 pb-40">
          {loading ? (
            <p className="col-span-2 paragraph-medium text-gray-200 text-center py-8">
              Loading...
            </p>
          ) : !data || data.length === 0 ? (
            <p className="col-span-2 paragraph-medium text-gray-200 text-center py-8">
              No results found.
            </p>
          ) : (
            data.map((item) => (
              <MenuCard key={item.$id} item={item as unknown as MenuItem} />
            ))
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
