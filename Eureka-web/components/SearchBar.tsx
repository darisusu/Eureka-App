"use client";

import { Search, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const SearchBar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");

  const handleChange = (text: string) => {
    setQuery(text);
    const params = new URLSearchParams(searchParams.toString());
    if (!text) {
      params.delete("query");
    } else {
      params.set("query", text);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("query");
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-row items-center rounded-full border border-gray-200 bg-slate-50 px-4 gap-2">
      <button onClick={() => handleChange(query)} className="flex-shrink-0">
        <Search size={22} color="#5D5F6D" />
      </button>

      <input
        type="search"
        className="flex-1 py-2 px-2 bg-transparent outline-none text-dark-100 paragraph-medium placeholder:text-gray-400"
        placeholder="Search for food you want..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />

      {query.length > 0 && (
        <button onClick={handleClear} className="flex-shrink-0">
          <XCircle size={22} color="#A0A0A0" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
