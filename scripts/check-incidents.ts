/**
 * Check what's in Firestore incidents collection
 */

import admin from 'firebase-admin';

// Initialize Firebase
const serviceAccount = require('/Users/jesper/rise-up-firebase-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'coiled-cloud',
  });
}

const db = admin.firestore();

async function checkIncidents() {
  const snapshot = await db.collection('incidents').get();

  console.log(`\nTotal incidents in Firestore: ${snapshot.size}\n`);

  snapshot.docs.forEach((doc, idx) => {
    const data = doc.data();
    console.log(`${idx + 1}. ${data.title}`);
    if (data.relatedArticles) {
      console.log(`   Articles: ${data.relatedArticles.length}`);
      data.relatedArticles.forEach((article: any) => {
        console.log(`   - [${article.source}] ${article.title}`);
      });
    } else {
      console.log(`   Articles: none`);
    }
    console.log('');
  });
}

checkIncidents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
