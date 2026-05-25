"use client";

import { ACTIVE_ORDER_STATUSES, STATUS_CONFIG } from "@/lib/config";
import { getOrderDetail } from "@/lib/supabase";
import type { OrderDetail } from "@/type";
import { ArrowLeft, Clock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!id) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    void getOrderDetail(id).then((data) => {
      if (!data) setNotFound(true);
      else setOrder(data);
      setIsLoading(false);
    });
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto px-6 pt-8 pb-24">
        <div className="animate-pulse">
          <div className="h-5 bg-dark-100/5 rounded-lg w-16 mb-7" />
          <div className="h-8 bg-dark-100/5 rounded-lg w-48 mb-3" />
          <div className="h-4 bg-dark-100/5 rounded-lg w-32 mb-8" />
          <div className="h-40 bg-dark-100/5 rounded-2xl mb-4" />
          <div className="h-28 bg-dark-100/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-lg mx-auto px-6 pt-8 text-center">
        <p className="paragraph-medium text-gray-100">Order not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-primary paragraph-medium hover:opacity-80 transition-opacity"
        >
          ← Back
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.received;
  const hasDiscount = order.discountCents > 0;
  const subtotalCents = Math.round(order.total * 100) + order.discountCents;
  const showReadyBanner = order.readyAt && ACTIVE_ORDER_STATUSES.includes(order.status);

  const formatReadyAt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-lg mx-auto px-6 pt-8 pb-24">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-gray-100 hover:text-dark-100 transition-colors mb-6 -ml-0.5 cursor-pointer"
        >
          <ArrowLeft size={17} strokeWidth={2.5} />
          <span className="body-medium">Back</span>
        </button>

        {/* Header: order number + status badge */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="h1-bold text-dark-100 leading-tight">
            Order #{order.orderNumber}
          </h1>
          <span
            className={`mt-1.5 flex-shrink-0 px-3 py-1 rounded-full body-medium font-semibold ${statusCfg.bgColor} ${statusCfg.textColor}`}
          >
            {statusCfg.label}
          </span>
        </div>

        {/* Date + time */}
        <p className="body-medium text-gray-100 mb-6">
          {order.dateLabel} · {order.timeLabel}
        </p>

        {/* Ready-by banner */}
        {showReadyBanner && (
          <div className="mb-5 flex items-center gap-2.5 bg-primary/10 rounded-2xl px-4 py-3.5">
            <Clock size={16} strokeWidth={2.5} className="text-primary flex-shrink-0" />
            <p className="paragraph-medium text-dark-100">
              Ready by{" "}
              <span className="paragraph-bold text-primary">
                {formatReadyAt(order.readyAt!)}
              </span>
            </p>
          </div>
        )}

        {/* Items card */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3.5 border-b border-gray-200/60">
            <p className="paragraph-bold text-dark-100">Items</p>
          </div>
          <div className="divide-y divide-gray-200/60">
            {order.items.length === 0 ? (
              <p className="px-4 py-4 paragraph-regular text-gray-100">No items found.</p>
            ) : (
              order.items.map((item, idx) => (
                <div key={idx} className="px-4 py-3.5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-2 flex-1 min-w-0">
                      <span className="paragraph-bold text-primary flex-shrink-0 tabular-nums">
                        {item.qty}×
                      </span>
                      <div className="min-w-0">
                        <p className="paragraph-medium text-dark-100 leading-snug">
                          {item.name}
                        </p>
                        {item.specialRequest && (
                          <p className="body-regular text-gray-100 mt-0.5 italic">
                            {item.specialRequest}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="paragraph-regular text-dark-100 flex-shrink-0 tabular-nums">
                      ${(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="border border-gray-200 rounded-2xl px-4 py-4">
          {hasDiscount && (
            <>
              <div className="flex justify-between mb-2">
                <span className="paragraph-regular text-gray-100">Subtotal</span>
                <span className="paragraph-regular text-dark-100 tabular-nums">
                  ${(subtotalCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="paragraph-regular text-gray-100">
                  Promo{order.promoCode ? ` (${order.promoCode})` : ""}
                </span>
                <span className="paragraph-regular text-success tabular-nums">
                  −${(order.discountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-200/60 mb-3" />
            </>
          )}
          <div className="flex justify-between">
            <span className="paragraph-bold text-dark-100">Total paid</span>
            <span className="paragraph-bold text-dark-100 tabular-nums">
              ${order.total.toFixed(2)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
