import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import React from 'react'
import { CustomButtonProps } from '@/type'
import cn from "clsx"

// prevents multiple clicks on button when loading
const CustomButton = ({
  onPress,
  title = "Click Me",
  style,
  textStyle, 
  leftIcon, // optional icon on left side of button
  isLoading = false, // allows button to show loading state for async actions
}: CustomButtonProps) => {
  return (
    <TouchableOpacity
      className={cn('custom-btn', style, isLoading && 'opacity-50')}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      <View className="flex-center flex-row">
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            {leftIcon}
            <Text className={cn('text-white-100 paragraph-semibold', textStyle)}>
              {title}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};



export default CustomButton