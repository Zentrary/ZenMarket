import { encryptBackup } from "./core/backup.js";
import { mountCaptcha, captchaToken, resetCaptcha } from "./core/captcha.js";
import { renderHome } from "./pages/storefront/home.js";
import { storeIconURL, checkoutRecipient } from "./core/customer.js";
import { notify, confirmAction, flash, showFlash } from "./core/ui.js";
import {
  productImages,
  safeSocialURL,
  statusLabels,
  reviewColumns,
} from "./core/experience.js";
import { needsMembership, safeReturnPath } from "./core/routes.js";
import { getLanguage, localizePage, supportedLanguages } from "./core/i18n.js";
import { categoryIcon } from "./core/category-icons.js";
import {
  customerViewKey,
  readCustomerView,
  audienceRedirect,
} from "./core/audience.js";
import "@fontsource/prompt/thai-400.css";
import "@fontsource/prompt/thai-500.css";
import "@fontsource/prompt/thai-600.css";
import "@fontsource/prompt/latin-400.css";
import "@fontsource/prompt/latin-500.css";
import "@fontsource/prompt/latin-600.css";
import "./styles/base.css";
import "./styles/spaces.css";
import { createClient } from "@supabase/supabase-js";
import {
  createIcons,
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  Menu,
  X,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Truck,
  ShieldCheck,
  Package,
  Headphones,
  Coffee,
  LampDesk,
  Shirt,
  LayoutGrid,
  Leaf,
  Instagram,
  Facebook,
  Mail,
  LogOut,
  Settings,
  Upload,
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle2,
  Copy,
  Download,
  CreditCard,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
} from "lucide";
import QRCode from "qrcode";
import {
  escapeHTML as esc,
  safeImage,
  validPromptPay,
  promptpayPayload,
  validateCart,
  reconcileCart,
} from "./core/lib.js";
import {
  defaultSettings,
  normalizeSettings,
  shippingFor,
} from "./core/settings.js";
import { pageURL, currentRoute, migrateLegacyLink } from "./core/routes.js";
import { createStorePages } from "./pages/storefront/store.js";
import { createCheckoutPages } from "./pages/customer/checkout.js";
import { createAccountPages } from "./pages/customer/account.js";
let store = { ...defaultSettings };
let language = getLanguage();
let categories = [{ name: "ทั้งหมด", icon: "LayoutGrid" }];
let signingOut = false;
const legacyLink = migrateLegacyLink();
if (legacyLink) location.replace(legacyLink);
const icons = {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShoppingBag,
  UserRound,
  Heart,
  Menu,
  X,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Truck,
  ShieldCheck,
  Package,
  Headphones,
  Coffee,
  LampDesk,
  Shirt,
  LayoutGrid,
  Leaf,
  Instagram,
  Facebook,
  Mail,
  LogOut,
  Settings,
  Upload,
  ArrowLeft,
  SlidersHorizontal,
  CheckCircle2,
  Copy,
  Download,
  CreditCard,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
};
const $ = (s) => document.querySelector(s);
const i = (name, cls = "") =>
  `<i data-lucide="${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}" class="${cls}" aria-hidden="true"></i>`;
const config =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = config
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  : null;
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
let addresses = [];
let products = [],
  session = null,
  profile = null,
  admin = false,
  customerView = false,
  cart = validateCart(read("zen-cart", [])),
  favorites = read("zen-favorites", []),
  category = new URLSearchParams(location.search).get("category") || "ทั้งหมด",
  search = "",
  sort = "recommended",
  loading = true,
  routeVersion = 0;
if (!Array.isArray(favorites)) favorites = [];
const app = $("#app");
const toast = notify;
function handleError(e) {
  reportClientError(e);
  console.error(e?.code || e?.name || "Request failed");
  toast(e?.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง", true);
}
const route = () => currentRoute();
function go(path, message) {
  if (message) flash(message);
  location.assign(pageURL(path));
}
const count = () => cart.reduce((n, x) => n + x.quantity, 0);
function saveCart() {
  localStorage.setItem("zen-cart", JSON.stringify(cart));
  document
    .querySelectorAll("[data-cart-count]")
    .forEach((el) => (el.textContent = count()));
}
function addCart(id) {
  const p = products.find((p) => p.id === id);
  if (!p || !p.active || p.stock < 1)
    return toast("สินค้านี้หมดชั่วคราว", true);
  let row = cart.find((x) => x.id === id);
  if (row && row.quantity >= Math.min(p.stock, 99))
    return toast("ถึงจำนวนสินค้าที่มีแล้ว", true);
  if (row) row.quantity++;
  else cart.push({ id, quantity: 1 });
  saveCart();
  toast("เพิ่มลงตะกร้าแล้ว ไปช้อปต่อได้เลย");
}
function clearCustomerView() {
  customerView = false;
  try {
    sessionStorage.removeItem(customerViewKey);
  } catch {
    /* Storage may be disabled. */
  }
}
function guardAudience() {
  const target = audienceRedirect({
    route: route(),
    signedIn: !!session,
    isOwner: admin,
    customerView,
  });
  if (!target) return false;
  location.replace(target);
  return true;
}
function pageContext() {
  return {
    products: customerView ? products.filter((p) => p.active) : products,
    addresses,
    session,
    profile,
    admin: admin && !customerView,
    db,
    cart,
    favorites,
    categories,
    category,
    search,
    sort,
    i,
    money,
    esc,
    safeImage,
    field,
    empty,
    pageHead,
    count,
    route,
    QRCode,
    promptpayPayload,
    statusLabel,
    date,
    shortDate,
    store,
    productImages,
    safeSocialURL,
    reviewColumns,
    shippingFor,
    pageURL,
  };
}
function preparePage() {
  document
    .querySelectorAll('a[href^="#/"]')
    .forEach((a) =>
      a.setAttribute("href", pageURL(a.getAttribute("href").slice(1))),
    );
  createIcons({ icons });
  mountCaptcha();
  updatePaymentCountdown();
  refreshOwnerAlerts();
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) {
    icon.removeAttribute("type");
    icon.href = storeIconURL(store.logo_url);
    icon.onerror = () => {
      icon.onerror = null;
      icon.href = "/favicon.svg";
    };
  }
}
async function refreshStore() {
  if (!db) return;
  const [settingsResult, categoriesResult] = await Promise.all([
    db.rpc("get_storefront"),
    db.from("categories").select("*").order("created_at", { ascending: true }),
  ]);
  if (settingsResult.error) throw settingsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  store = normalizeSettings(settingsResult.data);
  categories = [
    { name: "ทั้งหมด", icon: "LayoutGrid" },
    ...(categoriesResult.data || []).map((c) => ({ ...c, icon: categoryIcon(c.icon) })),
  ];
}
async function uploadImage(bucket, file) {
  checkFile(file);
  const path = crypto.randomUUID() + "." + file.type.split("/")[1];
  const { error } = await db.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
function brand() {
  const target =
    admin && !customerView ? "/admin/dashboard.html" : "/home.html";
  return `<a href="${target}" class="brand" aria-label="${esc(store.shop_name)} ${admin && !customerView ? "หลังบ้าน" : "หน้าหลัก"}">${store.logo_url ? `<img class="shop-logo" src="${safeImage(store.logo_url)}" alt="">` : `<span class="brand-mark">${i("ShoppingBag")}</span>`}<span>${esc(store.shop_name)}</span></a>`;
}
function header() {
  const r = route();
  const managing = admin && !customerView;
  const links = [
    ["/", "/home.html", "หน้าหลัก"],
    ...(session
      ? [
          ["/shop", "/shop/index.html", "สินค้า"],
          ["/orders", "/account/orders.html", "คำสั่งซื้อ"],
        ]
      : []),
    ["/contact", "/pages/contact.html", "ช่องทางการติดต่อ"],
  ];
  const account = session
    ? `<a class="user-chip" href="/account/index.html" aria-label="บัญชี ${esc(profile?.username || session.user.email)}">${i("UserRound")}<span>@${esc(profile?.username || session.user.email)}</span></a><button type="button" class="logout-btn" data-action="logout">${i("LogOut")}<span>ออกจากระบบ</span></button>`
    : `<a class="btn secondary login-link" href="/auth/login.html">${i("UserRound")} เข้าสู่ระบบ</a><a class="btn primary register-link" href="/auth/register.html">สมัครสมาชิก</a>`;
  const ownerControls = `<a class="notification-link" href="/admin/operations.html" aria-label="แจ้งเตือนร้าน">${i("Mail")} แจ้งเตือน <b data-owner-alert-count>0</b></a><span class="owner-identity">${esc(profile?.username || "เจ้าของร้าน")}</span><button type="button" class="btn secondary" data-action="enter-customer-view">${i("Eye")} มุมมองผู้ใช้</button><button type="button" class="logout-btn" data-action="logout">${i("LogOut")}<span>ออกจากระบบ</span></button>`;
  return `<a class="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a><header class="${managing ? "admin-header" : ""}"><div class="header-inner">${brand()}${managing ? '<span class="workspace-tag">ระบบจัดการร้านค้า</span>' : `<nav id="main-nav" aria-label="เมนูหลัก">${links.map(([key, href, label]) => `<a class="${r === key ? "active" : ""}" ${r === key ? 'aria-current="page"' : ""} href="${href}">${label}</a>`).join("")}</nav>`}<div class="header-actions">${session && !managing ? `<a class="cart-link" href="/shop/cart.html" aria-label="ตะกร้าสินค้า">${i("ShoppingBag")}<b data-cart-count>${count()}</b></a>` : ""}<div class="session-controls${!session ? " guest-account-actions" : ""}">${managing ? ownerControls : account}</div>${!managing ? `<button class="icon-btn mobile-menu" data-action="menu" aria-label="เปิดเมนู" aria-controls="main-nav" aria-expanded="false">${i("Menu")}</button>` : ""}<div class="language-switcher" role="group" aria-label="เลือกภาษา"><button type="button" class="language-option ${language === "th" ? "active" : ""}" data-language="th" aria-pressed="${language === "th"}" title="ภาษาไทย">TH</button><button type="button" class="language-option ${language === "en" ? "active" : ""}" data-language="en" aria-pressed="${language === "en"}" title="English">EN</button></div></div></div></header>${customerView ? `<section class="customer-view-bar" aria-label="มุมมองผู้ใช้"><div><strong>มุมมองผู้ใช้</strong><span>ใช้บัญชีเจ้าของร้าน · การสั่งซื้อและแก้ไขข้อมูลเป็นรายการจริง</span></div><button type="button" class="btn secondary" data-action="exit-customer-view">${i("ArrowLeft")} ออกจากมุมมองผู้ใช้</button></section>` : ""}${!db ? '<div class="demo-banner">ยังไม่ได้เชื่อมต่อฐานข้อมูล — ไม่สามารถเข้าสู่ระบบหรือสั่งซื้อได้</div>' : ""}`;
}
const empty = (
  title,
  text,
  link = session ? "/shop" : "/",
  label = session ? "เลือกชมสินค้า" : "กลับหน้าหลัก",
) =>
  `<div class="empty">${i("ShoppingBag")}<h2>${title}</h2><p>${text}</p><a class="btn primary" href="#${link}">${label} ${i("ArrowRight")}</a></div>`;
function pageHead(eyebrow, title, description = "") {
  return `<div class="page-head"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${description ? `<p>${description}</p>` : ""}</div>`;
}
function productCard(...args) {
  return createStorePages(pageContext()).productCard(...args);
}
function filters(...args) {
  return createStorePages(pageContext()).filters(...args);
}
function catalogList(...args) {
  return createStorePages(pageContext()).catalogList(...args);
}
function home(...args) {
  return renderHome(pageContext());
}
function shop(...args) {
  return createStorePages(pageContext()).shop(...args);
}
function collections(...args) {
  return createStorePages(pageContext()).collections(...args);
}
function productPage(...args) {
  return createStorePages(pageContext()).productPage(...args);
}
function cartRows(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).cartRows(...args);
}
function totals(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).totals(...args);
}
function summary(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).summary(...args);
}
function cartPage(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).cartPage(...args);
}
function field(label, name, type = "text", extra = "", value = "") {
  return `<label class="field"><span>${label}</span><input type="${type}" name="${name}" ${extra} value="${esc(value)}" required></label>`;
}
function authPage(...args) {
  return createAccountPages(pageContext()).authPage(...args);
}
function checkoutPage(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).checkoutPage(...args);
}
const statusLabel = statusLabels;
const locale = () => language === "en" ? "en-US" : "th-TH";
const money = (amount) => new Intl.NumberFormat(locale(), {
  style: "currency", currency: "THB", maximumFractionDigits: 2,
}).format(Number(amount) || 0);
const date = (s) => new Date(s).toLocaleString(locale(), {
  dateStyle: "medium", timeStyle: "short",
});
const shortDate = (s) => new Date(s).toLocaleDateString(locale(), {
  day: "numeric", month: "short", timeZone: "Asia/Bangkok",
});
async function ordersPage(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).ordersPage(...args);
}
async function orderPage(...args) {
  return createCheckoutPages({
    ...pageContext(),
    admin: admin && route().startsWith("/admin/"),
  }).orderPage(...args);
}
function accountPage(...args) {
  return createAccountPages(pageContext()).accountPage(...args);
}
async function adminPage(...args) {
  const { createAdminPages } = await import("./pages/admin/index.js");
  return createAdminPages(pageContext()).adminPage(...args);
}
function infoPage(...args) {
  return createAccountPages(pageContext()).infoPage(...args);
}
function recoveryPage(...args) {
  return createAccountPages(pageContext()).recoveryPage(...args);
}
async function render() {
  if (guardAudience()) return;
  const version = ++routeVersion;
  const r = route();
  document.body.dataset.space = r.startsWith("/admin")
    ? "admin"
    : r === "/"
      ? "home"
      : "customer";
  let content = "";
  app.innerHTML =
    header() +
    `<main class="wrap loading">กำลังจัดเตรียมสิ่งดีๆ ให้คุณ…</main>`;
  document.documentElement.lang = language;
  localizePage(app, language);
  try {
    if (r === "/") content = await home();
    else if (r === "/shop") content = shop();
    else if (r === "/collections") content = collections();
    else if (r.startsWith("/product/"))
      content = await productPage(r.split("/")[2]);
    else if (r === "/contact")
      content = createStorePages(pageContext()).contactPage();
    else if (r === "/cart") content = cartPage();
    else if (r === "/checkout") content = checkoutPage();
    else if (r === "/login") content = authPage();
    else if (r === "/admin/login") {
      const { ownerLogin } = await import("./pages/admin/login.js");
      content = ownerLogin(pageContext());
    } else if (r === "/admin/operations") {
      const { operationsPage } = await import("./pages/admin/operations.js");
      content = admin ? await operationsPage(pageContext()) : await adminPage();
    } else if (r.startsWith("/admin/order/")) {
      if (admin) {
        const { adminSidebar } = await import("./pages/admin/navigation.js");
        const detail = await orderPage(r.split("/")[3]);
        content = `<main class="workspace" id="main-content">${adminSidebar(i, "orders")}<div class="workspace-content admin-order-detail">${detail.replace(/^<main class="wrap subpage">/, '<div class="subpage">').replace(/<\/main>$/, "</div>")}</div></main>`;
      } else content = await adminPage();
    } else if (r === "/register") content = authPage(true);
    else if (r === "/account") content = accountPage();
    else if (r === "/orders") content = await ordersPage();
    else if (r.startsWith("/order/"))
      content = await orderPage(r.split("/")[2]);
    else if (r.startsWith("/admin"))
      content = await adminPage(r.split("/")[2] || "products");
    else if (r === "/favorites")
      content = `<main class="wrap subpage">${pageHead("SAVED FOR A GOOD DAY", "รายการโปรด", "สินค้าที่คุณบันทึกไว้")}<div class="product-grid">${products
        .filter((p) => p.active && favorites.includes(p.id))
        .map(productCard)
        .join(
          "",
        )}</div>${!products.some((p) => p.active && favorites.includes(p.id)) ? empty("ยังไม่มีรายการโปรด", "กดหัวใจบนสินค้าที่คุณชอบ เพื่อเก็บไว้ที่นี่") : ""}</main>`;
    else if (r === "/reset-password") content = recoveryPage();
    else if (["/about", "/help", "/privacy"].includes(r))
      content = infoPage(r.slice(1));
    else
      content = empty(
        "ไม่พบหน้านี้",
        "กลับมาเลือกสิ่งดีๆ ที่หน้าร้านกัน",
        "/",
        "กลับหน้าหลัก",
      );
    if (version !== routeVersion) return;
    if (!content.startsWith("<main")) content = "<main>" + content + "</main>";
    app.innerHTML = header() + content;
    document.documentElement.lang = language;
    localizePage(app, language);
    preparePage();
    if (!$("main").id) $("main").id = "main-content";
    document.title = `${$("main h1")?.textContent || "ร้านค้าออนไลน์"} | ${store.shop_name}`;
  } catch (e) {
    if (version !== routeVersion) return;
    reportClientError(e);
    app.innerHTML =
      header() +
      `<main class="wrap subpage" id="main-content">${empty("ไม่สามารถโหลดข้อมูลได้", esc(e.message || "กรุณาลองอีกครั้ง"))}</main>`;
    document.documentElement.lang = language;
    localizePage(app, language);
    preparePage();
  }
}
async function refreshProducts() {
  if (!session) {
    products = [];
    return;
  }
  if (db) {
    let query = db.from("products").select("*");
    if (customerView) query = query.eq("active", true);
    const { data, error } = await query.order("created_at", {
      ascending: true,
    });
    if (error) throw error;
    products = data || [];
  } else products = [];
  cart = reconcileCart(cart, products);
  saveCart();
  favorites = favorites.filter((id) =>
    products.some((p) => p.id === id && p.active),
  );
  localStorage.setItem("zen-favorites", JSON.stringify(favorites));
}
async function refreshAddresses() {
  if (!db || !session) {
    addresses = [];
    return;
  }
  const { data, error } = await db
    .from("customer_addresses")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  addresses = data || [];
}
async function refreshIdentity() {
  if (!db || !session) {
    profile = null;
    admin = false;
    clearCustomerView();
    return;
  }
  const [p, a] = await Promise.all([
    db.from("profiles").select("*").eq("id", session.user.id).single(),
    db.rpc("is_admin"),
  ]);
  if (p.error) throw p.error;
  if (a.error) throw a.error;
  profile = p.data;
  admin = a.data === true;
  customerView = false;
  try {
    customerView = readCustomerView(sessionStorage, session.user.id, admin);
  } catch {
    /* Inaccessible session storage must default to the owner workspace. */
  }
  if (!admin || route().startsWith("/admin/")) clearCustomerView();
}
function modal(content) {
  document.querySelector("dialog.editor-dialog")?.close();
  const dialog = document.createElement("dialog");
  dialog.className = "editor-dialog";
  dialog.innerHTML = `<button class="modal-close icon-btn" data-action="close-modal" aria-label="ปิด">${i("X")}</button>${content}`;
  document.body.append(dialog);
  dialog.showModal();
  preparePage();
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());
}
function productModal(id) {
  if (categories.length < 2) {
    flash("กรุณาเพิ่มหมวดหมู่สินค้าก่อน", true);
    go("/admin/categories");
    return;
  }
  const p = products.find((p) => p.id === id) || {};
  modal(
    `<h2>${id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2><form id="product-form" data-id="${p.id || ""}">${field("ชื่อสินค้า", "name", "text", 'maxlength="150"', p.name || "")}<div class="form-grid">${field("รหัสสินค้า (SKU)", "sku", "text", 'maxlength="50"', p.sku || "")}<label class="field"><span>หมวดหมู่สินค้า</span><select name="category">${categories
      .slice(1)
      .map(
        (c) =>
          `<option value="${esc(c.name)}" ${p.category === c.name ? "selected" : ""}>${esc(c.name)}</option>`,
      )
      .join(
        "",
      )}</select></label>${field("ราคา (บาท)", "price", "number", 'min="0.01" max="1000000" step="0.01"', p.price || "")}${field("จำนวนในสต็อก", "stock", "number", 'min="0" max="100000" step="1"', p.stock ?? "")}</div><label class="field"><span>รายละเอียดสินค้า</span><textarea name="description" maxlength="2000" rows="3">${esc(p.description || "")}</textarea></label><label class="field"><span>รูปสินค้า (สูงสุด 8 รูป · JPG, PNG, WebP รูปละไม่เกิน 5 MB) ${id ? "— ไม่เลือกเพื่อใช้รูปเดิม" : ""}</span><input type="file" name="image" multiple accept="image/jpeg,image/png,image/webp" ${id ? "" : "required"}></label><div class="image-editor">${productImages(
      p,
    )
      .map(
        (url, index) =>
          `<label class="retained-image"><img src="${safeImage(url)}" alt="รูปที่ ${index + 1}"><span><input type="checkbox" name="keep_image" value="${esc(url)}" checked> เก็บรูป ${index + 1}</span></label>`,
      )
      .join(
        "",
      )}</div><div id="image-preview" class="image-editor" aria-live="polite"></div><p class="muted">รูปแรกเป็นรูปปก เอาเครื่องหมายออกเพื่อนำรูปเดิมออก โดยคำสั่งซื้อเดิมยังเก็บรูปเดิมไว้</p><label class="checkbox"><input type="checkbox" name="active" ${p.active !== false ? "checked" : ""}> เปิดขายสินค้า (นำเครื่องหมายออกเพื่อซ่อน)</label><p class="form-error" role="alert"></p><button type="submit" class="btn primary full">${i("Check")} บันทึกสินค้า</button></form>`,
  );
}
function addressModal(id) {
  const a = addresses.find((a) => a.id === id) || {};
  if (!id && addresses.length >= 5) {
    toast("บันทึกได้สูงสุด 5 ที่อยู่", true);
    return;
  }
  modal(
    `<h2>${id ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</h2><form id="address-form" data-id="${a.id || ""}">${field("ชื่อเรียกที่อยู่", "label", "text", 'maxlength="40" placeholder="เช่น บ้าน หรือ ที่ทำงาน"', a.label || "")}${field("ชื่อผู้รับ", "recipient", "text", 'minlength="2" maxlength="150" autocomplete="name"', a.recipient || [profile?.first_name, profile?.last_name].filter(Boolean).join(" "))}${field("เบอร์โทรศัพท์", "phone", "tel", 'pattern="0[0-9]{9}" autocomplete="tel"', a.phone || profile?.phone || "")}<label class="field"><span>ที่อยู่จัดส่งครบถ้วน พร้อมรหัสไปรษณีย์</span><textarea name="address" required minlength="20" maxlength="1200" rows="4" autocomplete="street-address">${esc(a.address || "")}</textarea></label><label class="checkbox"><input type="checkbox" name="is_default" ${a.is_default || !addresses.length ? "checked" : ""}> ใช้เป็นที่อยู่หลัก</label><p class="form-error" role="alert"></p><button class="btn primary" type="submit">${i("Check")} บันทึกที่อยู่</button></form>`,
  );
}
async function uploadShippingImages(form) {
  const files = new FormData(form)
    .getAll("shipping_images")
    .filter((file) => file.size);
  if (files.length > 4) throw Error("แนบรูปการจัดส่งได้สูงสุด 4 รูปต่ออัปเดต");
  files.forEach(checkFile);
  const paths = [];
  for (const file of files) {
    const path =
      form.dataset.id +
      "/" +
      crypto.randomUUID() +
      "." +
      file.type.split("/")[1];
    const { error } = await db.storage
      .from("shipping-updates")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}
document.addEventListener("click", async (e) => {
  if (e.target.closest(".skip-link")) {
    e.preventDefault();
    const main = $("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus();
    return;
  }
  const languageButton = e.target.closest("button[data-language]");
  if (languageButton) {
    language = supportedLanguages.includes(languageButton.dataset.language) ? languageButton.dataset.language : "th";
    try { localStorage.setItem("zen-language", language); } catch {}
    render();
    return;
  }
  const notification = e.target.closest("[data-read-notification]");
  if (
    notification &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.shiftKey &&
    !e.altKey &&
    e.button === 0
  ) {
    e.preventDefault();
    try {
      if (!admin) throw Error("สำหรับเจ้าของร้านเท่านั้น");
      const { error } = await db.rpc("mark_owner_notification", {
        p_id: notification.dataset.readNotification,
      });
      if (error) throw error;
      location.href = notification.href;
    } catch (error) {
      handleError(error);
    }
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action,
    id = button.dataset.id;
  try {
    if (action === "enter-customer-view") {
      e.preventDefault();
      if (!admin) throw Error("สำหรับเจ้าของร้านเท่านั้น");
      try {
        sessionStorage.setItem(customerViewKey, session.user.id);
      } catch {
        throw Error(
          "เปิดมุมมองผู้ใช้ไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บข้อมูลสำหรับแท็บนี้",
        );
      }
      customerView = true;
      location.assign("/home.html");
    } else if (action === "exit-customer-view") {
      e.preventDefault();
      clearCustomerView();
      location.replace("/admin/dashboard.html");
    } else if (action === "read-notifications") {
      if (!admin) throw Error("สำหรับเจ้าของร้านเท่านั้น");
      const { error } = await db.rpc("mark_owner_notification", { p_id: null });
      if (error) throw error;
      await render();
    } else if (action === "edit-address") {
      if (!session) throw Error("กรุณาเข้าสู่ระบบ");
      addressModal(id);
    } else if (action === "delete-address") {
      if (
        !(await confirmAction(
          "ลบที่อยู่นี้จากสมุดที่อยู่? คำสั่งซื้อที่สร้างแล้วจะไม่เปลี่ยน",
          { danger: true, title: "ลบที่อยู่" },
        ))
      )
        return;
      button.disabled = true;
      const { error } = await db.rpc("delete_address", { p_id: id });
      if (error) throw error;
      await refreshAddresses();
      await render();
      toast("ลบที่อยู่แล้ว");
    } else if (action === "view-shipping-photo") {
      const { data, error } = await db.storage
        .from("shipping-updates")
        .createSignedUrl(button.dataset.path, 120);
      if (error) throw error;
      modal(
        `<h2>รูปอัปเดตการจัดส่ง</h2><img class="shipping-photo-large" src="${esc(data.signedUrl)}" alt="รูปอัปเดตการจัดส่งขนาดใหญ่">`,
      );
    } else if (action === "refresh-shipping-images") {
      button.disabled = true;
      try {
        await Promise.all(
          [...document.querySelectorAll("img[data-shipping-path]")].map(
            async (img) => {
              const { data, error } = await db.storage
                .from("shipping-updates")
                .createSignedUrl(img.dataset.shippingPath, 120);
              if (error) throw error;
              img.src = data.signedUrl;
            },
          ),
        );
      } finally {
        button.disabled = false;
      }
    } else if (action === "add") addCart(id);
    else if (action === "favorite") {
      favorites = favorites.includes(id)
        ? favorites.filter((x) => x !== id)
        : [...favorites, id];
      localStorage.setItem("zen-favorites", JSON.stringify(favorites));
      const y = scrollY;
      await render();
      scrollTo(0, y);
    } else if (action === "category") {
      category = button.dataset.category;
      document
        .querySelectorAll(".pill")
        .forEach((b) =>
          b.classList.toggle("selected", b.dataset.category === category),
        );
      $("#catalog-list").innerHTML = catalogList(
        route() === "/" ? 8 : undefined,
      );
      preparePage();
    } else if (action === "collection") {
      category = button.dataset.category;
      search = "";
      go("/shop?category=" + encodeURIComponent(category));
    } else if (action === "remove" || action === "quantity") {
      const row = cart.find((x) => x.id === id);
      if (action === "remove") {
        const productName = products.find((p) => p.id === id)?.name || "รายการนี้";
        if (!(await confirmAction(`ต้องการนำ “${productName}” ออกจากตะกร้าหรือไม่?`, { title: "ยืนยันการนำสินค้าออก", accept: "นำออก" }))) return;
        cart = cart.filter((x) => x.id !== id);
      } else if (row) {
        const p = products.find((x) => x.id === id);
        const n = row.quantity + Number(button.dataset.delta);
        if (n > Math.min(p?.stock || 0, 99))
          return toast("สินค้าในสต็อกไม่เพียงพอ", true);
        if (n <= 0) cart = cart.filter((x) => x.id !== id);
        else row.quantity = n;
      }
      saveCart();
      render();
    } else if (action === "search") {
      go("/shop");
      setTimeout(() => $('[name="search"]')?.focus(), 50);
    } else if (action === "menu") {
      const open = $("header nav").classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "ปิดเมนู" : "เปิดเมนู");
    } else if (action === "reset-filters") {
      category = "ทั้งหมด";
      search = "";
      sort = "recommended";
      render();
    } else if (action === "logout") {
      if (signingOut) return;
      signingOut = true;
      const buttons = [...document.querySelectorAll('[data-action="logout"]')];
      buttons.forEach((b) => {
        b.disabled = true;
        b.setAttribute("aria-busy", "true");
      });
      try {
        const { error } = await db.auth.signOut({ scope: "local" });
        if (error) {
          // Auth can clear this browser before remote revocation fails. Never
          // leave a stale signed-in screen or claim that revocation succeeded.
          const { data: current } = await db.auth.getSession();
          if (current.session) throw error;
          clearCustomerView();
          session = null;
          profile = null;
          admin = false;
          routeVersion++;
          location.replace("/auth/login.html?loggedOut=local");
          return;
        }
        clearCustomerView();
        session = null;
        profile = null;
        admin = false;
        routeVersion++;
        location.replace("/auth/login.html?loggedOut=1");
      } finally {
        signingOut = false;
        buttons.forEach((b) => {
          b.disabled = false;
          b.removeAttribute("aria-busy");
        });
      }
    } else if (action === "rename-category") {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      modal(
        `<h2>เปลี่ยนชื่อหมวดหมู่</h2><form id="category-rename-form" data-name="${esc(button.dataset.name)}">${field("ชื่อหมวดหมู่ใหม่", "name", "text", 'maxlength="80"', button.dataset.name)}<p class="form-error" role="alert"></p><button type="submit" class="btn primary">บันทึกชื่อหมวดหมู่</button></form>`,
      );
    } else if (action === "delete-category") {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      if (
        !(await confirmAction(
          "ลบหมวดหมู่ " +
            button.dataset.name +
            "? ลบได้เฉพาะหมวดหมู่ที่ไม่มีสินค้า",
        ))
      )
        return;
      button.disabled = true;
      const { error } = await db
        .from("categories")
        .delete()
        .eq("name", button.dataset.name);
      if (error)
        throw Error(
          ["23503", "23001"].includes(error.code)
            ? "หมวดหมู่นี้ยังมีสินค้า กรุณาย้ายสินค้าไปหมวดอื่นก่อน"
            : error.message,
        );
      await refreshStore();
      render();
      toast("ลบหมวดหมู่แล้ว");
    } else if (action === "delete-product") {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      const product = products.find((p) => p.id === id);
      if (
        !(await confirmAction(
          "ลบ “" +
            (product?.name || "สินค้านี้") +
            "” อย่างถาวร? สินค้าจะหายจากหน้าร้าน แต่ประวัติคำสั่งซื้อและรีวิวเดิมยังอยู่",
          { danger: true, title: "ลบสินค้า", accept: "ลบสินค้า" },
        ))
      )
        return;
      button.disabled = true;
      const { error } = await db.from("products").delete().eq("id", id);
      if (error) throw error;
      await refreshProducts();
      await render();
      toast("ลบสินค้าแล้ว");
    } else if (action === "gallery-image") {
      const image = document.querySelector("#gallery-main");
      image.src = button.dataset.src;
      image.alt = button.dataset.alt;
      document
        .querySelectorAll("[data-action=gallery-image]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    } else if (action === "receive-order") {
      if (
        !(await confirmAction(
          "ยืนยันว่าได้รับสินค้าและตรวจสอบเรียบร้อยแล้ว? หลังยืนยันคุณจะให้ดาวและเขียนรีวิวได้",
          { title: "ยืนยันรับสินค้า", accept: "ได้รับสินค้าแล้ว" },
        ))
      )
        return;
      button.disabled = true;
      const { error } = await db.rpc("transition_order", {
        order_id: id,
        next_status: "delivered",
      });
      if (error) throw error;
      await render();
      toast("ยืนยันรับสินค้าแล้ว ขอบคุณที่อุดหนุน เขียนรีวิวด้านล่างได้เลย");
    } else if (action === "edit-product") {
      if (admin) productModal(id);
    } else if (action === "close-modal") button.closest("dialog").close();
    else if (action === "forgot") {
      modal(
        `<h2>ลืมรหัสผ่าน?</h2><p>กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p><form id="forgot-form">${field("อีเมล", "email", "email", 'autocomplete="email"')}<p class="form-error" role="alert"></p><button class="btn primary full" type="submit">ส่งลิงก์ตั้งรหัสผ่าน</button></form>`,
      );
    } else if (action === "change-password") go("/reset-password");
    else if (["cancel-order", "approve-order"].includes(action)) {
      if (
        !(await confirmAction(
          action === "approve-order"
            ? "คุณตรวจสอบยอดเข้าบัญชีจริงตรงกับรายการนี้แล้วใช่ไหม?"
            : "ยืนยันยกเลิกคำสั่งซื้อ? หากชำระแล้วห้ามยกเลิก โปรดให้ร้านตรวจสอบก่อน",
        ))
      )
        return;
      button.disabled = true;
      const { error } = await db.rpc("transition_order", {
        order_id: id,
        next_status: action === "approve-order" ? "paid" : "cancelled",
      });
      if (error) throw error;
      await refreshProducts();
      render();
      toast("อัปเดตสถานะคำสั่งซื้อแล้ว");
    }
  } catch (e) {
    handleError(e);
    button.disabled = false;
  }
});
let previewURLs = [];
function clearPreviews() {
  previewURLs.forEach((url) => URL.revokeObjectURL(url));
  previewURLs = [];
}
document.addEventListener(
  "close",
  (event) => {
    if (event.target.matches?.(".editor-dialog")) clearPreviews();
  },
  true,
);
document.addEventListener("change", (e) => {
  if (e.target.id === "saved-address") {
    const delivery = checkoutRecipient(
      addresses.find((a) => a.id === e.target.value),
      profile,
    );
    const form = e.target.form;
    for (const key of ["recipient", "phone", "address"])
      form.elements[key].value = delivery[key];
  }
  if (e.target.name === "shipping_images") {
    clearPreviews();
    const preview = e.target.form.querySelector(".shipping-preview");
    preview?.replaceChildren();
    try {
      const files = [...e.target.files];
      if (files.length > 4)
        throw Error("แนบรูปการจัดส่งได้สูงสุด 4 รูปต่ออัปเดต");
      files.forEach(checkFile);
      files.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        previewURLs.push(url);
        const img = document.createElement("img");
        img.src = url;
        img.alt = "รูปการจัดส่ง " + (index + 1);
        preview?.append(img);
      });
    } catch (error) {
      e.target.value = "";
      handleError(error);
    }
  }
  if (e.target.name === "image") {
    clearPreviews();
    const preview = document.querySelector("#image-preview");
    if (!preview) return;
    preview.replaceChildren();
    try {
      const files = [...e.target.files];
      if (
        files.length +
          document.querySelectorAll("[name=keep_image]:checked").length >
        8
      )
        throw Error("ใส่รูปสินค้าได้สูงสุด 8 รูป");
      files.forEach(checkFile);
      files.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        previewURLs.push(url);
        const img = document.createElement("img");
        img.src = url;
        img.alt = "รูปใหม่ " + (index + 1);
        preview.append(img);
      });
    } catch (error) {
      e.target.value = "";
      handleError(error);
    }
  }
  if (e.target.id === "sort") {
    sort = e.target.value;
    $("#catalog-list").innerHTML = catalogList(route() === "/" ? 8 : undefined);
    preparePage();
  }
});
function checkPassword(data) {
  if (data.password !== data.confirm)
    throw Error("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
  if (
    data.password.length < 12 ||
    !/[a-zA-Z]/.test(data.password) ||
    !/[0-9]/.test(data.password)
  )
    throw Error(
      "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร และมีทั้งตัวอักษรอังกฤษและตัวเลข",
    );
}
function checkFile(file) {
  if (
    !file ||
    !file.size ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5242880
  )
    throw Error("เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
}
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!form.id) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button[type="submit"]');
  const errorBox = form.querySelector(".form-error");
  if (errorBox) errorBox.textContent = "";
  if (submit) submit.disabled = true;
  try {
    if (form.id === "search-form") {
      search = data.search.trim();
      $("#catalog-list").innerHTML = catalogList();
      preparePage();
      return;
    }
    if (!db) throw Error("ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase");
    if (form.id === "profile-form") {
      const { error } = await db.rpc("save_profile", {
        p_first_name: data.first_name.trim(),
        p_last_name: data.last_name.trim(),
        p_nickname: data.nickname.trim(),
        p_phone: data.phone.trim(),
        p_age: Number(data.age),
        p_username: data.username.trim().toLowerCase(),
      });
      if (error)
        throw Error(
          error.code === "23505"
            ? "ชื่อผู้ใช้นี้มีผู้ใช้แล้ว กรุณาเลือกชื่ออื่น"
            : error.code === "23514"
              ? "กรุณาตรวจสอบรูปแบบข้อมูลโปรไฟล์"
              : error.message,
        );
      await refreshIdentity();
      await render();
      toast("บันทึกโปรไฟล์แล้ว");
    } else if (form.id === "address-form") {
      const { error } = await db.rpc("save_address", {
        p_id: form.dataset.id || null,
        p_label: data.label.trim(),
        p_recipient: data.recipient.trim(),
        p_phone: data.phone.trim(),
        p_address: data.address.trim(),
        p_default: data.is_default === "on",
      });
      if (error) throw error;
      form.closest("dialog").close();
      await refreshAddresses();
      await render();
      toast("บันทึกที่อยู่แล้ว");
    } else if (form.id === "email-form") {
      const email = data.email.trim();
      if (email.toLowerCase() === session.user.email.toLowerCase())
        throw Error("กรุณาใช้อีเมลใหม่ที่ต่างจากอีเมลปัจจุบัน");
      const { data: result, error } = await db.auth.updateUser(
        { email },
        { emailRedirectTo: location.origin + "/account/index.html" },
      );
      if (error) throw error;
      if (result?.user) session = { ...session, user: result.user };
      await render();
      toast(
        "ส่งคำขอเปลี่ยนอีเมลแล้ว โปรดยืนยันจากอีเมลที่ระบบส่งให้ อีเมลเดิมจะยังใช้จนกว่าการยืนยันเสร็จ",
      );
    } else if (form.id === "backup-form") {
      if (!admin) throw Error("สำหรับเจ้าของร้านเท่านั้น");
      if (data.backup_password !== data.backup_confirm)
        throw Error("รหัสเข้ารหัสไม่ตรงกัน");
      if (
        !(await confirmAction(
          "สำเนามีข้อมูลลูกค้าและการรับเงิน จะเข้ารหัสในเบราว์เซอร์ก่อนดาวน์โหลด เก็บรหัสแยกจากไฟล์ และอย่าอัปโหลดไฟล์นี้ขึ้น GitHub",
          { title: "สำรองข้อมูลส่วนตัวของร้าน" },
        ))
      )
        return;
      const { data: backup, error } = await db.rpc("get_admin_backup");
      if (error) throw error;
      const encrypted = await encryptBackup(backup, data.backup_password);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(encrypted)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "zenmarket-" +
        new Date().toISOString().slice(0, 10) +
        ".zenbackup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      form.reset();
      toast(
        "ดาวน์โหลดสำเนาเข้ารหัสแล้ว กรุณาเก็บไว้นอกเครื่องและทดสอบเปิดไฟล์ด้วยรหัสที่ตั้งไว้",
      );
    } else if (form.id === "register-form") {
      checkPassword(data);
      const { error } = await db.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          captchaToken: captchaToken(form),
          emailRedirectTo: location.origin + "/account/index.html",
          data: {
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            nickname: data.nickname.trim(),
            age: Number(data.age),
            phone: data.phone,
            username: data.username.toLowerCase(),
          },
        },
      });
      if (error)
        throw Error(
          error.message.includes("Database")
            ? "ไม่สามารถสมัครได้ ชื่อผู้ใช้นี้อาจมีผู้ใช้แล้ว กรุณาตรวจข้อมูลอีกครั้ง"
            : error.message,
        );
      modal(
        `<div class="success-message">${i("Mail")}<h2>เช็กอีเมลของคุณได้เลย</h2><p>หากอีเมลนี้สมัครได้ ระบบจะส่งลิงก์ยืนยันให้ กรุณายืนยันก่อนเข้าสู่ระบบ และตรวจในโฟลเดอร์สแปมด้วย</p><a class="btn primary" href="#/login" data-action="close-modal">เข้าสู่ระบบ</a></div>`,
      );
      form.reset();
    } else if (form.id === "login-form") {
      const { data: result, error } = await db.functions.invoke(
        "username-login",
        {
          body: {
            identifier: data.identifier.trim(),
            password: data.password,
            captchaToken: captchaToken(form),
          },
        },
      );
      if (error) {
        let message =
          "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจชื่อผู้ใช้ รหัสผ่าน และการยืนยันอีเมล";
        try {
          message = (await error.context.json()).error || message;
        } catch {}
        throw Error(message);
      }
      if (result.error) throw Error(result.error);
      const { error: sessionError } = await db.auth.setSession(result.session);
      if (sessionError) throw sessionError;
      session = result.session;
      await refreshIdentity();
      if (form.dataset.owner && !admin)
        throw Error(
          "บัญชีนี้ไม่มีสิทธิ์เจ้าของร้าน กรุณาใช้หน้าสมาชิกสำหรับเลือกซื้อสินค้า",
        );
      clearCustomerView();
      const next = safeReturnPath(
        new URLSearchParams(location.search).get("next"),
      );
      location.assign(
        admin
          ? "/admin/dashboard.html"
          : next && !next.startsWith("/admin/")
            ? next
            : "/shop/index.html",
      );
    } else if (form.id === "checkout-form") {
      if (!session) throw Error("กรุณาเข้าสู่ระบบ");
      const recipient = String(data.recipient || "").trim();
      const phone = String(data.phone || "").trim();
      const address = String(data.address || "").trim();
      if (recipient.length < 2 || recipient.length > 150)
        throw Error("กรุณากรอกชื่อผู้รับอย่างน้อย 2 ตัวอักษร");
      if (!/^0[0-9]{9}$/.test(phone))
        throw Error("กรุณากรอกเบอร์โทรศัพท์ 10 หลักให้ถูกต้อง");
      if (address.length < 20 || address.length > 1200)
        throw Error("กรุณากรอกที่อยู่จัดส่งหลังตัดช่องว่างอย่างน้อย 20 ตัวอักษร");
      if (!form.dataset.request) form.dataset.request = crypto.randomUUID();
      const { data: order, error } = await db.rpc("create_order", {
        cart,
        delivery: { recipient, phone, address },
        request_key: form.dataset.request,
      });
      if (error) throw error;
      cart = [];
      saveCart();
      await refreshProducts();
      go("/order/" + order.id, "สร้างคำสั่งซื้อแล้ว กรุณาชำระเงินและแนบสลิป");
    } else if (form.id === "slip-form") {
      checkFile(data.slip);
      const ext = data.slip.type.split("/")[1];
      const path = `${session.user.id}/${form.dataset.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage
        .from("payment-slips")
        .upload(path, data.slip, {
          contentType: data.slip.type,
          upsert: false,
        });
      if (error) throw error;
      const { error: attach } = await db.rpc("attach_slip", {
        order_id: form.dataset.id,
        object_path: path,
      });
      if (attach) throw attach;
      render();
      toast("ส่งสลิปแล้ว ร้านจะตรวจสอบยอดเงินจริง");
    } else if (form.matches(".review-form")) {
      const rating = Number(data.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        throw Error("กรุณาเลือกคะแนน 1–5 ดาว");
      const { error } = await db.rpc("save_review", {
        p_order_id: form.dataset.order,
        p_product_id: form.dataset.product,
        p_rating: rating,
        p_comment: data.comment || "",
      });
      if (error) throw error;
      await render();
      toast("บันทึกรีวิวแล้ว ขอบคุณสำหรับความคิดเห็นของคุณ");
    } else if (form.id === "store-form") {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      const record = {};
      for (const key of [
        "shop_name",
        "tagline",
        "contact_email",
        "contact_phone",
        "contact_address",
        "about_text",
        "shipping_note",
      ])
        record[key] = String(data[key] || "").trim();
      for (const key of ["facebook_url", "instagram_url", "line_url"]) {
        const value = String(data[key] || "").trim();
        record[key] = safeSocialURL(value, key);
        if (value && !record[key])
          throw Error(
            "กรุณาใช้ลิงก์ HTTPS ของ Facebook, Instagram หรือ LINE ให้ตรงช่อง",
          );
      }
      record.shipping_fee = Number(data.shipping_fee);
      record.free_shipping_threshold = Number(data.free_shipping_threshold);
      if (!record.shop_name) throw Error("กรุณาระบุชื่อร้าน");
      record.logo_url = data.remove_logo === "on" ? "" : store.logo_url;
      if (data.logo?.size)
        record.logo_url = await uploadImage("store-assets", data.logo);
      const { error } = await db
        .from("store_settings")
        .update(record)
        .eq("singleton", true);
      if (error) throw error;
      await refreshStore();
      render();
      toast("บันทึกการตั้งค่าร้านแล้ว");
    } else if (["category-form", "category-rename-form"].includes(form.id)) {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      const name = String(data.name || "").trim();
      if (!name || name === "ทั้งหมด")
        throw Error("กรุณาใช้ชื่อหมวดหมู่ที่ไม่ใช่ “ทั้งหมด”");
      const query =
        form.id === "category-form"
          ? db.from("categories").insert({ name, icon: categoryIcon(data.icon) })
          : db
              .from("categories")
              .update({ name })
              .eq("name", form.dataset.name);
      const { error } = await query;
      if (error)
        throw Error(
          error.code === "23505" ? "มีหมวดหมู่ชื่อนี้แล้ว" : error.message,
        );
      form.closest("dialog")?.close();
      await refreshStore();
      await refreshProducts();
      render();
      toast("บันทึกหมวดหมู่แล้ว");
    } else if (form.id === "settings-form") {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      if (!validPromptPay(data.promptpay_id))
        throw Error("เบอร์โทรหรือเลขบัตรประชาชนไม่ถูกต้อง");
      const { error } = await db
        .from("store_settings")
        .update({
          promptpay_id: data.promptpay_id,
          recipient_name: data.recipient_name.trim(),
        })
        .eq("singleton", true);
      if (error) throw error;
      toast("บันทึกบัญชีรับเงินแล้ว");
    } else if (form.id === "product-form") {
      if (!admin) throw Error("ไม่มีสิทธิ์");
      const values = new FormData(form);
      const existing = productImages(
        products.find((p) => p.id === form.dataset.id),
      );
      const retained = values
        .getAll("keep_image")
        .filter((url) => existing.includes(url));
      const files = values.getAll("image").filter((file) => file.size);
      if (retained.length + files.length > 8)
        throw Error("ใส่รูปสินค้าได้สูงสุด 8 รูป");
      if (!retained.length && !files.length)
        throw Error("กรุณาใส่รูปสินค้าอย่างน้อย 1 รูป");
      files.forEach(checkFile);
      const imageURLs = [...retained];
      for (const file of files)
        imageURLs.push(await uploadImage("product-images", file));
      const record = {
        name: data.name.trim(),
        sku: data.sku.trim(),
        category: data.category,
        description: data.description.trim(),
        price: Number(data.price),
        stock: Number(data.stock),
        active: data.active === "on",
        image_url: imageURLs[0],
        image_urls: imageURLs,
      };
      const { error } = await (form.dataset.id
        ? db.from("products").update(record).eq("id", form.dataset.id)
        : db.from("products").insert(record));
      if (error)
        throw Error(
          error.code === "23505" ? "รหัสสินค้านี้ถูกใช้แล้ว" : error.message,
        );
      await refreshProducts();
      form.closest("dialog").close();
      await render();
      toast("บันทึกสินค้าแล้ว");
    } else if (form.id === "ship-form" || form.id === "shipping-update-form") {
      if (!admin) throw Error("สำหรับเจ้าของร้านเท่านั้น");
      const message = String(data.shipping_message || "").trim();
      if (
        form.id === "shipping-update-form" &&
        !message &&
        !new FormData(form).getAll("shipping_images").some((file) => file.size)
      )
        throw Error("กรุณาระบุข้อความ หรือแนบรูปการจัดส่ง");
      const images = await uploadShippingImages(form);
      const { error } = await db.rpc(
        form.id === "ship-form"
          ? "ship_order_with_update"
          : "add_shipping_update",
        {
          p_order_id: form.dataset.id,
          p_message: message,
          p_images: images,
          ...(form.id === "ship-form"
            ? { p_tracking: data.tracking.trim() }
            : {}),
        },
      );
      if (error) throw error;
      clearPreviews();
      await render();
      toast(
        form.id === "ship-form"
          ? "บันทึกการจัดส่งแล้ว"
          : "เผยแพร่อัปเดตการจัดส่งแล้ว",
      );
    } else if (form.id === "forgot-form") {
      const { error } = await db.auth.resetPasswordForEmail(data.email.trim(), {
        redirectTo: location.origin + "/auth/reset-password.html",
      });
      if (error) throw error;
      form.closest("dialog").close();
      toast("หากมีบัญชีนี้ ระบบจะส่งลิงก์ทางอีเมลให้คุณ");
    } else if (form.id === "password-form") {
      checkPassword(data);
      const { error } = await db.auth.updateUser({ password: data.password });
      if (error) throw error;
      go("/account", "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    }
  } catch (err) {
    if (["login-form", "register-form"].includes(form.id)) resetCaptcha(form);
    if (errorBox)
      errorBox.textContent = err.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
    handleError(err);
  } finally {
    if (submit) submit.disabled = false;
  }
});
window.addEventListener("hashchange", () => {
  const target = migrateLegacyLink();
  if (target) location.replace(target);
});
async function init() {
  const recovering = location.hash.includes("type=recovery");
  try {
    if (db) {
      db.auth.onAuthStateChange((event, newSession) => {
        session = newSession;
        if (event === "PASSWORD_RECOVERY")
          setTimeout(() => go("/reset-password"), 0);
        if (event === "SIGNED_OUT") {
          clearCustomerView();
          profile = null;
          admin = false;
          if (!signingOut && route() !== "/login")
            setTimeout(
              () => location.replace("/auth/login.html?loggedOut=1"),
              0,
            );
        }
        if (event === "TOKEN_REFRESHED")
          setTimeout(() => refreshIdentity().catch(handleError), 0);
      });
      const { data } = await db.auth.getSession();
      session = data.session;
      await refreshIdentity();
    }
    if (recovering && route() !== "/reset-password") {
      go("/reset-password");
      return;
    }
    if (guardAudience()) return;
    if (!session && needsMembership(route())) {
      location.replace(
        (route().startsWith("/admin")
          ? "/admin/login.html?next="
          : "/auth/login.html?next=") +
          encodeURIComponent(location.pathname + location.search),
      );
      return;
    }
    await refreshStore();
    await refreshProducts();
    if (session && ["/account", "/checkout"].includes(route()))
      await refreshAddresses();
    loading = false;
    if (recovering) go("/reset-password");
    else {
      await render();
      showFlash();
      const logoutStatus = new URLSearchParams(location.search).get(
        "loggedOut",
      );
      if (logoutStatus === "local")
        toast(
          "ออกจากระบบในเบราว์เซอร์นี้แล้ว แต่ยืนยันการยกเลิกเซสชันกับเซิร์ฟเวอร์ไม่สำเร็จ",
          true,
        );
      else if (logoutStatus) toast("ออกจากระบบเรียบร้อยแล้ว");
    }
  } catch (e) {
    app.innerHTML =
      header() +
      empty(
        "กำลังเชื่อมต่อร้านค้าไม่ได้",
        "โปรดลองรีเฟรชหน้าอีกครั้ง หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
        "/",
        "ลองอีกครั้ง",
      );
    preparePage();
    handleError(e);
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const nav = $("header nav");
    const toggle = $("[data-action=menu]");
    if (nav?.classList.contains("open")) {
      nav.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.setAttribute("aria-label", "เปิดเมนู");
      toggle?.focus();
    }
  }
});
if (!legacyLink) init();

// Poll only catalogue/cart pages; never replace a checkout/profile/review form.
// No service key, broad realtime publication or private order subscription needed.
let refreshingInventory = false;
async function refreshVisibleInventory() {
  if (
    loading ||
    refreshingInventory ||
    !session ||
    !db ||
    document.visibilityState !== "visible" ||
    document.querySelector("dialog[open]") ||
    (!["/shop", "/favorites", "/cart"].includes(route()) &&
      !route().startsWith("/product/"))
  )
    return;
  const userId = session.user.id;
  const previous = JSON.stringify(products);
  const draft = document.querySelector("[name=search]")?.value;
  const selected = document.querySelector(
    ".gallery-thumbnails [aria-pressed=true]",
  )?.dataset.src;
  refreshingInventory = true;
  try {
    await refreshProducts();
    if (session?.user.id !== userId) return;
    if (previous !== JSON.stringify(products)) {
      await render();
      if (draft !== undefined && document.querySelector("[name=search]"))
        document.querySelector("[name=search]").value = draft;
      if (selected) {
        const thumb = [
          ...document.querySelectorAll("[data-action=gallery-image]"),
        ].find((b) => b.dataset.src === selected);
        thumb?.click();
      }
    }
  } catch (error) {
    console.warn("Inventory refresh unavailable");
  } finally {
    refreshingInventory = false;
  }
}
setInterval(refreshVisibleInventory, 20000);
window.addEventListener("focus", refreshVisibleInventory);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshVisibleInventory();
});

// These refresh only small status nodes: never replace a draft form.
let alertsBusy = false,
  alertsInitialized = false,
  lastAlertId = null;
async function refreshOwnerAlerts() {
  if (
    alertsBusy ||
    loading ||
    !db ||
    !admin ||
    !session ||
    !route().startsWith("/admin/") ||
    document.visibilityState !== "visible"
  )
    return;
  alertsBusy = true;
  try {
    const { data, count, error } = await db
      .from("owner_notifications")
      .select("id,kind", { count: "exact" })
      .is("seen_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    document
      .querySelectorAll("[data-owner-alert-count]")
      .forEach((el) => (el.textContent = count || 0));
    const latest = data?.[0];
    if (
      alertsInitialized &&
      latest &&
      latest.id !== lastAlertId &&
      !document.querySelector("dialog[open]")
    )
      toast(
        latest.kind === "new_slip"
          ? "มีสลิปใหม่รอตรวจ ดูได้ที่ศูนย์แจ้งเตือนร้าน"
          : "มีคำสั่งซื้อใหม่ ดูได้ที่ศูนย์แจ้งเตือนร้าน",
      );
    lastAlertId = latest?.id || null;
    alertsInitialized = true;
  } catch {
    document
      .querySelectorAll("[data-owner-alert-count]")
      .forEach((el) => (el.textContent = "–"));
  } finally {
    alertsBusy = false;
  }
}
function updatePaymentCountdown() {
  const notice = document.querySelector("[data-payment-due]");
  if (!notice) return;
  const seconds = Math.max(
    0,
    Math.ceil(
      (new Date(notice.dataset.paymentDue).getTime() - Date.now()) / 1000,
    ),
  );
  const target = notice.querySelector("[data-payment-countdown]");
  if (target)
    target.textContent = seconds
      ? Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0")
      : "00:00";
  if (!seconds) {
    const label = notice.querySelector("[data-deadline-label]");
    if (label) label.textContent = "หมดเวลาชำระเงินแล้ว";
    const payment = document.querySelector("[data-expiring-payment]");
    if (payment && !payment.dataset.closed) {
      payment.dataset.closed = "true";
      payment.innerHTML =
        '<h2>หมดเวลาชำระเงิน</h2><p>กรุณาอย่าโอนเงิน หากโอนแล้วให้ติดต่อร้านพร้อมหลักฐาน ไม่ต้องสร้างรายการใหม่หรือชำระซ้ำ</p><a class="btn secondary" href="/pages/contact.html">ติดต่อร้าน</a>';
    }
  }
}
let lastErrorSent = 0;
function reportClientError(error) {
  if (!db || !session || Date.now() - lastErrorSent < 60000) return;
  lastErrorSent = Date.now();
  const r = route(),
    area = r.startsWith("/admin")
      ? "admin"
      : r === "/checkout" || r.startsWith("/order/")
        ? "checkout"
        : r === "/account"
          ? "account"
          : r === "/login" || r === "/register"
            ? "auth"
            : r === "/shop" || r.startsWith("/product/")
              ? "catalogue"
              : "other";
  const raw = String(error?.code || error?.name || "");
  const code =
    raw === "UI"
      ? "UI"
      : raw === "TypeError"
        ? "NETWORK"
        : raw === "42501"
          ? "PERMISSION"
          : /^\d{5}$/.test(raw) || raw.startsWith("PGRST")
            ? "DATABASE"
            : raw.includes("Storage")
              ? "STORAGE"
              : raw.includes("Auth")
                ? "AUTH"
                : "UNKNOWN";
  db.rpc("report_client_error", { p_area: area, p_code: code }).then(
    () => {},
    () => {},
  );
}
window.addEventListener("error", () => reportClientError({ code: "UI" }));
window.addEventListener("unhandledrejection", () =>
  reportClientError({ code: "UI" }),
);
setInterval(updatePaymentCountdown, 1000);
setInterval(refreshOwnerAlerts, 30000);
window.addEventListener("focus", refreshOwnerAlerts);

// A browser Back/Forward cache must not restore a stale owner preview or session.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    app.replaceChildren();
    location.reload();
  }
});
