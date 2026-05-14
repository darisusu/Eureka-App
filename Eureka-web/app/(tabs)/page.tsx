"use client";

import { getOrderStatus } from "@/lib/supabase";
import useOrdersStore from "@/store/orders.store";
import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 10_000;
const ACTIVE_STATUSES = new Set(["received", "preparing", "ready"]);

const parseItemsSummary = (summary: string) =>
  summary
    .split(", ")
    .map((entry) => {
      const match = entry.match(/^(\d+)x\s+(.*)$/);
      if (match) return { qty: Number(match[1]), name: match[2] };
      return { qty: 1, name: entry };
    })
    .filter((entry) => entry.name.trim().length > 0);

const formatEta = (iso: string) => {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (diffMin <= 0) return null;
  const time = new Date(iso).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `Ready by ~${time} (${diffMin} min)`;
};

export default function Home() {
  const latestOrder = useOrdersStore((state) => state.recentOrders[0]);
  const updateRecentOrderStatus = useOrdersStore((s) => s.updateRecentOrderStatus);

  useEffect(() => {
    if (!latestOrder || !ACTIVE_STATUSES.has(latestOrder.status)) return;

    const poll = async () => {
      const status = await getOrderStatus(latestOrder.orderId);
      if (status && status !== latestOrder.status) {
        updateRecentOrderStatus(latestOrder.orderId, status);
      }
    };

    void poll();
    const id = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [latestOrder?.orderId, latestOrder?.status, updateRecentOrderStatus]);

  const hasActiveOrder = latestOrder && ACTIVE_STATUSES.has(latestOrder.status);
  const isReady = latestOrder?.status === "ready";
  const orderNumber = latestOrder?.orderNumber?.startsWith("#")
    ? latestOrder.orderNumber
    : latestOrder ? `#${latestOrder.orderNumber}` : null;
  const items = latestOrder ? parseItemsSummary(latestOrder.itemsSummary) : [];
  const etaLabel = latestOrder?.readyAt ? formatEta(latestOrder.readyAt) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start">
      {/* Header */}
      <div className="w-full bg-gray-50 flex items-center justify-center py-12">
        <h1
          className="text-primary font-black text-[clamp(4rem,15vw,8rem)] leading-none tracking-tight opacity-90 select-none"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Eureka
        </h1>
      </div>

      <div className="w-full max-w-md px-6 -mt-10 flex flex-col gap-4">
        {/* Ready for collection */}
        {isReady && (
          <div className="bg-green-500 rounded-2xl shadow-lg overflow-hidden border border-green-400">
            <div className="p-6 text-center">
              <div className="text-5xl mb-3">🛎️</div>
              <p className="text-white text-2xl font-black tracking-tight">
                Your order is ready!
              </p>
              <p className="text-green-100 text-base font-medium mt-1">
                Please collect at the counter
              </p>
              {orderNumber && (
                <div className="mt-4 inline-block bg-white/20 rounded-full px-5 py-2">
                  <span className="text-white text-lg font-bold">{orderNumber}</span>
                </div>
              )}
            </div>
            {items.length > 0 && (
              <div className="bg-white/10 px-6 py-4">
                {items.map((item, i) => (
                  <p key={i} className="text-white text-sm font-medium">
                    {item.qty}x {item.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Order in progress (received / preparing) */}
        {hasActiveOrder && !isReady && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-orange-500 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Package size={20} color="white" />
                <span className="text-white text-xl font-bold">
                  Order {orderNumber}
                </span>
              </div>
              <p className="text-orange-100 text-base font-medium">
                Your order is being prepared
              </p>
            </div>
            <div className="p-6">
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm">—</p>
              ) : (
                items.map((item, i) => (
                  <p key={i} className="text-gray-800 text-lg font-medium mb-2">
                    {item.qty}x&nbsp;&nbsp;{item.name}
                  </p>
                ))
              )}
              <div className="h-px bg-gray-100 my-4" />
              <p className="text-sm font-semibold text-gray-500">
                Estimated wait
              </p>
              <p className="text-orange-500 text-base font-bold mt-0.5">
                {etaLabel ?? "20–30 min"}
              </p>
            </div>
          </div>
        )}

        <Link
          href="/search"
          className="block w-full bg-primary rounded-full py-4 px-6 text-center text-white text-lg font-bold hover:opacity-90 transition-opacity"
        >
          Order Now
        </Link>
      </div>
    </div>
  );
}
