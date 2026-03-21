# Eureka! — High-Volume F&B Pre-order & Payment System

<img width="500" height="600" alt="image" src="https://github.com/user-attachments/assets/e97c3863-a5e5-47e3-b50a-c7efe4b10e5d" />

> **A production-ready mobile solution for high-traffic grab-and-go food stalls, designed to eliminate physical queues and optimize kitchen throughput.**

Eureka! is a cross-platform mobile application that allows customers to pre-order and pre-pay for meals before arriving at the stall. By integrating real-time order tracking and automated prep-time estimation, the system reduces customer wait times and streamlines back-of-house operations.

## 🚀 Key Features
* **Seamless Pre-payment:** Integrated Stripe payment flows to ensure orders are confirmed and paid before entering the kitchen queue.
* **Real-time Order Lifecycle:** Full-stack order management from cart to "Ready for Pickup" status, powered by Appwrite’s real-time database.
* **Intelligent ETA Calculation:** Utilizes `prep_time_min` logic per menu item to provide customers with reliable pickup estimates.
* **Staff-Facing Dashboard:** Custom internal workflows for kitchen staff to manage active orders, update statuses, and view special requests.
* **Optimized UX:** Built with Expo Router for fluid, file-based navigation and Zustand for lightning-fast global state management.

## 🛠️ Tech Stack
* **Frontend:** React Native, Expo (SDK 50+), Expo Router, NativeWind (Tailwind CSS)
* **State Management:** Zustand
* **Backend-as-a-Service:** Appwrite (Authentication, Database, Storage)
* **Payments:** Stripe API

## 📊 Database Schema (Appwrite)
The system manages a relational structure across several core collections, some examples include:
* **`orders`**: userId, status, isPaid, total, orderNumber.
* **`menu`**: name, price, categories, and `prep_time_min` for ETA logic.
* **`order_items`**: Tracks specific customizations and special requests per item.
