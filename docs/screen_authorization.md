# Screen Authorization Matrix

This document defines the Role-Based Access Control (RBAC) matrix for all system screens, mapping access permissions to the following roles:
* **Admin** (System Owner / Headquarter)
* **Branch Manager**
* **StoreKeeper** (Warehouse Keeper)
* **Pharmacist** (Sales/Cashier)
* **Customer**

An **"X"** indicates that the corresponding role has authorized access to that screen.

| Screen | Admin | Branch Manager | StoreKeeper | Pharmacist | Customer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Common Screens** | | | | | |
| Login Screen | X | X | X | X | X |
| Logout Screen | X | X | X | X | X |
| **Customer / Guest Flow Screens** | | | | | |
| Login / Guest Screen | X | X | X | X | X |
| Home / Search Medicine Screen | X | X | X | X | X |
| View Detail Screen | X | X | X | X | X |
| Add to Cart Screen / Action | | | | | X |
| Shopping Cart Screen | | | | | X |
| Unified Payment Screen | | | | | X |
| Order History Self-Lookup Screen | | | | | X |
| View Invoice & Prescription Screen | | | | | X |
| **Warehouse Dashboard Flow Screens** | | | | | |
| Warehouse Dashboard Screen | X | | X | | |
| Create Master Purchase Request Screen | X | | X | | |
| Auto-split by Supplier Screen | X | | X | | |
| Send to Admin Screen | | | X | | |
| Inbound Management Screen | X | | X | | |
| Receive Goods Screen | | | X | | |
| Camera / AI CV Stock Counting Screen | | | X | | |
| Create Goods Receipt Note (GRN) Screen | | | X | | |
| Return to Supplier Screen | | | X | | |
| Outbound Management Screen | X | | X | | |
| Receive Dispatch Order Screen | | | X | | |
| Create GDN Screen | X | | X | | |
| Dispatch to Branch Screen | | | X | | |
| Create Stocktake Session Screen | | | X | | |
| Camera Actual Stock Counting Screen | | | X | | |
| Save & Adjust Inventory Screen | X | | X | | |
| **Branch Manager Dashboard Flow Screens** | | | | | |
| Branch Manager Dashboard Screen | X | X | | | |
| Low Stock Alert Panel | X | X | | | |
| Create Goods Request Screen | | X | | | |
| Receive Goods from Central Warehouse Screen | | X | | | |
| Confirm Receipt Screen | | X | | | |
| Customer Profile Management Screen | X | X | | X | |
| Branch Info Management (CRUD) Screen | X | X | | | |
| Revenue by Staff Screen | X | X | | | |
| Branch Reports Dashboard | X | X | | | |
| Branch Inventory Report Screen | X | X | | | |
| **Admin / System Owner Dashboard Flow Screens** | | | | | |
| Admin / System Owner Dashboard Screen | X | | | | |
| Purchase Request Approval Screen | X | | | | |
| Payment Decision Screen | X | | | | |
| Pay in Full (100%) Screen | X | | | | |
| Debt/Deposit Terms Screen | X | | | | |
| Branch Request Review Screen | X | | | | |
| Check Central Warehouse Stock Screen | X | | | | |
| Dispatch Order Screen | X | | | | |
| Cross-Branch Transfer Screen | X | | | | |
| Plan Supplier Purchase Screen | X | | | | |
| Catalog Management Screen | X | | | | |
| View Supplier List Screen | X | X | X | | |
| Medicine Management Screen | X | | | | |
| Create New Medicine Screen | X | | | | |
| Quick Create Supplier Screen | X | | | | |
| Chain-wide Reports Screen | X | | | | |
| System Configuration & RBAC Screen | X | | | | |
| **Sales / Pharmacist Dashboard Flow Screens** | | | | | |
| Sales / Pharmacist Dashboard Screen | X | | | X | |
| POS / Sales Screen | | | | X | |
| Scan Prescription QR Screen | | | | X | |
| Check Drug Interaction Screen | | | | X | |
| Hold Order Screen | | | | X | |
| Apply Promotion Screen | X | | | X | |
| Wholesale Screen | | | | X | |
| Check Debt Limit Screen | | | | X | |
| Unified Checkout Screen | | | | X | |
| E-Invoice Dispatch Screen | | | | X | |
| Update Loyalty Points Screen | | | | X | |
| Return & Exchange Screen | | | | X | |
| Refund & Update Inventory Screen | X | | | X | |
| View Medicine Detail Screen | X | X | | X | X |
| Customer Order History Lookup Screen | X | X | | X | |
