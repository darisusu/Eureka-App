import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Profile = () => {
  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerClassName="px-6 pt-8 pb-24">
        <Text className="h1-bold text-dark-100">Profile</Text>

        <View className="mt-6">
          <Text className="paragraph-bold text-dark-100">Name</Text>
          <Text className="paragraph-medium text-gray-100 mt-1">
            Darius Deng
          </Text>
        </View>

        <View className="mt-4">
          <Text className="paragraph-bold text-dark-100">Email</Text>
          <Text className="paragraph-medium text-gray-100 mt-1">
            darius@eureka.app
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
