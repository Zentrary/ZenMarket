export function storeIconURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : "/favicon.svg";
  } catch {
    return "/favicon.svg";
  }
}
export function stockState(value) {
  const stock = Number(value) || 0;
  return {
    soldOut: stock <= 0,
    low: stock > 0 && stock <= 3,
    label:
      stock <= 0
        ? "สินค้าหมดแล้ว"
        : stock <= 3
          ? `เหลือเพียง ${stock} ชิ้น`
          : `พร้อมส่ง ${stock} ชิ้น`,
  };
}
export function checkoutRecipient(address, profile) {
  return address
    ? {
        recipient: address.recipient,
        phone: address.phone,
        address: address.address,
      }
    : {
        recipient: profile
          ? [profile.first_name, profile.last_name].join(" ")
          : "",
        phone: profile?.phone || "",
        address: "",
      };
}
