# 3.2 Detailed Functional Requirements (Use Case Specifications)

This section provides complete technical specifications for all 65 Use Cases completed in the system. Each function details navigation triggers, actor roles, interface types, input/output data, validation constraints, associated business rules, and step-by-step normal and abnormal operational flows.

---

## 3.2 Authentication & User Account Management

### 3.2.1 Register Account (UC-01)
* **Function Trigger**:
  * **Navigation Path**: Home > Click 'Register' > Navigated to `/auth/register`
  * **Trigger Event / Frequency**: User clicks 'Register' button upon demand.
* **Function Description**:
  * **Actors / Roles**: Customer (Guest)
  * **Purpose**: Allows new customers to create a personal account using email and password.
  * **Interface Type**: Full Web Page Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Success confirmation message, OTP verification modal.
    * **Editable / Input**: Full Name, Email Address, Phone Number, Password, Confirm Password.
  * **Validation**:
    * Email must follow valid RFC 5322 format (`name@domain.com`) and must not already exist in the database.
    * Password must be at least 8 characters, containing uppercase, lowercase, number, and special character.
    * Phone number must be a valid 10-digit Vietnamese number (`0x...`).
  * **Business Rule**:
    * **BR-01**: Registration requires email verification via a 6-digit OTP code before account activation.
    * **BR-03**: Password complexity requirements enforced.
  * **Functionality**:
    * **In Normal Cases**: User enters valid personal details and submits. System hashes password using bcrypt, creates an inactive user record, sends a 6-digit OTP to the user's email, and redirects to the Email Verification screen with a success toast notification.
    * **In Abnormal Cases**: If the email is already registered, system blocks submission, displays an inline red error "Email is already in use", and keeps input fields intact for correction.

---

### 3.2.2 Sign In (UC-02)
* **Function Trigger**:
  * **Navigation Path**: Home / Dashboard > Click 'Login' > Navigated to `/auth/login`
  * **Trigger Event / Frequency**: User clicks 'Sign In' button.
* **Function Description**:
  * **Actors / Roles**: Customer, Pharmacist, Inventory Manager, Branch Manager, Admin
  * **Purpose**: Authenticates registered users and generates JWT session tokens with role-based permissions.
  * **Interface Type**: Full Web Page Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: User session metadata, JWT Auth Token, user role badge.
    * **Editable / Input**: Email Address / Username, Password, Remember Me checkbox.
  * **Validation**:
    * Email and Password fields are strictly required.
  * **Business Rule**:
    * **BR-02**: Newly created staff accounts must be approved by Admin/Branch Manager before initial login.
  * **Functionality**:
    * **In Normal Cases**: User enters credentials and clicks 'Sign In'. System validates credentials against database, verifies active account status, issues JWT access and refresh tokens, stores session context, and redirects user to their role-specific dashboard (e.g., `/pharmacist/sales` for Pharmacist, `/admin` for Admin).
    * **In Abnormal Cases**: If credentials do not match or account is deactivated/pending approval, system displays inline error MSG05 "Incorrect email or password. Please check your credentials and try again."

---

### 3.2.3 Verify Email (UC-03)
* **Function Trigger**:
  * **Navigation Path**: Automatically redirected from Register Screen > `/auth/verify-email`
  * **Trigger Event / Frequency**: User submits registration form or requests resend OTP.
* **Function Description**:
  * **Actors / Roles**: Customer, Pharmacist, Branch Manager
  * **Purpose**: Confirms customer email ownership by validating the 6-digit OTP sent via email.
  * **Interface Type**: Modal Dialog / Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Email destination label, OTP countdown timer (180s).
    * **Editable / Input**: 6-digit OTP Code.
  * **Validation**:
    * OTP must be exactly 6 numeric digits within the valid TTL window.
  * **Business Rule**:
    * **BR-01**: Mandatory email verification prior to account activation.
  * **Functionality**:
    * **In Normal Cases**: User enters the 6-digit code received in email and clicks 'Verify'. System validates OTP code and TTL, updates user account status to `ACTIVE`, and displays success toast MSG07 "Email verified successfully. You can now log in."
    * **In Abnormal Cases**: If code is expired or incorrect, system displays inline red error "Invalid or expired verification code", allowing the user to click 'Resend OTP'.

---

### 3.2.4 Sign In with Google (UC-04)
* **Function Trigger**:
  * **Navigation Path**: Login Screen > Click 'Continue with Google' button
  * **Trigger Event / Frequency**: On button click by Customer on demand.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Enables quick authentication for online shopping using Google OAuth 2.0.
  * **Interface Type**: Third-party OAuth Popup / Redirect
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Google Profile Avatar, Email, Full Name.
    * **Editable / Input**: Google OAuth Account Authorization.
  * **Validation**:
    * Google OAuth token response must be cryptographically verified by backend server.
  * **Business Rule**:
    * N/A (Standard Customer OAuth Access).
  * **Functionality**:
    * **In Normal Cases**: Customer clicks 'Continue with Google', completes Google consent prompt. Backend verifies token, automatically provisions a customer account if first-time login, issues JWT session, and logs user into `/customer/shop`.
    * **In Abnormal Cases**: If user cancels Google OAuth prompt, system catches callback error and retains user on `/auth/login` with toast "Google authentication cancelled."

---

### 3.2.5 Recover Password (UC-05)
* **Function Trigger**:
  * **Navigation Path**: Login Screen > Click 'Forgot Password?' > `/auth/forgot-password`
  * **Trigger Event / Frequency**: User clicks link upon forgetting credentials.
* **Function Description**:
  * **Actors / Roles**: Customer, Pharmacist, Inventory Manager, Branch Manager, Admin
  * **Purpose**: Initiates password recovery workflow by dispatching a reset link via email.
  * **Interface Type**: Full Web Page Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Instructions banner, success confirmation notification.
    * **Editable / Input**: Registered Email Address.
  * **Validation**:
    * Email field is required and must match valid email format.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: User enters registered email and submits. System generates a secure time-limited password reset token (15-min TTL), enqueues email job via BullMQ/SMTP, and displays toast MSG08 "A password reset link has been sent to your email."
    * **In Abnormal Cases**: If email is not found in database, system displays generic success message for privacy protection without disclosing account non-existence.

---

### 3.2.6 Reset Password (UC-06)
* **Function Trigger**:
  * **Navigation Path**: Email link click > Navigated to `/auth/reset-password?token=...`
  * **Trigger Event / Frequency**: User opens secure link from email inbox.
* **Function Description**:
  * **Actors / Roles**: Customer, Pharmacist, Inventory Manager, Branch Manager, Admin
  * **Purpose**: Allows users to define a new account password using the secure recovery token.
  * **Interface Type**: Full Web Page Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Account email identifier.
    * **Editable / Input**: New Password, Confirm New Password.
  * **Validation**:
    * New Password must meet complexity requirements (BR-03) and match Confirm Password field.
  * **Business Rule**:
    * **BR-03**: Enforce password strength rules.
  * **Functionality**:
    * **In Normal Cases**: User enters valid new password, submits. System verifies token validity, hashes new password, updates DB record, invalidates recovery token, and redirects to Login screen with success toast.
    * **In Abnormal Cases**: If recovery token is expired or tampered with, system blocks form submission and displays red error "Password reset link is invalid or expired. Please request a new one."

---

### 3.2.7 Sign Out (UC-07)
* **Function Trigger**:
  * **Navigation Path**: Top Navigation Bar > Click User Avatar > Select 'Sign Out'
  * **Trigger Event / Frequency**: User clicks 'Sign Out' button.
* **Function Description**:
  * **Actors / Roles**: Customer, Pharmacist, Inventory Manager, Branch Manager, Admin
  * **Purpose**: Safely terminates active JWT session and clears client storage.
  * **Interface Type**: Web Action / Header Widget
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: N/A.
    * **Editable / Input**: N/A.
  * **Validation**:
    * Active session token must be present in request header.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: User clicks 'Sign Out'. System invalidates refresh token on server, clears localStorage/cookies on client, disconnects active WebSocket rooms, and redirects to Landing Page (`/`).
    * **In Abnormal Cases**: If client storage clearing fails, system forcibly wipes tokens and redirects to Login page.

---

## 3.3 Online Customer Portal

### 3.3.1 Search Medicines Online (UC-08)
* **Function Trigger**:
  * **Navigation Path**: Landing Page / Shop > Search Bar at top header (`/customer/shop`)
  * **Trigger Event / Frequency**: User types in search box or presses Enter key.
* **Function Description**:
  * **Actors / Roles**: Customer, Guest
  * **Purpose**: Browse and search medicines by name, active ingredient, or medical indication.
  * **Interface Type**: Full Web Page / Live Dropdown Search
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Product list grid, medicine thumbnail, name, active ingredient, retail unit price, OTC badge.
    * **Editable / Input**: Search keyword, Category filter dropdown, OTC/Rx filter toggle.
  * **Validation**:
    * Search keyword is sanitized to prevent SQL injection or XSS scripting.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Customer enters keyword "Paracetamol" or selects "Pain Relief". System performs indexed full-text search, filters active SKUs, and updates product grid dynamically in < 500ms.
    * **In Abnormal Cases**: If no products match query, system displays inline message MSG01 "No matching medicines found for '{keyword}'. Please try another search term."

---

### 3.3.2 Add to Cart (UC-09)
* **Function Trigger**:
  * **Navigation Path**: Medicine Detail Screen / Catalog Card > Click 'Add to Cart' button
  * **Trigger Event / Frequency**: On button click by Customer.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Adds desired medication quantity into personal shopping cart.
  * **Interface Type**: Button Action / Floating Drawer
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Cart badge counter badge update, subtotal preview.
    * **Editable / Input**: Selected Medicine ID, Quantity selector.
  * **Validation**:
    * Quantity must be a positive integer >= 1 and <= available branch stock quantity.
  * **Business Rule**:
    * **BR-04**: Rx medicines added to cart trigger a prescription upload warning flag.
  * **Functionality**:
    * **In Normal Cases**: Customer selects quantity (e.g. 2 boxes) and clicks 'Add to Cart'. System verifies stock availability, inserts/updates item in user's active Cart entity, updates header badge count, and shows toast MSG09.
    * **In Abnormal Cases**: If requested quantity exceeds available stock, system blocks addition and displays warning toast "Requested quantity exceeds available stock limit."

---

### 3.3.3 Manage Personal Cart (UC-10)
* **Function Trigger**:
  * **Navigation Path**: Header > Click Cart Icon > Navigated to `/customer/cart`
  * **Trigger Event / Frequency**: User navigates to Cart page.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Allows customers to view, adjust quantities, or remove items from online cart.
  * **Interface Type**: Full Web Page Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Line item details, unit price, quantity subtotal, estimated tax, total price.
    * **Editable / Input**: Item quantity (+/- buttons), Remove item button, Voucher code input.
  * **Validation**:
    * Quantity changes must strictly be positive integers.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Customer modifies item quantities or clicks 'Remove'. System recalculates cart subtotal, updates Cart entity in database, and renders updated price summary.
    * **In Abnormal Cases**: If cart becomes empty, system displays empty cart illustration with button "Continue Shopping".

---

### 3.3.4 Confirm Online Order (UC-11)
* **Function Trigger**:
  * **Navigation Path**: Shopping Cart > Click 'Proceed to Checkout' > `/customer/checkout`
  * **Trigger Event / Frequency**: Customer initiates order confirmation.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Fill delivery address, recipient contact details, and review order details before payment.
  * **Interface Type**: Multi-step Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Order summary list, shipping fee calculation, applied voucher discount.
    * **Editable / Input**: Recipient Full Name, Phone Number, Delivery Address, Delivery Notes, Payment Method selection (VietQR / COD).
  * **Validation**:
    * Recipient Name, Phone Number, and Shipping Address are mandatory.
  * **Business Rule**:
    * **BR-04**: Orders containing Rx drugs must have an attached validated prescription record.
  * **Functionality**:
    * **In Normal Cases**: Customer enters valid shipping information, selects payment method, and clicks 'Place Order'. System creates pending Sales Order, locks item FEFO batches temporarily, and redirects to Payment screen.
    * **In Abnormal Cases**: If required address fields are blank, system highlights fields in red with error MSG02 "The {field_name} field is required."

---

### 3.3.5 Pay Online Order (UC-12)
* **Function Trigger**:
  * **Navigation Path**: Order Confirmation > Navigated to `/customer/payment?orderId=...`
  * **Trigger Event / Frequency**: Customer proceeds to online payment.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Complete online payment via bank transfer using dynamic VietQR or select COD.
  * **Interface Type**: Payment Gateway Widget / Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Dynamic VietQR Code, Bank Account Number, Transfer Amount, Order Reference Code, Expiry Timer (15 min).
    * **Editable / Input**: Payment Method Confirmation.
  * **Validation**:
    * Payment transaction signature must match payment gateway public key.
  * **Business Rule**:
    * **BR-08**: Deduct inventory based on atomic FEFO batch lock upon payment confirmation.
  * **Functionality**:
    * **In Normal Cases**: Customer scans VietQR using banking app. Payment gateway Webhook fires callback to system backend, system verifies payment signature, marks order status as `PAID`, deducts batch stock, and redirects to Order Confirmation page with success toast MSG14.
    * **In Abnormal Cases**: If payment timer expires (15 min) without receiving webhook callback, order status changes to `CANCELLED_EXPIRED` and reserved FEFO stock locks are released.

---

### 3.3.6 View Order History (UC-13)
* **Function Trigger**:
  * **Navigation Path**: Profile Menu > Click 'My Orders' > `/customer/orders`
  * **Trigger Event / Frequency**: Customer opens order history.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: View past purchase orders, delivery status timeline, invoice details, and re-order.
  * **Interface Type**: Full Web Page Screen with Tabs
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Order ID, Order Date, Status Badge (Pending, Paid, Shipping, Completed, Cancelled), Total Amount, Item list.
    * **Editable / Input**: Status Filter Tabs, Search Order Code, Cancel Order button.
  * **Validation**:
    * Order cancellation is allowed only for orders in `PENDING` or `PAID_UNSHIPPED` status.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Customer views list of past orders. Clicking an order expands full item breakdown, delivery tracking timeline, and downloadable PDF receipt link.
    * **In Abnormal Cases**: If user attempts to cancel an order already in `SHIPPED` status, system disables cancel button and displays tooltip "Order is already in transit and cannot be cancelled."

---

### 3.3.7 View Customer Profile (UC-14)
* **Function Trigger**:
  * **Navigation Path**: Header User Avatar > Click 'Profile' > `/customer/profile`
  * **Trigger Event / Frequency**: Customer opens profile settings.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: View personal information, membership tier status (Gold, Silver, Bronze), and reward points balance.
  * **Interface Type**: Full Web Page Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Membership Tier Card, Accumulated Loyalty Points, Total Spent Amount, Member ID.
    * **Editable / Input**: Full Name, Phone Number, Avatar Photo, Default Address.
  * **Validation**:
    * Profile update fields must satisfy standard formatting rules.
  * **Business Rule**:
    * **BR-15**: Customer loyalty points earned upon paid transactions and redeemable for vouchers.
  * **Functionality**:
    * **In Normal Cases**: Customer views membership details and updates profile information. System saves changes to User profile and displays toast "Profile updated successfully."
    * **In Abnormal Cases**: If phone number format is invalid, system displays error MSG04 "Please enter a valid 10-digit phone number."

---

### 3.3.8 Consult AI via Text (UC-15)
* **Function Trigger**:
  * **Navigation Path**: Customer Portal Floating Widget / Banner > Click 'AI Health Assistant' (`/customer/ai-consult`)
  * **Trigger Event / Frequency**: Customer submits symptom question in text box.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Text-based chatbot analyzing symptoms to suggest health advice and recommended OTC products.
  * **Interface Type**: Interactive Chatbot Panel
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Chat response stream, recommended OTC product cards, active ingredient recommendations, medical disclaimer notice.
    * **Editable / Input**: Natural language symptom query text.
  * **Validation**:
    * Text query must not be blank and must contain valid text characters.
  * **Business Rule**:
    * N/A (AI Health Consultation Advisory).
  * **Functionality**:
    * **In Normal Cases**: Customer types "I have a headache and mild fever". AI service processes NLP query, queries clinical knowledge database, streams medical consultation advice, and displays clickable product recommendation cards.
    * **In Abnormal Cases**: If AI service encounters an API timeout, system falls back to standard message "Service temporarily busy. Please contact our pharmacist directly via hotline."

---

### 3.3.9 Consult AI via Voice (UC-16)
* **Function Trigger**:
  * **Navigation Path**: AI Health Assistant Screen > Click Microphone Icon
  * **Trigger Event / Frequency**: Customer presses record button to speak symptoms.
* **Function Description**:
  * **Actors / Roles**: Customer
  * **Purpose**: Voice-enabled AI assistant converting speech to text and analyzing health symptoms.
  * **Interface Type**: Voice Recording Widget / Speech Interface
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Real-time audio wave visualization, transcribed text preview, AI health recommendations.
    * **Editable / Input**: Voice Audio Stream input, Stop Recording button.
  * **Validation**:
    * Audio input duration must be between 2 seconds and 60 seconds.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Customer presses mic button, speaks symptoms, and stops recording. Backend Speech-to-Text engine transcribes audio into Vietnamese text, passes transcript to AI Consultation engine, and renders recommendations.
    * **In Abnormal Cases**: If microphone permission is denied or audio is unintelligible, system prompts "Could not recognize audio. Please check microphone permissions or type your query."

---

## 3.4 Pharmacist POS Counter Terminal

### 3.4.1 Search Retail Medicines (UC-17)
* **Function Trigger**:
  * **Navigation Path**: Pharmacist Dashboard > POS Sales Terminal (`/pharmacist/sales`)
  * **Trigger Event / Frequency**: Pharmacist types in POS search bar or scans barcode.
* **Function Description**:
  * **Actors / Roles**: Pharmacist, Branch Manager
  * **Purpose**: Fast search of retail medicines by name, active ingredient, or barcode at POS counter.
  * **Interface Type**: POS Full Terminal Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Medicine SKU, active ingredient, retail unit price, available FEFO batch quantity, stock location bin.
    * **Editable / Input**: Search query / Barcode scanner input.
  * **Validation**:
    * Search must return results in < 200ms for fast counter operations.
  * **Business Rule**:
    * **BR-08**: Display available stock based strictly on non-expired FEFO batches.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist scans product barcode or types drug name. POS screen instantly populates matching item with FEFO batch details and unit price.
    * **In Abnormal Cases**: If item is out of stock at current branch, POS displays red tag "Out of Stock" and activates 'Suggest Substitute' button.

---

### 3.4.2 Add to Retail Cart (UC-18)
* **Function Trigger**:
  * **Navigation Path**: POS Terminal Search Results > Click item or press Enter / Barcode Scan
  * **Trigger Event / Frequency**: Item selected or scanned at POS counter.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: Appends selected medication item and default FEFO batch to active counter invoice cart.
  * **Interface Type**: POS Cart Table Panel
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Item line total, FEFO Batch Number (`batchNo`), Expiry Date (`expDate`).
    * **Editable / Input**: Unit selection (Box / Blister / Pill), Quantity integer.
  * **Validation**:
    * Quantity must not exceed physical branch stock for selected batch.
  * **Business Rule**:
    * **BR-08**: Auto-allocate nearest FEFO batch for selected line item.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist adds item. POS automatically locks nearest FEFO batch, populates selling price based on unit type, and updates cart total.
    * **In Abnormal Cases**: If batch expiry is < 3 months, system triggers Red Alert block (BR-09) preventing addition.

---

### 3.4.3 Edit Retail Cart (UC-19)
* **Function Trigger**:
  * **Navigation Path**: POS Sales Terminal > Cart Item Row > Edit Quantity / Delete
  * **Trigger Event / Frequency**: Pharmacist modifies line item in active POS cart.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: Adjust purchase quantities, change packaging units, or delete items from POS cart.
  * **Interface Type**: POS Interactive Table
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Recalculated invoice subtotal, tax amount, discount subtotal.
    * **Editable / Input**: Quantity input box, Unit Selector dropdown, Line discount input.
  * **Validation**:
    * Quantity must be >= 1 integer.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist changes quantity from 1 to 3. POS updates batch reservation locks, recalculates line total and grand total instantly.
    * **In Abnormal Cases**: If item is removed, batch reservation is immediately released back to branch stock pool.

---

### 3.4.4 Suggest Substitute Medicine (UC-20)
* **Function Trigger**:
  * **Navigation Path**: POS Terminal > Item Out of Stock Alert > Click 'Suggest Substitute'
  * **Trigger Event / Frequency**: On button click by pharmacist when requested medicine is unavailable.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: System automatically recommends equivalent substitute drugs matching active ingredient or therapeutic group.
  * **Interface Type**: Modal Dialog
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Original requested drug name, list of substitute SKUs, matching active ingredient, dosage equivalence, price comparison, available branch stock.
    * **Editable / Input**: Select substitute medicine button.
  * **Validation**:
    * Substitute items must match exact active ingredient strength or therapeutic category.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Requested drug is out of stock. Pharmacist opens modal, system displays 3 substitute medicines in stock with matching active ingredients. Pharmacist selects one to auto-fill POS cart.
    * **In Abnormal Cases**: If no equivalent substitutes exist in branch inventory, modal displays "No in-stock substitute found for this active ingredient."

---

### 3.4.5 Apply Voucher and Points (UC-21)
* **Function Trigger**:
  * **Navigation Path**: POS Terminal > Customer Loyalty Section > Enter Phone Number / Voucher Code
  * **Trigger Event / Frequency**: Pharmacist looks up customer phone number at counter.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: Look up customer profile to accumulate reward points or apply discount voucher codes to invoice.
  * **Interface Type**: POS Widget Sidebar
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Customer Name, Tier Badge, Available Points Balance, Discount Amount.
    * **Editable / Input**: Customer Phone Number, Redeem Points checkbox, Voucher Code string.
  * **Validation**:
    * Voucher code must be active, within valid date window, and satisfy minimum order value constraints.
  * **Business Rule**:
    * **BR-15**: Customer loyalty reward points calculated and redeemed based on Admin conversion rules.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist enters customer phone number. Profile loads showing 500 points. Pharmacist applies 50,000 VND discount voucher. POS deducts discount from grand total and logs points accumulation for the order.
    * **In Abnormal Cases**: If voucher code is expired or invalid, system displays error toast "Voucher code is invalid or expired."

---

### 3.4.6 Scan Prescription with AI (UC-22)
* **Function Trigger**:
  * **Navigation Path**: POS Sales Terminal > Click 'Scan Prescription (AI)' button
  * **Trigger Event / Frequency**: Pharmacist captures/uploads paper prescription image.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: AI Gemini 2.5 Flash OCR analyzes layout, extracts active ingredients/dosages, matches branch DB, and auto-fills POS cart with FEFO batches.
  * **Interface Type**: Modal Upload / Camera Scanner Widget
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Original uploaded prescription image preview, extracted drug list, recognized dosages, matched branch SKUs, confidence score.
    * **Editable / Input**: Upload Image File / Web Camera snapshot, Confirm Extracted Cart button.
  * **Validation**:
    * Uploaded file must be valid image format (JPEG, PNG, WEBP) under 10MB.
  * **Business Rule**:
    * **BR-05**: AI OCR extracts active ingredients and auto-selects available FEFO batches.
    * **BR-06**: Pharmacist must review and manually confirm AI-suggested prescription cart items before payment.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist uploads doctor prescription photo. AI OCR processes image in < 3s, extracts 4 prescribed drugs, merges duplicates, matches nearest branch FEFO batches, and populates POS cart for pharmacist verification.
    * **In Abnormal Cases**: If image is blurry or illegible, AI displays low-confidence alert "Unclear handwriting detected. Please manually review extracted items."

---

### 3.4.7 Check Medicine Interactions (UC-23)
* **Function Trigger**:
  * **Navigation Path**: POS Cart / Customer Cart > Click 'Check Drug Interactions' button
  * **Trigger Event / Frequency**: Triggered manually or automatically prior to invoice confirmation.
* **Function Description**:
  * **Actors / Roles**: Pharmacist, Customer
  * **Purpose**: Verifies active ingredients of selected items in cart against clinical database for harmful contraindications or interaction warnings.
  * **Interface Type**: Warning Alert Modal / Drawer
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Drug pair combination names, Severity Level Badge (Red: Severe, Yellow: Moderate, Blue: Info), Clinical interaction summary, Food/usage warning notes.
    * **Editable / Input**: Acknowledge Warning checkbox, Override & Proceed button.
  * **Validation**:
    * Verification requires at least 2 distinct active ingredients in cart.
  * **Business Rule**:
    * **BR-07**: High-severity (Red Level) drug interaction warnings must be acknowledged by pharmacist before finalizing invoice.
  * **Functionality**:
    * **In Normal Cases**: Cart contains 3 medications. Pharmacist clicks check. System analyzes clinical database, detects no severe interactions, and displays green indicator "Safe Combination".
    * **In Abnormal Cases**: System detects severe interaction between Warfarin and Aspirin (Risk of bleeding). Red Alert modal pops up requiring pharmacist signature/checkbox to acknowledge before checkout can proceed.

---

### 3.4.8 Confirm Retail Payment (UC-24)
* **Function Trigger**:
  * **Navigation Path**: POS Sales Terminal > Click 'Complete Payment' button
  * **Trigger Event / Frequency**: Pharmacist finalizes transaction at counter.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: Confirm transaction via Cash or Bank Transfer, deduct branch FEFO stock, and print invoice.
  * **Interface Type**: Payment Confirmation Modal
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Total Payable Amount, Change due calculation, Invoice Code (`INV-xxx`).
    * **Editable / Input**: Payment Method (Cash / VietQR Bank Transfer), Cash Received input.
  * **Validation**:
    * Cash Received must be >= Total Payable Amount.
  * **Business Rule**:
    * **BR-08**: Deduct branch stock based strictly on FEFO batch locks.
    * **BR-12**: Sales invoices must explicitly log batch number and expiry date for every line item.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist selects Cash, enters customer cash amount. System calculates change, executes atomic SQL stock deduction from branch batches, marks order `COMPLETED`, and triggers receipt printer.
    * **In Abnormal Cases**: If bank transfer fails or QR payment callback is not received, system holds transaction status as `PENDING_PAYMENT`.

---

### 3.4.9 Send E-Invoice via Email (UC-25)
* **Function Trigger**:
  * **Navigation Path**: POS Checkout Confirmation Modal > Check 'Send E-Invoice'
  * **Trigger Event / Frequency**: Pharmacist enters customer email at payment completion.
* **Function Description**:
  * **Actors / Roles**: Pharmacist
  * **Purpose**: Sends digital electronic invoice (PDF) directly to customer's email address upon payment.
  * **Interface Type**: Input Modal Popup
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: E-Invoice Preview PDF, Sent Status Indicator.
    * **Editable / Input**: Customer Email Address, Send Button.
  * **Validation**:
    * Email address must follow valid format.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist inputs customer email `customer@example.com` and clicks send. System generates signed PDF e-invoice, dispatches email asynchronously via BullMQ, and displays success toast.
    * **In Abnormal Cases**: If email server fails, system queues retry job and allows printing a physical receipt copy.

---

### 3.4.10 Create Wholesale Invoice (UC-26)
* **Function Trigger**:
  * **Navigation Path**: POS Terminal > Toggle 'Wholesale Sale Mode' (`/pharmacist/sales?mode=wholesale`)
  * **Trigger Event / Frequency**: Pharmacist selects wholesale order mode for agency partner.
* **Function Description**:
  * **Actors / Roles**: Pharmacist, Branch Manager
  * **Purpose**: Issue wholesale invoices for clinic/agency partners, applying tier discount pricing based on large volume purchases.
  * **Interface Type**: POS Special Screen Mode
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Agency Partner Name, Tax ID, Wholesale Volume Tier Discount %, Subtotal.
    * **Editable / Input**: Agency Partner Search/Selection, Bulk Box Quantities, Payment Terms.
  * **Validation**:
    * Wholesale mode requires minimum order quantity per item (e.g. >= 10 boxes).
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist selects registered agency partner, enters bulk order quantities. System applies wholesale tier discount, locks FEFO batches, issues wholesale tax invoice, and logs transaction.
    * **In Abnormal Cases**: If agency tax ID is unverified, system blocks wholesale discount application until account profile is validated.

---

### 3.4.11 Search Return Invoice (UC-27)
* **Function Trigger**:
  * **Navigation Path**: POS Terminal > Menu > Select 'Return / Exchange' (`/pharmacist/returns`)
  * **Trigger Event / Frequency**: Pharmacist enters invoice code or customer phone number to initiate return.
* **Function Description**:
  * **Actors / Roles**: Pharmacist, Branch Manager
  * **Purpose**: Search past retail invoices to verify purchase origin and item eligibility prior to executing returns.
  * **Interface Type**: Full Web Page / Search Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Invoice Date, Store Branch, Purchased Item List, Batch Numbers, Unit Selling Price, Return Eligibility Status.
    * **Editable / Input**: Search Invoice Code / Customer Phone Number.
  * **Validation**:
    * Invoice search must match a valid completed transaction in the system.
  * **Business Rule**:
    * **BR-13**: Returns allowed within 7 days of purchase only upon verifying purchase origin.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist inputs invoice code `INV-20260720-001`. System displays original receipt items, purchased batches, date, and marks eligible non-Rx items.
    * **In Abnormal Cases**: If invoice is older than 7 days, system displays red badge "Return Period Expired (7 Days Exceeded)."

---

### 3.4.12 Create Return Slip (UC-28)
* **Function Trigger**:
  * **Navigation Path**: Search Return Invoice Screen > Select Items > Click 'Create Return Slip'
  * **Trigger Event / Frequency**: Pharmacist executes item return/refund.
* **Function Description**:
  * **Actors / Roles**: Pharmacist, Branch Manager
  * **Purpose**: Generates return slips recording reasons (defective goods, customer exchange), executes refunds, and restocks inventory.
  * **Interface Type**: Form Modal Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Return Slip Code, Refund Amount summary.
    * **Editable / Input**: Returned Quantity per item, Return Reason dropdown (Defective, Wrong Item, Customer Change of Mind), Restock to Inventory checkbox.
  * **Validation**:
    * Returned quantity cannot exceed original purchased quantity on invoice.
  * **Business Rule**:
    * **BR-14**: Rx prescription drugs that have left counter cannot be restocked due to safety laws.
  * **Functionality**:
    * **In Normal Cases**: Pharmacist selects 1 returned OTC box, selects "Customer Change of Mind", clicks Confirm. System issues cash refund, creates Return Slip, and increments branch FEFO batch stock.
    * **In Abnormal Cases**: If item is an Rx drug, system automatically unchecks "Restock to Inventory" and routes item to disposal queue (BR-14).

---

## 3.5 Central Warehouse & FEFO Inventory Management

### 3.5.1 View Medicine Catalog (UC-29)
* **Function Trigger**:
  * **Navigation Path**: Warehouse / Admin Dashboard > Master Data > `/warehouse/master-data/products`
  * **Trigger Event / Frequency**: Inventory Manager or Admin opens medicine catalog.
* **Function Description**:
  * **Actors / Roles**: Admin, Inventory Manager, Pharmacist
  * **Purpose**: Displays complete list of master drug SKUs in system with active ingredients, therapeutic categories, packaging units, and base prices.
  * **Interface Type**: Full Data Table Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Medicine SKU Code, Brand Name, Active Ingredient, Category, Packaging Specifications, Unit Base Price, OTC/Rx Flag.
    * **Editable / Input**: Search Bar, Category Filter, Sort options.
  * **Validation**:
    * Table supports server-side pagination (50 items/page).
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: User views master medicine list, filters by category "Antibiotics", and views full clinical details per SKU.
    * **In Abnormal Cases**: If database connection times out, page displays error retry notification.

---

### 3.5.2 View Inventory by Batch (UC-30)
* **Function Trigger**:
  * **Navigation Path**: Warehouse Dashboard > Inventory Control > `/warehouse/inventory/batches`
  * **Trigger Event / Frequency**: Inventory Manager checks batch-level stock.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager, Admin
  * **Purpose**: Displays actual stock details per product including Batch Number (`batchNo`), Expiration Date (`expDate`), and available stock quantity.
  * **Interface Type**: Full Data Table Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Product Name, Batch Number (`batchNo`), Expiry Date (`expDate`), Warehouse Location Bin, Available Quantity, Reserved Quantity, Expiry Risk Status Tag.
    * **Editable / Input**: Search Batch No, Filter by Near-Expiry status, Store Location Selector.
  * **Validation**:
    * Search allows exact or partial batch number lookup.
  * **Business Rule**:
    * **BR-08**: Display batch stock sorted by FEFO (Earliest Expiry First).
  * **Functionality**:
    * **In Normal Cases**: Inventory Manager searches product "Amoxicillin". System displays all active physical batches sorted by earliest expiry date with location bin coordinates.
    * **In Abnormal Cases**: Expired batches are highlighted in red background with status "EXPIRED - BLOCKED".

---

### 3.5.3 Create Goods Receipt (UC-31)
* **Function Trigger**:
  * **Navigation Path**: Warehouse > Stock Import > Click 'Create Goods Receipt' (`/warehouse/inventory/requisitions`)
  * **Trigger Event / Frequency**: Warehouse manager receives shipment from supplier based on approved PO.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager
  * **Purpose**: Creates receiving document for goods delivered by supplier based on an approved Purchase Order (PO).
  * **Interface Type**: Multi-step Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: PO Reference Number, Supplier Name, Expected SKUs and Quantities.
    * **Editable / Input**: Received Quantities, Batch Numbers (`batchNo`), Expiration Dates (`expDate`), Manufacturing Dates, Unit Purchase Costs.
  * **Validation**:
    * Expiry date must be at least 12 months in the future for incoming supplier goods.
    * Batch number is strictly required for every received line item.
  * **Business Rule**:
    * **BR-18**: GRN must undergo physical/AI inspection verification before central stock activation.
  * **Functionality**:
    * **In Normal Cases**: Manager selects approved PO #PO-2026-08, inputs actual received quantities, batch numbers, and expiry dates per item, and submits GRN for Admin approval.
    * **In Abnormal Cases**: If received quantity exceeds approved PO quantity by > 10%, system triggers over-delivery warning requiring admin approval code.

---

### 3.5.4 Create Purchase Order (PO) (UC-32)
* **Function Trigger**:
  * **Navigation Path**: Warehouse > Inventory > Click 'Create Purchase Order' (`/warehouse/inventory/po/create`)
  * **Trigger Event / Frequency**: Inventory Manager creates new procurement order.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager
  * **Purpose**: Create new Purchase Orders (PO) to submit to HQ Admin for approval before submitting to suppliers.
  * **Interface Type**: Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Supplier Contact Info, Calculated Order Total.
    * **Editable / Input**: Supplier Selection dropdown, Item List, Order Quantities, Negotiated Unit Cost, Target Delivery Date.
  * **Validation**:
    * Item quantities must be positive integers > 0.
  * **Business Rule**:
    * **BR-17**: PO must receive explicit approval from HQ Admin before official transmission to suppliers.
  * **Functionality**:
    * **In Normal Cases**: Manager selects supplier, adds 5 medicine SKUs with desired replenishment quantities, clicks 'Submit for Approval'. System creates draft PO in `PENDING_APPROVAL` status and notifies Admin.
    * **In Abnormal Cases**: If no supplier is selected, form submission is blocked with validation error MSG02.

---

### 3.5.5 Inspect Goods via AI (UC-33)
* **Function Trigger**:
  * **Navigation Path**: GRN Creation Screen > Click 'Inspect Goods via AI' button
  * **Trigger Event / Frequency**: Staff captures shipment package photos using mobile app / warehouse camera.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager
  * **Purpose**: Capture images of shipment packages using mobile device; AI computer vision automatically counts actual medicine boxes in shipment to populate receipt.
  * **Interface Type**: Camera Snapshot Widget / AI Processing Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Uploaded Package Photo preview, AI Box Bounding Boxes, Detected Box Count, Audit Evidence Timestamp.
    * **Editable / Input**: Capture Photo button, Confirm AI Count button.
  * **Validation**:
    * Image must contain clear lighting and visible box package contours.
  * **Business Rule**:
    * **BR-18**: AI camera inspection attaches visual evidence to GRN.
  * **Functionality**:
    * **In Normal Cases**: Staff takes photo of pallet with 100 medicine boxes. AI computer vision model analyzes image in < 2s, draws bounding boxes around 100 boxes, counts them automatically, and populates GRN quantity.
    * **In Abnormal Cases**: If AI count differs from PO expected count (e.g. AI detects 95 boxes instead of 100), system flags discrepancy in orange for manual recount.

---

### 3.5.6 Alert Expiry Dates (UC-34)
* **Function Trigger**:
  * **Navigation Path**: Warehouse / Admin Dashboard > Click 'Expiry Alerts' (`/warehouse/inventory/expiry-alerts`)
  * **Trigger Event / Frequency**: Automated daily background scan or manual navigation.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager, Admin
  * **Purpose**: Reports detailed lists of near-expiry batches (under 6 months / 3 months) or expired items to plan for disposal/write-offs.
  * **Interface Type**: Dashboard Report Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Batch Number, SKU Name, Expiry Date, Days Remaining countdown, Stock Quantity, Warning Status (Red Alert < 3m, Yellow Alert < 6m).
    * **Editable / Input**: Filter by Risk Category, Export Report button, Initiate Quarantine button.
  * **Validation**:
    * Date calculations evaluated against server current UTC time.
  * **Business Rule**:
    * **BR-09**: Red Alert batches (< 3m) automatically blocked from POS and quarantined.
    * **BR-10**: Yellow Alert batches (< 6m) trigger promotional discount priority.
  * **Functionality**:
    * **In Normal Cases**: System displays interactive report table categorizing 5 Red Alert batches and 12 Yellow Alert batches. Manager clicks 'Quarantine' to lock Red Alert batches from sales.
    * **In Abnormal Cases**: If no near-expiry batches exist, report displays green banner "All batches are within safe shelf-life limits."

---

### 3.5.7 Track Medicine Lot (UC-35)
* **Function Trigger**:
  * **Navigation Path**: Warehouse > Inventory > Lot Tracking (`/warehouse/lot-tracking`)
  * **Trigger Event / Frequency**: Inventory Manager enters batch number to trace lot history.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager, Admin
  * **Purpose**: Enter batch number (`batchNo`) to trace full supplier origin, PO, GRN, and display quantity fluctuation timeline for that batch.
  * **Interface Type**: Full Audit Trail Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Batch Metadata, Origin Supplier, Receiving GRN ID, Initial Quantity, Current Remaining Quantity, Complete Movement Timeline (GRN Inbound -> Branch Transfers -> Counter Sales -> Write-offs).
    * **Editable / Input**: Batch Number Search Input.
  * **Validation**:
    * Batch number must exist in database.
  * **Business Rule**:
    * **BR-12**: Sales and movement transactions must log batch number for complete lot auditability.
  * **Functionality**:
    * **In Normal Cases**: Manager inputs batch `LOT-2026-99`. System displays full timeline showing GRN receipt of 1,000 units, transfer of 200 units to Branch A, sales of 150 units, leaving 650 units.
    * **In Abnormal Cases**: If batch number is not found, system displays error "No lot record found matching batch number."

---

## 3.6 Branch Store Management

### 3.6.1 View Branch Stock (UC-36)
* **Function Trigger**:
  * **Navigation Path**: Branch Dashboard > Stock Overview (`/branch/inventory`)
  * **Trigger Event / Frequency**: Branch Manager views local store inventory.
* **Function Description**:
  * **Actors / Roles**: Branch Manager
  * **Purpose**: Quickly look up actual physical stock quantities and batch levels of medicines at the managed store branch.
  * **Interface Type**: Data Table Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Product Name, SKU, Category, Local Stock Quantity, Safety Stock Threshold, Expiry Warning Status.
    * **Editable / Input**: Search Input, Low Stock Filter toggle.
  * **Validation**:
    * Displays data specific to the manager's assigned branch location.
  * **Business Rule**:
    * **BR-16**: Low stock status highlighted when local inventory drops below branch safety threshold.
  * **Functionality**:
    * **In Normal Cases**: Branch manager opens page. Table renders current branch stock. Items below safety stock threshold (e.g. < 10 boxes) are highlighted in yellow with button 'Request Requisition'.
    * **In Abnormal Cases**: If branch connection is lost, page displays cached local stock data with offline warning tag.

---

### 3.6.2 Request Stock Requisition (UC-37)
* **Function Trigger**:
  * **Navigation Path**: Branch Inventory > Click 'Create Requisition (PR)' (`/branch/requisitions`)
  * **Trigger Event / Frequency**: Branch Manager submits stock replenishment request to central warehouse.
* **Function Description**:
  * **Actors / Roles**: Branch Manager
  * **Purpose**: Create stock replenishment requests sent to central warehouse when branch counters experience shortages or out-of-stock items.
  * **Interface Type**: Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Branch Code, Current Stock Levels, Suggested Requisition Quantity.
    * **Editable / Input**: Requested Item List, Requested Quantities, Priority Urgency dropdown (Normal / High / Critical Out-of-Stock), Notes.
  * **Validation**:
    * Requested quantities must be positive integers > 0.
  * **Business Rule**:
    * **BR-16**: Branch managers create PR when stock falls below safety thresholds.
  * **Functionality**:
    * **In Normal Cases**: Manager selects 3 low-stock items, enters requested quantities, selects "High Urgency", clicks Submit. System generates Requisition `PR-BR01-102` in `PENDING_HQ_APPROVAL` status and notifies Warehouse and Admin.
    * **In Abnormal Cases**: If requested item list is empty, system blocks submission with MSG02.

---

### 3.6.3 Request Internal Transfer (UC-38)
* **Function Trigger**:
  * **Navigation Path**: Branch Inventory > Transfers > Click 'New Internal Transfer' (`/branch/receive-transfers`)
  * **Trigger Event / Frequency**: Branch Manager creates inter-branch stock transfer slip.
* **Function Description**:
  * **Actors / Roles**: Branch Manager
  * **Purpose**: Create stock transfer slips to ship goods to neighboring branches to resolve cross-branch stock imbalances.
  * **Interface Type**: Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Origin Branch, Destination Branch Address, Available Local FEFO Batches.
    * **Editable / Input**: Target Destination Branch dropdown, Transfer Items, FEFO Batch selection, Quantities.
  * **Validation**:
    * Destination branch cannot be the same as origin branch.
    * Transfer quantity cannot exceed available origin branch stock.
  * **Business Rule**:
    * **BR-19**: Inter-branch transfers require confirmation from sending and receiving branch managers.
  * **Functionality**:
    * **In Normal Cases**: Manager at Branch A creates transfer slip for 20 boxes of Paracetamol to Branch B. System creates Transfer Record in `IN_TRANSIT` status, locks batch stock at Branch A, and alerts Branch B manager.
    * **In Abnormal Cases**: If origin branch has insufficient batch stock, system blocks transfer creation.

---

### 3.6.4 Approve Stock Replenishment (UC-39)
* **Function Trigger**:
  * **Navigation Path**: Warehouse / Admin Dashboard > Requisitions > Select PR > Click 'Approve & Dispatch'
  * **Trigger Event / Frequency**: Inventory Manager reviews branch PR request.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager
  * **Purpose**: Review Requisition requests submitted by branches and approve dispatch of goods from central warehouse.
  * **Interface Type**: Approval Details Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: PR Details, Requesting Branch, Item List, Requested Quantities vs Central Warehouse Available FEFO Batches.
    * **Editable / Input**: Approved Quantities per line item, Warehouse FEFO Batch allocation selection, Approve button, Reject button + Rejection Reason.
  * **Validation**:
    * Approved quantity cannot exceed central warehouse available stock.
  * **Business Rule**:
    * **BR-08**: Central warehouse dispatches goods following strict FEFO batch allocation.
  * **Functionality**:
    * **In Normal Cases**: Inventory Manager reviews Branch A PR for 50 boxes, allocates central warehouse batch `LOT-CENTRAL-01`, clicks 'Approve'. System generates Dispatch Note, deducts central stock, and updates PR status to `DISPATCHED_IN_TRANSIT`.
    * **In Abnormal Cases**: If central warehouse is also out of stock, manager enters rejection reason "Central warehouse out of stock; added to supplier PO" and clicks Reject.

---

### 3.6.5 Confirm Transfer Receipt (UC-40)
* **Function Trigger**:
  * **Navigation Path**: Branch Transfers > Select Incoming Shipment > Click 'Confirm Goods Received' (`/branch/receive-transfers`)
  * **Trigger Event / Frequency**: Branch Manager receives incoming stock shipment from warehouse or branch.
* **Function Description**:
  * **Actors / Roles**: Branch Manager
  * **Purpose**: Receive goods delivered from central warehouse, verify physical count, and click confirm to synchronize and update destination stock.
  * **Interface Type**: Verification Confirmation Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Dispatch Transfer Slip Code, Origin Warehouse/Branch, Expected Items and FEFO Batches.
    * **Editable / Input**: Actual Received Quantities per item, Discrepancy Notes, Confirm Receipt button.
  * **Validation**:
    * Received quantity input must be non-negative integer.
  * **Business Rule**:
    * **BR-19**: Transfer receipt updates destination stock balances upon mutual confirmation.
  * **Functionality**:
    * **In Normal Cases**: Branch manager inspects delivered package of 50 boxes, verifies batch numbers match transfer slip, clicks 'Confirm Receipt'. System increments Branch B stock balance with received FEFO batches and marks transfer `COMPLETED`.
    * **In Abnormal Cases**: If 2 boxes are missing (received 48 of 50), manager logs discrepancy 48 received, 2 missing, and submits partial receipt report.

---

## 3.7 HQ System Governance & Staff Management

### 3.7.1 View Staff List (UC-41)
* **Function Trigger**:
  * **Navigation Path**: Admin / Branch Dashboard > Staff Management (`/admin/employees`)
  * **Trigger Event / Frequency**: Admin or Branch Manager opens staff directory.
* **Function Description**:
  * **Actors / Roles**: Admin, Branch Manager
  * **Purpose**: Displays a table listing all employees in the pharmacy chain with detailed information on role, work shift, branch, and activation status.
  * **Interface Type**: Full Data Table Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Staff ID, Full Name, Email, Phone Number, Role (Pharmacist, Inventory Manager, Branch Manager), Assigned Branch, Status (Active, Pending Approval, Deactivated).
    * **Editable / Input**: Search Staff, Filter by Role/Branch, Status Filter.
  * **Validation**:
    * Branch Managers can only view staff assigned to their specific branch. Admins can view all chain staff.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin views complete employee directory across 10 branches, filters by role "Pharmacist", and checks active account statuses.
    * **In Abnormal Cases**: If no staff match search query, table displays "No staff members found."

---

### 3.7.2 Create Staff Account (UC-42)
* **Function Trigger**:
  * **Navigation Path**: Staff List Screen > Click 'Add New Staff' button
  * **Trigger Event / Frequency**: Branch Manager or Admin creates staff account.
* **Function Description**:
  * **Actors / Roles**: Branch Manager
  * **Purpose**: Allows Branch Manager to create new accounts for pharmacists and counter staff members at their branch.
  * **Interface Type**: Form Modal Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Assigned Branch name.
    * **Editable / Input**: Full Name, Work Email, Phone Number, Assigned Role (Pharmacist / Inventory Manager), Initial Password, Shift Schedule.
  * **Validation**:
    * Work email must be unique and follow valid format.
  * **Business Rule**:
    * **BR-02**: Staff accounts created by Branch Manager require Admin review/approval before activation.
  * **Functionality**:
    * **In Normal Cases**: Branch Manager fills new pharmacist details and submits. System creates account record in `PENDING_APPROVAL` status and dispatches email notification to HQ Admin.
    * **In Abnormal Cases**: If email is already assigned to another user, system displays inline error "Email address already registered."

---

### 3.7.3 Approve Staff Account (UC-43)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Approvals > Staff Requests > Click 'Approve Account'
  * **Trigger Event / Frequency**: Admin reviews pending staff registration requests.
* **Function Description**:
  * **Actors / Roles**: Admin, Branch Manager
  * **Purpose**: Allows Admin or Branch Manager to review and approve newly registered staff accounts.
  * **Interface Type**: Confirmation Modal / List
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Staff Name, Email, Assigned Branch, Role, Registration Timestamp.
    * **Editable / Input**: Approve Button, Role Confirmation dropdown.
  * **Validation**:
    * Account must currently be in `PENDING_APPROVAL` status.
  * **Business Rule**:
    * **BR-02**: Account approval activates login permissions.
  * **Functionality**:
    * **In Normal Cases**: Admin reviews pending pharmacist account, clicks 'Approve'. System updates account status to `ACTIVE`, issues welcome email with login link, and logs approval in audit logs.
    * **In Abnormal Cases**: If account is already active, approval button is disabled.

---

### 3.7.4 Reject Staff Account (UC-44)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Approvals > Staff Requests > Click 'Reject Account'
  * **Trigger Event / Frequency**: Admin rejects staff account creation request.
* **Function Description**:
  * **Actors / Roles**: Admin, Branch Manager
  * **Purpose**: Allows Admin or Branch Manager to reject new staff registration requests.
  * **Interface Type**: Modal Screen with Textarea
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Staff Request Profile.
    * **Editable / Input**: Rejection Reason textarea, Confirm Reject button.
  * **Validation**:
    * Rejection reason is required (minimum 10 characters).
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin inputs reason "Invalid branch assignment credentials", clicks Confirm Reject. System updates status to `REJECTED`, sends notification email to requesting manager, and logs action.
    * **In Abnormal Cases**: If rejection reason is blank, system displays validation error MSG02.

---

### 3.7.5 Create Branch Manager Account (UC-45)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Branch Admin > Click 'Create Branch Manager' (`/admin/branches`)
  * **Trigger Event / Frequency**: HQ Admin provisions a new Branch Manager.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Allows HQ Admin to create new branch manager accounts and grant branch management permissions.
  * **Interface Type**: Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Available Store Branch List.
    * **Editable / Input**: Manager Full Name, Work Email, Phone Number, Target Assigned Branch, Management Scope Permissions.
  * **Validation**:
    * Target branch must not already have an active primary Branch Manager assigned.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin enters manager details, assigns to "Da Nang Store Branch #2", submits. System creates active account with `BRANCH_MANAGER` role, sends temporary credentials via encrypted email, and assigns branch management scope.
    * **In Abnormal Cases**: If selected branch already has an active manager, system prompts "Selected branch already has an assigned manager. Replace manager?"

---

### 3.7.6 Update Staff Role (UC-46)
* **Function Trigger**:
  * **Navigation Path**: Admin > Staff Management > Action Column > Click 'Edit Role / Branch'
  * **Trigger Event / Frequency**: Admin modifies employee profile permissions.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Allows Admin to update staff profile, assign job roles, and reassign branch locations.
  * **Interface Type**: Form Modal Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Staff ID, Current Role, Current Branch.
    * **Editable / Input**: Role dropdown (Pharmacist / Inventory Manager / Branch Manager), Reassigned Branch dropdown, Account Status toggle (Active / Suspended).
  * **Validation**:
    * Admin cannot modify their own super-admin role.
  * **Business Rule**:
    * **BR-21**: All role modifications recorded in system audit logs.
  * **Functionality**:
    * **In Normal Cases**: Admin changes staff member role from Pharmacist to Inventory Manager and assigns to Central Warehouse. System updates user role token claims and invalidates active session to enforce immediate permission reload.
    * **In Abnormal Cases**: If Admin attempts to deactivate the last remaining Super Admin, system blocks action with alert "Cannot deactivate the primary system administrator."

---

### 3.7.7 Add Medicine (UC-47)
* **Function Trigger**:
  * **Navigation Path**: Admin / Warehouse > Master Catalog > Click 'Add New Medicine' (`/warehouse/master-data/products`)
  * **Trigger Event / Frequency**: Admin creates a new master drug SKU.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Create a new medicine and fill in identification attributes, packaging specifications, and usage instructions.
  * **Interface Type**: Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Generated SKU Code (`MED-xxxx`).
    * **Editable / Input**: Brand Name, Generic Name, Active Ingredient, Concentration, Therapeutic Group, Dosage Form (Tablet / Capsule / Liquid), Unit Specifications (Box / Blister / Pill), Base Retail Price, OTC/Rx Flag, Manufacturer Name.
  * **Validation**:
    * SKU Brand Name and Active Ingredient are mandatory fields.
    * Base Retail Price must be a positive number > 0.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin fills complete drug specification form and clicks Save. System creates new master Medicine entity in global catalog, generates SKU code, and renders product in catalog.
    * **In Abnormal Cases**: If duplicate Brand Name + Concentration exists, system warns "A medicine SKU with this name and concentration already exists."

---

### 3.7.8 Update Medicine (UC-48)
* **Function Trigger**:
  * **Navigation Path**: Master Catalog > Click Edit Icon on Product Row
  * **Trigger Event / Frequency**: Admin updates existing medicine details.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Edit medicine attributes, descriptions, images, or classification categories in the system catalog.
  * **Interface Type**: Form Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Medicine SKU Code, Historical Price Changes log.
    * **Editable / Input**: Description, Packaging Units, Base Price, Prescription Flag, Product Image Upload.
  * **Validation**:
    * Base price changes require audit log reason.
  * **Business Rule**:
    * **BR-21**: Price modifications logged in audit records.
  * **Functionality**:
    * **In Normal Cases**: Admin updates base selling price from 50,000 VND to 55,000 VND, uploads new packaging photo, submits. System updates master record, invalidates API price cache, and logs price modification.
    * **In Abnormal Cases**: If base price is entered as a negative value, system displays validation error MSG02.

---

### 3.7.9 View Supplier List (UC-49)
* **Function Trigger**:
  * **Navigation Path**: Admin / Warehouse > Master Data > Suppliers (`/warehouse/master-data/suppliers`)
  * **Trigger Event / Frequency**: Admin or Inventory Manager opens supplier directory.
* **Function Description**:
  * **Actors / Roles**: Admin, Inventory Manager
  * **Purpose**: Displays contact information, supplier code, and reliability rating of suppliers.
  * **Interface Type**: Data Table Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Supplier Code, Company Name, Tax ID, Phone Number, Email, GDP License Expiry Date, Credit Terms, Reliability Rating (1-5 Stars).
    * **Editable / Input**: Search Supplier, Filter by GDP Expiry status.
  * **Validation**:
    * Displays active suppliers in system database.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: User views list of 15 pharmaceutical suppliers, checks GDP license validity dates, and views credit terms.
    * **In Abnormal Cases**: Suppliers with expired GDP licenses are highlighted with a red warning badge "GDP Expired."

---

### 3.7.10 Add Supplier (UC-50)
* **Function Trigger**:
  * **Navigation Path**: Supplier List Screen > Click 'Register Supplier' button
  * **Trigger Event / Frequency**: Admin registers new drug supplier.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Register new pharmaceutical supplier information and store legal profiles in the system.
  * **Interface Type**: Form Modal Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Generated Supplier Code (`SUP-xxx`).
    * **Editable / Input**: Company Name, Tax Identification Number, Address, Contact Person, Email, Phone Number, GDP License Number, GDP License Expiry Date, Payment Credit Terms (e.g. Net 30 Days).
  * **Validation**:
    * Tax ID and Company Name are required and must be unique.
    * GDP Expiry Date must be a future date.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin inputs supplier legal details and submits. System creates Supplier entity, generates supplier code, and saves profile for PO procurement.
    * **In Abnormal Cases**: If Tax ID already exists in DB, system blocks creation with error "Tax ID is already registered to another supplier."

---

### 3.7.11 Update Supplier (UC-51)
* **Function Trigger**:
  * **Navigation Path**: Supplier List > Action Column > Click 'Edit Supplier'
  * **Trigger Event / Frequency**: Admin updates supplier profile information.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Adjust contact information, GDP license expiration date, or supplier credit terms.
  * **Interface Type**: Form Modal Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Supplier Code, Historical PO Count.
    * **Editable / Input**: Phone Number, Email, GDP License Expiry Date, Payment Terms, Active Status toggle.
  * **Validation**:
    * License expiration date must be valid date format.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin updates renewed GDP license expiry date to 2028-12-31 and updates phone number. System saves updated supplier profile.
    * **In Abnormal Cases**: If supplier is marked Deactivated, system prevents selecting this supplier when creating new Purchase Orders.

---

## 3.8 Corporate Finance, Approvals & AI Analytics

### 3.8.1 View Revenue Dashboard (UC-52)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Analytics > Financial Revenue (`/admin/finance`)
  * **Trigger Event / Frequency**: Admin views corporate revenue dashboard.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: View revenue charts over time, transaction counts, total payables/receivables, and chain-wide operational performance.
  * **Interface Type**: Executive BI Dashboard Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Gross Revenue Widget, Net Profit Margin, Transaction Volume, Chain Cash Flow Chart, Accounts Payable to Suppliers, Accounts Receivable from Wholesale Partners.
    * **Editable / Input**: Date Range Picker (Today / This Week / Month / Custom), Branch Selector Filter.
  * **Validation**:
    * Date range start date must be prior to end date.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin selects "Current Month" and "All Branches". Dashboard renders interactive revenue bar charts, profit margin pie charts, and sales growth breakdown.
    * **In Abnormal Cases**: If financial service query fails, widget displays retry button "Failed to load financial metrics."

---

### 3.8.2 Compare Branch Performance (UC-53)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Analytics > Branch Performance (`/admin/ai-insights`)
  * **Trigger Event / Frequency**: Admin opens branch comparative ranking analytics.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Display comparative ranking tables for sales volume, transaction counts, and growth rates across all branch locations.
  * **Interface Type**: Analytics Comparison Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Branch Ranking Table, Sales Revenue per Branch, Order Count per Branch, Average Ticket Size, Top Performing Branch Badge, Underperforming Alert Flag.
    * **Editable / Input**: Sorting Criterion (Revenue / Orders / Growth %), Date Filter.
  * **Validation**:
    * Compares active stores in chain network.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin views table ranking 10 branches by revenue. System highlights top branch "Branch #1 - Da Nang Center" (120M VND) and flags lowest branch for operational review.
    * **In Abnormal Cases**: If a newly opened branch has 0 sales, system displays "New Branch - No Data Yet".

---

### 3.8.3 Approve Purchase Order (PO) (UC-54)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Approvals > Purchase Orders > Select PO (`/admin/approvals`)
  * **Trigger Event / Frequency**: HQ Admin reviews pending supplier PO for approval.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Approve Purchase Orders (PO) sent to suppliers and configure payment methods.
  * **Interface Type**: Approval Detail Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: PO Code, Supplier Name, Item List, Quantities, Unit Purchase Price, Calculated Total PO Cost.
    * **Editable / Input**: Payment Method Selection (Bank Credit / Cash), Admin Approval Notes, Approve Button.
  * **Validation**:
    * PO must be in `PENDING_APPROVAL` status.
  * **Business Rule**:
    * **BR-17**: Purchase Orders submitted to suppliers must receive explicit approval from HQ Admin.
    * **BR-21**: All PO approval actions logged in audit logs.
  * **Functionality**:
    * **In Normal Cases**: Admin reviews PO #PO-2026-88 total 150M VND, checks supplier credit terms, clicks 'Approve PO'. System updates PO status to `APPROVED_SENT_TO_SUPPLIER`, generates official PO PDF, and emails supplier.
    * **In Abnormal Cases**: If PO total exceeds corporate credit limit, system displays warning prompt requiring secondary confirmation.

---

### 3.8.4 Reject Purchase Order (PO) (UC-55)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Approvals > Select PO > Click 'Reject PO'
  * **Trigger Event / Frequency**: Admin rejects supplier PO submission.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Reject approval of purchase order PO and record rejection reasons.
  * **Interface Type**: Modal Screen with Textarea
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Target PO Reference Summary.
    * **Editable / Input**: Rejection Reason textarea (mandatory), Confirm Reject button.
  * **Validation**:
    * Rejection reason is strictly required (minimum 10 characters).
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin inputs reason "Unit price for item X is higher than contracted rate; renegotiate with supplier", clicks Confirm Reject. System updates PO status to `REJECTED`, notifies Inventory Manager to edit PO.
    * **In Abnormal Cases**: If rejection reason text is empty, system blocks rejection with error MSG02.

---

### 3.8.5 Approve Goods Receipt Note (GRN) (UC-56)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Approvals > GRN Receipts > Select GRN (`/admin/approvals`)
  * **Trigger Event / Frequency**: HQ Admin signs off warehouse physical inspection GRN.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Sign and approve physical inspection receipt from warehouse manager to confirm official entry, increase total stock, and activate new batches.
  * **Interface Type**: Approval Detail Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: GRN ID, Supplier Name, Physical Inspection Report, AI Camera Evidence Photo, Received FEFO Batches (`batchNo`, `expDate`), Total Inventory Valuation.
    * **Editable / Input**: Approve GRN Button, Final Sign-off Notes.
  * **Validation**:
    * GRN must have passed physical or AI camera inspection.
  * **Business Rule**:
    * **BR-18**: GRN must pass inspection verification before central stock activation.
    * **BR-21**: Action logged in system audit trail.
  * **Functionality**:
    * **In Normal Cases**: Admin inspects GRN data and AI box count evidence, clicks 'Approve GRN'. System signs receipt, officially updates central warehouse stock balances, activates new FEFO batches for dispatch, and updates PO to `FULFILLED`.
    * **In Abnormal Cases**: If GRN contains unverified batch expiry dates, system blocks approval until warehouse manager corrects batch metadata.

---

### 3.8.6 Reject Goods Receipt Note (GRN) (UC-57)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Approvals > Select GRN > Click 'Reject GRN'
  * **Trigger Event / Frequency**: Admin rejects warehouse GRN entry.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Reject physical inspection receipt (GRN) from warehouse manager and record rejection reasons for re-verification.
  * **Interface Type**: Modal Screen with Textarea
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Target GRN Details.
    * **Editable / Input**: Rejection Reason textarea, Confirm Reject button.
  * **Validation**:
    * Rejection reason mandatory.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin enters reason "Batch numbers do not match physical supplier invoice; re-count required", clicks Confirm. System updates GRN status to `REJECTED_NEEDS_REVISION` and alerts warehouse manager.
    * **In Abnormal Cases**: If rejection reason is blank, system displays error MSG02.

---

### 3.8.7 Manage Promotions (UC-58)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Marketing > Vouchers & Promotions (`/admin/vouchers`)
  * **Trigger Event / Frequency**: Admin configures discount campaigns or flash sales.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Create percentage/cash discount voucher codes, set up Flash Sale events for designated time slots.
  * **Interface Type**: Management Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Active Promotion List, Redemption Usage Statistics, Remaining Voucher Quota.
    * **Editable / Input**: Campaign Name, Voucher Code string, Discount Type (Percentage / Fixed Amount), Discount Value, Minimum Order Value, Start Date & End Date, Usage Limit Quota.
  * **Validation**:
    * Start Date must be prior to End Date. Discount value must be positive integer.
  * **Business Rule**:
    * **BR-10**: Priority promotional campaigns launched for Yellow Alert near-expiry batches.
  * **Functionality**:
    * **In Normal Cases**: Admin creates campaign "FLASH20", 20% off for near-expiry items, valid for 7 days with 500 redemptions. System activates voucher code for online cart and POS application.
    * **In Abnormal Cases**: If voucher code string already exists, system displays error "Voucher code already active."

---

### 3.8.8 Manage Cash Flow (UC-59)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > Finance > Cash Flow & Expenses (`/admin/finance`)
  * **Trigger Event / Frequency**: Admin monitors corporate cash flow and logs fixed expenses.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: View financial cash flow reports, enter fixed operational expenses (rent, salaries, utilities...) of branches.
  * **Interface Type**: Financial Form & Ledger Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Net Cash Flow Ledger, Operating Income vs Expenses Summary Chart, Net Profit.
    * **Editable / Input**: Add Expense Item (Expense Category: Rent/Salary/Utility, Amount VND, Target Branch, Transaction Date, Receipt Attachment).
  * **Validation**:
    * Expense amount must be a positive number > 0.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin logs monthly branch store rent expense of 25,000,000 VND for Branch #1. System records ledger transaction, updates net cash flow calculations, and re-renders profit charts.
    * **In Abnormal Cases**: If expense category is unselected, form submission is blocked.

---

### 3.8.9 Query Audit Logs (UC-60)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > System Security > Audit Logs (`/admin/audit-logs`)
  * **Trigger Event / Frequency**: Admin inspects system activity logs.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Retrieve audit log records tracking critical business operations performed by staff for security compliance.
  * **Interface Type**: Audit Trail Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Log ID, Timestamp, User Name & ID, User Role, Action Executed (e.g., `FEFO_OVERRIDE`, `PO_APPROVE`, `PRICE_UPDATE`), IP Address, Affected Entity ID, Changes Diff (Before/After values).
    * **Editable / Input**: Filter by User, Date Range Picker, Action Code dropdown, Search Bar.
  * **Validation**:
    * Audit log records are immutable and read-only.
  * **Business Rule**:
    * **BR-21**: All critical actions must be recorded in immutable system audit logs.
  * **Functionality**:
    * **In Normal Cases**: Admin searches audit logs for action "PRICE_UPDATE" during the last 30 days. System returns paginated log entries showing exact before/after selling prices, user who executed change, timestamp, and IP address.
    * **In Abnormal Cases**: If no logs match filter, table displays "No audit logs found for selected criteria."

---

### 3.8.10 Forecast Demand (UC-61)
* **Function Trigger**:
  * **Navigation Path**: Warehouse / Admin Dashboard > AI Analytics > Demand Forecast (`/warehouse/ai-forecast`)
  * **Trigger Event / Frequency**: System runs scheduled forecast or user requests manual AI prediction.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager, Admin
  * **Purpose**: System automatically analyzes sales volume and actual inventory levels to suggest replenishment order quantities from suppliers.
  * **Interface Type**: AI Forecasting Dashboard Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Predicted SKU Demand Curve (30-day projection), Current Warehouse Stock, Safety Stock Threshold, Calculated Economic Order Quantity (EOQ), Recommended Supplier PO List.
    * **Editable / Input**: Forecast Horizon selector (14 Days / 30 Days / 90 Days), Target Safety Stock Days parameter.
  * **Validation**:
    * Model predictions require at least 30 days of historical sales data.
  * **Business Rule**:
    * **BR-20**: AI replenishment recommendations must be reviewed by Inventory Manager before converting to Purchase Orders.
  * **Functionality**:
    * **In Normal Cases**: Manager opens AI Forecast page. Predictive model analyzes 90-day sales velocity, projects 500 boxes of Paracetamol needed for next month, compares with 100 current stock, and recommends ordering 400 boxes (EOQ).
    * **In Abnormal Cases**: If historical sales data is insufficient for a new drug SKU, system displays warning "Insufficient sales history; using default safety stock calculation."

---

### 3.8.11 Auto-Generate PO from AI Forecast (UC-62)
* **Function Trigger**:
  * **Navigation Path**: AI Demand Forecast Dashboard > Select Recommended Items > Click 'Auto-Generate PO'
  * **Trigger Event / Frequency**: On button click by Inventory Manager / Admin.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager, Admin
  * **Purpose**: Allows converting AI Economic Order Quantity (EOQ) replenishment recommendations directly into an official Purchase Order (PO) with one click.
  * **Interface Type**: Action Trigger / Form Preview Modal
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Generated Draft PO Summary, Auto-selected Preferred Supplier, EOQ Quantities, Estimated Procurement Cost.
    * **Editable / Input**: Supplier selection override, Quantity adjustment, Confirm & Submit for Approval button.
  * **Validation**:
    * Generated PO items must have assigned active suppliers in master catalog.
  * **Business Rule**:
    * **BR-17**: PO must receive explicit approval from HQ Admin before transmission.
    * **BR-20**: AI EOQ recommendations reviewed before PO conversion.
  * **Functionality**:
    * **In Normal Cases**: Manager reviews AI forecast recommendation for 400 boxes, clicks 'Auto-Generate PO'. System groups items by preferred supplier ID, creates draft PO #PO-2026-99 with EOQ quantities, and routes PO to Admin approval queue.
    * **In Abnormal Cases**: If an AI recommended item has no registered supplier, system prompts "Please assign a supplier to item {SKU_name} before generating PO."

---

### 3.8.12 Detect Inventory Anomalies with AI (UC-63)
* **Function Trigger**:
  * **Navigation Path**: Admin / Warehouse Dashboard > AI Analytics > Anomaly Detection (`/admin/ai-insights`)
  * **Trigger Event / Frequency**: Automated background job or manual dashboard inspection.
* **Function Description**:
  * **Actors / Roles**: Inventory Manager, Admin
  * **Purpose**: AI system automatically detects and alerts unusual inventory fluctuations such as export spikes, critically low stock, or abnormal inventory adjustments.
  * **Interface Type**: Executive Alert Dashboard Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Anomaly Alert Cards, Affected SKU Name & Location, Expected Baseline Movement vs Abnormal Spike %, Suspected Root Cause (e.g. Unrecorded Wastage, Theft Risk, Sudden Outbreak Demand), Severity Flag.
    * **Editable / Input**: Acknowledge Anomaly button, Initiate Audit Action button.
  * **Validation**:
    * Anomaly triggers when deviation exceeds 3 standard deviations from historical baseline.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: AI anomaly detector scans stock movements, detects an abnormal write-off spike of 50 boxes at Branch #3 within 2 hours. Dashboard generates Red Anomaly Alert "Unusual Wastage Spike Detected at Branch #3" and notifies Admin.
    * **In Abnormal Cases**: If no anomalies detected, dashboard displays "Inventory operations operating within normal statistical parameters."

---

### 3.8.13 Analyze Seasonal and Epidemic Trends (UC-64)
* **Function Trigger**:
  * **Navigation Path**: Admin Dashboard > AI Analytics > Seasonal & Epidemic Insights (`/admin/ai-insights`)
  * **Trigger Event / Frequency**: Admin opens strategic market intelligence dashboard.
* **Function Description**:
  * **Actors / Roles**: Admin
  * **Purpose**: Analyzes historical sales data across seasonal shifts and disease outbreaks to forecast medicine demand and optimize strategic stocking.
  * **Interface Type**: Strategic BI Analytics Screen
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Seasonal Demand Heatmap, Epidemic Trend Category Correlation (e.g. Flu Remedies in Winter, Dengue Fever SKUs in Rainy Season), Strategic Stocking Recommendations list.
    * **Editable / Input**: Disease Outbreak Filter, Weather Season Selector (Rainy / Dry / Winter), Forecast Target Region.
  * **Validation**:
    * Models incorporate external disease outbreak trend data.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Admin selects "Flu Season - Winter". System analyzes past 3-year historical sales, projects 150% demand increase in fever and cold medications, and displays recommended pre-stocking quantities for central warehouse.
    * **In Abnormal Cases**: If no historical trend data exists for a category, system displays baseline generic demand projections.

---

### 3.8.14 Receive Notifications (UC-65)
* **Function Trigger**:
  * **Navigation Path**: Top Right Header Bell Icon / Popup Toast Overlay (System-wide)
  * **Trigger Event / Frequency**: Real-time Socket.io event push from backend server.
* **Function Description**:
  * **Actors / Roles**: Customer, Pharmacist, Inventory Manager, Admin, Branch Manager
  * **Purpose**: System pushes real-time socket notifications for near-expiry alerts, PO/GRN approval requests, or urgent branch replenishment requests.
  * **Interface Type**: Notification Center Drawer / Toast Overlay
* **Screen Layout**: N/A
* **Function Details**:
  * **Data**:
    * **Read-only / Output**: Notification Title, Message Body, Timestamp, Category Icon (Alert, Approval, Order, Expiry), Unread Badge Count, Target Action Link URL.
    * **Editable / Input**: Mark as Read button, Clear All button, Click Notification row (Navigates to URL).
  * **Validation**:
    * User must be logged in with active WebSocket connection room.
  * **Business Rule**:
    * N/A.
  * **Functionality**:
    * **In Normal Cases**: Branch Manager submits urgent PR. Backend emits WebSocket event `pr_created`. Admin's bell icon badge increments (+1), toast pops up "New Urgent PR #PR-102 submitted by Branch #1", clicking toast navigates directly to approval screen.
    * **In Abnormal Cases**: If WebSocket drops connection, client falls back to 30-second HTTP polling to fetch unread notifications.
