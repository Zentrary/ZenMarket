export function productImages(product) {
  return [
    ...new Set(
      [
        product?.image_url,
        ...(Array.isArray(product?.image_urls) ? product.image_urls : []),
      ].filter((url) => typeof url === "string" && url.length),
    ),
  ].slice(0, 8);
}
const socialHosts = {
  facebook_url: ["facebook.com", "www.facebook.com", "fb.com", "www.fb.com"],
  instagram_url: ["instagram.com", "www.instagram.com"],
  line_url: ["line.me", "lin.ee"],
};
export function safeSocialURL(value, key) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      socialHosts[key]?.includes(url.hostname) &&
      url.pathname.length > 1 &&
      value.length <= 500 &&
      !/\s/.test(value)
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export const statusLabels = {
  pending: "รอชำระเงิน",
  review: "รอผู้ขายยืนยัน",
  paid: "กำลังเตรียมสินค้า",
  ready_to_ship: "พร้อมจัดส่ง",
  shipped: "ระหว่างจัดส่ง · รอรับสินค้า",
  delivered: "ได้รับสินค้าแล้ว",
  cancelled: "ยกเลิกแล้ว",
};
export function orderSteps(order) {
  const rank =
    {
      pending: 0,
      review: 1,
      paid: 2,
      ready_to_ship: 3,
      shipped: 5,
      delivered: 6,
    }[order.status] ?? -1;
  return [
    ["ชำระเงิน", "สร้างคำสั่งซื้อแล้ว", order.created_at],
    ["ยืนยันยอดเงิน", "รอร้านตรวจสอบสลิป", null],
    ["เตรียมจัดส่ง", "กำลังจัดสินค้าและแพ็กพัสดุ", order.paid_at],
    ["พร้อมจัดส่ง", "ร้านยืนยันว่าเตรียมสินค้าเสร็จแล้ว", order.prepared_at],
    ["จัดส่งแล้ว", "ร้านส่งมอบให้ขนส่งและแจ้งเลขติดตาม", order.shipped_at],
    ["รอรับสินค้า", "ระหว่างเดินทางถึงคุณ", null],
    ["ได้รับสินค้า", "ลูกค้ายืนยันการรับ", order.delivered_at],
  ].map(([title, description, time], index) => ({
    title,
    description,
    time,
    complete: index < rank,
    current: index === rank,
  }));
}
export const reviewColumns =
  "id,product_id,reviewer_name,product_name,rating,comment,created_at,updated_at";
