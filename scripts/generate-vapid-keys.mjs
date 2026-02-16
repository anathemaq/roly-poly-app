import crypto from "crypto";

// Generate VAPID key pair using Web Push standard (P-256 curve)
const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
  namedCurve: "P-256",
});

const rawPublic = publicKey.export({ type: "spki", format: "der" });
// The raw uncompressed public key is the last 65 bytes of the SPKI DER
const uncompressedKey = rawPublic.subarray(rawPublic.length - 65);
const vapidPublicKey = Buffer.from(uncompressedKey)
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

const rawPrivate = privateKey.export({ type: "pkcs8", format: "der" });
// The raw 32-byte private key value is the last 32 bytes before the end of PKCS8 DER
const privateKeyBytes = rawPrivate.subarray(rawPrivate.length - 32);
const vapidPrivateKey = Buffer.from(privateKeyBytes)
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

console.log("=== VAPID Keys Generated ===");
console.log("");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidPublicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidPrivateKey);
console.log("");
console.log("Add both as environment variables in your Vercel project.");
