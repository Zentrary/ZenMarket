import test from "node:test";
import assert from "node:assert/strict";
import {
  pageURL,
  currentRoute,
  migrateLegacyLink,
  pagePaths,
} from "../src/routes.js";
import {
  shippingFor,
  normalizeSettings,
  defaultSettings,
} from "../src/settings.js";
import { existsSync, readFileSync } from "node:fs";
test("real page URLs and legacy bookmarks map safely", () => {
  assert.equal(pageURL("/admin/settings"), "/admin/settings.html");
  assert.equal(pageURL("/order/abc"), "/order.html?id=abc");
  assert.equal(pageURL("/shop?category=Books"), "/shop.html?category=Books");
  assert.equal(migrateLegacyLink({ hash: "#/account" }), "/account.html");
  assert.equal(migrateLegacyLink({ hash: "#access_token=token" }), null);
  assert.equal(
    currentRoute({ pathname: "/admin/categories.html", search: "" }),
    "/admin/categories",
  );
  assert.equal(
    currentRoute({ pathname: "/order.html", search: "?id=abc" }),
    "/order/abc",
  );
  for (const path of new Set(Object.values(pagePaths)))
    assert.ok(existsSync("." + path), "entry missing " + path);
});
test("custom shipping amounts match subtotal rules and private keys never enter config", () => {
  const settings = normalizeSettings({
    ...defaultSettings,
    shipping_fee: 75,
    free_shipping_threshold: 500,
    promptpay_id: "secret",
  });
  assert.equal(shippingFor(499, settings), 75);
  assert.equal(shippingFor(500, settings), 0);
  assert.equal(shippingFor(1, { ...settings, shipping_fee: 0 }), 0);
  assert.equal("promptpay_id" in settings, false);
});
test("announcement removed and a separate settings/categories/payment page exists", () => {
  assert.ok(
    !readFileSync("src/app.js", "utf8").includes(
      "จัดส่ง 50 บาท · ฟรีเมื่อซื้อครบ 1,000 บาท",
    ),
  );
  for (const name of ["store", "checkout", "account", "admin"])
    assert.ok(existsSync("src/pages/" + name + ".js"));
  assert.ok(!readFileSync("vercel.json", "utf8").includes("rewrites"));
});
