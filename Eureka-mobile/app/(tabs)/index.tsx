import CartButton from "@/components/CartButton";
import { images, offers } from "@/constants";
import useAuthStore from "@/store/auth.store";
import cn from "clsx";
import { Fragment } from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const { user } = useAuthStore();

  //console.log("USER:", JSON.stringify(user,null,2));

  return (
    <SafeAreaView className="bg-white">
      <FlatList
        data={offers}
        renderItem={({ item, index }) => {
          const isEven: boolean = index % 2 === 0;

          return (
            <View>
              <Pressable
                className={cn(
                  "offer-card overflow-hidden",
                  isEven ? "flex-row-reverse" : "flex-row"
                )}
                style={{ backgroundColor: item.color }}
                android_ripple={{ color: "#fffff22" }}
              >
                {({ pressed }) => (
                  <Fragment>
                    <View className={"h-full w-1/2"}>
                      <Image
                        source={item.image}
                        className={"size-full"}
                        resizeMode={"contain"}
                      />
                    </View>

                    <View
                      className={cn(
                        "flex-1 justify-center",
                        isEven ? "pl-5" : "pr-5"
                      )}
                    >
                      <Text
                        numberOfLines={2}
                        className="h1-bold text-white leading-tight uppercase"
                      >
                        {item.title}
                      </Text>

                      <Image
                        source={images.arrowRight}
                        className="size-8 mt-2"
                        resizeMode="contain"
                        tintColor="#FFFFFF"
                      />
                    </View>
                  </Fragment>
                )}
              </Pressable>
            </View>
          );
        }}
        contentContainerClassName="pb-28 px-5"
        // Header components
        ListHeaderComponent={() => (
          <View className="flex-between flex-row w-full my-5 ">
            <View className="flex-start">
              <Text className="small-bold text-primary"> DELIVER TO </Text>

              <TouchableOpacity className="flex-center flex-row gap-x-1 mt-0.5">
                <Text className="paragraph-bold text-dark-100">Singapore</Text>
                <Image
                  source={images.arrowDown}
                  className="size-3"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <CartButton />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
