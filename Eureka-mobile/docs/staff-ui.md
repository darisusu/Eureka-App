# Staff UI (MVP)

This document defines the MVP staff UI behavior for live order tracking and status updates.
Assume staff UI would be on a shared iPad in stall.

---

## 1) Core Behavior
- Live updates across multiple devices from a shared source of truth.
- Landscape-only layout enforced for MVP.
- Three status columns visible at once: received, preparing, ready.
- Each column list is vertically scrollable.
- New orders appear at the top of their column list.
- Column headers include a count badge (example: received (7)).
- Newly received orders show a "New" badge and a highlighted border; persists until another new order arrives.

---

## 2) Layout Structure
- Single screen with three columns: received, preparing, ready.
- Column header row: status label + count badge.
- Column body: scrollable list of compact order cards.
- History strip: horizontal scroll of completed orders at the bottom (or side), newest inserted left-most.

### Column View (At-a-Glance)
<table width="100%">
  <thead>
    <tr>
      <th align="left">received (7)</th>
      <th align="left">preparing (4)</th>
      <th align="left">ready (2)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Order #1021</td>
      <td>Order #1019</td>
      <td>Order #1015</td>
    </tr>
    <tr>
      <td>Order #1020</td>
      <td>Order #1018</td>
      <td>Order #1013</td>
    </tr>
    <tr>
      <td>Order #1017</td>
      <td>Order #1016</td>
      <td>Order #1011</td>
    </tr>
  </tbody>
</table>

---

## 3) Order Card (Compact)
- Order number (primary).
- Item list with quantities.
- Special requests surfaced inline.
- Customer name.
- Time label (status-aware, see below).
- One primary action button.

---

## 4) Status Actions and Movement
- received card action: "Start" -> move to preparing (insert at top).
- preparing card action: "Ready" -> move to ready (insert at top).
- ready card action: "Collected" -> remove from columns and add to History (insert left-most).

---

## 5) Status Rules
- Statuses shown in columns: received, preparing, ready.
- "Collected" is a terminal action that removes the order from active columns and adds it to History.
- Sorting within each column: `createdAt` DESC (newest first).

---

## 6) Time Labels (Per Status)
- received: "Waiting X min" (time since entered queue/created).
- preparing: "Cooking X min" (time since Start pressed).
- ready: "Ready X min ago" (time since Ready pressed).

---

## 7) History
### History Strip (On Main Screen)
- Horizontal scroll of completed order cards.
- Newest completed order inserted left-most.
- Only show the last N completed orders (constant, default 20).

### History Screen (Full)
- Separate screen to display all completed orders.

---

## 8) Snackbar Feedback (Future)
- After tapping a status action, show a top snackbar.
- Auto-dismiss after a timeout (constant, default 10 seconds).
- Snackbar actions: [undo] and [dismiss].
- Snackbar does not block the workflow.
- Undo reverts the order status immediately to the previous value.
