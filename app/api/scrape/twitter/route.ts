import { NextRequest, NextResponse } from 'next/server';
import { scrapeTwitter, estimateCost } from '@/lib/twitter-scraper';

/**
 * GET /api/scrape/twitter
 * Scrape tweets from Persian uprising hashtags
 *
 * Query params:
 * - maxTweets: Maximum tweets to scrape (default: 50, min: 50 per Apify requirement)
 * - hoursBack: Hours to look back (default: 1)
 * - dryRun: If true, only return cost estimate without scraping
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const maxTweets = parseInt(searchParams.get('maxTweets') || '50');
    const hoursBack = parseInt(searchParams.get('hoursBack') || '1');
    const dryRun = searchParams.get('dryRun') === 'true';

    // Validate parameters
    if (maxTweets < 50) {
      return NextResponse.json(
        { error: 'maxTweets must be at least 50 (Apify requirement)' },
        { status: 400 }
      );
    }

    if (hoursBack < 1 || hoursBack > 72) {
      return NextResponse.json(
        { error: 'hoursBack must be between 1 and 72' },
        { status: 400 }
      );
    }

    // Calculate estimated cost
    const estimatedCost = estimateCost(maxTweets);

    // If dry run, just return cost estimate
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        parameters: {
          maxTweets,
          hoursBack,
        },
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        message: 'This is a dry run. No tweets were scraped.',
      });
    }

    console.log(`🐦 Starting Twitter scrape: maxTweets=${maxTweets}, hoursBack=${hoursBack}`);
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Scrape Twitter
    const articles = await scrapeTwitter(maxTweets, hoursBack);

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No tweets found or scraping failed',
        articles: [],
        count: 0,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
      });
    }

    // In a real app, you would save these to DynamoDB here
    // For now, we just return them

    return NextResponse.json({
      success: true,
      articles,
      count: articles.length,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      parameters: {
        maxTweets,
        hoursBack,
      },
    });

  } catch (error) {
    console.error('Error in /api/scrape/twitter:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape Twitter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scrape/twitter
 * Trigger Twitter scraping and store results
 *
 * Body:
 * - maxTweets: Maximum tweets to scrape (default: 50)
 * - hoursBack: Hours to look back (default: 1)
 * - saveToDb: Whether to save to database (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { maxTweets = 50, hoursBack = 1, saveToDb = true } = body;

    // Validate parameters
    if (maxTweets < 50) {
      return NextResponse.json(
        { error: 'maxTweets must be at least 50 (Apify requirement)' },
        { status: 400 }
      );
    }

    const estimatedCost = estimateCost(maxTweets);
    console.log(`🐦 Twitter scrape triggered: maxTweets=${maxTweets}, hoursBack=${hoursBack}`);
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Scrape Twitter
    const articles = await scrapeTwitter(maxTweets, hoursBack);

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No tweets found or scraping failed',
        savedCount: 0,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
      });
    }

    // TODO: Save to DynamoDB when AWS infrastructure is set up
    if (saveToDb) {
      console.log(`💾 Would save ${articles.length} articles to DynamoDB (not implemented yet)`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scraped ${articles.length} tweets`,
      scrapedCount: articles.length,
      savedCount: saveToDb ? articles.length : 0,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      articles: articles.slice(0, 5), // Return first 5 as preview
    });

  } catch (error) {
    console.error('Error in /api/scrape/twitter:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape Twitter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
