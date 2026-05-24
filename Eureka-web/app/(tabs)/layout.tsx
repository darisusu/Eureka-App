"use client";

import CartDrawer from "@/components/CartDrawer";
import { useCartStore } from "@/store/cart.store";
import useAuthStore from "@/store/auth.store";
import { ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function TopNav({ onCartOpen }: { onCartOpen: () => void }) {
  const totalItems = useCartStore((s) => s.getTotalItems());
  const totalPrice = useCartStore((s) => s.getTotalPrice());

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white">
      <div className="flex items-center justify-between px-5 py-3 max-w-5xl mx-auto">
        <Link href="/search" className="flex items-center gap-0">
          <span className="text-primary font-quicksand-bold text-3xl tracking-tight">EurekaGO</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fish.png" alt="Eureka fish" className="h-[60px] w-auto object-contain -ml-4 mt-2" />
        </Link>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <button
              onClick={onCartOpen}
              className="flex items-center gap-2.5 bg-primary px-3.5 py-1.5 rounded-full hover:opacity-90 transition-opacity"
              aria-label={`View cart: ${totalItems} items, $${totalPrice.toFixed(2)}`}
            >
              <span className="text-white text-sm font-semibold leading-none">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
              <span className="w-px h-3.5 bg-white/40" />
              <span className="text-white text-sm font-semibold leading-none">
                ${totalPrice.toFixed(2)}
              </span>
            </button>
          )}
          <button
            onClick={onCartOpen}
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-50 transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag size={22} className="text-dark-100" />
            {totalItems > 0 && (
              <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </button>
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
            aria-label="Profile"
          >
            <User size={15} className="text-dark-100" />
            <span className="body-medium text-dark-100">Profile</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function TabLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/sign-in");
    } else if (user?.role === "staff") {
      router.replace("/staff");
    }
  }, [isAuthenticated, user?.role, router]);

  if (!isAuthenticated || user?.role === "staff") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopNav onCartOpen={() => setIsCartOpen(true)} />
      <main className="flex-1 pt-[84px]">
        {children}
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
