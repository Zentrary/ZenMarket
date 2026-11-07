// Persist only icons that are included in the app's Lucide icon registry.
export const categoryIconOptions = [
  ["LayoutGrid", "ตาราง"],
  ["Package", "กล่องพัสดุ"],
  ["ShoppingBag", "ถุงช้อปปิ้ง"],
  ["Leaf", "ใบไม้"],
  ["Shirt", "เสื้อผ้า"],
  ["Coffee", "แก้วกาแฟ"],
  ["LampDesk", "ของแต่งบ้าน"],
  ["Heart", "หัวใจ"],
  ["Truck", "การจัดส่ง"],
  ["CreditCard", "การชำระเงิน"],
  ["Headphones", "อุปกรณ์เสียง"],
  ["ClipboardList", "รายการ"],
];
const allowed = new Set(categoryIconOptions.map(([icon]) => icon));
export function categoryIcon(value) {
  return allowed.has(value) ? value : "Package";
}
