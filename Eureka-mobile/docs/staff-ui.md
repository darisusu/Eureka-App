# Staff/Chef UI and Flow

This document outlines a proposed staff-side UI structure and workflow for the Eureka system. It focuses on speed, clarity, and minimal taps in a busy kitchen environment.

---

## Goals

- Surface the right order at the right time with minimal searching.
- Enable one-tap status updates.
- Provide predictable handoff cues (order number, pickup time, and contents).
- Make it hard to make mistakes (clear states, color coding, confirmation).

---

## Primary Roles

- **Chef/Kitchen**: monitors incoming orders and prep progress.
- **Counter/Runner**: handles pickup and marks orders collected.
- **Admin** (optional): can edit menu, promos, or view analytics.

---

## Navigation Structure

1) **Orders (default)**
2) **Queue**
3) **History**
4) **Settings**

Bottom tab nav or a side drawer depending on device size (tablet vs phone).

---

## Screen 1: Orders (Live)

### Purpose
Show all active orders and allow rapid status updates.

### Layout
- Header: current time, store name, "New Orders" count.
- Filters: status chips (Received, Preparing, Ready, Collected).
- Main list: order cards sorted by expected ready time (or FIFO).

### Order Card Contents
- Large order number (primary).
- Time placed + elapsed time.
- Status badge (color-coded).
- Item list with quantities.
- Special requests highlighted.
- Quick actions (single tap): "Start", "Ready", "Collected".

### Actions
- Tap card for detail view.
- Swipe or tap buttons to change status.

---

## Screen 2: Queue (Kitchen Focus)

### Purpose
Focused view for chefs with fewer distractions.

### Layout
- Two columns (on tablet) or segmented list (on phone):
  - **To Cook** (Received)
  - **In Progress** (Preparing)
- Each card shows only essentials:
  - Order number
  - Item summary
  - Prep time indicator (simple bar or minutes)

### Actions
- Tap "Start" to move to Preparing.
- Tap "Ready" to move to Ready for pickup.

---

## Screen 3: Order Detail

### Purpose
Full detail for complex orders.

### Content
- Order number, time, customer (optional), status.
- Full item list with quantities and notes.
- Promo applied (if any).
- ETA and elapsed time.
- Buttons: Start / Ready / Collected.

---

## Screen 4: History

### Purpose
Reference for completed orders and audits.

### Layout
- Search by order number.
- Filter by date or status.
- Show time-to-prepare and time-to-collect.

---

## Screen 5: Settings (Admin)

### Purpose
Operational settings and account.

### Content
- Staff accounts and roles.
- Basic store settings.
- Optional: menu and promo management links.

---

## Status Flow (Core)

1) **Received** (auto on order creation)
2) **Preparing** (chef taps Start)
3) **Ready** (chef taps Ready)
4) **Collected** (runner taps Collected)

Rules:
- Received -> Preparing -> Ready -> Collected only (no backward).
- Optional confirm dialog for Collected (to reduce mistakes).

---

## UI Design Principles

- Large tap targets (>= 44px).
- High contrast status colors:
  - Received: amber
  - Preparing: blue
  - Ready: green
  - Collected: gray
- Minimal text; emphasize order numbers.
- Continuous refresh with subtle "new order" pulse.

---

## Notifications

- New order sound / vibration for staff device.
- Visual badge on Orders tab.
- Optional "Ready" ping for runner.

---

## Edge Cases

- **Late orders**: highlight orders that exceed expected prep time.
- **Special requests**: always visible in red or bold.
- **Bulk orders**: group items by category for prep efficiency.

---

## Metrics (Optional for Admin)

- Average prep time
- Orders per hour
- Peak window alerts

---

## Suggested User Flow (Summary)

1) Staff opens app; lands on Orders tab.
2) New order arrives in Received queue.
3) Chef taps Start when cooking begins.
4) Chef taps Ready when complete.
5) Runner marks Collected at pickup.
6) Order moves to History automatically.
