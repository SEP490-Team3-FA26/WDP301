# Feature Screen Description

This document maps all the features and corresponding screens from the pharmacy system's screen flow diagrams.

| No. | Feature | Screen | Description |
|---|---|---|---|
| **0** | **Common Screens** | | |
| 0.1 | Authenticate user session | Login Screen | Allow system users (Admin, Branch Manager, StoreKeeper, Pharmacist, Customer) to log in to their respective portals. |
| 0.2 | Securely terminate user session | Logout Screen | Enable users to securely log out from the system to protect their accounts. |
| **1** | **Customer / Guest Flow** | | |
| 1.1 | Access system as Guest or Customer | Login / Guest Screen | Allows customers to enter the pharmacy store portal as guests or log in to their personal accounts. |
| 1.2 | Search for medicines | Home / Search Medicine Screen | Enables users to search for medications by name, active ingredients, symptoms, or category. |
| 1.3 | View detailed medicine information | View Detail Screen | Displays full medicine information, including indications, active ingredients, dosage, and warning notes. |
| 1.4 | Add items to the shopping cart | Add to Cart Screen / Action | Allows users to specify the quantity and add the selected medicine to their shopping cart. |
| 1.5 | Manage selected items in cart | Shopping Cart Screen | Displays selected medicines, checks stock availability, and calculates the total order value. |
| 1.6 | Checkout and pay | Unified Payment Screen | Integrates payment options including Cash and E-Wallet (Momo, VNPay, etc.) to complete transactions. |
| 1.7 | Look up order history | Order History Self-Lookup Screen | Allows customers to search for their previous orders using their phone numbers. |
| 1.8 | View digital invoices & prescriptions | View Invoice & Prescription Screen | Displays past invoices, billing breakdowns, and digital prescription copies linked to the orders. |
| **2** | **Warehouse Dashboard Flow** | | |
| 2.1 | Access warehouse management features | Warehouse Dashboard Screen | Central portal for warehouse keepers to manage inbound/outbound orders, inventory counts, and replenishment. |
| 2.2 | Initiate master replenishment requests | Create Master Purchase Request Screen | Allows warehouse staff to draft a consolidated purchase request for low-stock items. |
| 2.3 | Group purchase requests by supplier | Auto-split by Supplier Screen | System automatically segments the draft items based on their default supplier for separate purchase orders. |
| 2.4 | Submit purchase request for verification | Send to Admin Screen | Submits the grouped draft Purchase Orders (POs) to the central Administrator for approval. |
| 2.5 | Track and manage inbound shipments | Inbound Management Screen | Displays the list of pending Purchase Orders (POs) arriving from suppliers. |
| 2.6 | Receive physical goods | Receive Goods Screen | Entry form for warehouse keepers to select an active PO and verify the physical items arriving at the warehouse. |
| 2.7 | Scan and count stock using computer vision | Camera / AI CV Stock Counting Screen | Uses camera feed and AI computer vision to automatically count the arriving stock boxes or packages. |
| 2.8 | Generate Goods Receipt Note (GRN) on success | Create Goods Receipt Note (GRN) Screen | Saves the receipt, prompts entry of Lot Numbers & Expiry Dates, and adds items to the warehouse database. |
| 2.9 | Log inbound errors and return stock | Return to Supplier Screen | Records discrepancies or defective goods, rejects the delivery, and logs errors for administrative disputes. |
| 2.10 | Track outbound shipments | Outbound Management Screen | Displays pending dispatch orders from Admin to be prepared and shipped to pharmacy branches. |
| 2.11 | Review admin dispatch orders | Receive Dispatch Order Screen | Shows incoming admin instructions detailing the quantity and batch numbers of medicines to be sent to branches. |
| 2.12 | Create Goods Delivery Note (GDN) | Create GDN Screen | Generates the official delivery note detailing the medicines, batch numbers, and quantities being dispatched. |
| 2.13 | Dispatch goods to specific pharmacy branches | Dispatch to Branch Screen | Registers the shipment status and logs transit details for delivery drivers. |
| 2.14 | Initialize warehouse stock audit | Create Stocktake Session Screen | Creates a new auditing session to verify physical inventory in specific zones or the entire warehouse. |
| 2.15 | Perform stock counts via camera | Camera Actual Stock Counting Screen | Uses camera tools to scan shelves and count physical items for inventory reconciliation. |
| 2.16 | Reconcile and adjust inventory database | Save & Adjust Inventory Screen | Compares physical counts with system records, highlights discrepancies, and logs stock adjustments. |
| **3** | **Branch Manager Dashboard Flow** | | |
| 3.1 | Access branch management features | Branch Manager Dashboard Screen | Provides branch managers with tools to view local stock alerts, manage staff, edit branch info, and view reports. |
| 3.2 | View low stock alerts | Low Stock Alert Panel | Displays real-time notifications for items whose quantities fall below the branch's safety stock level. |
| 3.3 | Request stock replenishment | Create Goods Request Screen | Allows branch managers to draft a request for required medicines to be sent to the central office. |
| 3.4 | Monitor incoming warehouse transfers | Receive Goods from Central Warehouse Screen | Displays details of dispatches sent by the central warehouse that are on their way to the branch. |
| 3.5 | Confirm receipt of branch transfers | Confirm Receipt Screen | Allows branch staff to manually verify items and click a button to confirm stock receipt (without QR scanning). |
| 3.6 | Manage customer records | Customer Profile Management Screen | Allows managers to view, create, and update customer profiles, contact info, and loyalty points. |
| 3.7 | Manage local branch details | Branch Info Management (CRUD) Screen | Enables the manager to update pharmacy operating hours, contact numbers, and branch address details. |
| 3.8 | Monitor employee performance | Revenue by Staff Screen | Displays a breakdown of sales revenue, transactions completed, and performance metrics per employee. |
| 3.9 | View branch performance data | Branch Reports Dashboard | Portal containing multiple branch-level reports, including sales trends and gross margins. |
| 3.10 | Review branch stock details | Branch Inventory Report Screen | Displays local inventory quantities, valuation, and highlight lists of fast-moving or slow-moving items. |
| **4** | **Admin / System Owner Dashboard Flow** | | |
| 4.1 | Access administrative dashboard | Admin / System Owner Dashboard Screen | Main workspace for the business owner/admin to manage purchasing approvals, catalog, chain reports, and roles. |
| 4.2 | Approve warehouse purchase requests | Approve Master Purchase Request Screen | Allows Admin to review master purchase requests submitted by the warehouse and authorize supplier POs. |
| 4.3 | Authorize billing and payments | Payment Decision Screen | Displays billing options to allow the Admin to determine how the purchase orders will be funded. |
| 4.4 | Pay full order amount upfront | Pay in Full (100%) Screen | Finalizes the purchase order with immediate full payment clearance to the supplier. |
| 4.5 | Set credit terms or deposits | Debt/Deposit Terms Screen | Configures structured payment terms, deposits, or debt allowances for the supplier order. |
| 4.6 | Triage branch replenishment requests | Review Branch Goods Requests Screen | Displays all replenishment requests submitted by branch managers for administrative review. |
| 4.7 | Check central inventory levels | Check Central Warehouse Stock Screen | Allows Admin to check if the requested items are available in the central warehouse before choosing a dispatch strategy. |
| 4.8 | Dispatch items from central warehouse | Order Central to Dispatch Screen | Triggers a dispatch order commanding the central warehouse to ship items to the requesting branch. |
| 4.9 | Initiate stock transfers between branches | Order Cross-Branch Transfer Screen | Directs a branch with surplus stock to transfer items to a branch experiencing a shortage when central stock is empty. |
| 4.10 | Order new stock from external suppliers | Plan Supplier Purchasing Screen | Automatically routes the admin to the supplier procurement pipeline if the requested items are out of stock system-wide. |
| 4.11 | Manage suppliers and medications | Catalog Management Screen | Workspace containing tools to manage the overall product directory and supplier directory. |
| 4.12 | View partner supplier profiles | View Supplier List Screen | A read-only repository of supplier details, contract terms, active licenses, and performance ratings. |
| 4.13 | Manage medicine catalog | Medicine Management Screen | CRUD interface to add, edit, disable, or delete medicine SKUs in the enterprise database. |
| 4.14 | Create new medicine profiles | Create New Medicine Screen | Form to register a new drug SKU with names, active ingredients, dosage, and default suppliers. |
| 4.15 | Add supplier details on the fly | Quick Create Supplier Screen | Popup form that allows the administrator to add a new supplier details instantly during medicine creation. |
| 4.16 | Monitor enterprise performance | Chain-wide Reports Screen | Displays aggregated charts, revenues, costs, and profits across all branches in the chain. |
| 4.17 | Manage system access and permissions | System Configuration & RBAC Screen | Allows Admin to configure settings, add new staff accounts, and assign Role-Based Access Control permissions. |
| **5** | **Sales / Pharmacist Dashboard Flow** | | |
| 5.1 | Access retail sales tools | Sales / Pharmacist Dashboard Screen | Entry point for pharmacists and cashier staff to handle POS orders, returns, and customer histories. |
| 5.2 | Process customer retail purchases | POS / Sales Screen | POS checkout layout featuring item scanning, cart compilation, pricing, and checkout actions. |
| 5.3 | Input digital prescriptions | Scan Prescription QR Screen | Captures prescription details by scanning QR codes issued by clinics or doctors. |
| 5.4 | Run safety and interaction checks | Check Drug Interaction Screen | Automated tool that checks scanned medications for cross-drug contraindications and alerts the pharmacist. |
| 5.5 | Lock order for safety verification | Hold Order Screen | Temporarily blocks checkout if drug interactions are detected, requiring a pharmacist's credential to override. |
| 5.6 | Apply discounts and vouchers | Apply Promotion Screen | Allows checkout staff to input promo codes, apply active campaigns, or redeem customer points. |
| 5.7 | Process wholesale purchases | Wholesale Screen | Allows cashiers to process bulk sales, applying wholesale pricing structures and dealer discounts. |
| 5.8 | Check buyer credit allowances | Check Debt Limit Screen | Automatically checks the wholesale customer's outstanding balance and credit limit before approval. |
| 5.9 | Finalize transactions and update database | Unified Checkout Screen | Integrates checkout processing (cash/card/e-wallets), registers sales under FIFO rules, and prints receipts. |
| 5.10 | Issue electronic invoices | Send E-Invoice Screen | Automatically sends digital tax invoices/receipts to the customer's registered email or Zalo account. |
| 5.11 | Update customer loyalty accounts | Update Loyalty Points Screen | System registers transaction value and updates the customer's loyalty tier and point balance. |
| 5.12 | Handle product returns | Return & Exchange Screen | Form to input receipt numbers and identify items being returned or exchanged by customers. |
| 5.13 | Complete refunds and stock returns | Refund & Update Inventory Screen | Approves monetary refund values and restores eligible products back into the store stock. |
| 5.14 | Look up medicine specifications | View Medicine Detail Screen | Allows cashiers to search medicine details, indications, and available quantities on-screen. |
| 5.15 | Search customer sales histories | Customer Order History Lookup Screen | Enables retrieval of previous orders using customer names, phone numbers, or invoice IDs. |
