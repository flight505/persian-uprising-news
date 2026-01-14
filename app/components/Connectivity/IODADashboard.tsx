
'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Line } from 'react-chartjs-2';
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
import { Wifi, AlertCircle, CheckCircle } from 'lucide-react';

// Register ChartJS components
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

    const getStatus = (vals?: number[]) => {
        if (!vals || vals.length === 0) return 'unknown';
        const last = vals[vals.length - 1];
        if (last > 80) return 'normal';
        if (last > 50) return 'degraded';
        return 'outage';
    };

    if (isLoading) {
        return (
            <div className="p-6 border rounded-lg bg-white h-[400px] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                    <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                </div>
            </div>
        );
    }

    if (error || !data?.signals) {
        return (
            <div className="p-6 border border-red-200 rounded-lg bg-red-50 text-red-800">
                <h3 className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Connectivity Data Unavailable
                </h3>
                <p className="text-sm mt-1">Unable to load signals from IODA. Please try again later.</p>
            </div>
        );
    }

    const { timestamps, values } = data.signals;

    // Format timestamps
    const labels = timestamps.map((ts: number) =>
        new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    // Determine current status based on average of last point
    const lastBGP = values.bgp[values.bgp.length - 1] || 0;
    const lastPing = values.ping[values.ping.length - 1] || 0;
    const currentStatus = (lastBGP + lastPing) / 2 > 70 ? 'Connected' : (lastBGP + lastPing) / 2 > 30 ? 'Degraded' : 'Major Outage';

    const chartData = {
        labels,
        datasets: [
            {
                label: 'BGP Visibility',
                data: values.bgp,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3,
            },
            {
                label: 'Active Probing (Ping)',
                data: values.ping,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.3,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        scales: {
            y: {
                min: 0,
                suggestedMax: 100, // Normalized signals are usually relative
                title: {
                    display: true,
                    text: 'Connectivity Index'
                }
            },
            x: {
                ticks: {
                    maxTicksLimit: 8
                }
            }
        },
        plugins: {
            legend: {
                position: 'top' as const,
            },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => `${ctx.dataset.label}: ${Math.round(ctx.raw)}`
                }
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Wifi className="w-6 h-6 text-slate-700" />
                        Live Connectivity (IODA)
                    </h2>
                    <p className="text-sm text-gray-500">Real-time internet signals from Georgia Tech</p>
                </div>

                <div className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 ${currentStatus === 'Connected' ? 'bg-green-100 text-green-800 border-green-200' :
                        currentStatus === 'Degraded' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-red-100 text-red-800 border-red-200'
                    }`}>
                    {currentStatus === 'Connected' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {currentStatus}
                </div>
            </div>

            <div className="h-[300px] w-full">
                <Line data={chartData} options={options} />
            </div>

            <div className="mt-4 text-xs text-gray-400 text-right">
                Data source: Internet Outage Detection and Analysis (IODA)
            </div>
        </div>
    );
}
