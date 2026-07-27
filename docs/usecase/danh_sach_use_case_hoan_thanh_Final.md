# DETAILED LIST OF COMPLETED USE CASES

This document provides a detailed inventory and breakdown of all functionality (Use Cases) completed in the system's actual source code, including auxiliary functions, minor business operations, and advanced authentication flows.

### 2.2.2 Descriptions

| ID | Use Case | Actors | Use Case Description |
| :--- | :--- | :--- | :--- |
| **UC-01** | Register account | Customer | Allows customers to register a new personal account in the system using an email address and password. |
| **UC-02** | Sign in | Customer, Pharmacist, Inventory Manager, Admin, Branch Manager | Allows users to log in to the system using their registered or assigned account credentials. |
| **UC-03** | Verify email | Customer | Allows customers to confirm the activation code sent to their personal email after successful account registration. |
| **UC-04** | Sign in with Google | Customer | Allows customers to quickly log in to the online shopping portal using their Google account. |
| **UC-05** | Recover password | Pharmacist, Inventory Manager, Admin, Branch Manager | Allows staff to send a password recovery request via email when they forget their login credentials. |
| **UC-06** | Reset password | Pharmacist, Inventory Manager, Admin, Branch Manager | Allows staff to set a new password via a secure link sent to their recovery email. |
| **UC-07** | Sign out | Customer, Pharmacist, Inventory Manager, Admin, Branch Manager | Terminates the current session and safely logs out of the system account. |
| **UC-08** | Search medicines online | Customer | Browse and search for medicines by name, active ingredient, or medical indication on the online store. |
| **UC-09** | Add to cart | Customer | Allow customers to save desired pharmaceutical products into their personal cart for later checkout. |
| **UC-10** | Manage personal cart | Customer | Allow customers to adjust quantities or remove products from their online cart. |
| **UC-11** | Confirm online order | Customer | Fill in full name, phone number, shipping address, and confirm submission of online order. |
| **UC-12** | Pay online order | Customer | Complete online payment via bank transfer using dynamic QR code or COD. |
| **UC-13** | View order history | Customer | View list of past orders, detailed order items, and shipping status. |
| **UC-14** | View customer profile | Customer | View personal information, accumulated points, and current tier status (Gold, Silver, Bronze...). |
| **UC-15** | Consult AI via text | Customer | Enter symptom description questions; chatbot automatically analyzes and suggests health guidance & recommended products. |
| **UC-16** | Consult AI via voice | Customer | Press record button to describe symptoms via voice; AI automatically recognizes speech and converts to text for consultation. |
| **UC-17** | Search retail medicines | Pharmacist | Quickly search for medicines by name or active ingredient directly on the counter retail screen. |
| **UC-18** | Add to retail cart | Pharmacist | Select medicines from search results and add them to the customer's active retail shopping cart. |
| **UC-19** | Edit retail cart | Pharmacist | Change purchase quantity of each medicine or remove items from the retail cart. |
| **UC-20** | Suggest substitute medicine | Pharmacist | System automatically suggests equivalent substitute medicines (matching active ingredient or therapeutic group) when requested item is out of stock. |
| **UC-21** | Apply voucher and points | Pharmacist | Look up loyalty customer information by phone number to earn reward points or apply discount voucher codes directly to the invoice. |
| **UC-22** | Scan prescription with AI | Pharmacist | Capture/upload doctor prescription photos (single/multi-page). AI Gemini 2.5 Flash analyzes layout, extracts active ingredients/dosages, merges duplicates, matches branch DB & auto-selects nearest FEFO batch to auto-fill cart. |
| **UC-23** | Check medicine interactions | Pharmacist | Select multiple medicines in cart to trigger AI verification for interactions or harmful contraindication warnings. |
| **UC-24** | Confirm retail payment | Pharmacist | Confirm transactions via Cash or Bank Transfer. System automatically deducts branch stock based on FIFO batches and prints invoices. |
| **UC-25** | Send e-invoice via email | Pharmacist | Allows entering customer email at counter to send electronic invoice (e-invoice) directly upon payment completion. |
| **UC-26** | Create wholesale invoice | Pharmacist | Issue wholesale invoices for agency partners, automatically applying tier pricing based on large volume purchases. |
| **UC-27** | Search return invoice | Pharmacist | Search past invoices by customer phone number or invoice code to verify purchase origin prior to executing returns. |
| **UC-28** | Create return slip | Pharmacist | Create return slips recording return reasons (defective goods, near-expiry...), execute customer refunds, and restock counter inventory. |
| **UC-29** | View medicine catalog | Admin, Inventory Manager, Pharmacist | Displays a complete list of medicines in the system with active ingredient, medicine category, unit, and base price. |
| **UC-30** | View inventory by batch | Inventory Manager, Admin | Display actual stock details per product including batch number (`batchNo`), expiry date (`expDate`), and available stock quantity. |
| **UC-31** | Create goods receipt | Inventory Manager | Create a new receiving session for goods delivered by supplier based on an approved Purchase Order (PO). |
| **UC-32** | Create purchase order (PO) | Inventory Manager | Create new purchase orders (PO) to submit to Admin for approval before submitting to suppliers. |
| **UC-33** | Inspect goods via AI | Inventory Manager | Capture images of shipment packages using mobile device; AI automatically counts actual medicine boxes in shipment to populate receipt. |
| **UC-34** | Alert expiry dates | Inventory Manager, Admin | Report detailed lists of near-expiry batches (under 6 months / 3 months) or expired items to plan for disposal/write-offs. |
| **UC-35** | Track medicine lot | Inventory Manager, Admin | Enter batch number (`batchNo`) to trace full supplier history, PO, GRN, and display quantity fluctuation timeline for that batch. |
| **UC-36** | View branch stock | Branch Manager | Quickly look up actual physical stock quantities of medicines at the managed branch. |
| **UC-37** | Request stock requisition | Branch Manager | Create stock replenishment requests sent to central warehouse when branch counters experience shortages or out-of-stock items. |
| **UC-38** | Request internal transfer | Branch Manager | Create stock transfer slips to ship goods to neighboring branches to resolve cross-branch stock imbalances. |
| **UC-39** | Approve stock replenishment | Inventory Manager | Review Requisition requests submitted by branches and approve dispatch of goods from central warehouse. |
| **UC-40** | Confirm transfer receipt | Branch Manager | Receive goods delivered from central warehouse, verify physical count, and click confirm to synchronize and update destination stock. |
| **UC-41** | View staff list | Admin, Branch Manager | Displays a table listing all employees in the pharmacy chain with detailed information on role, work shift, branch, and activation status. |
| **UC-42** | Create staff account | Branch Manager | Allows Branch Manager to create new accounts for pharmacists and counter staff members at their branch. |
| **UC-43** | Approve staff account | Admin, Branch Manager | Allows Admin or Branch Manager to review and approve newly registered staff accounts. |
| **UC-44** | Reject staff account | Admin, Branch Manager | Allows Admin or Branch Manager to reject new staff registration requests. |
| **UC-45** | Create branch manager account | Admin | Allows HQ Admin to create new branch manager accounts and grant branch management permissions. |
| **UC-46** | Update staff role | Admin | Allows Admin to update staff profile, assign job roles, and reassign branch locations. |
| **UC-47** | Add medicine | Admin | Create a new medicine and fill in identification attributes, packaging specifications, and usage instructions. |
| **UC-48** | Update medicine | Admin | Edit medicine attributes, descriptions, images, or classification categories in the system catalog. |
| **UC-49** | View supplier list | Admin, Inventory Manager | Displays contact information, supplier code, and reliability rating of suppliers. |
| **UC-50** | Add supplier | Admin | Register new pharmaceutical supplier information and store legal profiles in the system. |
| **UC-51** | Update supplier | Admin | Adjust contact information, GDP license expiration date, or supplier credit terms. |
| **UC-52** | View revenue dashboard | Admin | View revenue charts over time, transaction counts, total payables/receivables, and chain-wide operational performance. |
| **UC-53** | Compare branch performance | Admin | Display comparative ranking tables for sales volume, transaction counts, and growth rates across all branch locations. |
| **UC-54** | Approve purchase order (PO) | Admin | Approve Purchase Orders (PO) sent to suppliers and configure payment methods. |
| **UC-55** | Reject purchase order (PO) | Admin | Reject approval of purchase order PO and record rejection reasons. |
| **UC-56** | Approve goods receipt note (GRN) | Admin | Sign and approve physical inspection receipt from warehouse manager to confirm official entry, increase total stock, and activate new batches. |
| **UC-57** | Reject goods receipt note (GRN) | Admin | Reject physical inspection receipt (GRN) from warehouse manager and record rejection reasons for re-verification. |
| **UC-58** | Manage promotions | Admin | Create percentage/cash discount voucher codes, set up Flash Sale events for designated time slots. |
| **UC-59** | Manage cash flow | Admin | View financial cash flow reports, enter fixed operational expenses (rent, salaries, utilities...) of branches. |
| **UC-60** | Query audit logs | Admin | Retrieve audit log records tracking critical business operations performed by staff for security compliance. |
| **UC-61** | Forecast demand | Inventory Manager, Admin | System automatically analyzes sales volume and actual inventory levels to suggest replenishment order quantities from suppliers. |
| **UC-62** | Auto-generate PO from AI forecast | Inventory Manager, Admin | Allows converting AI Economic Order Quantity (EOQ) replenishment recommendations directly into an official Purchase Order (PO) with one click. |
| **UC-63** | Detect inventory anomalies with AI | Inventory Manager, Admin | AI system automatically detects and alerts unusual inventory fluctuations such as export spikes, critically low stock, or abnormal inventory adjustments. |
| **UC-64** | Analyze seasonal and epidemic trends | Admin | Analyzes historical sales data across seasonal shifts and disease outbreaks to forecast medicine demand and optimize strategic stocking. |
| **UC-65** | Receive notifications | Customer, Pharmacist, Inventory Manager, Admin, Branch Manager | System pushes real-time socket notifications for near-expiry alerts, PO/GRN approval requests, or urgent branch replenishment requests. |
