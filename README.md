# InvoChat AI

**WhatsApp-first invoicing for Nigerian businesses.**

InvoChat AI is a lightweight, static invoicing and customer-management app built for small Nigerian businesses that run their sales relationships over WhatsApp. Create invoices in seconds, track who owes you what, record payments, and send professional invoices and receipts straight to a customer's WhatsApp — no backend server required.

---

## ✨ Features

- **Authentication** — email/password sign up and login via Firebase Auth, with a working "forgot password" flow.
- **Dashboard** — today's sales, monthly sales, payments collected, and outstanding debt, plus a 7-day revenue chart, recent activity feed, customers-owing list, and business insights.
- **Invoice builder** — customer autocomplete, unlimited line items, live totals, auto-generated invoice numbers, configurable due dates, and a live print-ready preview.
- **Customer CRM** — searchable customer list, full customer profiles with invoice history, in-place payment recording, and automatic balance tracking.
- **Records center** — tabbed view across invoices, customers, outstanding balances, and payments, with search, date-range filters, status filters, and CSV export.
- **Receipts** — generated from any invoice, with a paid/partial/unpaid badge, printable layout, and WhatsApp sharing.
- **Profile & Settings** — editable business profile, lifetime statistics, logo upload, invoice footer text, default due-day configuration, and light/dark theme with persistence.
- **WhatsApp sharing** — invoices and receipts open directly in WhatsApp Web/App with a pre-filled message to the customer's number.
- **Print & PDF** — every invoice/receipt uses print-optimized CSS; "Save as PDF" uses the browser's native print-to-PDF, so no extra libraries are required.

## 🧱 Tech stack

Pure static site — no build step, no bundler, no framework:

- HTML5, CSS3, vanilla JavaScript (ES modules)
- Firebase Authentication (email/password)
- Firestore (data storage)
- Firebase Storage (optional — for logo uploads)

## 📂 Project structure

```
InvoChatAI/
├── index.html        Landing page + login/signup/forgot-password views
├── dashboard.html     Main dashboard
├── invoice.html       Invoice builder + live preview
├── customers.html      Customer CRM (list + profile view)
├── records.html        Records center (invoices/customers/outstanding/payments)
├── receipt.html         Receipt generator
├── profile.html          Business owner profile
├── settings.html          Brand & app settings
├── style.css               Shared design system (tokens, components, dark mode, print styles)
├── firebase.js               Firebase app/auth/firestore/storage bootstrap
├── auth.js                    Login / signup / forgot-password logic
├── app.js                      Shared helpers: formatting, toasts, modals, auth guard, theme
├── dashboard.js                 Dashboard data + chart rendering
├── customers.js                   Customer CRUD + payment recording
├── invoice.js                      Invoice creation logic
├── records.js                       Filtering, search, CSV export
├── receipt.js                        Receipt rendering
├── profile.js                         Profile editing + lifetime stats
├── settings.js                         Brand settings + logo upload
├── logo.svg                             App logo
├── firestore.rules                       Firestore security rules
├── storage.rules                          Storage security rules
└── README.md
```

## 🔧 Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Email/Password**.
3. Create a **Firestore** database (production mode).
4. (Optional, requires the **Blaze** plan) Enable **Storage** if you want logo uploads — the app works fine without it and fails gracefully.
5. In Project Settings → Your apps, register a **Web app** and copy the config object.
6. Paste that config into `firebaseConfig` inside `firebase.js`.
7. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

### Firestore collections

| Collection      | Purpose                                   |
|-----------------|--------------------------------------------|
| `users/{uid}`   | One document per business owner            |
| `customers`     | Customer records, scoped by `ownerId`      |
| `invoices`      | Invoices, scoped by `ownerId`               |
| `payments`      | Payment records, scoped by `ownerId`        |
| `notifications` | Reserved for future notification history    |

Every document outside `users/{uid}` carries an `ownerId` field, and `firestore.rules` enforces that a user can only read or write documents where `ownerId` matches their own auth `uid`.

## 🚀 Deployment

This is a static site — deploy it anywhere that serves static files:

**Firebase Hosting**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

**Netlify / Vercel / GitHub Pages** — just drag-and-drop the folder or connect the repo; no build command is needed.

## 🗺️ Roadmap

- Recurring/subscription invoices
- SMS reminders alongside WhatsApp
- Multi-user access per business (staff accounts)
- Bulk invoice import from CSV
- Native PDF generation (currently uses the browser's print-to-PDF)
- Analytics export to Excel

## ⚠️ Known limitations of this build

- **PDF export** uses the browser's native print dialog rather than a dedicated PDF library, per the "no build tools / no npm" constraint — it produces a clean PDF but isn't a one-click silent download.
- **Logo cropping** UI isn't included; uploaded images are used as-is. Uploading requires the Storage service (Blaze plan) and fails gracefully without it.
- **Notifications** are currently computed live from invoice due-dates on the dashboard rather than stored as persistent `notifications` documents — the collection exists in the rules for future use.

## 📄 License

Proprietary — customize freely for your own deployment.
