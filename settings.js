import { db } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { requireAuth, toast, setCachedBusiness, getCachedBusiness } from "./app.js";

// Max size (in characters) we'll allow for a base64 logo string before
// refusing it. Firestore documents cap out at 1MB total; we stay well
// under that so the rest of the business document always has room.
const MAX_LOGO_BASE64_LENGTH = 250000; // ~180KB of actual image data
const LOGO_MAX_DIMENSION = 240; // px, on the longest side

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
    await setDoc(doc(db, "users", currentUser.uid), updates, { merge: true });
    setCachedBusiness({ ...getCachedBusiness(), ...updates });
    toast("Brand settings saved", "success");
  } catch (err) {
    toast("Couldn't save settings", "error");
  }
});

/* ---------- Logo upload — no Firebase Storage / Blaze plan required ----------
   The image is resized on-device with a canvas, compressed to JPEG, and
   saved as a base64 data URI directly on the user's Firestore document.
   This works entirely on the free Spark plan. It's only suitable for a
   small logo thumbnail, not full-resolution photos. ------------------------ */
document.getElementById("btn-upload-logo").addEventListener("click", () => {
  document.getElementById("logo-input").click();
});

document.getElementById("logo-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast("Please choose an image file", "error");
    return;
  }

  const uploadBtn = document.getElementById("btn-upload-logo");
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Processing…";

  try {
    const dataUrl = await resizeAndCompressImage(file, LOGO_MAX_DIMENSION);

    if (dataUrl.length > MAX_LOGO_BASE64_LENGTH) {
      toast("That image is still too large after compression — try a simpler image.", "error");
      return;
    }

    await setDoc(doc(db, "users", currentUser.uid), { logoUrl: dataUrl }, { merge: true });
    setCachedBusiness({ ...getCachedBusiness(), logoUrl: dataUrl });

    document.getElementById("logo-preview").innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`;
    toast("Logo updated", "success");
  } catch (err) {
    console.warn("Logo processing failed:", err.message);
    toast("Couldn't process that image. Try a different file.", "error");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload logo";
    e.target.value = "";
  }
});

/**
 * Resizes an image file to fit within maxDimension x maxDimension
 * (preserving aspect ratio), then returns it as a compressed JPEG
 * base64 data URI. Quality steps down automatically if the result
 * is still too large.
 */
function resizeAndCompressImage(file, maxDimension) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF"; // flattens transparency onto white for JPEG
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > MAX_LOGO_BASE64_LENGTH && quality > 0.3) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
