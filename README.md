# 🏪 Shop Management System

A **web-based, multi-user shop management system** that helps businesses manage products, stock, customers, sales, and invoices.  
Each user (shop owner) has their **own separate dashboard, inventory, and sales records**, ensuring full data isolation.

---

## 🚀 Features

### 🔑 Authentication & User Accounts

- Secure **login/signup** system
- Each signup creates a new **business workspace**
- Business name displayed across the app
- Profile management (update name, email, phone, password)
- Password reset functionality

### 📊 Dashboard (Per Business/User)

- Shows **key values**:
  - Total sales (daily, weekly, monthly, lifetime)
  - Total customers
  - Total products in stock
  - Low-stock products
  - Revenue & profit summary
- **Charts**:
  - Sales trends over time
  - Top-selling products
  - Customer purchase trends

### 📦 Product & Inventory Management

- Add, edit, delete products
- Track stock quantity, cost price, selling price
- SKU/Barcode support
- Restock products & track stock history
- Low-stock alerts

### 👥 Customer Management

- Add, edit, delete customer details
- View customer purchase history
- Customer contact details (phone, email, address)

### 💰 Sales & Invoicing

- Create invoices with:
  - Customer selection
  - Product selection (with auto subtotal, tax, discounts, total)
  - Payment method (cash, card, mobile money, etc.)
- Generate **printable/PDF invoices**
- Edit, update, delete sales records
- Search & filter sales history

### 📑 Reports & Analytics

- Sales reports (daily, weekly, monthly, yearly)
- Profit/loss summaries
- Export reports to **Excel/PDF**

### 🎨 UI/UX

- Fully **responsive design** (desktop, tablet, mobile)
- **Hamburger menu** for easy navigation on all screen sizes
- Clean and user-friendly interface

---

## 🛠️ Tech Stack (Recommended)

- **Frontend:** React (with responsive UI, TailwindCSS)
- **Backend:** Node.js
- **Database:** PostgreSQL(Supabase)
- **Authentication:** Supabase session-based auth

---

## 📂 Database Schema (High-Level)

**Tables:**

- `users` → manages login, profile, business info
- `products` → products per business/user
- `customers` → customers per business/user
- `sales` → invoice header (customer, date, totals)
- `sale_items` → invoice line items (product, qty, price)
- `stock_history` → logs of restocks/adjustments

**Relationships:**

- One `user` → many `products`, `customers`, `sales`
- One `sale` → many `sale_items`
- One `product` → many `sale_items`, many `stock_history`

---

## 🔒 Security

- Passwords stored securely (hashed, salted)
- Role-based access (Owner, Staff — optional)
- Each user can only see their own data

---
