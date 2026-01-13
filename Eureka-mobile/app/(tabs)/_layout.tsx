import CheckoutBar from "@/components/CheckoutBar";
import { images } from "@/constants";
import useAuthStore from "@/store/auth.store";
import type { TabBarIconProps } from "@/type";
import cn from "clsx";
import { Redirect, Tabs, usePathname } from "expo-router";
import { Image, Text, View } from "react-native";

const TabBarIcon = ({ focused, icon, title }: TabBarIconProps) => (
  <View className="tab-icon">
    <Image
      source={icon}
      className="size-7"
      resizeMode="contain"
      tintColor={focused ? "#FE8C00" : "#5D5F6D"}
    />

    <Text
      className={cn(
        "text-sm font-bold",
        focused ? "text-primary" : "text-gray-200"
      )}
    >
      {title}
    </Text>
  </View>
);

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  if (!isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }
  const tabBarHeight = 80;
  const tabBarBottom = 40;
  const checkoutBarGap = 12;
  const showCheckoutBar = pathname === "/search";

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            borderTopLeftRadius: 50,
            borderTopRightRadius: 50,
            borderBottomLeftRadius: 50,
            borderBottomRightRadius: 50,
            marginHorizontal: 20,
            height: tabBarHeight,
            position: "absolute",
            bottom: tabBarBottom,
            backgroundColor: "white",
            shadowColor: "#1a1a1a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon title="Home" icon={images.home} focused={focused} />
            ),
          }}
        />

      <Tabs.Screen
        name="search"
        options={{
          title: "Menu",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Menu" icon={images.search} focused={focused} />
          ),
        }}
      />

        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon title="Cart" icon={images.bag} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                title="Profile"
                icon={images.person}
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>
      {showCheckoutBar && (
        <CheckoutBar
          bottomOffset={tabBarBottom + tabBarHeight + checkoutBarGap}
        />
      )}
    </View>
  );
}
