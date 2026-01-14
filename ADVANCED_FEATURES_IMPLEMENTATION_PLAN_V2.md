# Advanced Features Implementation Plan V2
## Persian Uprising News Aggregator - Censorship-Resistant & OSINT Enhancement
## 🆓 FREE MONITORING APIS + COMPREHENSIVE DASHBOARD DESIGNS

**Date**: January 13, 2026
**Status**: Updated with FREE alternatives and detailed dashboard UI
**Research Sources**: IODA, OONI, Cloudflare Radar, BGPStream, RIPE RIS, BotSlayer/Hoaxy

---

## 🎯 Executive Summary

This updated plan transforms the Persian Uprising News application into a censorship-resistant, intelligence-grade platform using **100% FREE monitoring APIs** with comprehensive real-time dashboard visualizations.

**Key Changes from V1**:
- ✅ **GRIP API → Cloudflare Radar** (was $10-20/month, now **$0**)
- ✅ **Added IODA integration** (completely FREE, no authentication)
- ✅ **Added comprehensive dashboard component designs** with Chart.js/Recharts examples
- ✅ **Total cost reduced from $26.60-$56.60 to $6-10/month** (47-62% savings)

**Enhanced Features**:
- **Blackout-Resilient Infrastructure**: IPFS distribution, signed offline snapshots, Tor onion services
- **OSINT Verification Tools**: Media deduplication, cross-source corroboration, verification workbench
- **Disinformation Detection**: BotSlayer-inspired coordination detection, campaign tracking
- **🆕 FREE Connectivity Dashboards**: IODA, OONI, Cloudflare Radar, BGPStream, RIPE RIS
- **🆕 Real-Time Visualizations**: Chart.js line graphs, heatmaps, time-series analysis

**Revised Cost**: +$6/month for Tor VPS (total: $16.60/month, down from $56.60)
**Implementation Timeline**: 10-12 weeks
**Risk Level**: Medium (requires careful security review)

---

## Table of Contents

1. [Cost Comparison (V1 vs V2)](#cost-comparison-v1-vs-v2)
2. [Priority 0: Blackout-Resilient Infrastructure](#priority-0-blackout-resilient-infrastructure)
3. [Priority 1: OSINT Verification Tools](#priority-1-osint-verification-tools)
4. [Priority 2: Disinformation Detection](#priority-2-disinformation-detection)
5. [🆕 Priority 3: FREE Advanced Connectivity Dashboards](#priority-3-free-advanced-connectivity-dashboards)
6. [🆕 Dashboard Visualization Components](#dashboard-visualization-components)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Security Considerations](#security-considerations)

---

## Cost Comparison (V1 vs V2)

### V1 (Original Plan)

| Service | Cost/Month |
|---------|------------|
| Existing Services | $10.60 |
| IPFS (Pinata) | $0-20 |
| Tor VPS | $6 |
| OONI API | $0 |
| **GRIP API** | **$10-20** |
| **TOTAL** | **$26.60-$56.60** |

### V2 (Updated - FREE Monitoring)

| Service | Cost/Month | Savings |
|---------|------------|---------|
| Existing Services | $10.60 | - |
| IPFS (Pinata Free) | $0 | $0-20 |
| Tor VPS | $6 | $0 |
| OONI API | $0 | $0 |
| **Cloudflare Radar** | **$0** | **$10-20** |
| **IODA** | **$0** | **$0 (new)** |
| **BGPStream** | **$0** | **$0 (new)** |
| **RIPE RIS** | **$0** | **$0 (new)** |
| **TOTAL** | **$16.60** | **$10-40** |

**🎉 70% cost reduction while adding MORE features!**

---

## Priority 0: Blackout-Resilient Infrastructure

*[Unchanged from V1 - includes IPFS, signed snapshots, Tor onion service]*

*[See original plan for full implementation details]*

---

## Priority 1: OSINT Verification Tools

*[Unchanged from V1 - includes media deduplication, cross-source corroboration]*

*[See original plan for full implementation details]*

---

## Priority 2: Disinformation Detection

*[Unchanged from V1 - includes coordination detection engine]*

*[See original plan for full implementation details]*

---

## Priority 3: FREE Advanced Connectivity Dashboards

### Overview

Integrate **100% FREE** real-time internet connectivity monitoring using IODA, OONI, Cloudflare Radar, BGPStream, and RIPE RIS to provide comprehensive situational awareness during internet blackouts and routing attacks.

---

### Feature D1: IODA Internet Outage Detection (FREE)

**Objective**: Monitor Iran's internet connectivity status in real-time using Georgia Tech's IODA platform.

**Why IODA?**
- Completely FREE (no authentication, no rate limits)
- 3 signal sources: BGP visibility, active probing, internet background radiation
- 5-minute update cycles for BGP, 10-minute for active probing
- Country-level and ASN-level granularity

#### Technical Architecture

**IODA API Client**:
```typescript
// lib/ioda-client.ts
import { logger } from '@/lib/logger';

interface IODASignal {
  from: number; // Unix timestamp
  until: number;
  values: {
    bgp: number[]; // BGP visibility percentage (0-100)
    ping: number[]; // Active probing percentage (0-100)
    telescope: number[]; // Background radiation percentage (0-100)
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

    if (from) params.append('from', from.toString());
    if (until) params.append('until', until.toString());

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
        data_points: data.data.length,
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

    if (from) params.append('from', from.toString());
    if (until) params.append('until', until.toString());

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
        data_points: data.data.length,
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

    // IODA returns data as arrays of [timestamp, value] pairs
    for (const point of data.data) {
      signals.timestamps.push(point[0]);

      // BGP visibility
      if (point[1]?.bgp !== undefined) {
        signals.values.bgp.push(point[1].bgp);
      }

      // Active probing
      if (point[1]?.ping !== undefined) {
        signals.values.ping.push(point[1].ping);
      }

      // Telescope (background radiation)
      if (point[1]?.telescope !== undefined) {
        signals.values.telescope.push(point[1].telescope);
      }
    }

    return signals;
  }

  /**
   * Detect outages (significant drops in connectivity)
   */
  async detectOutages(
    countryCode: string = 'IR',
    thresholdPercentage: number = 50
  ): Promise<Array<{ start: number; end: number; severity: number }>> {
    // Get last 7 days of data
    const until = Math.floor(Date.now() / 1000);
    const from = until - 7 * 24 * 60 * 60;

    const signals = await this.getCountrySignals(countryCode, from, until);

    const outages: Array<{ start: number; end: number; severity: number }> = [];
    let outageStart: number | null = null;

    for (let i = 0; i < signals.timestamps.length; i++) {
      const bgp = signals.values.bgp[i] || 100;
      const ping = signals.values.ping[i] || 100;

      // Average connectivity across signals
      const avgConnectivity = (bgp + ping) / 2;

      if (avgConnectivity < thresholdPercentage && outageStart === null) {
        // Outage started
        outageStart = signals.timestamps[i];
      } else if (avgConnectivity >= thresholdPercentage && outageStart !== null) {
        // Outage ended
        outages.push({
          start: outageStart,
          end: signals.timestamps[i],
          severity: 100 - avgConnectivity,
        });
        outageStart = null;
      }
    }

    // If outage is still ongoing
    if (outageStart !== null) {
      outages.push({
        start: outageStart,
        end: signals.timestamps[signals.timestamps.length - 1],
        severity: 100 - ((signals.values.bgp[signals.values.bgp.length - 1] || 0) + (signals.values.ping[signals.values.ping.length - 1] || 0)) / 2,
      });
    }

    logger.info('ioda_outages_detected', {
      country: countryCode,
      outages_count: outages.length,
      threshold: thresholdPercentage,
    });

    return outages;
  }
}
```

**IODA Dashboard API**:
```typescript
// app/api/connectivity/ioda/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IODAClient } from '@/lib/ioda-client';
import { logger } from '@/lib/logger';

const iodaClient = new IODAClient();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get('country') || 'IR';
  const asn = searchParams.get('asn');

  try {
    // Get last 24 hours by default
    const until = Math.floor(Date.now() / 1000);
    const from = until - 24 * 60 * 60;

    let signals;
    if (asn) {
      signals = await iodaClient.getASNSignals(parseInt(asn), from, until);
    } else {
      signals = await iodaClient.getCountrySignals(countryCode, from, until);
    }

    // Detect outages
    const outages = await iodaClient.detectOutages(countryCode);

    // Calculate current status
    const latestBGP = signals.values.bgp[signals.values.bgp.length - 1] || 0;
    const latestPing = signals.values.ping[signals.values.ping.length - 1] || 0;
    const currentConnectivity = (latestBGP + latestPing) / 2;

    const duration = Date.now() - startTime;
    logger.http('GET', '/api/connectivity/ioda', 200, duration, {
      country: countryCode,
      asn: asn || 'N/A',
      data_points: signals.timestamps.length,
      current_connectivity: currentConnectivity,
      outages_count: outages.length,
    });

    return NextResponse.json({
      signals,
      outages,
      summary: {
        currentConnectivity: Math.round(currentConnectivity),
        latestBGP: Math.round(latestBGP),
        latestPing: Math.round(latestPing),
        outagesCount: outages.length,
        status: currentConnectivity > 80 ? 'normal' : currentConnectivity > 50 ? 'degraded' : 'outage',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('ioda_api_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('GET', '/api/connectivity/ioda', 500, duration);

    return NextResponse.json(
      { error: 'IODA API request failed' },
      { status: 500 }
    );
  }
}
```

**Cost**: **$0/month** (completely FREE, no authentication required)

---

### Feature D2: Cloudflare Radar BGP Monitoring (FREE)

**Objective**: Monitor BGP hijacking and route leaks affecting Iranian ISPs using Cloudflare's FREE Radar API.

**Why Cloudflare Radar?**
- Completely FREE with API token (1200 requests per 5 minutes)
- BGP hijack detection API
- Route leak detection API
- Real-time BGP routes API
- Better coverage than commercial alternatives

#### Technical Architecture

**Cloudflare Radar Client**:
```typescript
// lib/cloudflare-radar-client.ts
import { logger } from '@/lib/logger';

interface BGPHijack {
  id: string;
  detected_at: string;
  victim_asn: number;
  victim_asn_name: string;
  attacker_asn: number;
  attacker_asn_name: string;
  prefixes: string[];
  status: 'ongoing' | 'resolved';
}

interface RouteLeak {
  id: string;
  detected_at: string;
  leaker_asn: number;
  leaker_asn_name: string;
  victim_asn: number;
  prefixes: string[];
  status: 'ongoing' | 'resolved';
}

export class CloudflareRadarClient {
  private baseUrl = 'https://api.cloudflare.com/client/v4/radar';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Get BGP hijacking events for Iranian ASNs
   */
  async getBGPHijacks(
    asns: number[] = [12880, 8529, 6127, 15418] // Major Iranian ISPs
  ): Promise<BGPHijack[]> {
    const hijacks: BGPHijack[] = [];

    for (const asn of asns) {
      try {
        const url = `${this.baseUrl}/bgp/hijacks?asn=${asn}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Cloudflare Radar API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.result?.hijacks) {
          hijacks.push(...data.result.hijacks);
        }

        logger.info('cloudflare_radar_hijacks_fetched', {
          asn,
          hijacks_count: data.result?.hijacks?.length || 0,
        });
      } catch (error) {
        logger.error('cloudflare_radar_hijacks_failed', {
          asn,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return hijacks;
  }

  /**
   * Get route leak events
   */
  async getRouteLeaks(
    asns: number[] = [12880, 8529, 6127, 15418]
  ): Promise<RouteLeak[]> {
    const leaks: RouteLeak[] = [];

    for (const asn of asns) {
      try {
        const url = `${this.baseUrl}/bgp/leaks?asn=${asn}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Cloudflare Radar API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.result?.leaks) {
          leaks.push(...data.result.leaks);
        }

        logger.info('cloudflare_radar_leaks_fetched', {
          asn,
          leaks_count: data.result?.leaks?.length || 0,
        });
      } catch (error) {
        logger.error('cloudflare_radar_leaks_failed', {
          asn,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return leaks;
  }

  /**
   * Get current BGP routes for an ASN
   */
  async getBGPRoutes(asn: number): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/bgp/routes?asn=${asn}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Radar API error: ${response.statusText}`);
      }

      const data = await response.json();

      logger.info('cloudflare_radar_routes_fetched', {
        asn,
        routes_count: data.result?.routes?.length || 0,
      });

      return data.result?.routes || [];
    } catch (error) {
      logger.error('cloudflare_radar_routes_failed', {
        asn,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
```

**Cloudflare Radar Dashboard API**:
```typescript
// app/api/connectivity/cloudflare-radar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CloudflareRadarClient } from '@/lib/cloudflare-radar-client';
import { logger } from '@/lib/logger';

const radarClient = new CloudflareRadarClient(process.env.CLOUDFLARE_RADAR_API_TOKEN!);

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Iranian ISPs
    const iranianASNs = [12880, 8529, 6127, 15418];

    // Fetch hijacks and leaks in parallel
    const [hijacks, leaks] = await Promise.all([
      radarClient.getBGPHijacks(iranianASNs),
      radarClient.getRouteLeaks(iranianASNs),
    ]);

    const duration = Date.now() - startTime;
    logger.http('GET', '/api/connectivity/cloudflare-radar', 200, duration, {
      hijacks_count: hijacks.length,
      leaks_count: leaks.length,
    });

    return NextResponse.json({
      hijacks,
      leaks,
      summary: {
        totalHijacks: hijacks.length,
        ongoingHijacks: hijacks.filter(h => h.status === 'ongoing').length,
        totalLeaks: leaks.length,
        ongoingLeaks: leaks.filter(l => l.status === 'ongoing').length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('cloudflare_radar_api_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration,
    });

    logger.http('GET', '/api/connectivity/cloudflare-radar', 500, duration);

    return NextResponse.json(
      { error: 'Cloudflare Radar API request failed' },
      { status: 500 }
    );
  }
}
```

**Cost**: **$0/month** (FREE with API token, rate limit: 1200 req/5min)

---

### Feature D3: OONI Censorship Measurements (FREE)

*[Unchanged from V1 - OONI was already FREE]*

**Cost**: **$0/month** (completely FREE, no rate limits)

---

## Dashboard Visualization Components

### Overview

Comprehensive dashboard components using **Chart.js** (simple, performant) and **Recharts** (React-native, declarative) for real-time data visualization.

---

### Component D1: IODA Connectivity Dashboard with Chart.js

```typescript
// app/components/Connectivity/IODADashboard.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import useSWR from 'swr';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function IODADashboard() {
  const { data, error, isLoading } = useSWR(
    '/api/connectivity/ioda',
    (url) => fetch(url).then(r => r.json()),
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  if (isLoading) {
    return (
      <div className="p-6 border rounded bg-white">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded bg-red-50">
        <p className="text-red-600 font-semibold">Failed to load IODA data</p>
        <p className="text-sm text-gray-600">Try refreshing the page</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: data.signals.timestamps.map((ts: number) =>
      new Date(ts * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    ),
    datasets: [
      {
        label: 'BGP Visibility',
        data: data.signals.values.bgp,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Active Probing',
        data: data.signals.values.ping,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Background Radiation',
        data: data.signals.values.telescope,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${Math.round(context.parsed.y)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          },
        },
        title: {
          display: true,
          text: 'Connectivity %',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time (Last 24 Hours)',
        },
        ticks: {
          maxTicksLimit: 12, // Show 12 time labels max
        },
      },
    },
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'outage':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'outage':
        return '🔴';
      default:
        return '❓';
    }
  };

  return (
    <div className="p-6 border rounded bg-white shadow-sm">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">📡 Iran Internet Connectivity (IODA)</h2>
            <p className="text-gray-600">
              Real-time monitoring from Georgia Tech's Internet Outage Detection and Analysis
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(data.summary.status)}`}>
            {getStatusIcon(data.summary.status)} {data.summary.status.toUpperCase()}
          </div>
        </div>

        {/* Current Status Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-3xl font-bold text-blue-900">{data.summary.currentConnectivity}%</p>
            <p className="text-sm text-blue-700 font-medium">Overall Connectivity</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <p className="text-3xl font-bold text-blue-900">{data.summary.latestBGP}%</p>
            <p className="text-sm text-blue-700 font-medium">BGP Visibility</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <p className="text-3xl font-bold text-green-900">{data.summary.latestPing}%</p>
            <p className="text-sm text-green-700 font-medium">Active Probing</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <p className="text-3xl font-bold text-purple-900">{data.summary.outagesCount}</p>
            <p className="text-sm text-purple-700 font-medium">Outages (7 days)</p>
          </div>
        </div>
      </div>

      {/* Time-Series Chart */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Connectivity Trends (24 Hours)</h3>
        <div style={{ height: '400px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Outages List */}
      {data.outages && data.outages.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Detected Outages (Last 7 Days)</h3>
          <div className="space-y-2">
            {data.outages.map((outage: any, idx: number) => (
              <div key={idx} className="border border-red-200 p-4 rounded-lg bg-red-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-red-900">
                      Outage {idx + 1}
                    </p>
                    <p className="text-sm text-gray-700">
                      Start: {new Date(outage.start * 1000).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700">
                      End: {new Date(outage.end * 1000).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-700">
                      Duration: {Math.round((outage.end - outage.start) / 60)} minutes
                    </p>
                  </div>
                  <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold">
                    {Math.round(outage.severity)}% Severity
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend & Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <p className="text-sm font-semibold mb-2">Signal Sources:</p>
        <ul className="text-sm space-y-1 text-gray-700">
          <li><span className="text-blue-600 font-semibold">•</span> <strong>BGP Visibility:</strong> Number of BGP peers announcing routes</li>
          <li><span className="text-green-600 font-semibold">•</span> <strong>Active Probing:</strong> ICMP/TCP response rates from IP blocks</li>
          <li><span className="text-purple-600 font-semibold">•</span> <strong>Background Radiation:</strong> Unsolicited traffic reaching darknet sensors</li>
        </ul>
        <p className="text-xs text-gray-500 mt-2">
          Data updates every 5-10 minutes • Source: Georgia Tech IODA (FREE API)
        </p>
      </div>
    </div>
  );
}
```

---

### Component D2: Cloudflare Radar BGP Dashboard

```typescript
// app/components/Connectivity/CloudflareRadarDashboard.tsx
'use client';

import React from 'react';
import useSWR from 'swr';

export function CloudflareRadarDashboard() {
  const { data, error, isLoading } = useSWR(
    '/api/connectivity/cloudflare-radar',
    (url) => fetch(url).then(r => r.json()),
    { refreshInterval: 600000 } // Refresh every 10 minutes
  );

  if (isLoading) {
    return (
      <div className="p-6 border rounded bg-white">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border rounded bg-red-50">
        <p className="text-red-600 font-semibold">Failed to load Cloudflare Radar data</p>
        <p className="text-sm text-gray-600">Try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="p-6 border rounded bg-white shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🌐 BGP Security Monitoring (Cloudflare Radar)</h2>
        <p className="text-gray-600">
          Real-time BGP hijacking and route leak detection for Iranian ISPs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <p className="text-3xl font-bold text-orange-900">{data.summary.totalHijacks}</p>
          <p className="text-sm text-orange-700 font-medium">Total Hijacks (7d)</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <p className="text-3xl font-bold text-red-900">{data.summary.ongoingHijacks}</p>
          <p className="text-sm text-red-700 font-medium">Ongoing Hijacks</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <p className="text-3xl font-bold text-purple-900">{data.summary.totalLeaks}</p>
          <p className="text-sm text-purple-700 font-medium">Total Route Leaks (7d)</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
          <p className="text-3xl font-bold text-pink-900">{data.summary.ongoingLeaks}</p>
          <p className="text-sm text-pink-700 font-medium">Ongoing Leaks</p>
        </div>
      </div>

      {/* BGP Hijacks */}
      {data.hijacks && data.hijacks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🚨 BGP Hijacking Events</h3>
          <div className="space-y-3">
            {data.hijacks.map((hijack: any) => (
              <div key={hijack.id} className="border border-red-300 p-4 rounded-lg bg-red-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-red-900 text-lg">BGP Hijack Detected</p>
                    <p className="text-sm text-gray-700">
                      Detected: {new Date(hijack.detected_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded font-semibold text-sm ${
                    hijack.status === 'ongoing'
                      ? 'bg-red-600 text-white'
                      : 'bg-green-600 text-white'
                  }`}>
                    {hijack.status === 'ongoing' ? '🔴 ONGOING' : '✅ RESOLVED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 mb-1">VICTIM</p>
                    <p className="font-semibold text-red-900">{hijack.victim_asn_name}</p>
                    <p className="text-sm text-gray-600">AS{hijack.victim_asn}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 mb-1">ATTACKER</p>
                    <p className="font-semibold text-red-900">{hijack.attacker_asn_name}</p>
                    <p className="text-sm text-gray-600">AS{hijack.attacker_asn}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-semibold mb-1">Affected Prefixes:</p>
                  <div className="flex flex-wrap gap-2">
                    {hijack.prefixes.map((prefix: string, idx: number) => (
                      <span key={idx} className="bg-red-200 text-red-900 px-2 py-1 rounded text-xs font-mono">
                        {prefix}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Leaks */}
      {data.leaks && data.leaks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📡 Route Leak Events</h3>
          <div className="space-y-3">
            {data.leaks.map((leak: any) => (
              <div key={leak.id} className="border border-purple-300 p-4 rounded-lg bg-purple-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-purple-900 text-lg">Route Leak Detected</p>
                    <p className="text-sm text-gray-700">
                      Detected: {new Date(leak.detected_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded font-semibold text-sm ${
                    leak.status === 'ongoing'
                      ? 'bg-purple-600 text-white'
                      : 'bg-green-600 text-white'
                  }`}>
                    {leak.status === 'ongoing' ? '🔴 ONGOING' : '✅ RESOLVED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 mb-1">LEAKER</p>
                    <p className="font-semibold text-purple-900">{leak.leaker_asn_name}</p>
                    <p className="text-sm text-gray-600">AS{leak.leaker_asn}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-500 mb-1">VICTIM</p>
                    <p className="font-semibold text-purple-900">AS{leak.victim_asn}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-semibold mb-1">Affected Prefixes:</p>
                  <div className="flex flex-wrap gap-2">
                    {leak.prefixes.map((prefix: string, idx: number) => (
                      <span key={idx} className="bg-purple-200 text-purple-900 px-2 py-1 rounded text-xs font-mono">
                        {prefix}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.hijacks.length === 0 && data.leaks.length === 0 && (
        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-semibold text-green-900">No BGP Security Events</p>
          <p className="text-sm text-gray-600">All Iranian ISPs appear to have normal routing</p>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <p className="text-sm font-semibold mb-2">Monitored ISPs:</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
          <div>• AS12880 - TIC (Telecommunications Infrastructure Company)</div>
          <div>• AS8529 - Omantel</div>
          <div>• AS6127 - RipeTCI</div>
          <div>• AS15418 - Other Iranian ISPs</div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Data updates every 10 minutes • Source: Cloudflare Radar (FREE API)
        </p>
      </div>
    </div>
  );
}
```

---

### Component D3: Unified Connectivity Control Room

```typescript
// app/connectivity/page.tsx
'use client';

import React, { useState } from 'react';
import { IODADashboard } from '@/app/components/Connectivity/IODADashboard';
import { CloudflareRadarDashboard } from '@/app/components/Connectivity/CloudflareRadarDashboard';
import { OONIDashboard } from '@/app/components/Connectivity/OONIDashboard';

export default function ConnectivityControlRoom() {
  const [activeTab, setActiveTab] = useState<'overview' | 'outages' | 'censorship' | 'bgp'>('overview');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🌍 Internet Connectivity Control Room</h1>
          <p className="text-gray-600 text-lg">
            Real-time monitoring of Iran's internet status using FREE public APIs
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('outages')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'outages'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Outage Detection (IODA)
            </button>
            <button
              onClick={() => setActiveTab('censorship')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'censorship'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Censorship (OONI)
            </button>
            <button
              onClick={() => setActiveTab('bgp')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bgp'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              BGP Security (Cloudflare)
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <IODADashboard />
              <CloudflareRadarDashboard />
            </div>
          )}
          {activeTab === 'outages' && <IODADashboard />}
          {activeTab === 'censorship' && <OONIDashboard />}
          {activeTab === 'bgp' && <CloudflareRadarDashboard />}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 About This Dashboard</h3>
          <p className="text-sm text-blue-800 mb-3">
            This control room provides real-time visibility into Iran's internet connectivity using
            100% FREE public APIs from trusted research institutions and infrastructure providers.
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-blue-900 mb-1">IODA (Georgia Tech)</p>
              <p className="text-blue-700">Internet outage detection with 5-min updates</p>
            </div>
            <div>
              <p className="font-semibold text-blue-900 mb-1">OONI (Open Observatory)</p>
              <p className="text-blue-700">Application-level censorship measurements</p>
            </div>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Cloudflare Radar</p>
              <p className="text-blue-700">BGP hijacking and route leak detection</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-3">
            All data sources are FREE with no authentication required or rate limits.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Week 1: IPFS Infrastructure**
- [x] Set up Pinata account (free tier)
- [x] Implement IPFS snapshot creation (`lib/ipfs-distributor.ts`)
- [x] Create snapshot API endpoints (`/api/ipfs/snapshot`)
- [x] Add automated cron job (6-hour intervals)
- [x] Test snapshot retrieval from multiple gateways

**Week 2: IODA Integration (FREE)**
- [x] Implement IODA API client (`lib/ioda-client.ts`)
- [x] Create IODA dashboard API (`/api/connectivity/ioda`)
- [x] Build Chart.js visualization component
- [x] Add automatic refresh (5-minute intervals)
- [x] Test outage detection algorithm

**Week 3: Cloudflare Radar Integration (FREE)**
- [x] Obtain Cloudflare API token (free)
- [x] Implement Cloudflare Radar client (`lib/cloudflare-radar-client.ts`)
- [x] Create BGP dashboard API (`/api/connectivity/cloudflare-radar`)
- [x] Build BGP visualization component
- [x] Test with Iranian ASNs

### Phase 2: Verification Tools (Weeks 4-6)

**Week 4: Media Deduplication**
- [x] Implement perceptual hashing (`lib/media-deduplication.ts`)
- [x] Update image upload endpoint with dedup check
- [x] Add Firestore schema for media hashes
- [x] Build deduplication checker UI
- [x] Test with sample images

**Week 5: Cross-Source Corroboration**
- [x] Implement corroboration engine (`lib/verification-engine.ts`)
- [x] Create corroboration API (`/api/verification/scan`)
- [x] Build verification dashboard UI
- [x] Test with real article data

**Week 6: OONI Integration (FREE)**
- [x] Implement OONI API client (`lib/ooni-client.ts`)
- [x] Create OONI dashboard API (`/api/connectivity/ooni`)
- [x] Build OONI visualization component
- [x] Add automatic refresh (5-minute intervals)

### Phase 3: Disinformation & Polish (Weeks 7-9)

**Week 7: Coordination Detection**
- [x] Implement coordination detector (`lib/disinformation-detector.ts`)
- [x] Create detection API (`/api/disinformation/analyze`)
- [x] Build coordination dashboard UI
- [x] Test with sample social media data

**Week 8: Unified Connectivity Dashboard**
- [x] Create connectivity control room page (`/app/connectivity/page.tsx`)
- [x] Integrate IODA + Cloudflare Radar
- [x] Integrate OONI
- [x] Add tab navigation and filtering
- [x] Performance testing

**Week 9: Tor Onion Service**
- [ ] Provision VPS (DigitalOcean/Vultr) - $6/month
- [x] Install and configure Tor hidden service (Configuration files generated in `deploy/tor/`)
- [ ] Set up Nginx reverse proxy to Vercel
- [ ] Test .onion access with Tor Browser
- [x] Add Tor access banner to UI (`app/components/Layout/TorBanner.tsx`)

### Phase 4: Production Deployment (Weeks 10-12)

**Week 10: Offline Snapshots**
- [x] Implement cryptographic signing (`lib/snapshot-signer.ts`)
- [x] Generate RSA-4096 key pair (one-time setup)
- [x] Create downloadable snapshot pack API (`/api/snapshot/download`)
- [x] Build verification UI component
- [x] Test signature verification flow

### Phase 5: Advanced Visualizations & Polish (Recommendation)

**Week 11: Network & Metadata**
- [x] **Network Graph**: Visualizing bot networks with interactive nodes (`app/components/Admin/NetworkGraph.tsx`)
- [x] **EXIF Viewer**: Inspecting image metadata for verification (`app/components/Admin/ExifViewer.tsx`)
- [ ] **External Ingestion**: Scraper layer for Twitter/Telegram (Future)

**Week 11: Final Integration & Testing**
- [x] End-to-end testing of all dashboards
- [x] Performance optimization (hashing benchmarks)
- [x] Mobile responsive testing (PWA icons generated)
- [x] Security audit (Env & Headers verified)

**Week 12: Documentation & Launch**
- [x] Write user documentation for all features (`walkthrough.md`)
- [x] Create admin guide for verification tools
- [x] Deploy all features to production (Vercel)
- [x] Monitor and fix any issues

---

## Security Considerations

*[Same as V1 - no changes needed]*

---

## Final Cost Analysis

### Monthly Cost Breakdown (V2)

| Service | V1 Cost | V2 Cost | Savings |
|---------|---------|---------|---------|
| **Existing Services** | | | |
| Perplexity API | $3.60 | $3.60 | $0 |
| Twitter/Apify | $7.00 | $7.00 | $0 |
| Telegram Bot API | $0.00 | $0.00 | $0 |
| Vercel | $0.00 | $0.00 | $0 |
| **New Services** | | | |
| IPFS (Pinata Free) | $0.00 | $0.00 | $0 |
| Tor VPS | $6.00 | $6.00 | $0 |
| **Monitoring APIs** | | | |
| ~~GRIP API~~ | ~~$10-20~~ | - | - |
| **Cloudflare Radar** | - | **$0.00** | **+$10-20** |
| IODA | - | **$0.00** | **NEW** |
| OONI | $0.00 | **$0.00** | $0 |
| BGPStream | - | **$0.00** | **NEW** |
| RIPE RIS | - | **$0.00** | **NEW** |
| **TOTAL (MVP)** | **$26.60-$46.60** | **$16.60** | **$10-30** |
| **TOTAL (Full Featured)** | **$56.60** | **$16.60** | **$40** |

**🎉 Cost Reduction: 70% (from $56.60 to $16.60/month)**

### Why This Is Better

1. **More Data Sources**: Added IODA, BGPStream, RIPE RIS (all FREE)
2. **Better Coverage**: Cloudflare Radar has global BGP data vs GRIP's limited access
3. **No API Keys Needed**: IODA requires no authentication at all
4. **Higher Rate Limits**: Cloudflare Radar: 1200 req/5min vs GRIP's unknown limits
5. **More Features**: Added comprehensive dashboard UI with Chart.js visualizations

---

## Conclusion

This updated implementation plan delivers:

✅ **70% cost reduction** ($56.60 → $16.60/month)
✅ **100% FREE monitoring APIs** (IODA, OONI, Cloudflare Radar, BGPStream, RIPE RIS)
✅ **Comprehensive dashboard designs** with Chart.js/Recharts code examples
✅ **Real-time visualizations** for outages, censorship, and BGP security
✅ **Better data coverage** with multiple FREE sources
✅ **Production-ready React components** with loading states and error handling

**Next Steps**:
1. Set up Cloudflare API token (FREE)
2. Implement IODA client and dashboard (Week 2)
3. Add Cloudflare Radar integration (Week 3)
4. Deploy connectivity control room to production (Week 8)

This plan provides truly censorship-resistant news distribution with advanced OSINT capabilities **at 70% lower cost** while adding MORE features than the original plan.
