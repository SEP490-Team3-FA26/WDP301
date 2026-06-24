# Non-Screen Functions

This document lists all system functionalities that run in the background (such as batch jobs, cron jobs, background workers, and asynchronous integrations) without requiring a direct visual interface.

| # | Feature | System Function | Description |
|---|---|---|---|
| **1** | **AI Analysis & Alerts** | Expiry Date Scanner | A daily cron job that scans all medicine batches (`medicinebatches`) to flag items nearing expiry. It ranks warnings into color categories: <br>• **Red Alert (< 3 months):** Automatically blocks the batch from POS, moves it to "Quarantine," and alerts staff. <br>• **Yellow Alert (< 6 months):** Pushes notifications to Marketing and Sales to launch promotional campaigns. |
| | | AI Demand Forecasting | A monthly background job that runs an AI forecasting model over historical sales, seasonal trends, and local disease history to project replenishment demands. |
| | | Auto-Replenishment Proposal | A daily background script that compares actual inventory levels with calculated safety stock thresholds ($1.2 - 1.5 \times \text{average monthly usage}$). It automatically populates stock requests for low items. |
| | | Drug Interaction Analyzer | An API service that checks active ingredients of items in a prescription against a clinical database, flagging dangerous drug-to-drug interactions. |
| | | Vietnamese Medical NLP | An API service that parses natural language symptoms (e.g., "headache," "stuffy nose") entered in the search bar, mapping them to relevant active ingredients and drug groups. |
| | | Voice-to-Prescription Engine | An asynchronous worker that processes audio recordings of conversations between pharmacists and customers, transcribes them using speech-to-text, and uses NLP to recommend matching prescription items. |
| | | AI Stock Anomaly Detection | A batch job that compares physical stocktake counts with transaction histories to detect abnormal inventory discrepancies (e.g., suspected theft or unrecorded wastage). |
| **2** | **Event-Driven Messaging (Kafka)** | Async Order Stock Deductor | A Kafka consumer that listens to `order.created` events. It asynchronously executes SQL transactions to deduct quantities from inventory, evicts corresponding Redis cache keys, and logs transactions. |
| | | Real-Time Inventory Syncer | A broker-mediated worker that pushes catalog updates or stock changes made at the central warehouse to all branch instances, maintaining real-time consistency. |
| **3** | **Supplier Auto-Routing** | Purchase Request Splitter | An asynchronous transaction worker that processes consolidated master purchase requests and groups items by their `default_supplier_id`, generating draft Purchase Orders (POs) per supplier. |
| **4** | **Third-Party Integrations** | Supplier Order Dispatcher | A background worker that packages approved Purchase Orders (POs) into formal documents and automatically dispatches them to supplier representatives via Email or Zalo OA API. |
| | | E-Invoice Compiler | An event handler that runs post-payment, formatting transaction logs into compliant digital tax invoices and dispatching them to customers via Email or Zalo OA. |
| | | Payment Webhook Handler | An endpoint service that listens to callbacks from payment gateways (Momo, VNPay, banks). It validates cryptographic signatures, updates payment statuses to `PAID`, and triggers the order-completion workflow. |
| | | Zalo Mini App Syncer | An asynchronous synchronization worker that keeps catalog prices, promotional campaigns, and customer loyalty points aligned with the Zalo Mini App platform. |
| **5** | **Security & Audit Logging** | Audit Log Recorder | A system-wide middleware that intercepts all sensitive modifications (such as manual stock modifications, payment approvals, role changes) and logs them asynchronously to a MongoDB audit collection. |
| **6** | **Loyalty Program Processing** | Point Accumulation Engine | An asynchronous processor that captures completed sales events, calculates loyalty points based on member tiers, and updates the customer's point balance. |
