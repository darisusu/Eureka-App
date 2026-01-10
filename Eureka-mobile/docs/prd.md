# Product Requirements Document (PRD)
## Project: Eureka Preorder & Payment System

---

## 1. Overview

**Eureka** is a lightweight online preorder and payment system designed for grab-and-go food operations.  
It enables food stalls to manage **prepaid online orders** with **minimal operational overhead**, focusing on speed, predictability, and queue efficiency.

The MVP is initially piloted with **Eureka Store**, but the system is designed to be **merchant-agnostic** and generalisable to other food stalls under a consistent operational and pricing framework.

---

## 2. Goals & Non-Goals

### Goals
- Enable customers to preorder and prepay food for fast pickup
- Provide accurate preparation time estimates
- Reduce queueing and no-show risk
- Minimise store-side operational complexity
- Support future expansion to analytics, rewards, and optimisation

### Non-Goals (MVP)
- No delivery support
- No dine-in table management
- No walk-in payment processing
- No full POS system for in-store sales
- No inventory management

---

## 3. Target Users

### Customers
- Grab-and-go customers
- Users with short, fixed break windows (e.g. hospital staff)
- Department administrators placing bulk / meeting orders

### Store Staff
- Stall operators
- Kitchen staff
- Cashier / order handover staff

---

## 4. Core Product Principles

- **Prepayment first**: Orders must be paid online before entering the kitchen queue
- **Time predictability**: Estimated readiness time must be reliable
- **Operational simplicity**: Minimal taps for store staff
- **Clear accountability**: Order numbers and status visibility
- **Fail-safe bans**: Prevent abuse from repeated no-shows

---

## 5. MVP Features (Customer-Facing)

### 5.1 Account & Profile
- Profile creation
- Sign up and login
- User identity persists across orders

---

### 5.2 Menu Browsing
- Browse menu items
- View item name, image, description, price
- Each item has a predefined average preparation time

---

### 5.3 Place Order
- Select items
- Confirm order
- Generate unique order number
- Proceed to online payment

---

### 5.4 Online Payment
- Online payment required before order is accepted
- Payment confirmation is mandatory before order enters kitchen queue
- Failed or unpaid orders are not processed

---

### 5.5 Estimated Preparation Time (Automated)
- System stores average preparation time per dish  
  Example:
  - Fish Soup: 5 minutes
- System calculates realistic estimated ready time based on:
  - Current active online orders
  - Queue load
- Estimated time is shown before and after checkout

---

### 5.6 Order Status
Order states:
1. Received
2. Preparing
3. Ready for Pickup
4. Collected

Status updates are reflected in real time.

---

### 5.7 Order History
- View past online orders
- View order status and timestamps

---

### 5.8 Notifications
- Order received confirmation
- Order ready for pickup
- Optional future notifications for promotions

---

### 5.9 Order Number & Pickup Screen
- Prominent order number display
- Used by store staff to identify and hand over food
- Payment already completed before pickup

---

### 5.10 Scheduled Pickup Time
- **Enabled only for department meeting / bulk orders**
- Not available for standard individual orders
- Allows advance scheduling with capacity checks

---

## 6. Store-Side Features (Staff Dashboard)

### 6.1 Order Management
- View all online orders
- View order details and order numbers
- Orders sorted by readiness time

---

### 6.2 Order Status Updates
Staff can update order states:
- Received
- Preparing
- Ready for Pickup
- Collected

---

### 6.3 Account Management
- Staff login
- Role-restricted access (admin vs staff)

---

## 7. Future / Potential Features

### 7.1 Basic Analytics
- Orders per day
- Peak vs off-peak trends
- Order completion times

---

### 7.2 Rewards & Loyalty
- Earn reward points per order
- Redeem rewards for discounts

---

### 7.3 AI-Assisted Prep-Time Optimisation
- Learn from historical order data
- Dynamically adjust prep-time estimates

---

### 7.4 Referral & Promotions
- Referral codes
- Promotional campaigns
- Off-peak incentives



## 8. Assumptions

- Customers are comfortable with online payment
- Store staff have access to a phone or tablet
- Kitchen workflow is primarily order-number based
- Walk-in orders are handled outside this system (MVP)

---

