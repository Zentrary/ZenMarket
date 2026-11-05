import test from "node:test";
import assert from "node:assert/strict";
import { productImages, safeSocialURL, orderSteps } from "../src/experience.js";
import { safeReturnPath, needsMembership } from "../src/routes.js";
import { readFileSync } from "node:fs";
test("guest routes are gated and post-login destinations cannot redirect externally", () => {
  for (const route of [
    "/shop",
    "/collections",
    "/product/id",
    "/cart",
    "/checkout",
    "/orders",
    "/contact",
    "/admin/dashboard",
  ])
    assert.equal(needsMembership(route), true);
  for (const route of [
    "/",
    "/login",
    "/register",
    "/privacy",
    "/reset-password",
  ])
    assert.equal(needsMembership(route), false);
  assert.equal(safeReturnPath("/product.html?id=abc"), "/product.html?id=abc");
  for (const route of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
    "/not-real.html",
    "/login.html",
    "/register.html",
  ])
    assert.equal(safeReturnPath(route), "");
});
test("social URL allowlist blocks credentials, schemes, suffix hosts and mismatched platforms", () => {
  assert.equal(
    safeSocialURL("https://www.facebook.com/shop", "facebook_url"),
    "https://www.facebook.com/shop",
  );
  assert.equal(
    safeSocialURL("https://line.me/ti/p/@shop", "line_url"),
    "https://line.me/ti/p/@shop",
  );
  for (const value of [
    "javascript:alert(1)",
    "http://facebook.com/shop",
    "https://facebook.com.evil.test/shop",
    "https://evil.test@facebook.com/shop",
    "https://facebook.com:444/shop",
    "https://facebook.com/white space",
  ])
    assert.equal(safeSocialURL(value, "facebook_url"), "");
  assert.equal(safeSocialURL("https://instagram.com/shop", "line_url"), "");
});
test("gallery supports legacy covers, deduplication and eight-image cap", () => {
  assert.deepEqual(
    productImages({
      image_url: "cover",
      image_urls: ["cover", "back", "detail"],
    }),
    ["cover", "back", "detail"],
  );
  assert.deepEqual(productImages({ image_url: "old" }), ["old"]);
  assert.deepEqual(productImages(), []);
  assert.equal(
    productImages({
      image_url: "cover",
      image_urls: Array.from({ length: 12 }, (_, n) => "image" + n),
    }).length,
    8,
  );
});
test("shipping never implies receipt and six progress steps remain distinct", () => {
  const shipped = orderSteps({ status: "shipped" });
  assert.equal(shipped.length, 6);
  assert.equal(shipped[3].complete, true);
  assert.equal(shipped[4].current, true);
  assert.equal(shipped[5].complete, false);
  const delivered = orderSteps({ status: "delivered" });
  assert.equal(delivered[5].current, true);
  assert.equal(orderSteps({ status: "pending" })[0].current, true);
});
test("no native confirmation, toast or footer remains in shared rendering", () => {
  const app = readFileSync("src/app.js", "utf8");
  assert.ok(!/\bconfirm\(/.test(app));
  assert.ok(!app.includes("<footer"));
  assert.ok(!app.includes("#toast"));
  const ui = readFileSync("src/ui.js", "utf8");
  assert.ok(ui.includes("alertdialog"));
  assert.ok(ui.includes("showModal"));
});
