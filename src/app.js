import "@fontsource/prompt/thai-400.css";
import "@fontsource/prompt/thai-500.css";
import "@fontsource/prompt/thai-600.css";
import "@fontsource/prompt/latin-400.css";
import "@fontsource/prompt/latin-500.css";
import "@fontsource/prompt/latin-600.css";
import "./style.css";
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
  money,
  escapeHTML as esc,
  safeImage,
  validPromptPay,
  promptpayPayload,
  validateCart,
  reconcileCart,
} from "./lib.js";
import { defaultSettings, normalizeSettings, shippingFor } from "./settings.js";
import { pageURL, currentRoute, migrateLegacyLink } from "./routes.js";
import { createStorePages } from "./pages/store.js";
import { createCheckoutPages } from "./pages/checkout.js";
import { createAccountPages } from "./pages/account.js";
import { createAdminPages } from "./pages/admin.js";
let store = { ...defaultSettings };
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
let products = [],
  session = null,
  profile = null,
  admin = false,
  cart = validateCart(read("zen-cart", [])),
  favorites = read("zen-favorites", []),
  category = new URLSearchParams(location.search).get("category") || "ทั้งหมด",
  search = "",
  sort = "recommended",
  loading = true,
  routeVersion = 0;
if (!Array.isArray(favorites)) favorites = [];
const app = $("#app");
function toast(text, error = false) {
  const t = $("#toast");
  t.textContent = text;
  t.className = "show" + (error ? " error" : "");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ""), 4500);
}
function handleError(e) {
  console.error(e?.code || e?.name || "Request failed");
  toast(e?.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง", true);
}
const route = () => currentRoute();
function go(path) {
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
function pageContext() {
  return {
    products,
    session,
    profile,
    admin,
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
    store,
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
    ...(categoriesResult.data || []).map((c) => ({ ...c, icon: "Package" })),
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
  return `<a href="/index.html" class="brand" aria-label="${esc(store.shop_name)} หน้าหลัก">${store.logo_url ? `<img class="shop-logo" src="${safeImage(store.logo_url)}" alt="">` : `<span class="brand-mark">${i("ShoppingBag")}</span>`}<span>${esc(store.shop_name)}</span></a>`;
}
function header() {
  const r = route();
  const managing = r.startsWith("/admin");
  const account = session
    ? `<a class="user-chip" href="/account.html" aria-label="บัญชี ${esc(profile?.username || session.user.email)}">${i("UserRound")}<span>@${esc(profile?.username || session.user.email)}</span></a><button type="button" class="logout-btn" data-action="logout">${i("LogOut")}<span>ออกจากระบบ</span></button>`
    : `<a class="btn secondary login-link" href="/login.html">${i("UserRound")} เข้าสู่ระบบ</a>`;
  return `<a class="skip-link" href="#main-content">ข้ามไปเนื้อหาหลัก</a><header class="${managing ? "admin-header" : ""}"><div class="header-inner">${brand()}${managing ? '<span class="workspace-tag">ระบบจัดการร้านค้า</span>' : `<nav id="main-nav" aria-label="เมนูหลัก"><a class="${r === "/" ? "active" : ""}" href="/index.html">หน้าหลัก</a><a class="${r === "/shop" ? "active" : ""}" href="/shop.html">สินค้า</a><a class="${r === "/collections" ? "active" : ""}" href="/categories.html">หมวดหมู่</a><a class="${r === "/orders" ? "active" : ""}" href="/orders.html">คำสั่งซื้อ</a></nav>`}<div class="header-actions">${!managing ? `<a class="cart-link" href="/cart.html" aria-label="ตะกร้าสินค้า">${i("ShoppingBag")}<b data-cart-count>${count()}</b></a>` : ""}<div class="session-controls">${account}</div>${!managing ? `<button class="icon-btn mobile-menu" data-action="menu" aria-label="เปิดเมนู" aria-controls="main-nav" aria-expanded="false">${i("Menu")}</button>` : ""}</div></div></header>${!db ? '<div class="demo-banner">ยังไม่ได้เชื่อมต่อฐานข้อมูล — ไม่สามารถเข้าสู่ระบบหรือสั่งซื้อได้</div>' : ""}`;
}
function footer() {
  if (route().startsWith("/admin"))
    return `<footer class="workspace-footer"><span>${esc(store.shop_name)} · สำหรับเจ้าของร้าน</span><a href="/index.html">กลับหน้าร้าน ${i("ArrowUpRight")}</a></footer>`;
  return `<footer><div class="footer-main"><div>${brand()}<p>${esc(store.tagline)}</p></div><div><h4>ร้านค้า</h4><a href="/shop.html">สินค้าทั้งหมด</a><a href="/categories.html">หมวดหมู่สินค้า</a><a href="/about.html">เกี่ยวกับร้าน</a></div><div><h4>ช่วยเหลือ</h4><a href="/orders.html">คำสั่งซื้อของฉัน</a><a href="/help.html">จัดส่งและชำระเงิน</a><a href="/privacy.html">ความเป็นส่วนตัว</a>${store.contact_email ? `<span class="footer-contact">${esc(store.contact_email)}</span>` : ""}${store.contact_phone ? `<span class="footer-contact">${esc(store.contact_phone)}</span>` : ""}</div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(store.shop_name)}</span><a href="/admin/products.html">จัดการร้านค้า ${i("ArrowUpRight")}</a></div></footer>`;
}
const empty = (title, text, link = "/shop", label = "เลือกชมสินค้า") =>
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
  return createStorePages(pageContext()).home(...args);
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
  return createCheckoutPages(pageContext()).cartRows(...args);
}
function totals(...args) {
  return createCheckoutPages(pageContext()).totals(...args);
}
function summary(...args) {
  return createCheckoutPages(pageContext()).summary(...args);
}
function cartPage(...args) {
  return createCheckoutPages(pageContext()).cartPage(...args);
}
function field(label, name, type = "text", extra = "", value = "") {
  return `<label class="field"><span>${label}</span><input type="${type}" name="${name}" ${extra} value="${esc(value)}" required></label>`;
}
function authPage(...args) {
  return createAccountPages(pageContext()).authPage(...args);
}
function checkoutPage(...args) {
  return createCheckoutPages(pageContext()).checkoutPage(...args);
}
const statusLabel = {
  pending: "รอชำระเงิน",
  review: "รอตรวจสอบสลิป",
  paid: "ชำระเงินแล้ว",
  shipped: "จัดส่งแล้ว",
  cancelled: "ยกเลิกแล้ว",
};
const date = (s) =>
  new Date(s).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
async function ordersPage(...args) {
  return createCheckoutPages(pageContext()).ordersPage(...args);
}
async function orderPage(...args) {
  return createCheckoutPages(pageContext()).orderPage(...args);
}
function accountPage(...args) {
  return createAccountPages(pageContext()).accountPage(...args);
}
async function adminPage(...args) {
  return createAdminPages(pageContext()).adminPage(...args);
}
function infoPage(...args) {
  return createAccountPages(pageContext()).infoPage(...args);
}
function recoveryPage(...args) {
  return createAccountPages(pageContext()).recoveryPage(...args);
}
async function render() {
  const version = ++routeVersion;
  const r = route();
  let content = "";
  app.innerHTML =
    header() +
    `<main class="wrap loading">กำลังจัดเตรียมสิ่งดีๆ ให้คุณ…</main>` +
    footer();
  try {
    if (r === "/") content = home();
    else if (r === "/shop") content = shop();
    else if (r === "/collections") content = collections();
    else if (r.startsWith("/product/")) content = productPage(r.split("/")[2]);
    else if (r === "/cart") content = cartPage();
    else if (r === "/checkout") content = checkoutPage();
    else if (r === "/login") content = authPage();
    else if (r === "/register") content = authPage(true);
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
    app.innerHTML = header() + content + footer();
    preparePage();
    if (!$("main").id) $("main").id = "main-content";
    document.title = `${$("main h1")?.textContent || "ร้านค้าออนไลน์"} | ${store.shop_name}`;
  } catch (e) {
    if (version !== routeVersion) return;
    app.innerHTML =
      header() +
      empty("ไม่สามารถโหลดข้อมูลได้", esc(e.message || "กรุณาลองอีกครั้ง")) +
      footer();
    preparePage();
  }
}
async function refreshProducts() {
  if (db) {
    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });
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
async function refreshIdentity() {
  if (!db || !session) {
    profile = null;
    admin = false;
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
}
function modal(content) {
  document.querySelector("dialog")?.remove();
  const dialog = document.createElement("dialog");
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
    toast("กรุณาเพิ่มหมวดหมู่สินค้าก่อน", true);
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
      )}</select></label>${field("ราคา (บาท)", "price", "number", 'min="0.01" max="1000000" step="0.01"', p.price || "")}${field("จำนวนในสต็อก", "stock", "number", 'min="0" max="100000" step="1"', p.stock ?? "")}</div><label class="field"><span>รายละเอียดสินค้า</span><textarea name="description" maxlength="2000" rows="3">${esc(p.description || "")}</textarea></label><label class="field"><span>รูปสินค้า (JPG, PNG, WebP ไม่เกิน 5 MB) ${id ? "— ไม่เลือกเพื่อใช้รูปเดิม" : ""}</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp" ${id ? "" : "required"}></label><label class="checkbox"><input type="checkbox" name="active" ${p.active !== false ? "checked" : ""}> เปิดขายสินค้า (นำเครื่องหมายออกเพื่อซ่อน)</label><p class="form-error" role="alert"></p><button type="submit" class="btn primary full">${i("Check")} บันทึกสินค้า</button></form>`,
  );
}
document.addEventListener("click", async (e) => {
  if (e.target.closest(".skip-link")) {
    e.preventDefault();
    const main = $("main");
    main?.setAttribute("tabindex", "-1");
    main?.focus();
    return;
  }
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action,
    id = button.dataset.id;
  try {
    if (action === "add") addCart(id);
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
      if (action === "remove") cart = cart.filter((x) => x.id !== id);
      else if (row) {
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
          session = null;
          profile = null;
          admin = false;
          routeVersion++;
          location.replace("/login.html?loggedOut=local");
          return;
        }
        session = null;
        profile = null;
        admin = false;
        routeVersion++;
        location.replace("/login.html?loggedOut=1");
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
        !confirm(
          "ลบหมวดหมู่ " +
            button.dataset.name +
            "? ลบได้เฉพาะหมวดหมู่ที่ไม่มีสินค้า",
        )
      )
        return;
      button.disabled = true;
      const { error } = await db
        .from("categories")
        .delete()
        .eq("name", button.dataset.name);
      if (error)
        throw Error(
          error.code === "23503"
            ? "หมวดหมู่นี้ยังมีสินค้า กรุณาย้ายสินค้าไปหมวดอื่นก่อน"
            : error.message,
        );
      await refreshStore();
      render();
      toast("ลบหมวดหมู่แล้ว");
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
        !confirm(
          action === "approve-order"
            ? "คุณตรวจสอบยอดเข้าบัญชีจริงตรงกับรายการนี้แล้วใช่ไหม?"
            : "ยืนยันยกเลิกคำสั่งซื้อ? หากชำระแล้วห้ามยกเลิก โปรดให้ร้านตรวจสอบก่อน",
        )
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
document.addEventListener("change", (e) => {
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
    if (form.id === "register-form") {
      checkPassword(data);
      const { error } = await db.auth.signUp({
        email: data.email.trim(),
        password: data.password,
        options: {
          emailRedirectTo: location.origin + "/account.html",
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
          body: { identifier: data.identifier.trim(), password: data.password },
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
      await refreshProducts();
      go(admin ? "/admin/products" : "/account");
      toast("ยินดีต้อนรับกลับมาครับ");
    } else if (form.id === "checkout-form") {
      if (!session) throw Error("กรุณาเข้าสู่ระบบ");
      if (!form.dataset.request) form.dataset.request = crypto.randomUUID();
      const { data: order, error } = await db.rpc("create_order", {
        cart,
        delivery: {
          recipient: data.recipient.trim(),
          phone: data.phone,
          address: data.address.trim(),
        },
        request_key: form.dataset.request,
      });
      if (error) throw error;
      cart = [];
      saveCart();
      await refreshProducts();
      go("/order/" + order.id);
      toast("สร้างคำสั่งซื้อแล้ว กรุณาชำระเงินและแนบสลิป");
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
          ? db.from("categories").insert({ name })
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
      let image = products.find((p) => p.id === form.dataset.id)?.image_url;
      if (data.image.size) {
        checkFile(data.image);
        const path = `${crypto.randomUUID()}.${data.image.type.split("/")[1]}`;
        const { error } = await db.storage
          .from("product-images")
          .upload(path, data.image, {
            contentType: data.image.type,
            upsert: false,
          });
        if (error) throw error;
        image = db.storage.from("product-images").getPublicUrl(path)
          .data.publicUrl;
      }
      if (!image) throw Error("กรุณาเลือกรูปสินค้า");
      const record = {
        name: data.name.trim(),
        sku: data.sku.trim(),
        category: data.category,
        description: data.description.trim(),
        price: Number(data.price),
        stock: Number(data.stock),
        active: data.active === "on",
        image_url: image,
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
      render();
      toast("บันทึกสินค้าแล้ว");
    } else if (form.id === "ship-form") {
      const { error } = await db.rpc("transition_order", {
        order_id: form.dataset.id,
        next_status: "shipped",
        tracking_number: data.tracking.trim(),
      });
      if (error) throw error;
      render();
      toast("บันทึกการจัดส่งแล้ว");
    } else if (form.id === "forgot-form") {
      const { error } = await db.auth.resetPasswordForEmail(data.email.trim(), {
        redirectTo: location.origin + "/reset-password.html",
      });
      if (error) throw error;
      form.closest("dialog").close();
      toast("หากมีบัญชีนี้ ระบบจะส่งลิงก์ทางอีเมลให้คุณ");
    } else if (form.id === "password-form") {
      checkPassword(data);
      const { error } = await db.auth.updateUser({ password: data.password });
      if (error) throw error;
      go("/account");
      toast("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    }
  } catch (err) {
    if (errorBox)
      errorBox.textContent = err.message || "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
    else handleError(err);
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
          profile = null;
          admin = false;
          if (!signingOut && route() !== "/login")
            setTimeout(() => location.replace("/login.html?loggedOut=1"), 0);
        }
        if (event === "TOKEN_REFRESHED")
          setTimeout(() => refreshIdentity().catch(handleError), 0);
      });
      const { data } = await db.auth.getSession();
      session = data.session;
      await refreshIdentity();
    }
    await refreshStore();
    await refreshProducts();
    loading = false;
    if (recovering) go("/reset-password");
    else {
      render();
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
      ) +
      footer();
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
