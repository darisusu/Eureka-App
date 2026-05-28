"use client";

import CartDrawer from "@/components/CartDrawer";
import CheckoutBar, { CHECKOUT_BAR_HEIGHT } from "@/components/CheckoutBar";
import { useCartStore } from "@/store/cart.store";
import useAuthStore from "@/store/auth.store";
import { ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function TopNav({ onCartOpen }: { onCartOpen: () => void }) {
  const totalItems = useCartStore((s) => s.getTotalItems());
  const pathname = usePathname();
  const router = useRouter();

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/search") {
      e.preventDefault();
      router.push("/search");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white">
      <div className="flex items-center justify-between px-5 py-2 max-w-5xl mx-auto">
        <Link href="/search" className="flex items-center gap-0" onClick={handleLogoClick}>
          <span className="text-primary font-quicksand-bold text-2xl tracking-tight">EurekaGO</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fish.png" alt="Eureka fish" className="h-[44px] w-auto object-contain -ml-3" />
        </Link>
        <div className="flex items-center gap-2">
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
  const isCartOpen = useCartStore((s) => s.isCartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const totalItems = useCartStore((s) => s.getTotalItems());

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
    <div className="min-h-screen flex flex-col bg-primary/15">
      <TopNav onCartOpen={() => setCartOpen(true)} />
      <main
        className="flex-1 pt-[60px]"
        style={{ paddingBottom: totalItems > 0 ? CHECKOUT_BAR_HEIGHT : 0 }}
      >
        {children}
      </main>
      <CartDrawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} />
      <CheckoutBar onOpen={() => setCartOpen(true)} />
    </div>
  );
}
