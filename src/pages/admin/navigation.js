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
  return `<aside class="workspace-sidebar"><span class="sidebar-label">จัดการร้านค้า</span><nav aria-label="เมนูหลังบ้าน">${adminTabs.map(([id, icon, label]) => `<a href="/admin/${id}.html" class="${current === id ? "selected" : ""}" ${current === id ? 'aria-current="page"' : ""}>${i(icon)} ${label}</a>`).join("")}</nav></aside>`;
}
