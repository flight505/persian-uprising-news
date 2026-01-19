"use client"

import { TrendingUp, Users, MapPin, AlertCircle, Activity, Eye } from "lucide-react"

interface DashboardStats {
  totalStories: number
  activeProtests: number
  regionsAffected: number
  breakingAlerts: number
}

export default function DashboardPage() {
  const stats: DashboardStats = {
    totalStories: 156,
    activeProtests: 42,
    regionsAffected: 28,
    breakingAlerts: 7,
  }

  const statCards = [
    {
      icon: Activity,
      label: "Total Stories",
      value: stats.totalStories,
      change: "+12%",
      positive: true,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/20",
    },
    {
      icon: Users,
      label: "Active Protests",
      value: stats.activeProtests,
      change: "+8%",
      positive: true,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
    },
    {
      icon: MapPin,
      label: "Regions",
      value: stats.regionsAffected,
      change: "+3",
      positive: true,
      color: "text-amber-400",
      bgColor: "bg-amber-500/20",
    },
    {
      icon: AlertCircle,
      label: "Alerts",
      value: stats.breakingAlerts,
      change: "-2",
      positive: false,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
    },
  ]

  const recentActivity = [
    { time: "2m ago", event: "New protest reported in Tehran", type: "protest" },
    { time: "15m ago", event: "International solidarity march in Berlin", type: "solidarity" },
    { time: "32m ago", event: "Breaking: Internet disruption in Mashhad", type: "alert" },
    { time: "1h ago", event: "UN statement on human rights", type: "news" },
    { time: "2h ago", event: "University demonstrations nationwide", type: "protest" },
  ]

  const typeColors: Record<string, string> = {
    protest: "bg-blue-500/20 text-blue-400",
    solidarity: "bg-emerald-500/20 text-emerald-400",
    alert: "bg-red-500/20 text-red-400",
    news: "bg-amber-500/20 text-amber-400",
  }

  return (
    <div className="min-h-screen pt-6 px-4 pb-28">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E9D1B2] font-serif">Dashboard</h1>
        <p className="text-white/60 text-sm">Real-time overview of the movement</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4
              m3-elevation-1 transition-all duration-200 m3-motion-standard"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-[#E9D1B2]">{stat.value}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-white/50">{stat.label}</span>
              <span className={`text-xs font-medium ${stat.positive ? "text-emerald-400" : "text-red-400"}`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Chart Placeholder */}
      <div
        className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 mb-6
        m3-elevation-1"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#E9D1B2]">Weekly Activity</h2>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-end justify-between h-24 gap-2">
          {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-emerald-500/80 to-emerald-400/40 rounded-t-lg
                  transition-all duration-300 m3-motion-emphasized"
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-white/40">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div
        className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4
        m3-elevation-1"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#E9D1B2]">Recent Activity</h2>
          <Eye className="w-4 h-4 text-white/40" />
        </div>
        <div className="space-y-3">
          {recentActivity.map((activity, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${typeColors[activity.type]}`}>
                {activity.type}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#E9D1B2] line-clamp-1">{activity.event}</p>
                <p className="text-[10px] text-white/40">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
