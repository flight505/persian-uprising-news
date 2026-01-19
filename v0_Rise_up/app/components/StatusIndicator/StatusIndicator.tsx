"use client"

import { useState } from "react"
import { Shield, WifiOff, AlertTriangle, Wifi } from "lucide-react"

type StatusLevel = "safe" | "warning" | "critical" | "normal"

interface StatusIndicatorProps {
  initialStatus?: StatusLevel
}

export default function StatusIndicator({ initialStatus = "normal" }: StatusIndicatorProps) {
  const [status] = useState<StatusLevel>(initialStatus)
  const [isExpanded, setIsExpanded] = useState(false)

  const statusConfig = {
    safe: {
      icon: Shield,
      label: "Secure",
      color: "bg-emerald-600/90",
      textColor: "text-emerald-50",
      description: "Connection secure and encrypted",
    },
    normal: {
      icon: Wifi,
      label: "Connected",
      color: "bg-[#9BB09D]/90",
      textColor: "text-[#2d4a3e]",
      description: "Normal connection status",
    },
    warning: {
      icon: AlertTriangle,
      label: "Degraded",
      color: "bg-amber-600/90",
      textColor: "text-amber-50",
      description: "Some services may be limited",
    },
    critical: {
      icon: WifiOff,
      label: "Issues",
      color: "bg-red-600/90",
      textColor: "text-red-50",
      description: "Network disruptions detected",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="fixed top-2 right-2 md:top-4 md:right-4 z-40">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${config.color} ${config.textColor} 
          rounded-full 
          px-2.5 py-1.5 md:px-4 md:py-2.5 
          flex items-center gap-1.5 md:gap-2 
          backdrop-blur-md border border-white/20
          m3-elevation-2 hover:m3-elevation-3
          transition-all duration-300 m3-motion-emphasized
          ${isExpanded ? "rounded-xl md:rounded-2xl pr-3 md:pr-5" : ""}
          m3-state-layer`}
      >
        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
        {isExpanded && (
          <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-2 duration-200">
            <span className="text-[10px] md:text-xs font-semibold">{config.label}</span>
            <span className="text-[8px] md:text-[10px] opacity-80 hidden md:block">{config.description}</span>
          </div>
        )}
        {!isExpanded && <span className="text-[10px] md:text-xs font-semibold">{config.label}</span>}
      </button>
    </div>
  )
}
