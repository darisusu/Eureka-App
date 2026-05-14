"use client";

import useAuthStore from "@/store/auth.store";
import Image from "next/image";
import { useRouter } from "next/navigation";
import fishDefault from "@/assets/mascots/Fish-Default.png";
import { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(user?.role === "staff" ? "/staff" : "/search");
    }
  }, [isAuthenticated, user?.role, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-2">
          <h1 className="text-2xl font-bold text-dark-100 text-center">
            Welcome to EUREKA
          </h1>
          <Image
            src={fishDefault}
            alt="Eureka mascot"
            width={256}
            height={256}
            className="object-contain -mt-6"
          />
        </div>
        <div className="w-full -mt-20">
          {children}
        </div>
      </div>
    </div>
  );
}
