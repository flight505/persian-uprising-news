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

async function debug() {
  const snapshot = await db
    .collection('incidents')
    .where('title', '==', 'Large demonstration in Tehran')
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log('No incidents found with title "Large demonstration in Tehran"');
    return;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  console.log('Raw Firestore data:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\nMapped incident:');
  const incident = {
    id: doc.id,
    ...data,
  };
  console.log(JSON.stringify(incident, null, 2));
}

debug()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
