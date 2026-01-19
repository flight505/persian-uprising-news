"use client"

import { useState } from "react"
import { User, Bell, Globe, Moon, Shield, ChevronRight, LogOut } from "lucide-react"

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(true)
  const [language, setLanguage] = useState("en")

  const settingsGroups = [
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          description: "Breaking news alerts",
          type: "toggle" as const,
          value: notifications,
          onChange: () => setNotifications(!notifications),
        },
        {
          icon: Moon,
          label: "Dark Mode",
          description: "Stealth appearance",
          type: "toggle" as const,
          value: darkMode,
          onChange: () => setDarkMode(!darkMode),
        },
        {
          icon: Globe,
          label: "Language",
          description: language === "en" ? "English" : "فارسی",
          type: "select" as const,
          value: language,
          onChange: () => setLanguage(language === "en" ? "fa" : "en"),
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: Shield,
          label: "Privacy Settings",
          description: "Manage your data",
          type: "link" as const,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen pt-6 px-4 pb-28">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md 
          border border-white/20 flex items-center justify-center
          m3-elevation-2"
        >
          <User className="w-8 h-8 text-[#E9D1B2]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#E9D1B2] font-serif">Profile</h1>
          <p className="text-white/60 text-sm">Your Voice. Your Freedom.</p>
        </div>
      </div>

      {/* Settings Groups */}
      {settingsGroups.map((group) => (
        <div key={group.title} className="mb-6">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">{group.title}</h2>
          <div
            className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 
            overflow-hidden m3-elevation-1"
          >
            {group.items.map((item, index) => (
              <button
                key={item.label}
                onClick={item.onChange}
                className={`w-full flex items-center justify-between p-4 
                  hover:bg-white/5 transition-all duration-200 m3-motion-standard
                  ${index < group.items.length - 1 ? "border-b border-white/10" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-[#E9D1B2]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#E9D1B2]">{item.label}</p>
                    <p className="text-xs text-white/50">{item.description}</p>
                  </div>
                </div>
                {item.type === "toggle" && (
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200
                    ${item.value ? "bg-emerald-500" : "bg-white/20"}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md 
                      transition-transform duration-200 m3-motion-standard
                      ${item.value ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </div>
                )}
                {item.type === "select" && <ChevronRight className="w-5 h-5 text-white/40" />}
                {item.type === "link" && <ChevronRight className="w-5 h-5 text-white/40" />}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Sign Out Button */}
      <button
        className="w-full flex items-center justify-center gap-2 p-4 
        bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10
        text-red-400 font-medium text-sm
        transition-all duration-200 m3-motion-standard
        m3-elevation-1 hover:m3-elevation-2"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  )
}
