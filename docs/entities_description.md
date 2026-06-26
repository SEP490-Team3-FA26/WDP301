# Entities Description

This document describes all unique database entities from the system's Entity Relationship Diagram (ERD), detailing their purpose and business functions.

| # | Entity | Description |
|---|---|---|
| **1** | **User** | Represents any authenticated system user, including customers, pharmacists, warehouse staff, branch managers, and system administrators. Stores basic login credentials, roles, and profiles. |
| **2** | **Verification Token** | Manages tokens used for user registration verification, password resets, and account security validations. |
| **3** | **Branch** | Represents a physical pharmacy store location within the chain. Tracks branch details (address, store code) and isolates local stock levels. |
| **4** | **Branch Alert** | Stores automated warnings triggered by branches, such as low stock thresholds, critical medicine deficits, or temperature alerts for cold storage items. |
| **5** | **Cart** | Represents a customer's active online shopping cart. Each customer user owns one active cart to compile items before check out. |
| **6** | **Cart Item** | A bridge entity representing a specific medicine SKU and the quantity selected by a customer inside their active cart. |
| **7** | **Medicine** | The master catalog entity representing a unique drug/medicine SKU. Stores clinical specifications like active ingredients, dosage, indications, contraindications, and default suppliers. |
| **8** | **Medicine Batch** | Tracks physical batches (lots) of a medicine. Essential for batch tracking (Lot Number, Expiry Date, Unit Cost) and enforcing First-In, First-Out (FIFO) rules. |
| **9** | **Inventory Transaction** | Logs all physical stock movements (inbound receipts, outbound sales, internal branch transfers, stocktake adjustments) to maintain a complete audit trail. |
| **10** | **Supplier** | Represents an external drug supplier or pharmaceutical manufacturer. Stores contact details, contracts, current liabilities (debts), and ratings. |
| **11** | **Purchase Requisition (PR)** | An internal stock request created by a branch manager or an automated system alert to signal restocking needs to the central warehouse. |
| **12** | **Purchase Requisition Item** | Represents the specific medicine SKU and quantity requested within a Purchase Requisition. |
| **13** | **Purchase Order (PO)** | An official procurement order sent to a supplier to buy inventory. Generated after central admin approval and details supplier terms and costs. |
| **14** | **Purchase Order Item** | Represents the specific medicine SKU, unit purchase price, and quantity ordered from the supplier in a PO. |
| **15** | **Goods Receipt Note (GRN)** | Represents a receiving document generated at the warehouse when physical goods are delivered by a supplier. |
| **16** | **Goods Receipt Note Item** | A detail entity of the GRN, capturing the actual quantity received, designated batch numbers, and expiry dates of incoming medicines. |
| **17** | **Prescription** | Stores medical prescription details (scanned electronic prescriptions or upload images) required by law to authorize the sale of prescription-only drugs. |
| **18** | **Sales Order** | Represents a completed retail transaction, whether checked out at a branch POS counter or placed online via the customer portal. |
| **19** | **Sales Order Item** | Represents a specific medicine SKU, sold quantity, and active selling price recorded under a Sales Order. |
| **20** | **Sales Order Batch Item** | Tracks the specific physical medicine batches (Lot Number / Expiry Date) allocated to satisfy a sales order item, ensuring proper FIFO deduction. |
