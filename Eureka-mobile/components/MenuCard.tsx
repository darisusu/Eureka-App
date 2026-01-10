import { appwriteConfig } from "@/lib/appwrite";
import { useCartStore } from "@/store/cart.store";
import { MenuItem } from "@/type";
import { images } from "@/constants";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MenuCard = ({
  item: { $id, image_url, name, price, description },
}: {
  item: MenuItem;
}) => {
  // check if image_url exists, if so append project param for Appwrite access
  const imageUrl = image_url
    ? `${image_url}${image_url.includes("?") ? "&" : "?"}project=${
        appwriteConfig.projectId
      }`
    : "";
    
  const { addItem } = useCartStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [specialRequest, setSpecialRequest] = useState("");

  const handleOpen = () => {
    setSpecialRequest("");
    setIsModalVisible(true);
  };

  const handleAddToCart = () => {
    addItem({
      id: $id,
      name,
      price,
      image_url: imageUrl,
      specialRequest: specialRequest.trim() || undefined,
    });
    setIsModalVisible(false);
    setSpecialRequest("");
  };

  return (
    <>
      <View
        className="menu-card h-[260px]"
        style={
          Platform.OS === "android"
            ? { elevation: 10, shadowColor: "#878787" }
            : {}
        }
      >
        <View className="relative">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-36 rounded-2xl"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={handleOpen}
            className="absolute right-3 bottom-3 bg-primary rounded-full w-10 h-10 flex-center"
          >
            <Image
              source={images.plus}
              className="w-5 h-5"
              resizeMode="contain"
              tintColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
        <View className="mt-3 flex-1">
          <Text className="base-bold text-dark-100" numberOfLines={2}>
            {name}
          </Text>
          <Text className="h3-bold text-dark-100 mt-2">${price}</Text>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View className="bg-white rounded-2xl p-5">
              {/* Header Section */}
              <View className="flex-row items-center gap-x-4">
                <Image
                  source={{ uri: imageUrl }}
                  className="size-16 rounded-xl"
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <Text className="base-bold text-dark-100" numberOfLines={2}>
                    {name}
                  </Text>
                  <Text className="paragraph-bold text-primary mt-1">
                    ${price}
                  </Text>
                </View>
              </View>
              {!!description && (
                <Text className="paragraph-regular text-gray-200 mt-3">
                  {description}
                </Text>
              )}

              {/* Input Section */}
              <Text className="paragraph-regular text-gray-200 mt-4">
                Note to restaurant / Special Request (optional)
              </Text>
              <TextInput
                className="mt-2 rounded-lg border border-gray-200 p-3 text-sm"
                placeholder="Add your request (subject to restaurant discretion)"
                placeholderTextColor="#A0A0A0"
                maxLength={200}
                value={specialRequest}
                onChangeText={setSpecialRequest}
              />

              {/* Action Buttons */}
              <View className="flex-row justify-end gap-x-3 mt-5">
                <TouchableOpacity
                  onPress={() => setIsModalVisible(false)}
                  className="px-4 py-2"
                >
                  <Text className="paragraph-bold text-gray-200">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddToCart}
                  className="bg-primary px-4 py-2 rounded-full"
                >
                  <Text className="paragraph-bold text-white">Add to Cart</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

export default MenuCard;
