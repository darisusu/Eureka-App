"use client";

import CheckoutBar from "@/components/CheckoutBar";
import { useCartStore } from "@/store/cart.store";
import useAuthStore from "@/store/auth.store";
import cn from "clsx";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/search", label: "Menu", Icon: Search },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
  { href: "/profile", label: "Profile", Icon: User },
];

function TabNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.getTotalItems());

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex items-center justify-between px-8 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
        <span className="h3-bold text-dark-100">Eureka</span>
        <div className="flex items-center gap-6">
          {tabs.map(({ href, label, Icon }) => {
            const focused = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors",
                  focused ? "text-primary" : "text-gray-400 hover:text-gray-600"
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
                <span className="text-xs font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 z-40 bg-white rounded-full shadow-lg shadow-black/10 px-4 py-3 flex items-center justify-around">
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
    </>
  );
}

export default function TabLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }
  if (user?.role === "staff") {
    redirect("/staff");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TabNav />
      <main className="flex-1 pb-32 md:pb-0">
        {children}
      </main>
      <CheckoutBar />
    </div>
  );
}
