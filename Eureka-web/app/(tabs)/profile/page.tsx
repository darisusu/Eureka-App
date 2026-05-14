"use client";

import CustomButton from "@/components/CustomButton";
import { getRecentOrders, signOut } from "@/lib/appwrite";
import useAuthStore from "@/store/auth.store";
import useOrdersStore, { RECENT_ORDERS_LIMIT } from "@/store/orders.store";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Profile() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const { user, isLoading, setIsAuthenticated, setUser } = useAuthStore();
  const recentOrders = useOrdersStore((state) => state.recentOrders);
  const setRecentOrders = useOrdersStore((state) => state.setRecentOrders);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user?.id) {
        if (isLoading) return;
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
  }, [user?.id, isLoading]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      router.replace("/sign-in");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="bg-white min-h-screen overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-24">
        <h1 className="h1-bold text-dark-100">Profile</h1>

        <div className="mt-6">
          <p className="paragraph-bold text-dark-100">Name</p>
          <p className="paragraph-medium text-gray-100 mt-1">
            {isLoading ? "Loading..." : user?.name ?? "—"}
          </p>
        </div>

        <div className="mt-4">
          <p className="paragraph-bold text-dark-100">Email</p>
          <p className="paragraph-medium text-gray-100 mt-1">
            {isLoading ? "Loading..." : user?.email ?? "—"}
          </p>
        </div>

        <div className="mt-8">
          <h2 className="h3-bold text-dark-100">Recent Orders</h2>
          <div className="mt-4 flex flex-col gap-4">
            {isOrdersLoading ? (
              <p className="paragraph-medium text-gray-200">Loading recent orders...</p>
            ) : recentOrders.length === 0 ? (
              <p className="paragraph-medium text-gray-200">No recent orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="border border-gray-200 rounded-2xl p-4 bg-white"
                >
                  <div className="flex justify-between items-center">
                    <span className="paragraph-bold text-dark-100">
                      {order.orderNumber}
                    </span>
                    <span className="paragraph-regular text-gray-200">
                      {order.dateLabel}
                    </span>
                  </div>
                  <p className="paragraph-regular text-gray-200 mt-2">
                    {order.itemsSummary}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="paragraph-bold text-dark-100">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
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
