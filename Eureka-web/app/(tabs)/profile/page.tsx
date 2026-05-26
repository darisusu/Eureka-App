"use client";

import CustomButton from "@/components/CustomButton";
import { RECENT_ORDERS_LIMIT, STATUS_CONFIG } from "@/lib/config";
import { getRecentOrders } from "@/lib/supabase";
import useAuthStore from "@/store/auth.store";
import useOrdersStore from "@/store/orders.store";
import { ArrowLeft, ChevronRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Profile() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const { user, logout } = useAuthStore();
  const recentOrders = useOrdersStore((state) => state.recentOrders);
  const setRecentOrders = useOrdersStore((state) => state.setRecentOrders);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.id) {
        setRecentOrders([]);
        return;
      }

      setIsOrdersLoading(true);
      try {
        const orders = await getRecentOrders({
          userId: user.id,
          limit: RECENT_ORDERS_LIMIT,
        });
        setRecentOrders(orders);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load past orders.");
      } finally {
        setIsOrdersLoading(false);
      }
    };

    void loadOrders();
  }, [user?.id]);

  const handleSignOut = () => {
    setIsSigningOut(true);
    logout();
    router.replace("/sign-in");
  };

  return (
    <div className="bg-white min-h-screen overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-24">
        <Link
          href="/search"
          className="flex items-center gap-1.5 text-gray-100 hover:text-dark-100 transition-colors mb-6 -ml-0.5 w-fit"
        >
          <ArrowLeft size={17} strokeWidth={2.5} />
          <span className="body-medium">Back to Menu</span>
        </Link>

        <h1 className="h1-bold text-dark-100">Profile</h1>

        <div className="mt-6">
          <p className="paragraph-bold text-dark-100">Name</p>
          <p className="paragraph-medium text-gray-100 mt-1">{user?.name ?? "—"}</p>
        </div>

        <div className="mt-4">
          <p className="paragraph-bold text-dark-100">Phone</p>
          <p className="paragraph-medium text-gray-100 mt-1">{user?.phone ?? "—"}</p>
        </div>

        <div className="mt-8">
          <h2 className="h3-bold text-dark-100">Recent Orders</h2>
          <div className="mt-4 flex flex-col gap-4">
            {isOrdersLoading ? (
              <p className="paragraph-medium text-gray-200">Loading recent orders...</p>
            ) : recentOrders.length === 0 ? (
              <p className="paragraph-medium text-gray-200">No recent orders yet.</p>
            ) : (
              recentOrders.map((order) => {
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending_payment;
                return (
                  <Link
                    key={order.orderId}
                    href={`/order/${order.orderId}`}
                    className="block border border-gray-200 rounded-2xl p-4 bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="paragraph-bold text-dark-100">
                        {order.orderNumber}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="body-regular text-gray-100">
                          {order.dateLabel}
                        </span>
                        <ChevronRight size={15} className="text-gray-100 flex-shrink-0" />
                      </div>
                    </div>
                    <p className="body-regular text-gray-100 mt-2 line-clamp-1">
                      {order.itemsSummary}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="paragraph-bold text-dark-100">
                        ${order.total.toFixed(2)}
                      </span>
                      <span className={`small-bold px-2.5 py-1 rounded-full ${statusCfg.bgColor} ${statusCfg.textColor}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <CustomButton
          title="Log out"
          className="mt-10 bg-red-500"
          leftIcon={<LogOut size={18} color="#fff" className="mr-2" />}
          isLoading={isSigningOut}
          onClick={handleSignOut}
        />
      </div>
    </div>
  );
}
