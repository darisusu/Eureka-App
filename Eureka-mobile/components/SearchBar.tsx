import { images } from "@/constants";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, TextInput, TouchableOpacity, View } from "react-native";

const SearchBar = () => {
  const params = useLocalSearchParams<{ query?: string }>(); // get query from URL
  const [query, setQuery] = useState(params.query || ""); // initial state is query from URL or empty string

  const handleSearch = (text: string) => {
    setQuery(text);

    if (!text) {
      router.setParams({ query: undefined }); // remove query from URL if empty
    }
  };

  const handleSubmit = () => {
    if (query.trim()) {
      router.setParams({ query });
    }
  };

  const handleClear = () => {
    setQuery("");
    router.setParams({ query: "" });
  };

  return (
    <View className="flex-row items-center rounded-full border border-gray-60 background bg-slate-50">
      
      <TouchableOpacity className="pl-4" onPress={() => router.setParams({ query })} >
        <Image
          source={images.search}
          className="size-6"
          resizeMode="contain"
          tintColor="#5D5F6D"
        />
      </TouchableOpacity>

      <TextInput
        className="flex-1 p-5"
        placeholder="Search for food you want..."
        value={query}
        onChangeText={handleSearch}
        onSubmitEditing={handleSubmit}
        placeholderTextColor={"#A0A0A0"}
        returnKeyType="search"
      />

      {query.length > 0 && (
        <TouchableOpacity className="mr-4" onPress={() => handleClear()}>
          <Ionicons name="close-circle" size={24} color="#A0A0A0" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SearchBar;
