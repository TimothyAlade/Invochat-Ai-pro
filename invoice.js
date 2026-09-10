import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  requireAuth, formatNaira, formatDate, genInvoiceNumber, debounce,
  toast, shareOnWhatsApp, getCachedBusiness
} from "./app.js";

let currentUser = null;
let business = {};
let customersCache = [];
let lineItems = [
  { id: cryptoId(), description: "", qty: 1, price: 0 }
];

function cryptoId() { return Math.random().toString(36).slice(2, 9); }

document.getElementById("invoice-number").value = genInvoiceNumber();
const defaultDue = new Date();
defaultDue.setDate(defaultDue.getDate() + 7);
document.getElementById("due-date").value = defaultDue.toISOString().slice(0, 10);

requireAuth(async (user, biz) => {
  currentUser = user;
  business = biz;
  document.getElementById("due-date").value = addDays(new Date(), biz.defaultDueDays || 7).toISOString().slice(0, 10);

  const snap = await getDocs(query(collection(db, "customers"), where("ownerId", "==", user.uid)));
  customersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderLineItems();
  renderPreview();
});

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

/* ---------- Customer autocomplete ---------- */
const nameInput = document.getElementById("customer-name");
const phoneInput = document.getElementById("customer-phone");
const suggestionsBox = document.getElementById("customer-suggestions");

nameInput.addEventListener("input", debounce(() => {
  const val = nameInput.value.trim().toLowerCase();
  if (!val) { suggestionsBox.classList.remove("open"); return; }
  const matches = customersCache.filter(c => c.name?.toLowerCase().includes(val)).slice(0, 6);
  if (!matches.length) { suggestionsBox.classList.remove("open"); return; }
  suggestionsBox.innerHTML = matches.map(c => `<div class="autocomplete-item" data-id="${c.id}">${c.name} <span style="color:var(--text-muted)">· ${c.phone || ""}</span></div>`).join("");
  suggestionsBox.classList.add("open");
}, 150));

suggestionsBox.addEventListener("click", (e) => {
  const item = e.target.closest(".autocomplete-item");
  if (!item) return;
  const customer = customersCache.find(c => c.id === item.dataset.id);
  if (customer) {
    nameInput.value = customer.name;
    phoneInput.value = customer.phone || "";
  }
  suggestionsBox.classList.remove("open");
  renderPreview();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".autocomplete-box")) suggestionsBox.classList.remove("open");
});

/* ---------- Line items ---------- */
function renderLineItems() {
  const container = document.getElementById("line-items");
  container.innerHTML = `
    <div class="line-item-row" style="font-size:11px;color:var(--text-muted);font-weight:700;text-transform:uppercase;">
      <span>Description</span><span>Qty</span><span>Price</span><span>Total</span><span></span>
    </div>
  ` + lineItems.map(item => `
    <div class="line-item-row" data-id="${item.id}">
      <input class="input li-desc" placeholder="Item or service" value="${escapeHtml(item.description)}">
      <input class="input li-qty" type="number" min="0" step="1" value="${item.qty}">
      <input class="input li-price" type="number" min="0" step="0.01" value="${item.price}">
      <div class="text-sm font-bold li-total" style="text-align:right;">${formatNaira(item.qty * item.price)}</div>
      <button type="button" class="btn-icon li-remove" style="width:32px;height:32px;padding:0;">✕</button>
    </div>
  `).join("");

  container.querySelectorAll(".line-item-row[data-id]").forEach(row => {
    const id = row.dataset.id;
    row.querySelector(".li-desc").addEventListener("input", (e) => updateItem(id, "description", e.target.value));
    row.querySelector(".li-qty").addEventListener("input", (e) => updateItem(id, "qty", Number(e.target.value) || 0));
    row.querySelector(".li-price").addEventListener("input", (e) => updateItem(id, "price", Number(e.target.value) || 0));
    row.querySelector(".li-remove").addEventListener("click", () => removeItem(id));
  });
}

function updateItem(id, field, value) {
  const item = lineItems.find(i => i.id === id);
  if (!item) return;
  item[field] = value;
  const row = document.querySelector(`.line-item-row[data-id="${id}"]`);
  if (row) row.querySelector(".li-total").textContent = formatNaira(item.qty * item.price);
  renderPreview();
}
function removeItem(id) {
  if (lineItems.length === 1) { toast("An invoice needs at least one item", "info"); return; }
  lineItems = lineItems.filter(i => i.id !== id);
  renderLineItems();
  renderPreview();
}
document.getElementById("add-line-item").addEventListener("click", () => {
  lineItems.push({ id: cryptoId(), description: "", qty: 1, price: 0 });
  renderLineItems();
});

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ---------- Totals + preview ---------- */
function computeTotals() {
  const subtotal = lineItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const amountPaid = Number(document.getElementById("amount-paid").value) || 0;
  const outstanding = Math.max(subtotal - amountPaid, 0);
  let status = "Unpaid";
  if (amountPaid >= subtotal && subtotal > 0) status = "Paid";
  else if (amountPaid > 0) status = "Partial";
  return { subtotal, amountPaid, outstanding, status };
}

function statusBadgeColor(status) {
  return { Paid: "#16A34A", Partial: "#D97706", Unpaid: "#DC2626" }[status] || "#6B7280";
}

function renderPreview() {
  const { subtotal, amountPaid, outstanding, status } = computeTotals();
  const custName = nameInput.value.trim() || "Customer name";
  const custPhone = phoneInput.value.trim();
  const invNum = document.getElementById("invoice-number").value;
  const due = document.getElementById("due-date").value;

  document.getElementById("invoice-preview").innerHTML = `
    <div class="p-header">
      <div class="flex items-center gap-12">
        ${business.logoUrl ? `<img src="${business.logoUrl}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;">` : `<div style="width:44px;height:44px;border-radius:10px;background:#2E5EFF;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;">${(business.businessName || "IB")[0]}</div>`}
        <div>
          <div style="font-weight:800;font-size:16px;">${business.businessName || "Your Business"}</div>
          <div style="color:#6B7280;font-size:12px;">${business.phone || ""} ${business.address ? "· " + business.address : ""}</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:800;font-size:18px;letter-spacing:-0.02em;">INVOICE</div>
        <div style="color:#6B7280;font-size:12px;">${invNum}</div>
      </div>
    </div>

    <div class="flex justify-between" style="margin-bottom:10px;">
      <div>
        <div style="color:#6B7280;font-size:11px;text-transform:uppercase;font-weight:700;">Billed to</div>
        <div style="font-weight:700;">${escapeHtml(custName)}</div>
        <div style="color:#6B7280;font-size:12.5px;">${escapeHtml(custPhone)}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#6B7280;font-size:11px;text-transform:uppercase;font-weight:700;">Due date</div>
        <div style="font-weight:700;">${due ? formatDate(due) : "—"}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr></thead>
      <tbody>
        ${lineItems.map(i => `<tr><td>${escapeHtml(i.description) || "—"}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:right;">${formatNaira(i.price)}</td><td style="text-align:right;">${formatNaira(i.qty * i.price)}</td></tr>`).join("")}
      </tbody>
    </table>

    <div style="max-width:260px;margin-left:auto;">
      <div class="flex justify-between" style="padding:5px 0;font-size:13px;"><span>Subtotal</span><span>${formatNaira(subtotal)}</span></div>
      <div class="flex justify-between" style="padding:5px 0;font-size:13px;"><span>Amount Paid</span><span>${formatNaira(amountPaid)}</span></div>
      <div class="flex justify-between" style="padding:8px 0;font-weight:800;font-size:15px;border-top:1px solid #E4E7EF;margin-top:4px;"><span>Balance Due</span><span>${formatNaira(outstanding)}</span></div>
    </div>

    <div style="margin-top:16px;">
      <span style="display:inline-block;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;color:#fff;background:${statusBadgeColor(status)};">${status.toUpperCase()}</span>
    </div>

    ${business.invoiceFooter ? `<div style="margin-top:24px;padding-top:14px;border-top:1px solid #E4E7EF;color:#6B7280;font-size:12px;">${escapeHtml(business.invoiceFooter)}</div>` : ""}
  `;
}

["amount-paid"].forEach(id => document.getElementById(id).addEventListener("input", renderPreview));
["customer-name", "customer-phone", "due-date"].forEach(id => document.getElementById(id).addEventListener("input", renderPreview));

/* ---------- Save invoice ---------- */
async function saveInvoice(status_override) {
  const { subtotal, amountPaid, outstanding, status } = computeTotals();
  const custName = nameInput.value.trim();
  const custPhone = phoneInput.value.trim();

  if (!custName || !custPhone) { toast("Please add customer name and phone", "error"); return null; }
  if (!lineItems.some(i => i.description.trim())) { toast("Add at least one item description", "error"); return null; }

  const invoiceData = {
    ownerId: currentUser.uid,
    invoiceNumber: document.getElementById("invoice-number").value,
    customerName: custName,
    customerPhone: custPhone,
    dueDate: document.getElementById("due-date").value ? new Date(document.getElementById("due-date").value) : null,
    items: lineItems.map(({ description, qty, price }) => ({ description, qty, price })),
    total: subtotal,
    amountPaid,
    outstanding,
    status: status_override || status,
    paymentMethod: document.querySelector('[name="paymentMethod"]').value,
    notes: document.querySelector('[name="notes"]').value.trim(),
    createdAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "invoices"), invoiceData);

  // find-or-create customer, update stats
  let customer = customersCache.find(c => c.name.toLowerCase() === custName.toLowerCase() && c.phone === custPhone);
  if (customer) {
    await updateDoc(doc(db, "customers", customer.id), {
      totalSpent: increment(subtotal),
      totalPaid: increment(amountPaid),
      balance: increment(outstanding),
      invoiceCount: increment(1),
      lastPurchase: serverTimestamp()
    });
  } else {
    await addDoc(collection(db, "customers"), {
      ownerId: currentUser.uid,
      name: custName,
      phone: custPhone,
      totalSpent: subtotal,
      totalPaid: amountPaid,
      balance: outstanding,
      invoiceCount: 1,
      lastPurchase: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }

  if (amountPaid > 0) {
    await addDoc(collection(db, "payments"), {
      ownerId: currentUser.uid,
      invoiceId: ref.id,
      invoiceNumber: invoiceData.invoiceNumber,
      customerName: custName,
      amount: amountPaid,
      method: invoiceData.paymentMethod,
      createdAt: serverTimestamp()
    });
  }

  return { id: ref.id, ...invoiceData };
}

document.getElementById("invoice-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  const saved = await saveInvoice();
  btn.disabled = false;
  if (saved) {
    toast("Invoice saved!", "success");
    setTimeout(() => window.location.href = "records.html", 700);
  }
});

document.getElementById("save-draft").addEventListener("click", async () => {
  const saved = await saveInvoice("Draft");
  if (saved) toast("Draft saved", "success");
});

/* ---------- Print / PDF / WhatsApp ---------- */
document.getElementById("btn-print").addEventListener("click", () => window.print());
document.getElementById("btn-pdf").addEventListener("click", () => {
  toast("Opening print dialog — choose 'Save as PDF' as the destination", "info");
  setTimeout(() => window.print(), 400);
});
document.getElementById("btn-whatsapp").addEventListener("click", () => {
  const { subtotal, outstanding, status } = computeTotals();
  const msg = `Hi ${nameInput.value || "there"}, here's your invoice ${document.getElementById("invoice-number").value} from ${business.businessName || "us"}.\n\nTotal: ${formatNaira(subtotal)}\nBalance due: ${formatNaira(outstanding)}\nStatus: ${status}\n\nThank you!`;
  shareOnWhatsApp(phoneInput.value, msg);
});
