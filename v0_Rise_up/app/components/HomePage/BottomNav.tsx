"use client"

import { Home, Search, Bookmark, User, LayoutDashboard, Map } from "lucide-react"

interface BottomNavProps {
  currentView: "home" | "search" | "saved" | "profile" | "dashboard" | "map"
  onNavigate: (view: "home" | "search" | "saved" | "profile" | "dashboard" | "map") => void
}

export default function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "search" as const, icon: Search, label: "Search" },
    { id: "map" as const, icon: Map, label: "Map" },
    { id: "dashboard" as const, icon: LayoutDashboard, label: "Stats" },
    { id: "saved" as const, icon: Bookmark, label: "Saved" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ]

  return (
    <nav
      className="fixed bottom-2 left-2 right-2 z-50 
      md:bottom-4 md:left-4 md:right-4
      bg-black/50 backdrop-blur-xl 
      rounded-[1.5rem] md:rounded-[2rem] border border-white/10
      m3-elevation-3
      transition-all duration-300 m3-motion-emphasized"
    >
      <div className="max-w-lg mx-auto px-1 py-1.5 md:px-2 md:py-2">
        <div className="flex justify-around items-center">
          {navItems.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center justify-center
                px-1.5 py-1 md:px-3 md:py-2 
                rounded-lg md:rounded-xl
                transition-all duration-200 m3-motion-standard
                focus-visible:ring-2 focus-visible:ring-brand-warm focus-visible:outline-none
                ${
                  currentView === id
                    ? "text-brand-warm bg-white/10"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              aria-label={label}
              aria-current={currentView === id ? "page" : undefined}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:block text-[10px] mt-0.5">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
