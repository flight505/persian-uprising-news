
import { logger } from '@/lib/logger';

interface OONIMeasurement {
    measurement_uid: string;
    test_name: string;
    measurement_start_time: string;
    probe_cc: string;
    probe_asn: string;
    input: string;
    anomaly: boolean;
    confirmed: boolean;
    failure: boolean;
    scores: any;
}

export class OONIClient {
    private baseUrl = 'https://api.ooni.io/api/v1';

    /**
     * Get recent measurements for Iran
     * specialized for social media and messaging apps
     */
    async getMeasurements(
        countryCode: string = 'IR',
        domain: string = 'twitter.com',
        limit: number = 50
    ): Promise<OONIMeasurement[]> {
        const params = new URLSearchParams({
            probe_cc: countryCode,
            input: `https://${domain}/`,
            limit: limit.toString(),
            order_by: 'measurement_start_time',
            order: 'desc'
        });

        const url = `${this.baseUrl}/measurements?${params}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OONI API error: ${response.statusText}`);
            }

            const data = await response.json();

            // OONI returns { metadata: {}, results: [] }
            return data.results || [];

        } catch (error) {
            console.error('OONI Fetch Error', error);
            return [];
        }
    }

    /**
     * Get aggregate stats for critical services in the last 24h
     */
    async getCensorshipSummary(countryCode: string = 'IR') {
        const targets = [
            'twitter.com',
            'instagram.com',
            'telegram.org',
            'whatsapp.com',
            'youtube.com'
        ];

        const summary = [];

        for (const target of targets) {
            const measurements = await this.getMeasurements(countryCode, target, 20);
            const total = measurements.length;
            const anomalies = measurements.filter(m => m.anomaly || m.confirmed).length;
            const failures = measurements.filter(m => m.failure).length;
            const ok = total - anomalies - failures;

            summary.push({
                domain: target,
                total,
                blocked: anomalies, // anomalies usually mean blocking in OONI context for these known sites
                accessible: ok,
                status: anomalies > (total * 0.5) ? 'Blocked' : anomalies > 0 ? 'Partial' : 'Accessible'
            });
        }

        return summary;
    }
}
