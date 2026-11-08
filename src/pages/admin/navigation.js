// One shared navigation for every owner workspace page.
export const adminTabs = [
  ["dashboard", "LayoutGrid", "แดชบอร์ด", "ภาพรวมยอดขาย สินค้า และเสียงจากลูกค้า"],
  ["orders", "ClipboardList", "คำสั่งซื้อ", "ตรวจสอบการชำระเงินและจัดส่ง"],
  ["products", "Package", "สินค้า", "จัดการสินค้าและสต็อก"],
  ["categories", "ShoppingBag", "หมวดหมู่", "เพิ่มและจัดการหมวดหมู่สินค้า"],
  ["reviews", "Heart", "รีวิวลูกค้า", "อ่านคะแนนและข้อเสนอแนะจากผู้ซื้อจริง"],
  ["settings", "Settings", "ตั้งค่าร้าน", "ชื่อร้าน โลโก้ ข้อมูลติดต่อ และการจัดส่ง"],
  ["payments", "CreditCard", "บัญชีรับเงิน", "ตั้งค่าการชำระเงิน PromptPay"],
  ["operations", "ShieldCheck", "แจ้งเตือนและดูแลระบบ", "ออเดอร์ สลิป ปัญหา และสำรองข้อมูล"],
];

export function adminSidebar(i, current) {
  const links = adminTabs
    .map(
      ([id, icon, label]) =>
        `<a href="/admin/${id}.html" class="${current === id ? "selected" : ""}" ${current === id ? 'aria-current="page"' : ""}>${i(icon)}<span>${label}</span></a>`,
    )
    .join("");
  const selected = adminTabs.find(([id]) => id === current) || adminTabs[0];
  return `<details class="workspace-mobile-nav"><summary aria-label="เมนูหลังบ้าน"><span class="mobile-nav-current">${i(selected[1])}<strong>${selected[2]}</strong></span><span class="mobile-nav-toggle">${i("Menu")}</span></summary><nav aria-label="เมนูหลังบ้าน">${links}</nav></details><aside class="workspace-sidebar"><span class="sidebar-label">จัดการร้านค้า</span><nav aria-label="เมนูหลังบ้าน">${links}</nav></aside>`;
}
