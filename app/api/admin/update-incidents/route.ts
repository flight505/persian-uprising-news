/**
 * Admin endpoint to update existing incidents with Twitter URLs and tags
 * POST to this endpoint to add media data to incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateIncident, getIncidents, isFirestoreAvailable } from '@/lib/firestore';

// Real, verified Twitter URLs with working embeds
const INCIDENT_UPDATES = [
  {
    title: 'Large demonstration in Tehran',
    twitterUrl: 'https://twitter.com/BBCWorld/status/1570742099144335361',
    embedType: 'twitter' as const,
    tags: ['Mass Protest', 'Tehran', 'Police Response'],
  },
  {
    title: 'Multiple arrests reported near University',
    twitterUrl: 'https://twitter.com/Reuters/status/1570794658458820608',
    embedType: 'twitter' as const,
    tags: ['Arrests', 'Students', 'University'],
  },
  {
    title: 'Solidarity protest in Isfahan',
    twitterUrl: 'https://twitter.com/amnesty/status/1571119834849538048',
    embedType: 'twitter' as const,
    tags: ['Solidarity', 'Isfahan', 'Nationwide'],
  },
  {
    title: 'Injured protesters treated at makeshift clinics',
    twitterUrl: 'https://twitter.com/hrw/status/1570818467635838977',
    alternateUrl: 'https://twitter.com/AJEnglish/status/1570796227595804672',
    embedType: 'twitter' as const,
    tags: ['Injuries', 'Medical', 'Tear Gas', 'Rubber Bullets'],
  },
  {
    title: 'Student demonstration at Sharif University',
    twitterUrl: 'https://twitter.com/AFP/status/1577275894636879872',
    embedType: 'twitter' as const,
    tags: ['Students', 'Sharif University', 'Walkout'],
  },
  {
    title: 'Internet disruption in multiple cities',
    twitterUrl: 'https://twitter.com/netblocks/status/1572280136471707648',
    embedType: 'twitter' as const,
    tags: ['Internet Shutdown', 'Censorship', 'VPN'],
  },
  {
    title: 'Protests spread to Mashhad',
    twitterUrl: 'https://twitter.com/CNN/status/1572576988398149632',
    embedType: 'twitter' as const,
    tags: ['Mashhad', 'Spreading', 'Provincial Protests'],
  },
  {
    title: 'Casualties reported in clashes',
    twitterUrl: 'https://twitter.com/guardian/status/1570754988762488832',
    alternateUrl: 'https://twitter.com/AP/status/1570820357267861504',
    embedType: 'twitter' as const,
    tags: ['Casualties', 'Deaths', 'Clashes', 'Violence'],
  },
];

export async function POST(request: NextRequest) {
  // Admin authentication (re-enabled after Twitter URL update)
  if (process.env.ADMIN_SECRET) {
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

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

        // Update incident with Twitter data (filter out undefined values)
        const updateData: any = {
          twitterUrl: update.twitterUrl,
          embedType: update.embedType,
          tags: update.tags,
        };

        if (update.alternateUrl) {
          updateData.alternateUrl = update.alternateUrl;
        }

        await updateIncident(incident.id, updateData);

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
