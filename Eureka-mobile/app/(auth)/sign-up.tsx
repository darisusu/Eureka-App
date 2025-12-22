import { View, Text, Button, Alert } from 'react-native'
import React, { use, useState } from 'react'
import { Link, router } from 'expo-router'
import CustomInput from '@/components/CustomInput'
import CustomButton from '@/components/CustomButton'

const SignUp = () => {

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [form, setForm] = useState({name: '', email: '', password: ''}); 

  const submit = async () => {
    if (!form.name || !form.email || !form.password) {
      return Alert.alert('Error', 'Please enter name, email and password.'); 
    } 

    setIsSubmitting(true); //updates the isSubmitting state to true
    try {
      // Call Appwrite sign-up API function here

      Alert.alert('Success', 'You have signed up successfully!');
      router.replace('/'); // Redirect to home page after successful sign-in
    } catch (error: any) {
      Alert.alert('Error', 'Failed to sign up. Please check your credentials.');
    } finally {
      setIsSubmitting(false); //updates the isSubmitting state to false
    }
  } 


  
  return (
    <View className = "gap-10 bg-white rounded-lg p-5 mt-5">
        
        <CustomInput
          placeholder = "Enter your full name"
          value = {form.name}
          onChangeText={(
            text) => setForm((prev) => ({...prev, name: text})) // copy entire from object from prev, update only email field with new text
          }
          label = "Full name"
          // default keyboardType is "default"
        />
   
        <CustomInput
          placeholder = "Enter your email"
          value = {form.email}
          onChangeText={(
            text) => setForm((prev) => ({...prev, email: text})) // copy entire from object from prev, update only email field with new text
          }
          label = "Email"
          keyboardType = "email-address" 
        />

        <CustomInput
          placeholder = "Enter your password"
          value = {form.password}
          onChangeText={(text) => setForm((prev) => ({...prev, password: text}) )}
          label = "Password"
          secureTextEntry = {true}
        />

        <CustomButton
            title = "Sign Up"
            isLoading = {isSubmitting}
            onPress = {submit} //call submit funciton
        />

        <View className = "flex justify-center mt-5 flex-row gap-2 px-1">
          <Text className = "base-regular text-gray-100">
            Already have an account?
          </Text>

          <Link href= "/sign-in" className = "base-bold text-primary">
            Sign In
          </Link>
        </View>

    </View>
  )
}


export default SignUp