"use client"

import { useState } from "react"
import { MapPin, AlertCircle, Users, ChevronDown } from "lucide-react"

interface Region {
  id: string
  name: string
  status: "active" | "moderate" | "calm"
  incidents: number
  coordinates: { x: number; y: number }
}

export default function MapPage() {
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)

  const regions: Region[] = [
    { id: "tehran", name: "Tehran", status: "active", incidents: 23, coordinates: { x: 55, y: 35 } },
    { id: "isfahan", name: "Isfahan", status: "active", incidents: 15, coordinates: { x: 50, y: 50 } },
    { id: "shiraz", name: "Shiraz", status: "moderate", incidents: 8, coordinates: { x: 45, y: 65 } },
    { id: "mashhad", name: "Mashhad", status: "active", incidents: 18, coordinates: { x: 75, y: 30 } },
    { id: "tabriz", name: "Tabriz", status: "moderate", incidents: 12, coordinates: { x: 30, y: 25 } },
    { id: "ahvaz", name: "Ahvaz", status: "calm", incidents: 4, coordinates: { x: 35, y: 55 } },
    { id: "kerman", name: "Kerman", status: "calm", incidents: 3, coordinates: { x: 65, y: 60 } },
    { id: "rasht", name: "Rasht", status: "moderate", incidents: 9, coordinates: { x: 35, y: 30 } },
  ]

  const statusColors = {
    active: { dot: "bg-red-500", pulse: "bg-red-400", text: "text-red-400" },
    moderate: { dot: "bg-amber-500", pulse: "bg-amber-400", text: "text-amber-400" },
    calm: { dot: "bg-emerald-500", pulse: "bg-emerald-400", text: "text-emerald-400" },
  }

  const totalIncidents = regions.reduce((sum, r) => sum + r.incidents, 0)

  return (
    <div className="min-h-screen pt-6 px-4 pb-28">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E9D1B2] font-serif">Live Map</h1>
        <p className="text-white/60 text-sm">{totalIncidents} active incidents across Iran</p>
      </div>

      {/* Legend */}
      <div
        className="flex gap-4 mb-4 p-3 bg-white/10 backdrop-blur-md rounded-2xl 
        border border-white/20 m3-elevation-1"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-white/70">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-white/70">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-white/70">Calm</span>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="relative bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 
        aspect-[4/3] mb-6 overflow-hidden m3-elevation-2"
      >
        {/* Simplified Iran Map Shape */}
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-30">
          <path
            d="M25,20 Q30,15 40,18 L55,15 Q65,18 75,25 L80,35 Q85,45 82,55 L78,65 Q72,75 60,78 L45,80 Q35,78 28,70 L22,55 Q18,40 22,30 Z"
            fill="currentColor"
            className="text-white/20"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </svg>

        {/* Region Markers */}
        {regions.map((region) => {
          const colors = statusColors[region.status]
          return (
            <button
              key={region.id}
              onClick={() => setSelectedRegion(region)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 
                transition-all duration-200 m3-motion-standard
                hover:scale-125 focus:outline-none focus:ring-2 focus:ring-white/30 rounded-full"
              style={{ left: `${region.coordinates.x}%`, top: `${region.coordinates.y}%` }}
            >
              {/* Pulse Animation for Active */}
              {region.status === "active" && (
                <div
                  className={`absolute inset-0 w-6 h-6 -m-1.5 rounded-full ${colors.pulse} animate-ping opacity-50`}
                />
              )}
              <div className={`w-4 h-4 rounded-full ${colors.dot} m3-elevation-2 relative`}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-white/70 whitespace-nowrap font-medium">
                  {region.name}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Region Details */}
      {selectedRegion && (
        <div
          className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 mb-4
          m3-elevation-2 animate-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className={`w-5 h-5 ${statusColors[selectedRegion.status].text}`} />
              <h3 className="text-lg font-semibold text-[#E9D1B2]">{selectedRegion.name}</h3>
            </div>
            <button onClick={() => setSelectedRegion(null)} className="text-white/40 hover:text-white/70">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-white/50">Incidents</span>
              </div>
              <p className="text-xl font-bold text-[#E9D1B2]">{selectedRegion.incidents}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-white/50">Status</span>
              </div>
              <p className={`text-sm font-semibold capitalize ${statusColors[selectedRegion.status].text}`}>
                {selectedRegion.status}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Region List */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden m3-elevation-1">
        <h3 className="text-sm font-semibold text-[#E9D1B2] p-4 border-b border-white/10">All Regions</h3>
        <div className="divide-y divide-white/10">
          {regions
            .sort((a, b) => b.incidents - a.incidents)
            .map((region) => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region)}
                className="w-full flex items-center justify-between p-4 
                hover:bg-white/5 transition-all duration-200 m3-motion-standard"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[region.status].dot}`} />
                  <span className="text-sm text-[#E9D1B2]">{region.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">{region.incidents} incidents</span>
                  <ChevronDown className="w-4 h-4 text-white/30 -rotate-90" />
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
