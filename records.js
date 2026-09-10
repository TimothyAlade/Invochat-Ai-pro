import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { requireAuth, formatNaira, formatDate, initials, debounce } from "./app.js";

let currentUser = null;
let invoices = [], customers = [], payments = [];
let activeTab = "invoices";

requireAuth(async (user) => {
  currentUser = user;
  const [invSnap, custSnap, paySnap] = await Promise.all([
    getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid))),
    getDocs(query(collection(db, "customers"), where("ownerId", "==", user.uid))),
    getDocs(query(collection(db, "payments"), where("ownerId", "==", user.uid)))
  ]);
  invoices = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
  render();
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeTab = btn.dataset.tab;
    document.getElementById("status-filter").style.display = activeTab === "invoices" || activeTab === "outstanding" ? "block" : "none";
    render();
  });
});

document.getElementById("search-input").addEventListener("input", debounce(render, 200));
document.getElementById("date-filter").addEventListener("change", render);
document.getElementById("status-filter").addEventListener("change", render);

function inDateRange(dateVal, range) {
  if (range === "all") return true;
  const d = dateVal?.toDate ? dateVal.toDate() : new Date(dateVal || 0);
  const now = new Date();
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") { const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); return d >= weekAgo; }
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === "year") return d.getFullYear() === now.getFullYear();
  return true;
}

function render() {
  const search = document.getElementById("search-input").value.trim().toLowerCase();
  const dateRange = document.getElementById("date-filter").value;
  const status = document.getElementById("status-filter").value;

  const head = document.getElementById("table-head");
  const body = document.getElementById("table-body");

  if (activeTab === "invoices" || activeTab === "outstanding") {
    let rows = invoices.filter(i => inDateRange(i.createdAt, dateRange));
    if (activeTab === "outstanding") rows = rows.filter(i => (i.outstanding || 0) > 0);
    if (status !== "all") rows = rows.filter(i => i.status === status);
    if (search) rows = rows.filter(i =>
      i.customerName?.toLowerCase().includes(search) ||
      i.customerPhone?.includes(search) ||
      i.invoiceNumber?.toLowerCase().includes(search)
    );
    rows.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

    head.innerHTML = `<tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr>`;
    renderRows(body, rows, (i) => `
      <td class="font-bold">${i.invoiceNumber}</td>
      <td>${i.customerName}</td>
      <td class="text-muted">${formatDate(i.createdAt)}</td>
      <td>${formatNaira(i.total)}</td>
      <td>${formatNaira(i.outstanding)}</td>
      <td><span class="badge ${i.status === 'Paid' ? 'badge-success' : i.status === 'Partial' ? 'badge-warning' : 'badge-danger'}">${i.status}</span></td>
    `, "No invoices found");

  } else if (activeTab === "customers") {
    let rows = customers;
    if (search) rows = rows.filter(c => c.name?.toLowerCase().includes(search) || c.phone?.includes(search));
    head.innerHTML = `<tr><th>Customer</th><th>Phone</th><th>Invoices</th><th>Total Spent</th><th>Balance</th></tr>`;
    renderRows(body, rows, (c) => `
      <td><div class="flex items-center gap-12"><div class="avatar" style="width:30px;height:30px;font-size:11px;">${initials(c.name)}</div>${c.name}</div></td>
      <td class="text-muted">${c.phone || "—"}</td>
      <td>${c.invoiceCount || 0}</td>
      <td>${formatNaira(c.totalSpent)}</td>
      <td>${(c.balance || 0) > 0 ? `<span class="badge badge-danger">${formatNaira(c.balance)}</span>` : `<span class="badge badge-success">Settled</span>`}</td>
    `, "No customers found", (row) => window.location.href = `customers.html?id=${row.id}`);

  } else if (activeTab === "payments") {
    let rows = payments.filter(p => inDateRange(p.createdAt, dateRange));
    if (search) rows = rows.filter(p => p.customerName?.toLowerCase().includes(search));
    rows.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    head.innerHTML = `<tr><th>Customer</th><th>Amount</th><th>Method</th><th>Date</th></tr>`;
    renderRows(body, rows, (p) => `
      <td class="font-bold">${p.customerName || "—"}</td>
      <td>${formatNaira(p.amount)}</td>
      <td class="text-muted">${p.method || "—"}</td>
      <td class="text-muted">${formatDate(p.createdAt)}</td>
    `, "No payments recorded");
  }
}

function renderRows(tbody, rows, rowTemplate, emptyMsg, onClick) {
  const wrap = document.querySelector(".table-wrap");
  const emptyEl = document.getElementById("records-empty");
  if (!rows.length) {
    wrap.style.display = "none";
    emptyEl.style.display = "block";
    emptyEl.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h18v18H3V3zm0 6h18M3 15h18"/></svg>
      <h3>${emptyMsg}</h3><p>Try adjusting your filters or search.</p>
    </div>`;
    return;
  }
  wrap.style.display = "block";
  emptyEl.style.display = "none";
  tbody.innerHTML = rows.map(r => `<tr data-id="${r.id}">${rowTemplate(r)}</tr>`).join("");
  tbody.querySelectorAll("tr").forEach((tr, idx) => {
    tr.addEventListener("click", () => {
      if (onClick) onClick(rows[idx]);
      else if (activeTab === "invoices" || activeTab === "outstanding") window.location.href = `receipt.html?invoiceId=${rows[idx].id}`;
    });
  });
}

/* ---------- CSV export ---------- */
document.getElementById("btn-export-csv").addEventListener("click", () => {
  let rows = [], headers = [];
  if (activeTab === "invoices" || activeTab === "outstanding") {
    headers = ["Invoice", "Customer", "Phone", "Date", "Total", "Paid", "Balance", "Status"];
    rows = invoices.map(i => [i.invoiceNumber, i.customerName, i.customerPhone, formatDate(i.createdAt), i.total, i.amountPaid, i.outstanding, i.status]);
  } else if (activeTab === "customers") {
    headers = ["Name", "Phone", "Invoices", "Total Spent", "Total Paid", "Balance"];
    rows = customers.map(c => [c.name, c.phone, c.invoiceCount, c.totalSpent, c.totalPaid, c.balance]);
  } else {
    headers = ["Customer", "Amount", "Method", "Date"];
    rows = payments.map(p => [p.customerName, p.amount, p.method, formatDate(p.createdAt)]);
  }
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `invochat-${activeTab}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});
