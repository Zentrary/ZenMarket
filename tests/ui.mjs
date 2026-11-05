import { chromium as playwright } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { seedProducts } from "./fixtures/products.js";
import { defaultSettings } from "../src/settings.js";
import { pageURL } from "../src/routes.js";
let shopConfig = { ...defaultSettings };
let categoryRows = ["ไลฟ์สไตล์", "ของแต่งบ้าน", "แก็ดเจ็ต", "แฟชั่น"].map(
  (name) => ({ name }),
);
let logoutError = false;
const browser = await playwright.launch({
  headless: true,
  executablePath: await chromium.executablePath(),
  args: chromium.args,
});
const errors = [];
const user = {
  id: "c5a5d418-c050-41c8-9079-87f2435cea2d",
  email: "user@zenmarket.example",
  user_metadata: {},
  app_metadata: { provider: "email" },
  aud: "authenticated",
  role: "authenticated",
};
const adminUser = {
  ...user,
  id: "d38d4d1f-ca7c-4d87-a1cf-8abecdae8891",
  email: "admin@zenmarket.example",
};
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
let isAdmin = false,
  products = seedProducts.map((p) => ({
    ...p,
    active: true,
    created_at: "2026-11-05T00:00:00Z",
  })),
  orders = [],
  configured = false;
await page.context().route("https://*.supabase.co/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    path = url.pathname;
  if (path.startsWith("/storage/v1/object/public/"))
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: png.buffer,
    });
  let body;
  try {
    body = req.postDataJSON();
  } catch {}
  let result = null;
  let status = 200;
  if (path.includes("/functions/v1/username-login")) {
    isAdmin = body.identifier === "zenadmin";
    const u = isAdmin ? adminUser : user;
    const jwt =
      "e30." +
      Buffer.from(
        JSON.stringify({
          sub: u.id,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      ".mock";
    result = {
      session: {
        access_token: jwt,
        refresh_token: "mock-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: u,
      },
    };
  } else if (path === "/auth/v1/user") result = isAdmin ? adminUser : user;
  else if (path.includes("/auth/v1/logout")) {
    if (logoutError) {
      status = 500;
      result = { message: "Logout unavailable" };
    } else result = {};
  } else if (path === "/rest/v1/rpc/get_storefront") result = shopConfig;
  else if (path === "/rest/v1/categories") {
    const oldName = url.searchParams.get("name")?.slice(3);
    if (req.method() === "POST") {
      if (categoryRows.some((c) => c.name === body.name)) {
        status = 409;
        result = { code: "23505", message: "Duplicate category" };
      } else {
        categoryRows.push(body);
        result = null;
      }
    } else if (req.method() === "PATCH") {
      categoryRows.find((c) => c.name === oldName).name = body.name;
      products.forEach((p) => {
        if (p.category === oldName) p.category = body.name;
      });
    } else if (req.method() === "DELETE") {
      if (products.some((p) => p.category === oldName)) {
        status = 409;
        result = { code: "23503" };
      } else categoryRows = categoryRows.filter((c) => c.name !== oldName);
    } else result = categoryRows;
  } else if (path === "/rest/v1/products") {
    if (req.method() === "POST") {
      products.push({
        ...body,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
      result = null;
    } else if (req.method() === "PATCH") {
      const id = url.searchParams.get("id").slice(3);
      Object.assign(
        products.find((p) => p.id === id),
        body,
      );
      result = null;
    } else result = products;
  } else if (path === "/rest/v1/rpc/is_admin") result = isAdmin;
  else if (path === "/rest/v1/profiles")
    result = {
      id: (isAdmin ? adminUser : user).id,
      first_name: "ทดสอบ",
      last_name: "ระบบ",
      nickname: "Tester",
      username: isAdmin ? "zenadmin" : "zenuser",
      phone: "0812345678",
      age: 25,
    };
  else if (path === "/rest/v1/store_settings") {
    if (req.method() === "POST") {
      products.push({
        ...body,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
      result = null;
    } else if (req.method() === "PATCH") {
      if (body.promptpay_id) configured = true;
      else Object.assign(shopConfig, body);
      result = null;
    } else
      result = {
        singleton: true,
        promptpay_id: configured ? "0812345678" : null,
        recipient_name: configured ? "บัญชีทดสอบ" : "",
      };
  } else if (path === "/rest/v1/rpc/create_order") {
    if (!configured) {
      status = 400;
      result = { message: "ร้านค้ายังไม่ได้ตั้งค่าบัญชีรับเงิน" };
    } else {
      const items = body.cart.map((x) => ({
        ...products.find((p) => p.id === x.id),
        quantity: x.quantity,
      }));
      const subtotal = items.reduce((a, p) => a + p.price * p.quantity, 0);
      const shipping =
        subtotal >= shopConfig.free_shipping_threshold
          ? 0
          : shopConfig.shipping_fee;
      const o = {
        id: "b1000000-0000-4000-8000-000000000001",
        user_id: user.id,
        items,
        subtotal,
        shipping,
        total: subtotal + shipping,
        ...body.delivery,
        promptpay_id: "0812345678",
        recipient_name: "บัญชีทดสอบ",
        status: "pending",
        created_at: new Date().toISOString(),
      };
      orders.push(o);
      result = o;
    }
  } else if (path === "/rest/v1/orders") {
    result = url.searchParams.has("id")
      ? orders.find((o) => o.id === url.searchParams.get("id").slice(3))
      : orders;
  } else if (path === "/rest/v1/rpc/transition_order") {
    orders.find((o) => o.id === body.order_id).status = body.next_status;
    result = null;
  } else if (path === "/rest/v1/rpc/attach_slip") {
    orders[0].status = "review";
    result = null;
  } else if (path.startsWith("/storage/"))
    result = { Key: "mock", signedURL: "/mock-slip.png" };
  else {
    console.log("Unhandled mock:", path);
    result = {};
  }
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(result),
    headers: { "access-control-allow-origin": "*" },
  });
});
const visit = async (path) => {
  await page.goto("http://localhost:5173" + pageURL(path));
  await page.locator("main").waitFor();
  await page.locator(".loading").waitFor({ state: "detached" });
};
const login = async (name) => {
  await visit("/login");
  await page.locator("[name=identifier]").fill(name);
  await page.locator("[name=password]").fill("MockPassword123!");
  await page.locator("#login-form button[type=submit]").click();
  await page.waitForURL(
    name === "zenadmin" ? "**/admin/products.html" : "**/account.html",
  );
  await page
    .locator(name === "zenadmin" ? ".workspace-sidebar" : ".account-layout")
    .waitFor();
};
const png = {
  name: "test.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aql0AAAAASUVORK5CYII=",
    "base64",
  ),
};
try {
  await visit("/");
  assert.equal(await page.locator(".announcement").count(), 0);
  assert.equal(await page.locator(".home-shortcuts").count(), 1);
  assert.equal(await page.locator(".product-card").count(), 0);
  assert.equal(await page.locator('a[href^="#/"]').count(), 0);
  await page.screenshot({
    path: "/home/user/zenmarket-dark-home.png",
    fullPage: true,
  });
  await visit("/shop");
  assert.equal(await page.locator(".product-card").count(), 8);
  await page.locator('.pill[data-category="แก็ดเจ็ต"]').click();
  assert.equal(await page.locator(".product-card").count(), 2);
  await page.locator('[data-category="ทั้งหมด"]').click();
  await page.locator(".wish").first().click();
  assert.equal(await page.locator(".wish.liked").count(), 1);
  await page.locator(".add-btn").first().click();
  await visit("/cart");
  assert.equal(await page.locator(".cart-row").count(), 1);
  await page.locator('[data-delta="1"]').click();
  assert.equal(await page.locator(".stepper>span").textContent(), "2");
  await page.reload();
  await page.locator(".cart-row").waitFor();
  assert.equal(await page.locator(".stepper>span").textContent(), "2");
  await visit("/checkout");
  assert.match(await page.locator("main").textContent(), /เข้าสู่ระบบก่อน/);
  await login("zenuser");
  assert.match(await page.locator(".user-chip").textContent(), /zenuser/);
  assert.equal(await page.locator(".account-layout").count(), 1);
  await visit("/admin/settings");
  assert.equal(await page.locator("#store-form").count(), 0);
  await visit("/checkout");
  await page
    .locator("[name=address]")
    .fill("99 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพมหานคร 10110");
  await page.locator("#checkout-form button").click();
  await page
    .locator(".form-error")
    .filter({ hasText: "ยังไม่ได้ตั้งค่า" })
    .waitFor();
  configured = true;
  await page.locator("#checkout-form button").click();
  await page.waitForURL("**/order.html?id=*");
  await page.locator("img.qr").waitFor();
  assert.equal(await page.locator("a[download]").count(), 1);
  await page.locator("[name=slip]").setInputFiles(png);
  await page.locator("#slip-form button").click();
  await page.locator(".status.review").waitFor();
  // Local removal must not leave stale identity if remote revocation fails.
  logoutError = true;
  await page.locator("header [data-action=logout]").click();
  await page.waitForURL("**/login.html?loggedOut=local");
  await page.locator("#toast.error").waitFor();
  assert.match(
    await page.locator("#toast").textContent(),
    /เซิร์ฟเวอร์ไม่สำเร็จ/,
  );
  assert.equal(await page.locator(".user-chip").count(), 0);
  await visit("/account");
  assert.match(await page.locator("main").textContent(), /กรุณาเข้าสู่ระบบ/);
  logoutError = false;
  await login("zenuser");
  const otherTab = await page.context().newPage();
  otherTab.on("pageerror", (e) => errors.push("otherTab: " + e.message));
  await otherTab.goto("http://localhost:5173/account.html");
  await otherTab.locator(".account-layout").waitFor();
  await page.locator("header [data-action=logout]").click();
  await page.waitForURL("**/login.html?loggedOut=1");
  await otherTab.waitForURL("**/login.html?loggedOut=1");
  await otherTab.close();
  await page.locator("main").waitFor();
  assert.equal(await page.locator(".user-chip").count(), 0);
  await visit("/account");
  assert.match(await page.locator("main").textContent(), /กรุณาเข้าสู่ระบบ/);
  await login("zenadmin");
  assert.equal(await page.locator(".workspace-sidebar").count(), 1);
  assert.match(await page.locator(".user-chip").textContent(), /zenadmin/);
  await visit("/admin/categories");
  await page
    .locator("#category-form [name=name]")
    .fill("หมวดว่างสำหรับทดสอบลบ");
  await page.locator("#category-form button").click();
  await page
    .locator('[data-action=delete-category][data-name="หมวดว่างสำหรับทดสอบลบ"]')
    .click();
  await page
    .locator('[data-action=delete-category][data-name="หมวดว่างสำหรับทดสอบลบ"]')
    .waitFor({ state: "detached" });
  assert.ok(!categoryRows.some((c) => c.name === "หมวดว่างสำหรับทดสอบลบ"));
  await page.locator("#category-form [name=name]").fill("หนังสือและดิจิทัล");
  await page.locator("#category-form button").click();
  await page
    .locator(".category-row")
    .filter({ hasText: "หนังสือและดิจิทัล" })
    .waitFor();
  await page
    .locator('[data-action=rename-category][data-name="หนังสือและดิจิทัล"]')
    .click();
  await page.locator("dialog [name=name]").fill("สินค้าเกม");
  await page.locator("dialog button[type=submit]").click();
  await page.locator('[data-name="สินค้าเกม"]').first().waitFor();
  await visit("/admin/products");
  await page.locator("[data-action=edit-product][data-id]").first().click();
  await page.locator("dialog [name=category]").selectOption("สินค้าเกม");
  await page.locator("dialog button[type=submit]").click();
  await page.locator("dialog").waitFor({ state: "detached" });
  assert.equal(products[0].category, "สินค้าเกม");
  await visit("/admin/categories");
  await page
    .locator('[data-action=delete-category][data-name="สินค้าเกม"]')
    .click();
  await page.locator("#toast.error").waitFor();
  assert.equal(
    await page
      .locator('[data-action=delete-category][data-name="สินค้าเกม"]')
      .count(),
    1,
  );
  await visit("/collections");
  await page.locator('[data-category="สินค้าเกม"]').click();
  await page.waitForURL("**/shop.html?category=*");
  await page.locator(".product-card").waitFor();
  assert.equal(await page.locator(".product-card").count(), 1);
  await visit("/admin/settings");
  assert.equal(await page.locator("[name=promptpay_id]").count(), 0);
  await page.locator("[name=shop_name]").fill("ร้านทดสอบกลางคืน");
  await page.locator("[name=tagline]").fill("ร้านของฉัน");
  await page.locator("[name=contact_email]").fill("hello@example.com");
  await page.locator("[name=shipping_fee]").fill("75");
  await page.locator("[name=free_shipping_threshold]").fill("500");
  await page.locator("[name=logo]").setInputFiles(png);
  await page.locator("#store-form button[type=submit]").click();
  await page
    .locator(".brand")
    .filter({ hasText: "ร้านทดสอบกลางคืน" })
    .waitFor();
  assert.equal(await page.locator("header .shop-logo").count(), 1);
  await page.locator("header .shop-logo").evaluate((img) => img.decode());
  await page.screenshot({
    path: "/home/user/zenmarket-dark-settings.png",
    fullPage: true,
  });
  await visit("/");
  assert.match(await page.locator("h1").textContent(), /ร้านทดสอบกลางคืน/);
  await visit("/help");
  assert.match(await page.locator("main").textContent(), /75/);
  await visit("/admin/payments");
  await page.locator("[name=recipient_name]").fill("ชื่อทดสอบ");
  await page.locator("[name=promptpay_id]").fill("0812345678");
  await page.locator("#settings-form button").click();
  await page.locator("#toast.show").waitFor();
  await visit("/admin/orders");
  await page.locator("tbody a").click();
  await page.waitForURL("**/order.html?id=*");
  await page.locator("[data-action=approve-order]").click();
  await page.locator(".status.paid").waitFor();
  await visit("/account");
  await page.screenshot({
    path: "/home/user/zenmarket-dark-account.png",
    fullPage: true,
  });
  assert.equal(
    await page.locator(".account-actions [data-action=logout]").count(),
    0,
  );
  assert.equal(
    await page.locator(".account-sidebar [data-action=logout]").count(),
    1,
  );
  // Independent documents load directly and after refresh at representative portrait/landscape sizes.
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [375, 667],
    [390, 844],
    [430, 932],
    [600, 960],
    [768, 1024],
    [820, 1180],
    [844, 390],
    [1024, 768],
    [1280, 800],
    [1440, 1000],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    for (const path of [
      "/",
      "/shop",
      "/collections",
      "/cart",
      "/checkout",
      "/account",
      "/login",
      "/register",
      "/orders",
      "/favorites",
      "/help",
      "/about",
      "/privacy",
      "/reset-password",
      "/product/" + products[0].id,
      "/order/" + orders[0].id,
      "/admin/products",
      "/admin/categories",
      "/admin/settings",
      "/admin/payments",
      "/admin/orders",
    ]) {
      await visit(path);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${width} overflow ${path}`,
      );
    }
    await visit("/admin/products");
    await page.locator("[data-action=edit-product]").first().click();
    assert.equal(
      await page
        .locator("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
      "dialog overflow " + width,
    );
    await page.locator("[data-action=close-modal]").click();
  }
  // Empty catalogue has no fallback demo products. Keep owner data entirely mocked.
  const previous = products;
  products = [];
  await visit("/shop");
  assert.equal(await page.locator(".product-card").count(), 0);
  assert.match(await page.locator("main").textContent(), /ยังไม่มีสินค้า/);
  products = previous;
  await visit("/admin/settings");
  await page.locator("[name=remove_logo]").check();
  await page.locator("#store-form button[type=submit]").click();
  await page.locator("header .shop-logo").waitFor({ state: "detached" });
  await visit("/");
  assert.equal(await page.locator("header .shop-logo").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await visit("/account");
  await page.screenshot({
    path: "/home/user/zenmarket-dark-mobile.png",
    fullPage: true,
  });
  await page.goto("http://localhost:5173/#/account");
  await page.waitForURL("**/account.html");
  await page.locator(".account-layout").waitFor();
  assert.equal(await page.locator("i[data-lucide]").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: multi-page documents, legacy links, dark layout, username header, failed/successful logout, settings/logo persistence, custom category CRUD/FK guard, shipping display, cart/order/slip and responsive layouts. Supabase mocked; Chromium only.",
  );
} catch (e) {
  console.log("UI failure:", await page.locator("body").innerText(), errors);
  throw e;
} finally {
  await browser.close();
}
