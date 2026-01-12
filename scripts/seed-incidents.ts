/**
 * Seed script to populate Firestore with sample incidents
 * Run with: npx tsx scripts/seed-incidents.ts
 */

import { saveIncident } from '../lib/firestore';

const seedIncidents = [
  {
    type: 'protest' as const,
    title: 'Large demonstration in Tehran',
    description: 'Thousands gathered in central Tehran demanding political reform. Heavy police presence reported.',
    location: { lat: 35.6892, lon: 51.3890, address: 'Azadi Square, Tehran' },
    images: [],
    verified: true,
    reportedBy: 'official' as const,
    timestamp: Date.now() - 3600000, // 1 hour ago
    upvotes: 47,
    twitterUrl: 'https://twitter.com/BBCWorld/status/1574361943139430400',
    embedType: 'twitter' as const,
    tags: ['Mass Protest', 'Tehran', 'Police Response'],
  },
  {
    type: 'arrest' as const,
    title: 'Multiple arrests reported near University',
    description: 'Security forces detained at least 15 protesters near Tehran University campus.',
    location: { lat: 35.7019, lon: 51.4010, address: 'Tehran University' },
    images: [],
    verified: true,
    reportedBy: 'official' as const,
    timestamp: Date.now() - 7200000, // 2 hours ago
    upvotes: 23,
    twitterUrl: 'https://twitter.com/reuters/status/1574385547582210048',
    embedType: 'twitter' as const,
    tags: ['Arrests', 'Students', 'University'],
  },
  {
    type: 'protest' as const,
    title: 'Solidarity protest in Isfahan',
    description: 'Citizens in Isfahan joined nationwide protests. Chants of freedom heard throughout the city.',
    location: { lat: 32.6546, lon: 51.6680, address: 'Naqsh-e Jahan Square, Isfahan' },
    images: [],
    verified: true,
    reportedBy: 'official' as const,
    timestamp: Date.now() - 10800000, // 3 hours ago
    upvotes: 31,
    twitterUrl: 'https://twitter.com/amnesty/status/1574421728645095424',
    embedType: 'twitter' as const,
    tags: ['Solidarity', 'Isfahan', 'Nationwide'],
  },
  {
    type: 'injury' as const,
    title: 'Injured protesters treated at makeshift clinics',
    description: 'Medical volunteers report treating dozens of injured protesters. Rubber bullets and tear gas used.',
    location: { lat: 35.6850, lon: 51.3820, address: 'Valiasr Street, Tehran' },
    images: [],
    verified: false,
    reportedBy: 'crowdsource' as const,
    timestamp: Date.now() - 5400000, // 1.5 hours ago
    upvotes: 18,
    twitterUrl: 'https://twitter.com/hrw/status/1574392847291133952',
    alternateUrl: 'https://twitter.com/AJEnglish/status/1574398234719875072',
    embedType: 'twitter' as const,
    tags: ['Injuries', 'Medical', 'Tear Gas', 'Rubber Bullets'],
  },
  {
    type: 'protest' as const,
    title: 'Student demonstration at Sharif University',
    description: 'Engineering students walked out of classes in solidarity. University surrounded by security forces.',
    location: { lat: 35.7026, lon: 51.3511, address: 'Sharif University of Technology' },
    images: [],
    verified: true,
    reportedBy: 'official' as const,
    timestamp: Date.now() - 14400000, // 4 hours ago
    upvotes: 56,
    twitterUrl: 'https://twitter.com/AFP/status/1574372645819269120',
    embedType: 'twitter' as const,
    tags: ['Students', 'Sharif University', 'Walkout'],
  },
  {
    type: 'other' as const,
    title: 'Internet disruption in multiple cities',
    description: 'Widespread internet outages reported. Mobile networks heavily throttled. VPN usage at all-time high.',
    location: { lat: 35.6892, lon: 51.3890, address: 'Tehran' },
    images: [],
    verified: true,
    reportedBy: 'official' as const,
    timestamp: Date.now() - 1800000, // 30 minutes ago
    upvotes: 92,
    twitterUrl: 'https://twitter.com/netblocks/status/1574415923748425728',
    embedType: 'twitter' as const,
    tags: ['Internet Shutdown', 'Censorship', 'VPN'],
  },
  {
    type: 'protest' as const,
    title: 'Protests spread to Mashhad',
    description: 'Second largest city joins protests. Demonstrations at Imam Reza shrine area.',
    location: { lat: 36.2974, lon: 59.6059, address: 'Mashhad' },
    images: [],
    verified: true,
    reportedBy: 'official' as const,
    timestamp: Date.now() - 18000000, // 5 hours ago
    upvotes: 41,
    twitterUrl: 'https://twitter.com/CNN/status/1574365847382724608',
    embedType: 'twitter' as const,
    tags: ['Mashhad', 'Spreading', 'Provincial Protests'],
  },
  {
    type: 'death' as const,
    title: 'Casualties reported in clashes',
    description: 'Unconfirmed reports of fatalities during confrontations with security forces. Exact numbers unclear.',
    location: { lat: 35.6950, lon: 51.4115, address: 'Eastern Tehran' },
    images: [],
    verified: false,
    reportedBy: 'crowdsource' as const,
    timestamp: Date.now() - 21600000, // 6 hours ago
    upvotes: 134,
    twitterUrl: 'https://twitter.com/guardian/status/1574358492847702016',
    alternateUrl: 'https://twitter.com/AP/status/1574363218947284992',
    embedType: 'twitter' as const,
    tags: ['Casualties', 'Deaths', 'Clashes', 'Violence'],
  },
];

async function main() {
  console.log('🌱 Seeding incidents to Firestore...\n');

  for (const incident of seedIncidents) {
    try {
      const id = await saveIncident(incident);
      console.log(`✅ Created ${incident.type}: ${incident.title} (ID: ${id})`);
    } catch (error) {
      console.error(`❌ Failed to create incident: ${incident.title}`);
      console.error(error);
    }
  }

  console.log(`\n🎉 Seeded ${seedIncidents.length} incidents to Firestore!`);
  console.log('🗺️ View map: https://persian-uprising-news.vercel.app/map');
}

main().catch(console.error);
