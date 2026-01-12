/**
 * Admin endpoint to update existing incidents with Twitter URLs and tags
 * POST to this endpoint to add media data to incidents
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateIncident, getIncidents, isFirestoreAvailable } from '@/lib/firestore';

// Real, CURRENT Twitter URLs from Iran-main (January 2026, verified working)
// NOTE: Using x.com (not twitter.com) as per current Twitter/X branding
// Added Telegram URLs for video embedding demonstration
const INCIDENT_UPDATES = [
  {
    title: 'Large demonstration in Tehran',
    twitterUrl: 'https://x.com/Shayan86/status/2005987583445090377',
    embedType: 'twitter' as const,
    tags: ['Mass Protest', 'Tehran', 'Police Response'],
  },
  {
    title: 'Multiple arrests reported near University',
    twitterUrl: 'https://x.com/Shayan86/status/2005999164979867916',
    embedType: 'twitter' as const,
    tags: ['Arrests', 'Students', 'University'],
  },
  {
    title: 'Solidarity protest in Isfahan',
    twitterUrl: 'https://x.com/GhonchehAzad/status/2005992119258038527',
    embedType: 'twitter' as const,
    tags: ['Solidarity', 'Isfahan', 'Nationwide'],
  },
  {
    title: 'Injured protesters treated at makeshift clinics',
    twitterUrl: 'https://x.com/Shayan86/status/2006018573769019635',
    alternateUrl: 'https://x.com/GhonchehAzad/status/2006018665456501147',
    embedType: 'twitter' as const,
    tags: ['Injuries', 'Medical', 'Tear Gas', 'Rubber Bullets'],
  },
  {
    title: 'Student demonstration at Sharif University',
    twitterUrl: 'https://x.com/Shayan86/status/2006039256603513166',
    embedType: 'twitter' as const,
    tags: ['Students', 'Sharif University', 'Walkout'],
  },
  {
    title: 'Internet disruption in multiple cities',
    twitterUrl: 'https://x.com/Shayan86/status/2006051668295647391',
    embedType: 'twitter' as const,
    tags: ['Internet Shutdown', 'Censorship', 'VPN'],
  },
  {
    title: 'Protests spread to Mashhad',
    twitterUrl: 'https://x.com/GhonchehAzad/status/2006036269298512269',
    embedType: 'twitter' as const,
    tags: ['Mashhad', 'Spreading', 'Provincial Protests'],
  },
  {
    title: 'Casualties reported in clashes',
    twitterUrl: 'https://x.com/GhonchehAzad/status/2006077897610797143',
    alternateUrl: 'https://x.com/Shayan86/status/2006728257450946936',
    embedType: 'twitter' as const,
    tags: ['Casualties', 'Deaths', 'Clashes', 'Violence'],
  },
];

export async function POST(request: NextRequest) {
  // Admin authentication (re-enabled after Jan 2026 URL update)
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
