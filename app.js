// ===========================================================
// InvoChat AI — Shared application helpers
// Imported by every authenticated page.
// ===========================================================

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ---------- Formatting ---------- */
export function formatNaira(amount) {
  const n = Number(amount) || 0;
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " · " +
    d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

export function genInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}-${rand}`;
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

/* ---------- Toasts ---------- */
export function toast(message, type = "info") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(20px)";
    el.style.transition = "all .2s ease";
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

/* ---------- Modal helpers ---------- */
export function openModal(id) { document.getElementById(id)?.classList.add("open"); }
export function closeModal(id) { document.getElementById(id)?.classList.remove("open"); }

document.addEventListener("click", (e) => {
  if (e.target.classList?.contains("modal-overlay")) e.target.classList.remove("open");
  if (e.target.closest("[data-close-modal]")) {
    const id = e.target.closest("[data-close-modal]").dataset.closeModal;
    closeModal(id);
  }
});

/* ---------- Theme ---------- */
export function initTheme() {
  const saved = localStorage.getItem("invochat-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
}
export function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("invochat-theme", cur);
}
initTheme();

/* ---------- Auth guard + shared shell wiring ---------- */
let cachedBusiness = null;

export function requireAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    if (!cachedBusiness) {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          cachedBusiness = snap.data();
        } else {
          // Self-heal: this account has no business profile document yet
          // (e.g. it was created outside the normal signup flow). Create
          // a minimal one now so later updateDoc/setDoc calls never fail.
          cachedBusiness = {
            ownerName: user.displayName || "",
            businessName: "",
            phone: "",
            email: user.email || "",
            address: "",
            logoUrl: "",
            slogan: "",
            invoiceFooter: "Thank you for your business!",
            defaultDueDays: 7,
            createdAt: serverTimestamp()
          };
          await setDoc(ref, cachedBusiness, { merge: true });
        }
      } catch (e) {
        cachedBusiness = {};
      }
    }
    populateShell(user, cachedBusiness);
    callback(user, cachedBusiness);
  });
}

export function getCachedBusiness() { return cachedBusiness; }
export function setCachedBusiness(data) { cachedBusiness = data; }

function populateShell(user, business) {
  document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = business.ownerName || user.email);
  document.querySelectorAll("[data-business-name]").forEach(el => el.textContent = business.businessName || "Your Business");
  document.querySelectorAll("[data-user-avatar]").forEach(el => el.textContent = initials(business.ownerName || user.email));

  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  menuToggle?.addEventListener("click", () => sidebar?.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (sidebar?.classList.contains("open") && !sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });

  document.querySelectorAll("[data-logout]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    });
  });

  const themeBtn = document.querySelector("[data-theme-toggle]");
  themeBtn?.addEventListener("click", toggleTheme);

  const path = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav-link[data-page]").forEach(link => {
    link.classList.toggle("active", link.dataset.page === path);
  });
}

/* ---------- WhatsApp sharing ---------- */
export function shareOnWhatsApp(phone, message) {
  const cleanPhone = (phone || "").replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(message);
  const base = cleanPhone ? `https://wa.me/${cleanPhone.startsWith("234") ? cleanPhone : "234" + cleanPhone.replace(/^0/, "")}` : "https://wa.me/";
  window.open(`${base}?text=${encoded}`, "_blank");
}

/* ---------- Skeleton helper ---------- */
export function skeletonRows(container, count = 4, height = "56px") {
  container.innerHTML = Array.from({ length: count }).map(() =>
    `<div class="skeleton" style="height:${height};margin-bottom:10px;border-radius:12px;"></div>`
  ).join("");
}
