import { db, storage } from "./firebase.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { requireAuth, toast, setCachedBusiness, getCachedBusiness } from "./app.js";

let currentUser = null;

requireAuth((user, business) => {
  currentUser = user;
  const form = document.getElementById("brand-form");
  form.slogan.value = business.slogan || "";
  form.invoiceFooter.value = business.invoiceFooter || "Thank you for your business!";
  form.defaultDueDays.value = business.defaultDueDays ?? 7;

  const preview = document.getElementById("logo-preview");
  if (business.logoUrl) {
    preview.innerHTML = `<img src="${business.logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`;
  } else {
    preview.textContent = (business.businessName || "IB").slice(0, 2).toUpperCase();
  }

  const themeSwitch = document.getElementById("theme-switch");
  themeSwitch.checked = document.documentElement.getAttribute("data-theme") === "dark";
  themeSwitch.addEventListener("change", () => {
    const theme = themeSwitch.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("invochat-theme", theme);
  });
});

document.getElementById("brand-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const updates = {
    slogan: form.slogan.value.trim(),
    invoiceFooter: form.invoiceFooter.value.trim(),
    defaultDueDays: Number(form.defaultDueDays.value) || 7
  };
  try {
    await updateDoc(doc(db, "users", currentUser.uid), updates);
    setCachedBusiness({ ...getCachedBusiness(), ...updates });
    toast("Brand settings saved", "success");
  } catch (err) {
    toast("Couldn't save settings", "error");
  }
});

/* ---------- Logo upload — fails gracefully without Blaze/Storage ---------- */
document.getElementById("btn-upload-logo").addEventListener("click", () => {
  document.getElementById("logo-input").click();
});

document.getElementById("logo-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!storage) {
    document.getElementById("storage-note").style.display = "block";
    toast("Storage isn't set up on this Firebase plan. Logo upload skipped.", "info");
    return;
  }

  try {
    const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js");
    const fileRef = ref(storage, `logos/${currentUser.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await updateDoc(doc(db, "users", currentUser.uid), { logoUrl: url });
    setCachedBusiness({ ...getCachedBusiness(), logoUrl: url });

    document.getElementById("logo-preview").innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`;
    toast("Logo updated", "success");
  } catch (err) {
    console.warn("Storage upload failed:", err.message);
    document.getElementById("storage-note").style.display = "block";
    toast("Couldn't upload logo — Storage may not be enabled (requires Blaze plan).", "error");
  }
});
