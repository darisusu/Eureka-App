"use client";

import CustomButton from "@/components/CustomButton";
import CustomInput from "@/components/CustomInput";
import useAuthStore from "@/store/auth.store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function SignIn() {
  const router = useRouter();
  const { signIn, verifyPin } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [pin, setPin] = useState("");

  const submitPhone = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await signIn(phone);
      if (result.status === "invalid_phone") {
        toast.error("Please enter a valid phone number.");
        return;
      }
      if (result.status === "not_found") {
        toast.error("Phone number not found. New customer? Please sign up below.");
        return;
      }
      if (result.status === "pin_required") {
        setStep("pin");
        return;
      }
      router.replace("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPin = async () => {
    if (!pin.trim()) {
      toast.error("Please enter your PIN.");
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await verifyPin(pin);
      if (!ok) {
        toast.error("Incorrect PIN. Please try again.");
        setPin("");
        return;
      }
      router.replace("/staff");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "pin") {
    return (
      <div className="flex flex-col gap-10 bg-white rounded-lg p-5">
        <CustomInput
          label="Staff PIN"
          placeholder="Enter your PIN"
          value={pin}
          type="password"
          onChange={(e) => setPin(e.target.value)}
        />

        <CustomButton title="Verify PIN" isLoading={isSubmitting} onClick={submitPin} />

        <div className="flex justify-center flex-row gap-2 px-1">
          <button
            className="base-regular text-gray-100 underline"
            onClick={() => { setStep("phone"); setPin(""); }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 bg-white rounded-lg p-5">
      <CustomInput
        label="Phone number"
        placeholder="Enter your phone number"
        value={phone}
        type="tel"
        onChange={(e) => setPhone(e.target.value)}
      />

      <CustomButton title="Sign In" isLoading={isSubmitting} onClick={submitPhone} />

      <div className="flex justify-center flex-row gap-2 px-1">
        <span className="base-regular text-gray-100">New customer?</span>
        <Link href="/sign-up" className="base-bold text-primary">
          Sign Up
        </Link>
      </div>
    </div>
  );
}
