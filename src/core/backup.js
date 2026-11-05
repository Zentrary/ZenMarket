// Encrypted application-data export. No password, plaintext or session is persisted.
const encode = (bytes) => {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out);
};
export async function encryptBackup(data, password) {
  if (typeof password !== "string" || password.length < 12)
    throw Error("ใช้รหัสเข้ารหัสอย่างน้อย 12 ตัวอักษร");
  const raw = new TextEncoder().encode(JSON.stringify(data));
  if (raw.byteLength > 20 * 1024 * 1024)
    throw Error("ข้อมูลเกิน 20 MB กรุณาใช้การสำรองฐานข้อมูลแบบ server-side");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    raw,
  );
  return {
    format: "zenmarket-encrypted-v1",
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 250000,
    salt: encode(salt),
    iv: encode(iv),
    ciphertext: encode(new Uint8Array(ciphertext)),
  };
}
