/**
 * Reset incidents in Firestore - delete all and re-seed with updated data including article links
 * Run with: npx tsx scripts/reset-incidents.ts
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

async function resetIncidents() {
  console.log('🗑️ Deleting existing incidents...\n');

  // Delete all existing incidents
  const snapshot = await db.collection('incidents').get();
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`✅ Deleted ${snapshot.size} incidents\n`);

  console.log('🌱 Seeding new incidents with article links...\n');

  // New incidents with article links
  const seedIncidents = [
    {
      type: 'protest' as const,
      title: 'Large demonstration in Tehran',
      description: 'Thousands gathered in central Tehran demanding political reform. Heavy police presence reported.',
      location: { lat: 35.6892, lon: 51.3890, address: 'Azadi Square, Tehran' },
      images: [],
      verified: true,
      reportedBy: 'official' as const,
      timestamp: Date.now() - 3600000,
      upvotes: 47,
      relatedArticles: [
        {
          title: 'Thousands protest in Tehran demanding reforms',
          url: 'https://www.bbc.com/persian/iran',
          source: 'BBC Persian'
        },
        {
          title: 'Heavy police presence at Azadi Square demonstration',
          url: 'https://www.iranintl.com',
          source: 'Iran International'
        }
      ],
    },
    {
      type: 'arrest' as const,
      title: 'Multiple arrests reported near University',
      description: 'Security forces detained at least 15 protesters near Tehran University campus.',
      location: { lat: 35.7019, lon: 51.4010, address: 'Tehran University' },
      images: [],
      verified: true,
      reportedBy: 'official' as const,
      timestamp: Date.now() - 7200000,
      upvotes: 23,
      relatedArticles: [
        {
          title: '15 students detained at Tehran University',
          url: 'https://www.radiofarda.com',
          source: 'Radio Farda'
        }
      ],
    },
    {
      type: 'protest' as const,
      title: 'Solidarity protest in Isfahan',
      description: 'Citizens in Isfahan joined nationwide protests. Chants of freedom heard throughout the city.',
      location: { lat: 32.6546, lon: 51.6680, address: 'Naqsh-e Jahan Square, Isfahan' },
      images: [],
      verified: true,
      reportedBy: 'official' as const,
      timestamp: Date.now() - 10800000,
      upvotes: 31,
    },
    {
      type: 'injury' as const,
      title: 'Injured protesters treated at makeshift clinics',
      description: 'Medical volunteers report treating dozens of injured protesters. Rubber bullets and tear gas used.',
      location: { lat: 35.6850, lon: 51.3820, address: 'Valiasr Street, Tehran' },
      images: [],
      verified: false,
      reportedBy: 'crowdsource' as const,
      timestamp: Date.now() - 5400000,
      upvotes: 18,
    },
    {
      type: 'protest' as const,
      title: 'Student demonstration at Sharif University',
      description: 'Engineering students walked out of classes in solidarity. University surrounded by security forces.',
      location: { lat: 35.7026, lon: 51.3511, address: 'Sharif University of Technology' },
      images: [],
      verified: true,
      reportedBy: 'official' as const,
      timestamp: Date.now() - 14400000,
      upvotes: 56,
      relatedArticles: [
        {
          title: 'Sharif University students walk out in solidarity',
          url: 'https://www.bbc.com/persian/iran',
          source: 'BBC Persian'
        },
        {
          title: 'Security forces surround engineering campus',
          url: 'https://www.voanews.com/persian',
          source: 'VOA Persian'
        }
      ],
    },
    {
      type: 'other' as const,
      title: 'Internet disruption in multiple cities',
      description: 'Widespread internet outages reported. Mobile networks heavily throttled. VPN usage at all-time high.',
      location: { lat: 35.6892, lon: 51.3890, address: 'Tehran' },
      images: [],
      verified: true,
      reportedBy: 'official' as const,
      timestamp: Date.now() - 1800000,
      upvotes: 92,
    },
    {
      type: 'protest' as const,
      title: 'Protests spread to Mashhad',
      description: 'Second largest city joins protests. Demonstrations at Imam Reza shrine area.',
      location: { lat: 36.2974, lon: 59.6059, address: 'Mashhad' },
      images: [],
      verified: true,
      reportedBy: 'official' as const,
      timestamp: Date.now() - 18000000,
      upvotes: 41,
    },
    {
      type: 'death' as const,
      title: 'Casualties reported in clashes',
      description: 'Unconfirmed reports of fatalities during confrontations with security forces. Exact numbers unclear.',
      location: { lat: 35.6950, lon: 51.4115, address: 'Eastern Tehran' },
      images: [],
      verified: false,
      reportedBy: 'crowdsource' as const,
      timestamp: Date.now() - 21600000,
      upvotes: 134,
    },
  ];

  // Create all incidents
  const createBatch = db.batch();

  for (const incident of seedIncidents) {
    const docRef = db.collection('incidents').doc();
    createBatch.set(docRef, {
      ...incident,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await createBatch.commit();
  console.log(`✅ Created ${seedIncidents.length} incidents with article links\n`);
  console.log('🗺️ View map: https://persian-uprising-news.vercel.app/map');
}

resetIncidents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
