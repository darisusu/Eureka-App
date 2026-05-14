"use client";

import { getOrderStatus } from "@/lib/supabase";
import useOrdersStore from "@/store/orders.store";
import { Package } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 10_000;
const ACTIVE_STATUSES = new Set(["received", "preparing", "ready"]);

const preparationSteps = ["received", "preparing", "ready"];

const statusTextMap: Record<string, string> = {
  received: "Your Order Was Received",
  preparing: "Your Order Is Being Prepared",
  ready: "Your Order Is Ready",
};

const parseItemsSummary = (summary: string) =>
  summary
    .split(", ")
    .map((entry) => {
      const match = entry.match(/^(\d+)x\s+(.*)$/);
      if (match) return { qty: Number(match[1]), name: match[2] };
      return { qty: 1, name: entry };
    })
    .filter((entry) => entry.name.trim().length > 0);

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

    const id = setInterval(() => { void poll(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [latestOrder?.orderId, latestOrder?.status]);

  const orderDetails = latestOrder
    ? {
        id: latestOrder.orderNumber.startsWith("#")
          ? latestOrder.orderNumber
          : `#${latestOrder.orderNumber}`,
        status: latestOrder.status,
        items: parseItemsSummary(latestOrder.itemsSummary),
      }
    : { id: "#-", status: "pending_payment", items: [] };

  const currentStatus = orderDetails.status;
  const statusText = preparationSteps.includes(currentStatus)
    ? statusTextMap[currentStatus]
    : "Pending order";
  const progressPct = preparationSteps.includes(currentStatus)
    ? ((preparationSteps.indexOf(currentStatus) + 1) / preparationSteps.length) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start">
      {/* Header banner */}
      <div className="w-full bg-gray-50 flex items-center justify-center py-12">
        <h1
          className="text-primary font-black text-[clamp(4rem,15vw,8rem)] leading-none tracking-tight opacity-90 select-none"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Eureka
        </h1>
      </div>

      <div className="w-full max-w-md px-6 -mt-10">
        {/* Order card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-100">
          {/* Card header */}
          <div className="bg-orange-500 p-5">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <Package size={20} color="white" />
                <span className="text-white text-xl font-bold">
                  Order {orderDetails.id}
                </span>
              </div>
            </div>
            <p className="text-orange-100 text-base font-medium mt-1">
              {statusText}
            </p>
          </div>

          {/* Card body */}
          <div className="p-6 bg-white">
            {orderDetails.items.length === 0 ? (
              <p className="text-gray-800 text-lg font-medium">-</p>
            ) : (
              orderDetails.items.map((item, index) => (
                <div key={index} className="flex items-center mb-3">
                  <span className="text-gray-800 text-lg font-medium">
                    {item.qty}x&nbsp;&nbsp;{item.name}
                  </span>
                </div>
              ))
            )}

            <div className="h-px bg-gray-100 my-6" />

            {/* Progress bar */}
            <div>
              <div className="flex justify-between mb-2">
                {preparationSteps.map((step, index) => {
                  const isDone =
                    preparationSteps.indexOf(currentStatus) >= index;
                  return (
                    <span
                      key={step}
                      className={`text-xs font-bold ${
                        isDone ? "text-orange-500" : "text-gray-300"
                      }`}
                    >
                      {step.toUpperCase()}
                    </span>
                  );
                })}
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full w-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, progressPct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

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
