// Optional Turnstile integration. Enable matching server verification in Supabase
// before claiming bot protection; a browser widget by itself is not enforcement.
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
let scriptPromise;
export function mountCaptcha() {
  if (!siteKey) return;
  document.querySelectorAll("#login-form, #register-form").forEach((form) => {
    if (!form.querySelector("[data-captcha]")) {
      const slot = document.createElement("div");
      slot.className = "captcha-slot";
      slot.dataset.captcha = "";
      form.querySelector("button[type=submit]").before(slot);
    }
  });
  const slots = [
    ...document.querySelectorAll("[data-captcha]:not([data-widget])"),
  ];
  if (!slots.length) return;
  scriptPromise ||= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = resolve;
    script.onerror = () =>
      reject(Error("โหลดการยืนยันความปลอดภัยไม่ได้ กรุณารีเฟรชหน้า"));
    document.head.append(script);
  });
  scriptPromise
    .then(() =>
      slots
        .filter((slot) => slot.isConnected && !slot.hasAttribute("data-widget"))
        .forEach((slot) => {
          slot.dataset.widget = window.turnstile.render(slot, {
            sitekey: siteKey,
            theme: "dark",
            size: "flexible",
          });
        }),
    )
    .catch(() => {
      slots.forEach(
        (slot) =>
          (slot.textContent = "โหลดการยืนยันความปลอดภัยไม่ได้ กรุณารีเฟรชหน้า"),
      );
    });
}
export function captchaToken(form) {
  if (!siteKey) return undefined;
  const token = form.querySelector('[name="cf-turnstile-response"]')?.value;
  if (!token) throw Error("กรุณายืนยันความปลอดภัยก่อนดำเนินการ");
  return token;
}
export function resetCaptcha(form) {
  const widget = form.querySelector("[data-widget]")?.dataset.widget;
  if (widget !== undefined) window.turnstile?.reset(widget);
}
