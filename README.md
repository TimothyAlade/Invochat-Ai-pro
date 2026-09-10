InvoChat AI

«WhatsApp-first invoicing for Nigerian businesses.»

InvoChat AI is a premium invoicing and customer management platform designed for Nigerian entrepreneurs, freelancers, shop owners, technicians, fashion vendors, and service providers who already run their businesses on WhatsApp.

Instead of juggling notebooks, screenshots, and scattered payment records, businesses can create professional invoices, track outstanding payments, manage customers, and send branded invoices or receipts directly through WhatsApp in seconds.

Built with Vanilla JavaScript and Firebase, the entire platform runs as a lightweight static web application with no build tools, no frameworks, and minimal hosting costs.

---

Why InvoChat AI

Small businesses across Nigeria often communicate with customers through WhatsApp but still create invoices manually.

InvoChat AI bridges that gap by combining invoicing, customer tracking, payment management, and WhatsApp sharing into one fast, mobile-first experience.

The platform is designed to feel like a premium SaaS product while remaining inexpensive to deploy and maintain.

---

Core Features

Authentication

- Email and password authentication
- Secure Firebase Authentication
- Password reset flow
- Automatic business profile creation during signup

Smart Dashboard

- Today's sales
- Monthly sales
- Payments collected
- Outstanding debt
- Seven day revenue chart
- Recent activity feed
- Customers owing money
- Business insights
- Live updates from Firestore

Professional Invoice Builder

- Customer autocomplete
- Unlimited line items
- Automatic invoice numbers
- Configurable due dates
- Live invoice preview
- Automatic payment status
- Print-ready invoices
- PDF export
- One tap WhatsApp sharing

Customer CRM

- Permanent customer IDs
- Customer profiles
- Invoice history
- Outstanding balance tracking
- Record payments
- Automatic balance updates
- Search customers instantly

Records Center

- Invoice history
- Customer records
- Outstanding invoices
- Payment history
- Search by customer, phone, or invoice number
- Date range filters
- Status filters
- CSV export

Receipt Generator

- Professional receipt layout
- Payment cleared badges
- Remaining balance display
- Print support
- WhatsApp sharing

Business Settings

- Business branding
- Logo upload
- Owner information
- Invoice footer text
- Default payment terms
- Dark mode
- Theme persistence

---

WhatsApp First Experience

One of InvoChat AI's biggest advantages is its native WhatsApp workflow.

Users can:

- create invoices
- share invoices instantly
- send receipts
- follow up on payments
- maintain customer relationships

without leaving their normal communication channel.

---

Technology Stack

Built entirely with:

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)
- Firebase Authentication
- Cloud Firestore

No React.

No Vue.

No Angular.

No build process.

No server maintenance.

---

Project Structure

InvoChatAI/
│
├── index.html
├── dashboard.html
├── invoice.html
├── customers.html
├── records.html
├── receipt.html
├── profile.html
├── settings.html
│
├── style.css
│
├── firebase.js
├── auth.js
├── app.js
├── dashboard.js
├── customers.js
├── invoice.js
├── records.js
├── receipt.js
├── profile.js
├── settings.js
│
├── logo.svg
├── firestore.rules
└── README.md

---

Firebase Setup

Setup takes only a few minutes.

1. Create a Firebase Project

Go to the Firebase Console.

2. Enable Authentication

Enable:

- Email and Password

3. Create Firestore Database

Use Production Mode.

4. Register a Web App

Copy your Firebase configuration.

5. Paste into "firebase.js"

Replace the existing configuration.

6. Deploy Firestore Rules

firebase deploy --only firestore:rules

Everything runs comfortably on Firebase's free Spark plan.

---

Firestore Structure

Users

users/{uid}

Stores:

- owner name
- business name
- phone
- email
- logo
- address
- settings

Customers

customers/{customerId}

Stores:

- customer ID
- customer details
- total sales
- total paid
- outstanding balance
- invoice count

Invoices

invoices/{invoiceId}

Stores:

- invoice number
- customer
- items
- totals
- balance
- status
- due date

Payments

payments/{paymentId}

Stores payment history.

---

Security

Every business owns its own data.

Firestore rules ensure users can only access documents that belong to their authenticated account.

No business can read another business's invoices or customer records.

---

Deployment

InvoChat AI is a static application.

Deploy to:

- Firebase Hosting
- Vercel
- Netlify
- GitHub Pages

No build command is required.

---

Mobile First

The entire interface is designed for Android users.

Features include:

- one handed navigation
- responsive layouts
- touch friendly buttons
- print optimized invoices
- smooth animations
- dark mode

---

Future Expansion

The architecture is already prepared for premium upgrades including:

- Paystack integration
- Flutterwave integration
- Public invoice links
- QR code payments
- Automatic WhatsApp reminders
- Expense tracking
- Sales analytics
- Excel export
- Team accounts
- Inventory management
- AI invoice assistant

These features can be added without rebuilding the application.

---

Business Opportunity

InvoChat AI is positioned as a lightweight SaaS for Nigeria's growing SME market.

Ideal customers include:

- Fashion designers
- Tailors
- Phone repair technicians
- Makeup artists
- Event planners
- Freelancers
- POS operators
- Mini supermarkets
- Service agencies

The product combines low infrastructure costs with a scalable customer workflow, making it suitable as both a deployable SaaS and a commercial source-code product.

---

Known Limitations

- PDF export uses the browser's native print-to-PDF.
- Logos are automatically compressed before storage.
- Notifications are generated dynamically rather than stored persistently.

These choices keep the application compatible with Firebase's free Spark plan while maintaining excellent performance.

---

License

Proprietary Software

This project may be customized for private deployments or transferred as a commercial SaaS asset.