import { appwriteConfig } from "@/lib/appwrite";
import type { MenuItem } from "@/type";
import React from "react";
import { Image, Platform, Text, TouchableOpacity } from "react-native";

const MenuCard = ({ item: { image_url, name, price } }: { item: MenuItem }) => {
  const imageUrl = `${image_url}?project=${appwriteConfig.projectId}`; // go to appwrite storage, query by appending project id

  return (
    <TouchableOpacity
      className="menu-card"
      style={
        Platform.OS === "android"
          ? { elevation: 10, shadowColor: "#878787" }
          : {}
      }
    >
      <Image
        source={{ uri: imageUrl }}
        className="size-32 absolute -top-10"
        resizeMode="contain"
      />
      <Text className="text-center base-bold text-dark-100 mb-2">{name}</Text>
      <Text className="body-regular text-gray-200 mb-4">From ${price}</Text>
      <TouchableOpacity>
        <Text className="paragraph-bold text-primary">Add to Cart +</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default MenuCard;
