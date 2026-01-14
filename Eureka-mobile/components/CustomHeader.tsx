import { useRouter, type Href } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { images } from "@/constants";
import { CustomHeaderProps } from "@/type";

const CustomHeader = ({
  title,
  backHref,
}: CustomHeaderProps & { backHref?: Href }) => {
  const router = useRouter();

  return (
    <View className="custom-header">
      <TouchableOpacity
        onPress={() => (backHref ? router.replace(backHref) : router.back())}
      >
        <Image
          source={images.arrowBack}
          className="size-5"
          resizeMode="contain"
        />
      </TouchableOpacity>

      {title && <Text className="base-semibold text-dark-100">{title}</Text>}

      <Image source={images.search} className="size-5" resizeMode="contain" />
    </View>
  );
};

export default CustomHeader;
