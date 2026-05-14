"use client";

import CheckoutBar from "@/components/CheckoutBar";
import { useCartStore } from "@/store/cart.store";
import useAuthStore from "@/store/auth.store";
import cn from "clsx";
import { Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const tabs = [
  { href: "/search", label: "Menu", Icon: Search },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
  { href: "/profile", label: "Profile", Icon: User },
];

function TabNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.getTotalItems());

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-40 bg-white rounded-full shadow-lg shadow-black/10 px-4 py-3 flex items-center justify-around">
      {tabs.map(({ href, label, Icon }) => {
        const focused = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-3",
              focused ? "text-primary" : "text-gray-400"
            )}
          >
            <div className="relative">
              <Icon size={22} />
              {label === "Cart" && totalItems > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function TabLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

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
      <TabNav />
      <main className="flex-1 pb-32">
        {children}
      </main>
      <CheckoutBar />
    </div>
  );
}
