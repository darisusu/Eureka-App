import { View, Text, Button } from 'react-native'
import React from 'react'
import { router } from 'expo-router'

const SignUp = () => {
  return (
    <View>
      <Text>Sign Up</Text>
      <Button title = "Sign in" onPress = {() => router.push("/sign-in")} />
    </View>
  )
}

export default SignUp