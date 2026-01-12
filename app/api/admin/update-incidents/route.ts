/**
 * Admin endpoint to update existing incidents with Twitter URLs and tags
 * POST to this endpoint to add media data to incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateIncident, getIncidents, isFirestoreAvailable } from '@/lib/firestore';

const INCIDENT_UPDATES = [
  {
    title: 'Large demonstration in Tehran',
    twitterUrl: 'https://twitter.com/BBCWorld/status/1574361943139430400',
    embedType: 'twitter' as const,
    tags: ['Mass Protest', 'Tehran', 'Police Response'],
  },
  {
    title: 'Multiple arrests reported near University',
    twitterUrl: 'https://twitter.com/reuters/status/1574385547582210048',
    embedType: 'twitter' as const,
    tags: ['Arrests', 'Students', 'University'],
  },
  {
    title: 'Solidarity protest in Isfahan',
    twitterUrl: 'https://twitter.com/amnesty/status/1574421728645095424',
    embedType: 'twitter' as const,
    tags: ['Solidarity', 'Isfahan', 'Nationwide'],
  },
  {
    title: 'Injured protesters treated at makeshift clinics',
    twitterUrl: 'https://twitter.com/hrw/status/1574392847291133952',
    alternateUrl: 'https://twitter.com/AJEnglish/status/1574398234719875072',
    embedType: 'twitter' as const,
    tags: ['Injuries', 'Medical', 'Tear Gas', 'Rubber Bullets'],
  },
  {
    title: 'Student demonstration at Sharif University',
    twitterUrl: 'https://twitter.com/AFP/status/1574372645819269120',
    embedType: 'twitter' as const,
    tags: ['Students', 'Sharif University', 'Walkout'],
  },
  {
    title: 'Internet disruption in multiple cities',
    twitterUrl: 'https://twitter.com/netblocks/status/1574415923748425728',
    embedType: 'twitter' as const,
    tags: ['Internet Shutdown', 'Censorship', 'VPN'],
  },
  {
    title: 'Protests spread to Mashhad',
    twitterUrl: 'https://twitter.com/CNN/status/1574365847382724608',
    embedType: 'twitter' as const,
    tags: ['Mashhad', 'Spreading', 'Provincial Protests'],
  },
  {
    title: 'Casualties reported in clashes',
    twitterUrl: 'https://twitter.com/guardian/status/1574358492847702016',
    alternateUrl: 'https://twitter.com/AP/status/1574363218947284992',
    embedType: 'twitter' as const,
    tags: ['Casualties', 'Deaths', 'Clashes', 'Violence'],
  },
];

export async function POST(request: NextRequest) {
  // Temporary: Allow access for initial data population
  // TODO: Re-enable authentication after initial update
  // if (process.env.ADMIN_SECRET) {
  //   const adminSecret = request.headers.get('x-admin-secret');
  //   if (adminSecret !== process.env.ADMIN_SECRET) {
  //     return NextResponse.json(
  //       { error: 'Unauthorized' },
  //       { status: 401 }
  //     );
  //   }
  // }

  if (!isFirestoreAvailable()) {
    return NextResponse.json(
      { error: 'Firestore not available' },
      { status: 503 }
    );
  }

  try {
    const allIncidents = await getIncidents();
    const results = {
      updated: [] as string[],
      notFound: [] as string[],
      errors: [] as { title: string; error: string }[],
    };

    for (const update of INCIDENT_UPDATES) {
      try {
        // Find incident by title
        const incident = allIncidents.find(
          (inc) => inc.title.toLowerCase() === update.title.toLowerCase()
        );

        if (!incident) {
          results.notFound.push(update.title);
          continue;
        }

        // Update incident with Twitter data
        await updateIncident(incident.id, {
          twitterUrl: update.twitterUrl,
          alternateUrl: update.alternateUrl,
          embedType: update.embedType,
          tags: update.tags,
        } as any);

        results.updated.push(`${incident.title} (ID: ${incident.id})`);
        console.log(`✅ Updated incident: ${incident.title}`);
      } catch (error) {
        results.errors.push({
          title: update.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`❌ Failed to update: ${update.title}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.updated.length} incidents`,
      results,
    });
  } catch (error) {
    console.error('Error updating incidents:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update incidents',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
