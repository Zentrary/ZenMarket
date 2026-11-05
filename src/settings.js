export const defaultSettings = Object.freeze({
  facebook_url: "",
  instagram_url: "",
  line_url: "",
  shop_name: "ZenMarket",
  tagline: "ร้านค้าออนไลน์ ดูแลโดยเจ้าของร้านโดยตรง",
  logo_url: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  about_text: "ร้านค้าออนไลน์ ดูแลทุกคำสั่งซื้อโดยเจ้าของร้านโดยตรง",
  shipping_note: "จัดส่งภายใน 2–5 วันทำการหลังตรวจสอบการชำระเงิน",
  shipping_fee: 50,
  free_shipping_threshold: 1000,
});
export function shippingFor(subtotal, settings) {
  return subtotal >= Number(settings.free_shipping_threshold)
    ? 0
    : Number(settings.shipping_fee);
}
export function normalizeSettings(data) {
  return Object.fromEntries(
    Object.keys(defaultSettings).map((key) => [
      key,
      data?.[key] ?? defaultSettings[key],
    ]),
  );
}
