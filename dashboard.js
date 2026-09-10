import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  requireAuth, formatNaira, formatDateTime, timeGreeting, toast,
  openModal, closeModal, initials
} from "./app.js";

document.getElementById("today-date").textContent = new Date().toLocaleDateString("en-NG", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});

requireAuth(async (user, business) => {
  document.getElementById("greeting").textContent = `${timeGreeting()}, ${(business.ownerName || "there").split(" ")[0]}`;

  try {
    const [invoicesSnap, customersSnap, paymentsSnap] = await Promise.all([
      getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid))),
      getDocs(query(collection(db, "customers"), where("ownerId", "==", user.uid))),
      getDocs(query(collection(db, "payments"), where("ownerId", "==", user.uid)))
    ]);

    const invoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const customers = customersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderKpis(invoices, payments);
    renderChart(invoices);
    renderActivity(invoices, payments);
    renderCustomersOwing(customers);
    renderInsights(invoices, customers);
    renderNotifications(invoices);
  } catch (err) {
    console.error(err);
    toast("Couldn't load dashboard data. Check your Firebase setup.", "error");
  }
});

function isToday(d) {
  const now = new Date();
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.toDateString() === now.toDateString();
}
function isThisMonth(d) {
  const now = new Date();
  const date = d?.toDate ? d.toDate() : new Date(d);
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function renderKpis(invoices, payments) {
  const todaySales = invoices.filter(i => isToday(i.createdAt)).reduce((s, i) => s + (Number(i.total) || 0), 0);
  const monthlySales = invoices.filter(i => isThisMonth(i.createdAt)).reduce((s, i) => s + (Number(i.total) || 0), 0);
  const collected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = invoices.reduce((s, i) => s + Math.max((Number(i.total) || 0) - (Number(i.amountPaid) || 0), 0), 0);

  const cards = [
    { label: "Today's Sales", value: todaySales, icon: "sun" },
    { label: "Monthly Sales", value: monthlySales, icon: "calendar" },
    { label: "Payments Collected", value: collected, icon: "check" },
    { label: "Outstanding Debt", value: outstanding, icon: "alert" }
  ];

  const icons = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'
  };

  document.getElementById("kpi-grid").innerHTML = cards.map(c => `
    <div class="card kpi-card">
      <div class="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[c.icon]}</svg></div>
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${formatNaira(c.value)}</div>
    </div>
  `).join("");
}

function renderChart(invoices) {
  const canvas = document.getElementById("revenue-chart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth - 44;
  const h = 140;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + "px"; canvas.style.height = h + "px";
  ctx.scale(dpr, dpr);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const values = days.map(day => invoices
    .filter(inv => {
      const d = inv.createdAt?.toDate ? inv.createdAt.toDate() : new Date(inv.createdAt || 0);
      return d.toDateString() === day.toDateString();
    })
    .reduce((s, inv) => s + (Number(inv.total) || 0), 0));

  const max = Math.max(...values, 1);
  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue("--color-primary").trim();
  const border = styles.getPropertyValue("--border").trim();

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = border; ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = 10 + (h - 30) * (i / 3);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const barW = (w / values.length) * 0.5;
  const gap = (w / values.length) - barW;
  values.forEach((v, i) => {
    const barH = (v / max) * (h - 34);
    const x = i * (barW + gap) + gap / 2;
    const y = h - 22 - barH;
    ctx.fillStyle = primary;
    ctx.globalAlpha = 0.9;
    roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = styles.getPropertyValue("--text-muted").trim();
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(days[i].toLocaleDateString("en-NG", { weekday: "short" })[0], x + barW / 2, h - 6);
  });
}
function roundRect(ctx, x, y, w, h, r) {
  h = Math.max(h, 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderActivity(invoices, payments) {
  const events = [
    ...invoices.map(i => ({ type: "invoice", label: `Invoice ${i.invoiceNumber || ""} for ${i.customerName || "customer"}`, amount: i.total, date: i.createdAt })),
    ...payments.map(p => ({ type: "payment", label: `Payment from ${p.customerName || "customer"}`, amount: p.amount, date: p.createdAt }))
  ].sort((a, b) => (b.date?.toDate?.() || new Date(b.date || 0)) - (a.date?.toDate?.() || new Date(a.date || 0))).slice(0, 6);

  const el = document.getElementById("recent-activity");
  if (!events.length) {
    el.innerHTML = emptyState("No activity yet", "Create your first invoice to see activity here.");
    return;
  }
  el.innerHTML = events.map(e => `
    <div class="flex justify-between items-center" style="padding:11px 0;border-bottom:1px solid var(--border);">
      <div class="flex items-center gap-12">
        <div class="avatar" style="background:${e.type === "payment" ? "var(--color-success)" : "var(--color-primary)"};width:34px;height:34px;font-size:12px;">
          ${e.type === "payment" ? "₦" : "#"}
        </div>
        <div>
          <div class="text-sm font-bold">${e.label}</div>
          <div class="text-sm text-muted">${formatDateTime(e.date)}</div>
        </div>
      </div>
      <div class="font-bold text-sm">${formatNaira(e.amount)}</div>
    </div>
  `).join("");
}

function renderCustomersOwing(customers) {
  const owing = customers.filter(c => (Number(c.balance) || 0) > 0)
    .sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 5);
  const el = document.getElementById("customers-owing");
  if (!owing.length) {
    el.innerHTML = emptyState("All clear", "No customers currently owe you money.");
    return;
  }
  el.innerHTML = owing.map(c => `
    <a href="customers.html?id=${c.id}" class="flex justify-between items-center" style="padding:9px 0;border-bottom:1px solid var(--border);">
      <div class="flex items-center gap-12">
        <div class="avatar" style="width:32px;height:32px;font-size:11px;">${initials(c.name)}</div>
        <div class="text-sm font-bold">${c.name}</div>
      </div>
      <span class="badge badge-danger">${formatNaira(c.balance)}</span>
    </a>
  `).join("");
}

function renderInsights(invoices, customers) {
  const totalInvoices = invoices.length;
  const avgInvoice = totalInvoices ? invoices.reduce((s, i) => s + (Number(i.total) || 0), 0) / totalInvoices : 0;
  const spendByCustomer = {};
  invoices.forEach(i => { spendByCustomer[i.customerName] = (spendByCustomer[i.customerName] || 0) + (Number(i.total) || 0); });
  const top = Object.entries(spendByCustomer).sort((a, b) => b[1] - a[1])[0];

  const rows = [
    ["Total Customers", customers.length],
    ["Total Invoices", totalInvoices],
    ["Average Invoice", formatNaira(avgInvoice)],
    ["Top Customer", top ? top[0] : "—"]
  ];
  document.getElementById("business-insights").innerHTML = rows.map(([label, value]) => `
    <div class="flex justify-between"><span class="text-muted">${label}</span><span class="font-bold">${value}</span></div>
  `).join("");
}

function renderNotifications(invoices) {
  const now = new Date();
  const overdue = invoices.filter(i => {
    if ((i.status || "").toLowerCase() === "paid") return false;
    const due = i.dueDate?.toDate ? i.dueDate.toDate() : new Date(i.dueDate || 0);
    return due < now;
  });
  document.getElementById("notif-dot").style.display = overdue.length ? "block" : "none";
  document.getElementById("bell-btn").addEventListener("click", () => {
    if (overdue.length) {
      toast(`${overdue.length} invoice(s) overdue`, "error");
    } else {
      toast("You're all caught up!", "success");
    }
  });
}

function emptyState(title, sub) {
  return `<div class="empty-state" style="padding:30px 10px;">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/></svg>
    <h3>${title}</h3><p>${sub}</p>
  </div>`;
}

/* Quick add customer modal */
document.querySelector("[data-open-add-customer]")?.addEventListener("click", () => openModal("modal-add-customer"));
document.getElementById("quick-customer-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");
  const user = getAuth().currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, "customers"), {
      ownerId: user.uid,
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      balance: 0, totalSpent: 0, totalPaid: 0, invoiceCount: 0,
      createdAt: serverTimestamp()
    });
    toast("Customer added", "success");
    closeModal("modal-add-customer");
    form.reset();
  } catch (err) {
    toast("Couldn't add customer", "error");
  }
});
