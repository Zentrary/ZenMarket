// Lightweight client-side locale layer. Thai remains the source language; English
// translations are applied only to known UI copy, never to arbitrary user content.
export const languageKey = "zen-language";
export const supportedLanguages = ["th", "en"];
export function getLanguage() {
  try {
    return localStorage.getItem(languageKey) === "en" ? "en" : "th";
  } catch {
    return "th";
  }
}

const en = {
  "หน้าหลัก": "Home", "สินค้า": "Products", "คำสั่งซื้อ": "Orders",
  "ช่องทางการติดต่อ": "Contact", "เข้าสู่ระบบ": "Log in", "สมัครสมาชิก": "Sign up",
  "ออกจากระบบ": "Log out", "เมนูหลัก": "Main menu", "เปิดเมนู": "Open menu",
  "ข้ามไปเนื้อหาหลัก": "Skip to main content", "ระบบจัดการร้านค้า": "Store management",
  "แจ้งเตือน": "Notifications", "แจ้งเตือนร้าน": "Store notifications", "มุมมองผู้ใช้": "Customer view",
  "ออกจากมุมมองผู้ใช้": "Exit customer view", "ตะกร้าสินค้า": "Shopping cart", "บัญชี": "Account",
  "ยินดีต้อนรับสู่ร้านของเรา": "Welcome to our store", "เลือกสิ่งที่ชอบ": "Find something you love",
  "ให้เป็นของคุณ": "Make it yours", "เลือกดูสินค้า สั่งซื้อ และติดตามคำสั่งซื้อได้ในที่เดียว": "Browse, order, and track your purchases — all in one place.",
  "เลือกดูสินค้า": "Shop now", "เข้าสู่ระบบเพื่อเลือกซื้อ": "Log in to shop", "วิธีสั่งซื้อ": "How to order",
  "มีคำถามก่อนสั่งซื้อ?": "Questions before you order?", "คุยกับร้านได้เลย": "Talk to our team",
  "จากสิ่งที่ชอบ สู่หน้าบ้านคุณ": "From things you love to your doorstep", "เลือกง่าย สั่งสบาย": "Easy to choose, easy to order",
  "ในแบบของคุณ": "Made for you", "เลือกสินค้า": "Choose products", "ดูรายละเอียดก่อนตัดสินใจ": "Explore the details before you decide",
  "ชำระเงิน": "Pay", "ชำระเงินและแนบสลิป": "Pay and upload your slip", "PromptPay พร้อมแนบสลิป": "PromptPay with payment slip upload",
  "ติดตามจนได้รับสินค้า": "Track your order to delivery", "ติดตามคำสั่งซื้อได้": "Track your order", "ดูสถานะได้จากบัญชีของคุณ": "Check your status in your account",
  "ชำระผ่าน PromptPay": "Pay with PromptPay", "แนบสลิปให้ร้านตรวจสอบ": "Upload your slip for verification",
  "จัดส่งฟรี": "Free shipping", "ตรวจสอบที่อยู่ก่อนยืนยันคำสั่งซื้อ": "Review your address before confirming your order",
  "HOW TO ORDER": "HOW TO ORDER", "สั่งซื้อง่าย ใน 3 ขั้นตอน": "Order in 3 easy steps", "ตั้งแต่เลือกสินค้า จนถึงวันรับของ": "From choosing your items to delivery",
  "เข้าสู่ระบบเพื่อดูสินค้า เลือกจำนวน และเพิ่มลงตะกร้า ตรวจสอบรายการก่อนสั่งซื้อ": "Log in to browse, choose quantities, and add items to your cart. Review your order before checkout.",
  "กรอกที่อยู่จัดส่ง ชำระผ่าน QR PromptPay ของคำสั่งซื้อ แล้วแนบหลักฐานภายในเวลาที่กำหนด": "Enter your shipping address, pay using your order's PromptPay QR code, then upload proof within the time limit.",
  "ร้านตรวจสอบการชำระเงินก่อนจัดส่ง ดูสถานะและข้อมูลจัดส่งได้จากหน้าคำสั่งซื้อของคุณ": "We verify your payment before shipping. Track your order and delivery details from your Orders page.",
  "ก่อนสั่งซื้อ": "Before you order", "อยากรู้อะไรบ้าง?": "Frequently asked questions", "GOOD TO KNOW": "GOOD TO KNOW",
  "รวมคำตอบสั้น ๆ เพื่อให้คุณเริ่มต้นได้ง่ายขึ้น": "Quick answers to help you get started.", "สอบถามเรื่องอื่น": "Ask us something else",
  "เริ่มเลือกซื้อสินค้าอย่างไร?": "How do I start shopping?", "เข้าสู่ระบบหรือสมัครสมาชิกก่อนเลือกดูสินค้า จากนั้นเพิ่มสินค้าที่ต้องการลงตะกร้าและตรวจสอบรายการก่อนยืนยันคำสั่งซื้อ": "Log in or create an account, browse products, add items to your cart, and review your order before confirming.",
  "ชำระเงินผ่านช่องทางไหน?": "How can I pay?", "ชำระผ่าน QR PromptPay ที่แสดงในคำสั่งซื้อ แล้วแนบสลิปภายในเวลาที่ระบุ ร้านจะตรวจสอบยอดก่อนเปลี่ยนสถานะการชำระเงิน": "Pay using the PromptPay QR code shown with your order and upload the slip within the stated time. We verify the payment before updating your order.",
  "ค่าจัดส่งเท่าไร และจัดส่งเมื่อไร?": "How much is shipping, and when will my order ship?", "ดูสถานะคำสั่งซื้อได้ที่ไหน?": "Where can I track my order?",
  "มีอะไรให้ร้านช่วยไหม?": "How can we help?", "สอบถามรายละเอียดสินค้า หรือแจ้งเรื่องคำสั่งซื้อ ติดต่อเราได้โดยตรง": "Contact us with product questions or anything about your order.", "ติดต่อร้าน": "Contact us",
  "FROM OUR CUSTOMERS": "FROM OUR CUSTOMERS", "เสียงจากคนที่ได้รับของแล้ว": "What our customers say", "รีวิวจากผู้ซื้อที่ยืนยันรับสินค้าแล้ว": "Reviews from verified buyers",
  "ยืนยันรับสินค้าแล้ว": "Order received", "HERE TO HELP": "HERE TO HELP", "ติดต่อร้าน ": "Contact us ",
  "แดชบอร์ด": "Dashboard", "ภาพรวมยอดขาย สินค้า และเสียงจากลูกค้า": "Sales, products, and customer feedback overview",
  "ตรวจสอบการชำระเงินและจัดส่ง": "Review payments and shipping", "จัดการสินค้าและสต็อก": "Manage products and inventory",
  "หมวดหมู่": "Categories", "เพิ่มและจัดการหมวดหมู่สินค้า": "Add and manage product categories", "รีวิวลูกค้า": "Customer reviews",
  "อ่านคะแนนและข้อเสนอแนะจากผู้ซื้อจริง": "Read ratings and feedback from verified buyers", "ตั้งค่าร้าน": "Store settings",
  "ชื่อร้าน โลโก้ ข้อมูลติดต่อ และการจัดส่ง": "Store name, logo, contact details, and shipping", "บัญชีรับเงิน": "Payment account",
  "ตั้งค่าการชำระเงิน PromptPay": "Configure PromptPay payments", "แจ้งเตือนและดูแลระบบ": "Alerts and system operations",
  "ออเดอร์ สลิป ปัญหา และสำรองข้อมูล": "Orders, payment slips, issues, and backups", "จัดการร้านค้า": "Manage store", "เมนูหลังบ้าน": "Admin menu",
  "เลือกงานที่ต้องการทำต่อได้ทันที": "Continue with a task", "QUICK ACCESS": "QUICK ACCESS",
  "ยอดรับชำระรวม": "Total payments received", "คำสั่งซื้อที่ยืนยันยอดแล้ว": "orders with verified payment", "สินค้าที่ขายได้": "Items sold",
  "ชิ้น": "items", "รายการสินค้าในร้าน": "products in store", "คะแนนจากลูกค้า": "Customer rating", "รีวิวจากผู้ซื้อจริง": "verified reviews",
  "รอดำเนินการ": "Pending", "ตรวจยอด": "Verify payment", "รอจัดส่ง": "Awaiting shipment", "ยอดรับชำระ 7 วันล่าสุด": "Payments received in the last 7 days",
  "เวลาไทย · รายการเก่าที่ไม่มีวันยืนยันยอด อ้างอิงวันสั่งซื้อ": "Thailand time · Older records without a payment date use the order date",
  "คะแนนรีวิว": "Review ratings", "อ่านรีวิวทั้งหมด": "Read all reviews", "รีวิวล่าสุด": "Recent reviews", "ดูทั้งหมด": "View all",
  "สินค้าใกล้หมด": "Low stock", "ยังไม่มีรายการที่ต้องเติมสต็อก": "No items need restocking", "จัดการคำสั่งซื้อ": "Manage orders",
  "ไม่พบหน้านี้": "Page not found", "กลับมาเลือกสิ่งดีๆ ที่หน้าร้านกัน": "Return to the shop and find something you love", "กลับหน้าหลัก": "Back to home",
  "ไม่สามารถโหลดข้อมูลได้": "Unable to load data", "กำลังจัดเตรียมสิ่งดีๆ ให้คุณ…": "Getting things ready for you…",
  "ตกลง": "OK", "ยืนยัน": "Confirm", "ยกเลิก": "Cancel", "บันทึก": "Save", "แก้ไข": "Edit", "ลบ": "Delete",
  "ทั้งหมด": "All", "ค้นหา": "Search", "เรียงตาม": "Sort by", "ราคา": "Price", "ใหม่ล่าสุด": "Newest",
  "แนะนำสำหรับคุณ": "Recommended for you", "ราคา: ต่ำไปสูง": "Price: low to high", "ราคา: สูงไปต่ำ": "Price: high to low",
  "ยังไม่มีสินค้า": "No products yet", "สินค้าหมดแล้ว": "Out of stock", "พร้อมส่ง": "In stock", "เหลือเพียง": "Only", "จาก 5 ดาว": "out of 5 stars", "ดาว": "stars", "ชิ้น": "items", "จัดส่งฟรีเมื่อซื้อครบ": "Free shipping on orders over", "จัดส่งฟรี": "Free shipping", "ค่าจัดส่ง": "Shipping fee", "ตรวจสอบที่อยู่ก่อนยืนยันคำสั่งซื้อ": "Review your address before confirming your order", "ตรวจสอบยอดรวมอีกครั้งที่หน้าชำระเงิน": "Review the total again at checkout", "เมื่อเข้าสู่ระบบแล้ว": "Once you are logged in", "เปิดเมนูคำสั่งซื้อ": "open the Orders menu", "เพื่อดูสถานะการชำระเงินและการจัดส่ง": "to check payment and shipping status", "หากมีข้อสงสัย": "If you have questions", "ติดต่อร้านพร้อมแจ้งเลขคำสั่งซื้อ": "contact us with your order number", "รับสินค้าแล้ว": "Order received", "แนบหลักฐานภายในเวลาที่กำหนด": "upload proof within the time limit", "ตรวจสอบยอดก่อนเปลี่ยนสถานะการชำระเงิน": "verify payment before updating payment status",
  "รอชำระเงิน": "Awaiting payment", "รอผู้ขายยืนยัน": "Awaiting seller confirmation", "รอจัดส่ง": "Awaiting shipment",
  "ระหว่างจัดส่ง": "In transit", "รอรับสินค้า": "Awaiting receipt", "ได้รับสินค้าแล้ว": "Delivered", "ยกเลิกแล้ว": "Cancelled",
  "สถานะคำสั่งซื้อ": "Order status", "ชำระเงิน": "Payment", "ยืนยันยอดเงิน": "Payment confirmed", "เตรียมจัดส่ง": "Preparing shipment", "จัดส่งแล้ว": "Shipped",
  "สมัครสมาชิก": "Create account", "ชื่อผู้ใช้ หรืออีเมล": "Username or email", "รหัสผ่าน": "Password", "อีเมล": "Email", "เบอร์โทรศัพท์": "Phone number",
  "ลืมรหัสผ่าน?": "Forgot password?", "ยืนยันรหัสผ่าน": "Confirm password", "พื้นที่ทำงานของเจ้าของร้าน": "Store owner workspace",
  "สมุดที่อยู่": "Address book", "บันทึกได้สูงสุด 5 ที่อยู่": "Save up to 5 addresses", "ข้อมูลจัดส่ง": "Shipping information",
  "เลือกที่อยู่จัดส่ง": "Choose a shipping address", "กรอกที่อยู่ใหม่ด้วยตัวเอง": "Enter a new address", "ชื่อผู้รับ": "Recipient name",
  "ที่อยู่จัดส่ง": "Shipping address", "กรุณากรอกที่อยู่ครบถ้วนเพื่อการจัดส่ง": "Please enter the complete address for delivery",
  "สร้างคำสั่งซื้อและรับ QR": "Create order and get QR", "ชำระผ่าน QR PromptPay และแนบสลิป": "Pay with PromptPay QR and upload your slip",
  "แนบหลักฐานการชำระเงิน": "Upload payment proof", "ฉันได้รับสินค้าแล้ว": "I have received the item", "คำสั่งซื้อของฉัน": "My orders",
  "รายละเอียดคำสั่งซื้อ": "Order details", "ยอดรวม": "Total", "ค่าจัดส่ง": "Shipping fee", "รวมทั้งสิ้น": "Grand total",
  "ยืนยันการทำรายการ": "Confirm action", "ไม่สามารถทำรายการได้": "Unable to complete the action", "เรียบร้อยแล้ว": "Done",
  "ยังไม่ได้เชื่อมต่อฐานข้อมูล — ไม่สามารถเข้าสู่ระบบหรือสั่งซื้อได้": "Database is not connected — sign-in and checkout are unavailable.",
  "เกี่ยวกับร้าน": "About the store", "ติดต่อร้าน": "Contact the store", "ร้านยังไม่ได้ระบุช่องทางติดต่อ": "The store has not provided contact details",
  "จัดส่งภายใน 2–5 วันทำการ": "Ships within 2–5 business days", "สินค้าที่คุณบันทึกไว้": "Items you saved", "รายการโปรด": "Favorites",
  "ยังไม่มีรายการโปรด": "No favorites yet", "กดหัวใจบนสินค้าที่คุณชอบ เพื่อเก็บไว้ที่นี่": "Tap the heart on products you like to save them here.",
  "เข้าสู่ระบบหรือสมัครสมาชิกก่อนเลือกดูสินค้า จากนั้นเพิ่มสินค้าที่ต้องการลงตะกร้าและตรวจสอบรายการก่อนยืนยันคำสั่งซื้อ": "Log in or create an account, browse products, add items to your cart, and review your order before confirming.",
  "ชำระผ่าน QR PromptPay ที่แสดงในคำสั่งซื้อ แล้วแนบสลิปภายในเวลาที่ระบุ ร้านจะตรวจสอบยอดก่อนเปลี่ยนสถานะการชำระเงิน": "Pay with the PromptPay QR code on your order and upload the slip within the stated time. We verify the amount before updating payment status.",
  "เมื่อเข้าสู่ระบบแล้ว เปิดเมนูคำสั่งซื้อเพื่อดูสถานะการชำระเงินและการจัดส่ง หากมีข้อสงสัย ติดต่อร้านพร้อมแจ้งเลขคำสั่งซื้อ": "Once logged in, open Orders to check payment and shipping status. If you have questions, contact us with your order number.",
  "สินค้า": "Products", "เลือกหมวดหมู่": "Choose a category", "ค้นหาสินค้า": "Search products", "ค้นหาสินค้า…": "Search products…", "เรียงลำดับ": "Sort", "ล้างตัวกรอง": "Clear filters",
  "ไม่พบสินค้าที่ตรงกับการค้นหา": "No products match your search", "ลองเปลี่ยนคำค้นหาหรือหมวดหมู่": "Try another search or category", "รายละเอียดสินค้า": "Product details",
  "เพิ่มลงตะกร้า": "Add to cart", "เพิ่มรายการโปรด": "Add to favorites", "นำออกจากรายการโปรด": "Remove from favorites", "จำนวน": "Quantity",
  "ไปยังตะกร้า": "Go to cart", "เลือกซื้อสินค้า": "Shop products", "ตะกร้าของคุณ": "Your cart", "ตะกร้าว่างเปล่า": "Your cart is empty",
  "ดำเนินการชำระเงิน": "Proceed to checkout", "กลับไปเลือกสินค้า": "Continue shopping", "สรุปคำสั่งซื้อ": "Order summary", "ยอดรวมสินค้า": "Subtotal",
  "สถานะการชำระเงิน": "Payment status", "อัปโหลดสลิป": "Upload payment slip", "ชำระและส่งสลิปภายใน 30 นาที": "Pay and upload your slip within 30 minutes",
  "JPG, PNG หรือ WebP ไม่เกิน 5 MB": "JPG, PNG, or WebP up to 5 MB", "รอผู้ขายยืนยัน": "Awaiting seller confirmation",
  "คำสั่งซื้อถูกสร้างแล้ว": "Your order has been created", "ตรวจสอบสถานะ": "Check status", "แนบสลิป": "Upload slip", "เวลาที่เหลือ": "Time remaining",
  "บันทึกโปรไฟล์": "Save profile", "แก้ไขโปรไฟล์": "Edit profile", "บันทึกที่อยู่": "Save address", "เพิ่มที่อยู่": "Add address", "ที่อยู่หลัก": "Default address",
  "ไม่มีคำสั่งซื้อ": "No orders yet", "ไม่มีรีวิว": "No reviews yet", "ดูสินค้า": "View products", "ยืนยันรับสินค้า": "Confirm receipt",
  "เลือกดูรายละเอียด": "View details", "กลับ": "Back", "ถัดไป": "Next", "ก่อนหน้า": "Previous", "หน้า": "Page", "บันทึกการเปลี่ยนแปลง": "Save changes",
  "การจัดส่ง": "Shipping", "ข้อมูลบัญชี": "Account information", "ข้อมูลส่วนตัว": "Personal information", "ยืนยันอีเมล": "Verify email",
  "เพิ่มสินค้า": "Add product", "แก้ไขสินค้า": "Edit product", "คลังสินค้า": "Product inventory", "หมวดหมู่ทั้งหมด": "All categories", "สถานะ": "Status", "จัดการ": "Actions",
  "เปิดขาย": "Active", "ซ่อน": "Hidden", "ราคา: ": "Price: ", "คงเหลือ": "Stock", "บันทึกการตั้งค่า": "Save settings", "ตั้งค่าร้านค้า": "Store settings",
  "รายการแจ้งเตือน": "Notifications", "สำรองข้อมูล": "Back up data", "กำลังดำเนินการ": "In progress", "ไม่มีข้อมูล": "No data available",
};

export function translateText(value, language = getLanguage()) {
  if (language !== "en") return value;
  const text = value.trim();
  const translated = en[text];
  if (translated) {
    const start = value.match(/^\s*/)?.[0] || "";
    const end = value.match(/\s*$/)?.[0] || "";
    return start + translated + end;
  }
  // Some templates combine fixed copy with computed shipping/stock values.
  // Replace only curated multi-character UI fragments in those mixed text nodes.
  const fragments = ["ตรวจสอบที่อยู่ก่อนยืนยันคำสั่งซื้อ", "ตรวจสอบยอดรวมอีกครั้งที่หน้าชำระเงิน", "ติดต่อร้านพร้อมแจ้งเลขคำสั่งซื้อ", "เพื่อดูสถานะการชำระเงินและการจัดส่ง", "เปิดเมนูคำสั่งซื้อ", "เมื่อเข้าสู่ระบบแล้ว", "จัดส่งฟรีเมื่อซื้อครบ", "จัดส่งฟรี", "ค่าจัดส่ง", "เหลือเพียง", "พร้อมส่ง", "ชำระผ่าน PromptPay", "แนบหลักฐานภายในเวลาที่กำหนด", "รับสินค้าแล้ว", "ชิ้น", "จัดส่งฟรีเมื่อซื้อครบ"];
  return fragments.sort((a, b) => b.length - a.length).reduce((result, source) => result.replaceAll(source, en[source] || source), value);
}

// Translate only exact, known UI strings in rendered text/accessible attributes.
// Unknown content (including store-owner copy and customer data) is left untouched.
export function localizePage(root, language = getLanguage()) {
  if (!root || language !== "en") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) node.nodeValue = translateText(node.nodeValue, language);
  for (const element of root.querySelectorAll("[aria-label], [aria-description], [title], [placeholder], [alt]")) {
    for (const attr of ["aria-label", "aria-description", "title", "placeholder", "alt"])
      if (element.hasAttribute(attr)) element.setAttribute(attr, translateText(element.getAttribute(attr), language));
  }
}
