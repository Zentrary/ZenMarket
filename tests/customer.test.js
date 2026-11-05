import test from "node:test";
import assert from "node:assert/strict";
import {
  storeIconURL,
  stockState,
  checkoutRecipient,
} from "../src/customer.js";
test("favicon accepts only credential-free HTTPS and falls back safely", () => {
  assert.equal(
    storeIconURL("https://shop.example/logo.png"),
    "https://shop.example/logo.png",
  );
  for (const value of [
    "",
    null,
    "javascript:alert(1)",
    "data:image/svg+xml,bad",
    "http://example.com/a",
    "https://user:secret@example.com/a",
  ])
    assert.equal(storeIconURL(value), "/favicon.svg");
});
test("stock badge switches between sold out, low and ready after restocking", () => {
  assert.equal(stockState(0).soldOut, true);
  assert.equal(stockState(-1).soldOut, true);
  assert.equal(stockState(1).low, true);
  assert.equal(stockState(3).low, true);
  assert.deepEqual(stockState(4), {
    soldOut: false,
    low: false,
    label: "พร้อมส่ง 4 ชิ้น",
  });
});
test("checkout copies saved addresses and manual entry resets the address, without mutating saved data", () => {
  const saved = {
    recipient: "Saved name",
    phone: "0812345678",
    address: "Saved address",
  };
  const copy = checkoutRecipient(saved, null);
  copy.address = "Order-only change";
  assert.equal(saved.address, "Saved address");
  assert.deepEqual(
    checkoutRecipient(null, {
      first_name: "First",
      last_name: "Last",
      phone: "0891234567",
    }),
    { recipient: "First Last", phone: "0891234567", address: "" },
  );
  assert.deepEqual(checkoutRecipient(null, null), {
    recipient: "",
    phone: "",
    address: "",
  });
});
