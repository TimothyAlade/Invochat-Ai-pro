import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { requireAuth, formatNaira, formatDate, shareOnWhatsApp } from "./app.js";

let currentUser = null;
let business = {};
let invoices = [];

requireAuth(async (user, biz) => {
  currentUser = user;
  business = biz;
  const snap = await getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid)));
  invoices = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

  const select = document.getElementById("invoice-select");
  select.innerHTML = `<option value="">Select an invoice…</option>` +
    invoices.map(i => `<option value="${i.id}">${i.invoiceNumber} — ${i.customerName} (${formatNaira(i.total)})</option>`).join("");

  const preselect = new URLSearchParams(window.location.search).get("invoiceId");
  if (preselect) { select.value = preselect; renderReceipt(preselect); }
});

document.getElementById("invoice-select").addEventListener("change", (e) => renderReceipt(e.target.value));

function renderReceipt(invoiceId) {
  const content = document.getElementById("receipt-content");
  const actions = document.getElementById("receipt-actions");
  if (!invoiceId) {
    content.innerHTML = `<div class="empty-state"><p>Select an invoice above to generate its receipt.</p></div>`;
    actions.style.display = "none";
    return;
  }
  const invoice = invoices.find(i => i.id === invoiceId);
  if (!invoice) return;
  actions.style.display = "flex";

  content.innerHTML = `
    <div class="r-header">
      ${business.logoUrl ? `<img src="${business.logoUrl}" style="width:48px;height:48px;border-radius:10px;margin:0 auto 10px;object-fit:cover;">` : `<div style="width:48px;height:48px;border-radius:10px;background:#2E5EFF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;margin:0 auto 10px;">${(business.businessName||"IB")[0]}</div>`}
      <div style="font-weight:800;font-size:16px;">${business.businessName || "Your Business"}</div>
      <div style="color:#6B7280;font-size:12px;">${business.phone || ""}</div>
    </div>

    <div class="paid-badge">${(invoice.status || "").toUpperCase()}</div>

    <table>
      <tr><td style="color:#6B7280;">Receipt for</td><td style="text-align:right;font-weight:700;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="color:#6B7280;">Customer</td><td style="text-align:right;font-weight:700;">${invoice.customerName}</td></tr>
      <tr><td style="color:#6B7280;">Payment date</td><td style="text-align:right;">${formatDate(invoice.createdAt)}</td></tr>
      <tr><td style="color:#6B7280;">Amount paid</td><td style="text-align:right;font-weight:700;">${formatNaira(invoice.amountPaid)}</td></tr>
      <tr><td style="color:#6B7280;">Remaining balance</td><td style="text-align:right;font-weight:700;color:${(invoice.outstanding||0) > 0 ? '#DC2626' : '#16A34A'};">${formatNaira(invoice.outstanding)}</td></tr>
    </table>

    ${business.invoiceFooter ? `<div style="margin-top:20px;padding-top:14px;border-top:1px solid #E4E7EF;color:#6B7280;font-size:12px;text-align:center;">${business.invoiceFooter}</div>` : ""}
  `;

  document.getElementById("btn-print").onclick = () => window.print();
  document.getElementById("btn-pdf").onclick = () => window.print();
  document.getElementById("btn-whatsapp").onclick = () => {
    const msg = `Hi ${invoice.customerName}, here's your receipt for invoice ${invoice.invoiceNumber}.\n\nAmount paid: ${formatNaira(invoice.amountPaid)}\nRemaining balance: ${formatNaira(invoice.outstanding)}\n\nThank you for your business — ${business.businessName || ""}!`;
    shareOnWhatsApp(invoice.customerPhone, msg);
  };
}
