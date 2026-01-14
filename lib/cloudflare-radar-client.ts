
interface BGPHijack {
    time: string;
    detected_at: string;
    hijack_type: string;
    prefix: string;
    victim_as: { asn: number; name: string };
    violator_as: { asn: number; name: string };
    confidence: number;
}

export class CloudflareRadarClient {
    private baseUrl = 'https://api.cloudflare.com/client/v4/radar';
    private apiToken: string | undefined;

    constructor(apiToken?: string) {
        // Prefer passed token, then env var
        this.apiToken = apiToken || process.env.CLOUDFLARE_RADAR_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    }

    /**
     * Get BGP hijacking events for Iranian ASNs
     */
    async getBGPHijacks(
        asns: number[] = [12880, 8529, 6127, 15418] // TIC, DCI, ParsOnline, Asiatech (Major Iranian ASNs)
    ): Promise<BGPHijack[]> {
        if (!this.apiToken) {
            console.warn('CLOUDFLARE_RADAR_API_TOKEN not set. BGP monitoring disabled.');
            return [];
        }

        const hijacks: BGPHijack[] = [];

        // Cloudflare Radar API allows filtering by ASN or country?
        // /radar/bgp/hijacks documentation is sparse but generally supports params.
        // We'll iterate ASNs to be safe as "country=IR" might be noisy or unsupported for this specific endpoint.

        // Note: This is an example implementation. The actual Cloudflare Radar API endpoint might differ slightly
        // in parameters (e.g. 'asn' vs 'victimAsn').
        // Reference: https://developers.cloudflare.com/radar/api/

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const dateStart = oneWeekAgo.toISOString();

        for (const asn of asns) {
            try {
                // v4/radar/bgp/hijacks
                const url = `${this.baseUrl}/bgp/hijacks?dateStart=${dateStart}&victimAsn=${asn}`;

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    // 404 or 400 might mean no data or bad request. Log and continue.
                    continue;
                }

                const data = await response.json();
                if (data.success && Array.isArray(data.result?.hijacks)) {
                    hijacks.push(...data.result.hijacks);
                }
            } catch (e) {
                // Silent fail for individual ASNs to keep dashboard resilient
            }
        }

        return hijacks;
    }

    /**
     * Get Route Leaks
     */
    async getRouteLeaks(
        asns: number[] = [12880, 8529]
    ): Promise<any[]> {
        if (!this.apiToken) return [];

        const leaks: any[] = [];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const dateStart = oneWeekAgo.toISOString();

        for (const asn of asns) {
            try {
                const url = `${this.baseUrl}/bgp/leaks?dateStart=${dateStart}&originAsn=${asn}`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${this.apiToken}` }
                });
                const data = await response.json();
                if (data.success && Array.isArray(data.result?.leaks)) {
                    leaks.push(...data.result.leaks);
                }
            } catch (e) { }
        }
        return leaks;
    }
}
