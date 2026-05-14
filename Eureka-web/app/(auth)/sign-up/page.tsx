"use client";

import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import useAuthStore from "@/store/auth.store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SignUp() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const submit = async () => {
    const { name, phone } = form;

    if (!name.trim() || !phone.trim()) {
      toast.error("Please enter your name and phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(name, phone);
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 bg-white rounded-lg p-5">
      <CustomInput
        label="Full name"
        placeholder="Enter your full name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
      />

      <CustomInput
        label="Phone number"
        placeholder="Enter your phone number"
        value={form.phone}
        type="tel"
        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
      />

      <CustomButton title="Sign Up" isLoading={isSubmitting} onClick={submit} />

      <div className="flex justify-center flex-row gap-2 px-1">
        <span className="base-regular text-gray-100">Already have an account?</span>
        <Link href="/sign-in" className="base-bold text-primary">
          Sign In
        </Link>
      </div>
    </div>
  );
}
