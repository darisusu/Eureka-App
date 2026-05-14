"use client";

import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import { signIn } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SignIn() {
  const router = useRouter();
  const { fetchAuthenticatedUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = async () => {
    const { email, password } = form;

    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      const user = await fetchAuthenticatedUser();
      router.replace(user?.role === "staff" ? "/staff" : "/");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 bg-white rounded-lg p-5">
      <CustomInput
        label="Email"
        placeholder="Enter your email"
        value={form.email}
        type="email"
        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
      />

      <CustomInput
        label="Password"
        placeholder="Enter your password"
        value={form.password}
        type="password"
        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
      />

      <CustomButton title="Sign In" isLoading={isSubmitting} onClick={submit} />

      <div className="flex justify-center flex-row gap-2 px-1">
        <span className="base-regular text-gray-100">
          Don&apos;t have an account?
        </span>
        <Link href="/sign-up" className="base-bold text-primary">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
