import { IIncidentExtractor, ExtractedIncident } from './i-incident-extractor';
import { ArticleWithHash } from '../news/deduplication/i-deduplicator';
import { extractIncidentsFromArticles } from '@/lib/incident-extractor';
import { geocodeLocations } from '@/lib/geocoder';
import { isFirestoreAvailable, getDb } from '@/lib/firestore';
import { FirestoreBatchWriter } from '@/lib/firestore-batch';
import { perfMonitor } from '@/lib/performance/monitor';
import { logger } from '@/lib/logger';

export class IncidentExtractorService implements IIncidentExtractor {
  async extractFromArticles(articles: ArticleWithHash[]): Promise<ExtractedIncident[]> {
    if (articles.length === 0) {
      return [];
    }

    if (!isFirestoreAvailable()) {
      logger.warn('firestore_unavailable_extraction_skipped', { articles_count: articles.length });
      return [];
    }

    try {
      logger.info('incident_extraction_started', { articles_count: articles.length });

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
        logger.info('no_incidents_extracted', { articles_count: articles.length });
        return [];
      }

      const uniqueLocations = [...new Set(extractedIncidents.map(i => i.location))];
      logger.info('geocoding_started', { unique_locations_count: uniqueLocations.length });

      const geocodedLocations = await perfMonitor.measure('Geocoding', () =>
        geocodeLocations(uniqueLocations)
      );
      logger.info('geocoding_completed', { geocoded_count: geocodedLocations.size });

      // PERFORMANCE OPTIMIZATION: Use batch writes instead of N sequential writes
      const incidentsToSave = extractedIncidents
        .map(extracted => {
          const geocoded = geocodedLocations.get(extracted.location);

          if (!geocoded) {
            logger.warn('geocoding_failed', { location: extracted.location });
            return null;
          }

          if (extracted.confidence < 40) {
            logger.debug('low_confidence_incident_skipped', {
              confidence: extracted.confidence,
              title: extracted.title,
            });
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

        logger.info('incidents_batch_saved', {
          success_count: result.success,
          failed_count: result.failed,
        });

        if (result.errors.length > 0) {
          logger.error('incidents_batch_write_errors', {
            error_count: result.errors.length,
            errors: result.errors,
          });
        }
      } else {
        logger.info('no_incidents_passed_confidence_threshold', {
          extracted_count: extractedIncidents.length,
        });
      }
      return extractedIncidents;
    } catch (error) {
      logger.error('incident_extraction_failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        articles_count: articles.length,
      });
      return [];
    }
  }
}
