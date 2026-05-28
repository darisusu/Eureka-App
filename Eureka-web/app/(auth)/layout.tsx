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
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-dark-100 text-center">
            Welcome to EUREKA
          </h1>
          <Image
            src={fishDefault}
            alt="Eureka mascot"
            width={140}
            height={140}
            className="object-contain"
          />
        </div>
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
