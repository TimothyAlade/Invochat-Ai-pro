// ===========================================================
// InvoChat AI — Authentication
// ===========================================================

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const FRIENDLY_ERRORS = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect password. Try again.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "An account already exists with that email.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Network error. Check your connection."
};

function friendlyError(err) {
  return FRIENDLY_ERRORS[err.code] || "Something went wrong. Please try again.";
}

function showAlert(el, message) {
  if (!el) return;
  el.textContent = message;
  el.style.display = "block";
}
function hideAlert(el) { if (el) el.style.display = "none"; }

function setLoading(button, isLoading, label) {
  if (!button) return;
  button.disabled = isLoading;
  button.innerHTML = isLoading
    ? `<span class="spinner"></span> ${label || "Please wait…"}`
    : button.dataset.originalLabel || button.innerHTML;
}

/* Redirect already-authenticated users straight to the dashboard */
export function redirectIfAuthed() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "dashboard.html";
  });
}

/* ---------- Login ---------- */
export function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const alertBox = document.getElementById("login-alert");
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.dataset.originalLabel = submitBtn.innerHTML;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertBox);
    const email = form.email.value.trim();
    const password = form.password.value;
    setLoading(submitBtn, true, "Signing in…");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert(alertBox, friendlyError(err));
      setLoading(submitBtn, false);
    }
  });
}

/* ---------- Signup ---------- */
export function initSignupForm() {
  const form = document.getElementById("signup-form");
  if (!form) return;
  const alertBox = document.getElementById("signup-alert");
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.dataset.originalLabel = submitBtn.innerHTML;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertBox);

    const ownerName = form.ownerName.value.trim();
    const businessName = form.businessName.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (password.length < 6) {
      showAlert(alertBox, "Password should be at least 6 characters.");
      return;
    }

    setLoading(submitBtn, true, "Creating account…");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: ownerName });

      await setDoc(doc(db, "users", cred.user.uid), {
        ownerName,
        businessName,
        phone,
        email,
        address: "",
        logoUrl: "",
        slogan: "",
        invoiceFooter: "Thank you for your business!",
        defaultDueDays: 7,
        createdAt: serverTimestamp()
      });

      window.location.href = "dashboard.html";
    } catch (err) {
      showAlert(alertBox, friendlyError(err));
      setLoading(submitBtn, false);
    }
  });
}

/* ---------- Forgot password ---------- */
export function initForgotForm() {
  const form = document.getElementById("forgot-form");
  if (!form) return;
  const alertBox = document.getElementById("forgot-alert");
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.dataset.originalLabel = submitBtn.innerHTML;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertBox);
    const email = form.email.value.trim();
    setLoading(submitBtn, true, "Sending…");
    try {
      await sendPasswordResetEmail(auth, email);
      alertBox.className = "alert alert-success";
      showAlert(alertBox, "Reset link sent! Check your inbox.");
      form.reset();
    } catch (err) {
      alertBox.className = "alert alert-error";
      showAlert(alertBox, friendlyError(err));
    }
    setLoading(submitBtn, false);
  });
}
