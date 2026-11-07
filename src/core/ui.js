import { escapeHTML as esc } from "./lib.js";
import { getLanguage, localizePage } from "./i18n.js";
// Separate from editing dialogs: a notification must never destroy unsaved forms.
let queue = Promise.resolve();
function openPopup({
  message,
  title,
  error = false,
  confirm = false,
  accept = "ตกลง",
}) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const dialog = document.createElement("dialog");
    const id = "popup-" + crypto.randomUUID();
    dialog.className = "popup" + (error ? " popup-danger" : "");
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-labelledby", id + "-title");
    dialog.setAttribute("aria-describedby", id + "-message");
    dialog.innerHTML = `<div class="popup-symbol" aria-hidden="true">${confirm ? "?" : error ? "!" : "✓"}</div><span class="eyebrow">${confirm ? "PLEASE CONFIRM" : error ? "PLEASE CHECK" : "NOTIFICATION"}</span><h2 id="${id}-title">${esc(title || (confirm ? "ยืนยันการทำรายการ" : error ? "ไม่สามารถทำรายการได้" : "เรียบร้อยแล้ว"))}</h2><p id="${id}-message">${esc(message)}</p><div class="popup-actions">${confirm ? '<button type="button" class="btn secondary" data-popup-cancel autofocus>ยกเลิก</button>' : ""}<button type="button" class="btn ${error && confirm ? "danger-fill" : "primary"}" data-popup-accept ${!confirm ? "autofocus" : ""}>${esc(accept)}</button></div>`;
    localizePage(dialog, getLanguage());
    let accepted = false;
    dialog.querySelector("[data-popup-accept]").onclick = () => {
      accepted = true;
      dialog.close();
    };
    dialog
      .querySelector("[data-popup-cancel]")
      ?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          dialog.close();
      }
    });
    dialog.addEventListener(
      "close",
      () => {
        dialog.remove();
        if (previous?.isConnected) previous.focus();
        resolve(accepted);
      },
      { once: true },
    );
    document.body.append(dialog);
    dialog.showModal();
  });
}
export function notify(message, error = false, title) {
  const task = () => openPopup({ message, error, title });
  queue = queue.then(task, task);
  return queue;
}
export function confirmAction(
  message,
  { danger = false, title, accept = "ยืนยัน" } = {},
) {
  const task = () =>
    openPopup({ message, error: danger, title, accept, confirm: true });
  queue = queue.then(task, task);
  return queue;
}
export function flash(message, error = false) {
  sessionStorage.setItem("zen-flash", JSON.stringify({ message, error }));
}
export function showFlash() {
  const raw = sessionStorage.getItem("zen-flash");
  sessionStorage.removeItem("zen-flash");
  if (raw) {
    try {
      const data = JSON.parse(raw);
      notify(data.message, data.error);
    } catch {}
  }
}
