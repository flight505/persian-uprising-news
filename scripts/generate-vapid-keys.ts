import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n🔐 VAPID Keys Generated!\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com\n`);
console.log('Also add to .env for Next.js client-side access:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`);
