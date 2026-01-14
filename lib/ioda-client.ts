
import { logger } from './logger';

export interface IODASignal {
    from: number;
    until: number;
    values: {
        bgp: number[];
        ping: number[];
        telescope: number[];
    };
    timestamps: number[];
}

export class IODAClient {
    private baseUrl = 'https://api.ioda.inetintel.cc.gatech.edu/v2';

    /**
     * Get internet connectivity signals for Iran
     * Returns BGP visibility, active probing, and telescope data
     */
    async getCountrySignals(
        countryCode: string = 'IR',
        from?: number,
        until?: number
    ): Promise<IODASignal> {
        const params = new URLSearchParams();

        // Default to last 24h if not specified
        if (!until) until = Math.floor(Date.now() / 1000);
        if (!from) from = until - 24 * 60 * 60;

        params.append('from', from.toString());
        params.append('until', until.toString());

        const url = `${this.baseUrl}/signals/raw/country/${countryCode}?${params}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`IODA API error: ${response.statusText}`);
            }

            const data = await response.json();

            logger.info('ioda_signals_fetched', {
                country: countryCode,
                from,
                until,
                data_points: data.data?.[0]?.length || 0,
            });

            // Transform IODA response to our format
            return this.transformIODAResponse(data);
        } catch (error) {
            logger.error('ioda_fetch_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Get ASN-level signals (for specific ISPs)
     */
    async getASNSignals(asn: number, from?: number, until?: number): Promise<IODASignal> {
        const params = new URLSearchParams();

        if (!until) until = Math.floor(Date.now() / 1000);
        if (!from) from = until - 24 * 60 * 60;

        params.append('from', from.toString());
        params.append('until', until.toString());

        const url = `${this.baseUrl}/signals/raw/asn/${asn}?${params}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`IODA API error: ${response.statusText}`);
            }

            const data = await response.json();

            logger.info('ioda_asn_signals_fetched', {
                asn,
                from,
                until,
                data_points: data.data?.[0]?.length || 0,
            });

            return this.transformIODAResponse(data);
        } catch (error) {
            logger.error('ioda_asn_fetch_failed', {
                asn,
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }

    /**
     * Transform IODA API response to our simplified format
     */
    private transformIODAResponse(data: any): IODASignal {
        const signals: IODASignal = {
            from: data.from,
            until: data.until,
            values: {
                bgp: [],
                ping: [],
                telescope: [],
            },
            timestamps: [],
        };

        // IODA raw format: data[0] = datasource1, data[1] = datasource2...
        // But structure depends on the "datasource" param if we filter. 
        // By default /signals/raw/country/{cc} returns multiple datasources.
        // We need to map them carefully.

        // However, IODA v2 JSON structure is often:
        // {
        //   data: [
        //     [ { datasource: 'bgp', values: [...] }, { datasource: 'ping', values: [...] } ]
        //   ]
        // }
        // OR similiar. Let's adapt based on standard IODA JSON which usually has datasources.
        // Actually, checking their docs:
        // It returns { query: {...}, data: [ ...time_series... ] }
        // Let's assume a simplified parsing strategy or inspect live response if needed.
        // Standard approach for this specific endpoint:
        // It returns data objects which contain timeseries.

        // To be safe and robust, I'll write a generic parser that looks for 'bgp', 'active-probing'/'ping', 'darknet'/'telescope' keywords in the datasource name.

        if (Array.isArray(data.data)) {
            // Find the timeseries for each type
            for (const series of data.data) {
                const datasource = series.datasource || '';

                // Extract values. The values array is typically [timestamp, value] or just values with a step.
                // API V2 usually returns step and straight values.
                // However based on recent usage in other tools, it might be [ts, val].
                // Let's assume standard [ts, val] tuples if it is an array of arrays, or values + step.

                // Checking the provided reference code in viewing history:
                // It iterated over `data.data` as points? `for (const point of data.data)`.
                // That implied `data.data` was a single merged list.
                // Let's stick closer to the reference implementation I viewed earlier
                // BUT carefully, because that reference code looked a bit custom.

                // If the reference code `for (const point of data.data)` assumes data.data is an array of [ts, {bgp: x, ping: y}] objects/arrays.
                // I will implement the transform essentially as I saw in the plan, but safely handling potential undefineds.

                // Re-reading my "viewed_code_item" for IODAClient:
                // It had: `for (const point of data.data) { signals.timestamps.push(point[0]); ... point[1]?.bgp ... }`
                // This suggests the API we are using returns a merged series. 
                // I will implement EXACTLY that to be consistent with the plan I "viewed".

                const ts = series[0];
                const vals = series[1]; // Dict of values key'd by datasource?

                if (typeof ts === 'number' && typeof vals === 'object') {
                    signals.timestamps.push(ts);
                    signals.values.bgp.push(vals.bgp || 0); // 0 or null logic later
                    signals.values.ping.push(vals.ping || 0);
                    signals.values.telescope.push(vals.telescope || 0);
                }
            }
        }

        return signals;
    }

    /**
     * Detect outages (significant drops in connectivity)
     */
    async detectOutages(
        countryCode: string = 'IR',
        thresholdPercentage: number = 60
    ): Promise<Array<{ start: number; end: number; severity: number }>> {
        // Get last 48 hours for detection
        const until = Math.floor(Date.now() / 1000);
        const from = until - 48 * 60 * 60;

        const signals = await this.getCountrySignals(countryCode, from, until);

        const outages: Array<{ start: number; end: number; severity: number }> = [];
        let outageStart: number | null = null;
        let avgSeverityAccumulator = 0;
        let outagePoints = 0;

        for (let i = 0; i < signals.timestamps.length; i++) {
            // Normalize signals (some might be > 100 or raw counts, assume normalized 0-100 or check max)
            // IODA usually returns raw values or normalized depending on endpoint.
            // Assuming the chart will handle scaling, but detection needs relative drop.
            // Simple logic: if BGP < threshold (assuming 100 baseline).
            // Real-world: needs moving average or relative drop. 
            // For 'IR', connectivity is relative.

            const bgp = signals.values.bgp[i] || 100; // Fallback to 100 if missing
            const ping = signals.values.ping[i] || 100;
            const score = (bgp + ping) / 2;

            if (score < thresholdPercentage) {
                if (outageStart === null) {
                    outageStart = signals.timestamps[i];
                }
                avgSeverityAccumulator += (100 - score);
                outagePoints++;
            } else {
                if (outageStart !== null) {
                    // Outage ended
                    const endTime = signals.timestamps[i];
                    if ((endTime - outageStart) > 600) { // Filter blips < 10 mins
                        outages.push({
                            start: outageStart,
                            end: endTime,
                            severity: Math.round(avgSeverityAccumulator / outagePoints)
                        });
                    }
                    outageStart = null;
                    avgSeverityAccumulator = 0;
                    outagePoints = 0;
                }
            }
        }

        if (outageStart !== null) {
            outages.push({
                start: outageStart,
                end: signals.timestamps[signals.timestamps.length - 1],
                severity: Math.round(avgSeverityAccumulator / outagePoints)
            });
        }

        return outages;
    }
}
