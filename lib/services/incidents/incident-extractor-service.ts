import { IIncidentExtractor, ExtractedIncident } from './i-incident-extractor';
import { ArticleWithHash } from '../news/deduplication/i-deduplicator';
import { extractIncidentsFromArticles } from '@/lib/incident-extractor';
import { geocodeLocations } from '@/lib/geocoder';
import { isFirestoreAvailable, getDb } from '@/lib/firestore';
import { FirestoreBatchWriter } from '@/lib/firestore-batch';
import { perfMonitor } from '@/lib/performance/monitor';

export class IncidentExtractorService implements IIncidentExtractor {
  async extractFromArticles(articles: ArticleWithHash[]): Promise<ExtractedIncident[]> {
    if (articles.length === 0) {
      return [];
    }

    if (!isFirestoreAvailable()) {
      console.warn('⚠️ Firestore not available, skipping incident extraction');
      return [];
    }

    try {
      console.log(`🔍 Auto-extracting incidents from ${articles.length} articles...`);

      const articlesForExtraction = articles.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        url: a.sourceUrl || '',
        source: a.source,
        publishedAt: typeof a.publishedAt === 'number'
          ? new Date(a.publishedAt).toISOString()
          : a.publishedAt,
      }));

      const extractedIncidents = extractIncidentsFromArticles(articlesForExtraction);

      if (extractedIncidents.length === 0) {
        console.log('ℹ️  No incidents extracted from articles');
        return [];
      }

      const uniqueLocations = [...new Set(extractedIncidents.map(i => i.location))];
      console.log(`🗺️ Geocoding ${uniqueLocations.length} unique locations...`);

      const geocodedLocations = await perfMonitor.measure('Geocoding', () =>
        geocodeLocations(uniqueLocations)
      );
      console.log(`✅ Geocoded ${geocodedLocations.size} locations`);

      // PERFORMANCE OPTIMIZATION: Use batch writes instead of N sequential writes
      const incidentsToSave = extractedIncidents
        .map(extracted => {
          const geocoded = geocodedLocations.get(extracted.location);

          if (!geocoded) {
            console.log(`⚠️ Failed to geocode: ${extracted.location}`);
            return null;
          }

          if (extracted.confidence < 40) {
            console.log(`⚠️ Skipping low-confidence incident (${extracted.confidence}): ${extracted.title}`);
            return null;
          }

          return {
            data: {
              type: extracted.type,
              title: extracted.title.substring(0, 200),
              description: extracted.description.substring(0, 500),
              location: {
                lat: geocoded.lat,
                lon: geocoded.lon,
                address: geocoded.address,
              },
              verified: false,
              reportedBy: 'official' as const,
              timestamp: extracted.timestamp,
              upvotes: 0,
              confidence: extracted.confidence,
              keywords: extracted.keywords,
              relatedArticles: extracted.extractedFrom ? [{
                title: extracted.extractedFrom.articleTitle,
                url: extracted.extractedFrom.articleUrl,
                source: extracted.extractedFrom.source
              }] : undefined,
            }
          };
        })
        .filter((incident): incident is { data: any } => incident !== null);

      if (incidentsToSave.length > 0) {
        const db = getDb();
        const batchWriter = new FirestoreBatchWriter(db);
        const result = await perfMonitor.measure('Batch write incidents', () =>
          batchWriter.writeBatch('incidents', incidentsToSave)
        );

        console.log(`💾 Batch saved ${result.success} incidents, ${result.failed} failed`);

        if (result.errors.length > 0) {
          console.error('Batch write errors:', result.errors);
        }
      } else {
        console.log('ℹ️  No incidents passed confidence threshold');
      }
      return extractedIncidents;
    } catch (error) {
      console.error('Error in incident extraction:', error);
      return [];
    }
  }
}
