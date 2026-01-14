import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { signIn } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Sentry from "@sentry/react-native";

const SignIn = () => {
  const { fetchAuthenticatedUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false); // [boolean state, function to update the state]
  const [form, setForm] = useState({ email: "", password: "" }); // form holds object: form.email, form.password

  const submit = async () => {
    const {email,password} = form;

    if (!email || !password) {
      return Alert.alert("Error", "Please enter email and password."); // label, message
    }
    setIsSubmitting(true); //updates the isSubmitting state to true
    
    try {

      // Call Appwrite sign-in API function here
      await signIn({email,password});
      await fetchAuthenticatedUser();

      router.replace("/"); // Redirect to home page after successful sign-in

    } catch (error: any) {
      
      Alert.alert('Error', error.message);
      Sentry.captureException(error);

    } finally {
      setIsSubmitting(false); //updates the isSubmitting state to false
    }
  };

  // UI rendering
  return (
    <View className="gap-10 bg-white rounded-lg p-5">
      <CustomInput
        placeholder="Enter your email"
        value={form.email}
        onChangeText={
          (text) => setForm((prev) => ({ ...prev, email: text })) // copy entire form, update only email field with new text
        }
        label="Email"
        keyboardType="email-address"
      />

      <CustomInput
        placeholder="Enter your password"
        value={form.password}
        onChangeText={(text) =>
          setForm((prev) => ({ ...prev, password: text }))
        }
        label="Password"
        secureTextEntry={true}
      />

      <CustomButton
        title="Sign In"
        isLoading={isSubmitting}
        onPress={submit} //call submit funciton
      />

      
      <View className="flex justify-center flex-row gap-2 px-1">
        <Text className="base-regular text-gray-100">
          Don't have an account?
        </Text>

        <Link href="/sign-up" className="base-bold text-primary">
          Sign Up
        </Link>
      </View>
    </View>
  );
};

export default SignIn;
