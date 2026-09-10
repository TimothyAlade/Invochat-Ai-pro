import { db } from "./firebase.js";
import { doc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { requireAuth, formatNaira, formatDate, toast, openModal, closeModal, setCachedBusiness, getCachedBusiness } from "./app.js";

let currentUser = null;

requireAuth(async (user, business) => {
  currentUser = user;
  document.getElementById("p-email").textContent = business.email || user.email;
  document.getElementById("p-phone").textContent = business.phone || "—";
  document.getElementById("p-address").textContent = business.address || "—";
  document.getElementById("p-created").textContent = business.createdAt ? formatDate(business.createdAt) : "—";

  const form = document.getElementById("edit-profile-form");
  form.ownerName.value = business.ownerName || "";
  form.businessName.value = business.businessName || "";
  form.phone.value = business.phone || "";
  form.address.value = business.address || "";

  const [invSnap, custSnap, paySnap] = await Promise.all([
    getDocs(query(collection(db, "invoices"), where("ownerId", "==", user.uid))),
    getDocs(query(collection(db, "customers"), where("ownerId", "==", user.uid))),
    getDocs(query(collection(db, "payments"), where("ownerId", "==", user.uid)))
  ]);
  const invoices = invSnap.docs.map(d => d.data());
  const customers = custSnap.docs.map(d => d.data());
  const payments = paySnap.docs.map(d => d.data());

  const totalRevenue = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalCollected = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  document.getElementById("p-stats").innerHTML = `
    <div class="flex justify-between"><span class="text-muted">Total invoices created</span><span class="font-bold">${invoices.length}</span></div>
    <div class="flex justify-between"><span class="text-muted">Total customers</span><span class="font-bold">${customers.length}</span></div>
    <div class="flex justify-between"><span class="text-muted">Total revenue invoiced</span><span class="font-bold">${formatNaira(totalRevenue)}</span></div>
    <div class="flex justify-between"><span class="text-muted">Total payments collected</span><span class="font-bold">${formatNaira(totalCollected)}</span></div>
  `;
});

document.getElementById("btn-edit-profile").addEventListener("click", () => openModal("modal-edit-profile"));

document.getElementById("edit-profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const updates = {
    ownerName: form.ownerName.value.trim(),
    businessName: form.businessName.value.trim(),
    phone: form.phone.value.trim(),
    address: form.address.value.trim()
  };
  try {
    await updateDoc(doc(db, "users", currentUser.uid), updates);
    setCachedBusiness({ ...getCachedBusiness(), ...updates });
    toast("Profile updated", "success");
    closeModal("modal-edit-profile");
    document.querySelectorAll("[data-user-name]").forEach(el => el.textContent = updates.ownerName);
    document.querySelectorAll("[data-business-name]").forEach(el => el.textContent = updates.businessName);
  } catch (err) {
    toast("Couldn't update profile", "error");
  }
});
