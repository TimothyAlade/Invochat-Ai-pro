import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  requireAuth, formatNaira, formatDate, initials, toast, shareOnWhatsApp,
  openModal, closeModal, debounce, skeletonRows
} from "./app.js";

let currentUser = null;
let allCustomers = [];
let allInvoices = [];
let activeCustomerId = null;

const tbody = document.getElementById("customers-tbody");
skeletonRows(document.querySelector(".table-wrap"), 5);

requireAuth(async (user) => {
  currentUser = user;
  await loadData();
  renderList(allCustomers);

  const urlId = new URLSearchParams(window.location.search).get("id");
  if (urlId) openProfile(urlId);
});

async function loadData() {
  const [custSnap, invSnap] = await Promise.all([
    getDocs(query(collection(db, "customers"), where("ownerId", "==", currentUser.uid))),
    getDocs(query(collection(db, "invoices"), where("ownerId", "==", currentUser.uid)))
  ]);
  allCustomers = custSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  allInvoices = invSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderList(customers) {
  if (!customers.length) {
    document.querySelector(".table-wrap").style.display = "none";
    const empty = document.getElementById("customers-empty");
    empty.style.display = "block";
    empty.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
      <h3>No customers yet</h3><p>Add your first customer to start building relationships.</p>
    </div>`;
    return;
  }
  document.querySelector(".table-wrap").style.display = "block";
  document.getElementById("customers-empty").style.display = "none";

  tbody.innerHTML = customers.map(c => `
    <tr data-id="${c.id}">
      <td><div class="flex items-center gap-12"><div class="avatar" style="width:32px;height:32px;font-size:11px;">${initials(c.name)}</div><span class="font-bold">${c.name}</span></div></td>
      <td class="text-muted">${c.phone || "—"}</td>
      <td>${c.invoiceCount || 0}</td>
      <td>${formatNaira(c.totalSpent)}</td>
      <td>${(c.balance || 0) > 0 ? `<span class="badge badge-danger">${formatNaira(c.balance)}</span>` : `<span class="badge badge-success">Settled</span>`}</td>
    </tr>
  `).join("");

  tbody.querySelectorAll("tr").forEach(row => {
    row.addEventListener("click", () => openProfile(row.dataset.id));
  });
}

document.getElementById("customer-search").addEventListener("input", debounce((e) => {
  const val = e.target.value.trim().toLowerCase();
  const filtered = allCustomers.filter(c =>
    c.name?.toLowerCase().includes(val) || c.phone?.includes(val)
  );
  renderList(filtered);
}, 200));

/* ---------- Profile view ---------- */
function openProfile(id) {
  const customer = allCustomers.find(c => c.id === id);
  if (!customer) return;
  activeCustomerId = id;
  document.getElementById("list-view").style.display = "none";
  document.getElementById("profile-view").style.display = "block";

  document.getElementById("cp-avatar").textContent = initials(customer.name);
  document.getElementById("cp-name").textContent = customer.name;
  document.getElementById("cp-phone").textContent = customer.phone || "";
  document.getElementById("cp-call").href = `tel:${customer.phone || ""}`;
  document.getElementById("cp-whatsapp").onclick = () => shareOnWhatsApp(customer.phone, `Hi ${customer.name}, this is a quick note from your business account.`);

  document.getElementById("cp-stats").innerHTML = `
    <div class="flex justify-between"><span class="text-muted">Total spent</span><span class="font-bold">${formatNaira(customer.totalSpent)}</span></div>
    <div class="flex justify-between"><span class="text-muted">Total paid</span><span class="font-bold">${formatNaira(customer.totalPaid)}</span></div>
    <div class="flex justify-between"><span class="text-muted">Outstanding balance</span><span class="font-bold" style="color:${(customer.balance||0)>0?'var(--color-danger)':'var(--color-success)'}">${formatNaira(customer.balance)}</span></div>
    <div class="flex justify-between"><span class="text-muted">Invoice count</span><span class="font-bold">${customer.invoiceCount || 0}</span></div>
    <div class="flex justify-between"><span class="text-muted">Last purchase</span><span class="font-bold">${customer.lastPurchase ? formatDate(customer.lastPurchase) : "—"}</span></div>
  `;

  const invoices = allInvoices.filter(i => i.customerName === customer.name && i.customerPhone === customer.phone)
    .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

  document.getElementById("cp-invoices").innerHTML = invoices.length ? invoices.map(i => `
    <div class="flex justify-between items-center" style="padding:10px 0;border-bottom:1px solid var(--border);">
      <div>
        <div class="text-sm font-bold">${i.invoiceNumber}</div>
        <div class="text-sm text-muted">${formatDate(i.createdAt)}</div>
      </div>
      <div class="flex items-center gap-8">
        <span class="badge ${i.status === 'Paid' ? 'badge-success' : i.status === 'Partial' ? 'badge-warning' : 'badge-danger'}">${i.status}</span>
        <span class="font-bold text-sm">${formatNaira(i.total)}</span>
      </div>
    </div>
  `).join("") : `<p class="text-muted text-sm">No invoices yet.</p>`;

  document.getElementById("cp-edit").onclick = () => {
    document.getElementById("customer-modal-title").textContent = "Edit Customer";
    const form = document.getElementById("customer-form");
    form.id.value = customer.id;
    form.name.value = customer.name;
    form.phone.value = customer.phone;
    openModal("modal-customer");
  };

  history.replaceState(null, "", `customers.html?id=${id}`);
}

document.getElementById("back-to-list").addEventListener("click", () => {
  document.getElementById("profile-view").style.display = "none";
  document.getElementById("list-view").style.display = "block";
  history.replaceState(null, "", "customers.html");
});

/* ---------- Add / edit customer ---------- */
document.getElementById("btn-add-customer").addEventListener("click", () => {
  document.getElementById("customer-modal-title").textContent = "Add Customer";
  document.getElementById("customer-form").reset();
  document.getElementById("customer-form").id.value = "";
  openModal("modal-customer");
});

document.getElementById("customer-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();

  const duplicate = allCustomers.find(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase() && c.phone === phone);
  if (duplicate) { toast("A customer with this name and phone already exists", "error"); return; }

  try {
    if (id) {
      await updateDoc(doc(db, "customers", id), { name, phone });
      toast("Customer updated", "success");
    } else {
      await addDoc(collection(db, "customers"), {
        ownerId: currentUser.uid, name, phone,
        balance: 0, totalSpent: 0, totalPaid: 0, invoiceCount: 0,
        createdAt: serverTimestamp()
      });
      toast("Customer added", "success");
    }
    closeModal("modal-customer");
    await loadData();
    renderList(allCustomers);
    if (id) openProfile(id);
  } catch (err) {
    toast("Something went wrong", "error");
  }
});

/* ---------- Record payment from profile ---------- */
document.getElementById("record-payment-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const amount = Number(form.amount.value);
  const method = form.method.value;
  const customer = allCustomers.find(c => c.id === activeCustomerId);
  if (!customer || amount <= 0) return;

  try {
    await addDoc(collection(db, "payments"), {
      ownerId: currentUser.uid,
      customerName: customer.name,
      customerId: customer.id,
      amount, method,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "customers", customer.id), {
      totalPaid: increment(amount),
      balance: increment(-amount)
    });
    toast("Payment recorded", "success");
    form.reset();
    await loadData();
    openProfile(customer.id);
  } catch (err) {
    toast("Couldn't record payment", "error");
  }
});
