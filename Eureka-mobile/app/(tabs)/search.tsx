import CartButton from "@/components/CartButton";
import Filter from "@/components/Filter";
import MenuCard from "@/components/MenuCard";
import { CHECKOUT_BAR_HEIGHT } from "@/components/CheckoutBar";
import SearchBar from "@/components/SearchBar";
import { getCategories, getMenu } from "@/lib/appwrite";
import useAppwrite from "@/lib/useAppwrite";
import type { Category, MenuItem } from "@/type";
import cn from "clsx";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";


const Search = () => {
  const insets = useSafeAreaInsets();
  const { category, query } = useLocalSearchParams<{
    // get category and query from URL
    query: string;
    category: string;
  }>();

  const { data, refetch, loading } = useAppwrite({
    fn: getMenu,
    params: { category, query, limit: 6 },
  });

  const { data: categories } = useAppwrite({ fn: getCategories });

  useEffect(() => {
    refetch({ category, query, limit: 6 });
  }, [category, query]); // runs function when category or query changes

  return (
    <SafeAreaView className="bg-gray-50 h-full">
      <View className="mt-5 mb-2 gap-4 px-5">
        <View className="flex-between flex-row w-full items-center gap-3">
          <View className="flex-1">
            <View className="bg-white border border-gray-200 rounded-2xl px-5 py-3">
              <Text className="paragraph-regular text-gray-200">
                Preparing{" "}
                <Text className="paragraph-bold text-primary">5</Text> orders,
                estimated time{" "}
                <Text className="paragraph-bold text-primary">20</Text> min
              </Text>
            </View>
          </View>
          <CartButton />
        </View>
        <SearchBar />
        <Filter categories={(categories as unknown as Category[]) || []} />
      </View>
      <FlatList
        data={data}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View className={cn("flex-1 max-w-[48%]")}>
            <MenuCard item={item as unknown as MenuItem} />
          </View>
        )}
        keyExtractor={(item) => item.$id} // distinct key for each item
        numColumns={2} // 2 columns for grid layout
        columnWrapperClassName="gap-7"
        contentContainerClassName="gap-7 px-5"
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + 40 + 80 + 12 + CHECKOUT_BAR_HEIGHT + 16,
        }}
        ListEmptyComponent={() => !loading && <Text>No results</Text>}
      />
    </SafeAreaView>
  );
};

export default Search;
