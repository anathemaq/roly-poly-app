import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("=== VAPID Keys Generated ===");
console.log("");
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + vapidKeys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + vapidKeys.privateKey);
console.log("");
console.log("Add both as environment variables in your Vercel project.");
