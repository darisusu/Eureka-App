import { appwriteConfig } from "@/lib/appwrite";
import { useCartStore } from "@/store/cart.store";
import { MenuItem } from "@/type";
import React, { useState } from "react";
import {
    Image,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const MenuCard = ({ item: { $id, image_url, name, price }}: { item: MenuItem}) => {
    const imageUrl = `${image_url}?project=${appwriteConfig.projectId}`;
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
                <Text
                    className="text-center base-bold text-dark-100 mb-2"
                    numberOfLines={1}
                >
                    {name}
                </Text>
                <Text className="body-regular text-gray-200 mb-4">
                    From ${price}
                </Text>
                <TouchableOpacity onPress={handleOpen}>
                    <Text className="paragraph-bold text-primary">
                        Add to Cart +
                    </Text>
                </TouchableOpacity>
            </TouchableOpacity>

            <Modal
                animationType="fade"
                transparent
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-center px-6">
                    <View className="bg-white rounded-2xl p-5">
                        <View className="flex-row items-center gap-x-4">
                            <Image
                                source={{ uri: imageUrl }}
                                className="size-16 rounded-xl"
                                resizeMode="cover"
                            />
                            <View className="flex-1">
                                <Text
                                    className="base-bold text-dark-100"
                                    numberOfLines={2}
                                >
                                    {name}
                                </Text>
                                <Text className="paragraph-bold text-primary mt-1">
                                    ${price}
                                </Text>
                            </View>
                        </View>

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

                        <View className="flex-row justify-end gap-x-3 mt-5">
                            <TouchableOpacity
                                onPress={() => setIsModalVisible(false)}
                                className="px-4 py-2"
                            >
                                <Text className="paragraph-bold text-gray-200">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddToCart}
                                className="bg-primary px-4 py-2 rounded-full"
                            >
                                <Text className="paragraph-bold text-white">
                                    Add to Cart
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    )
}
export default MenuCard
