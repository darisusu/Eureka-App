import type { Category } from "@/type";
import cn from "clsx";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, Text, TouchableOpacity } from "react-native";

const Filter = ({ categories }: { categories: Category[] }) => {
  const searchParams = useLocalSearchParams();
  const [active, setActive] = useState(searchParams.category || "");

  const handlePress = (id: string) => {
    setActive(id);
    if (id === "all") {
      router.setParams({ category: undefined });
    } else {
      router.setParams({ category: id });
    }
  };

  // the buttons for categories
  const filterData: (Category | { $id: string; name: string })[] = categories // array contains those that have databse items + those dont dont have (just 'all')
    ? [{ $id: "all", name: "All" }, ...categories]
    : [{ $id: "all", name: "All" }]; // if no categories, just show All

  return (
    <FlatList
      data={filterData}
      keyExtractor={(item) => item.$id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="pb-3 gap-x-2"
      renderItem={({ item }) => (
        <TouchableOpacity
          key={item.$id}
          className={cn(
            "filter",
            active === item.$id ? "bg-amber-500" : "bg-white"
          )}
          style={
            Platform.OS === "android"
              ? { elevation: 5, shadowColor: "#878787" }
              : {}
          }
          onPress={() => handlePress(item.$id)}
        >
          <Text
            className={cn(
              "body-medium",
              active === item.$id ? "text-white" : "text-gray-200"
            )}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
};

export default Filter;
