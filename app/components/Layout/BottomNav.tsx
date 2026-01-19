"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Bookmark, User, LayoutDashboard, Map } from "lucide-react"

export default function BottomNav() {
    const pathname = usePathname()

    const navItems = [
        { id: "home", href: "/", icon: Home, label: "Home" },
        { id: "search", href: "/search", icon: Search, label: "Search" },
        { id: "map", href: "/map", icon: Map, label: "Map" },
        { id: "dashboard", href: "/report", icon: LayoutDashboard, label: "Report" }, // Changed Stats to Report based on existing routes
        { id: "connectivity", href: "/connectivity", icon: Bookmark, label: "Connect" }, // Replaced Saved with Connectivity
        { id: "verification", href: "/verification", icon: User, label: "Verify" }, // Replaced Profile with Verification
    ]

    const isActive = (href: string) => {
        if (href === "/" && pathname === "/") return true
        if (href !== "/" && pathname?.startsWith(href)) return true
        return false
    }

    return (
        <nav
            className="fixed bottom-2 left-2 right-2 z-50 
      md:bottom-4 md:left-4 md:right-4
      bg-black/80 backdrop-blur-xl 
      rounded-[1.5rem] md:rounded-[2rem] border border-white/10
      m3-elevation-3
      transition-all duration-300 m3-motion-emphasized"
        >
            <div className="max-w-lg mx-auto px-1 py-1.5 md:px-2 md:py-2">
                <div className="flex justify-around items-center">
                    {navItems.map(({ id, href, icon: Icon, label }) => (
                        <Link
                            key={id}
                            href={href}
                            className={`flex flex-col items-center justify-center
                px-1.5 py-1 md:px-3 md:py-2 
                rounded-lg md:rounded-xl
                transition-all duration-200 m3-motion-standard
                focus-visible:ring-2 focus-visible:ring-brand-warm focus-visible:outline-none
                ${isActive(href)
                                    ? "text-brand-warm bg-white/10"
                                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                }`}
                            aria-label={label}
                            aria-current={isActive(href) ? "page" : undefined}
                        >
                            <Icon className="w-5 h-5 md:w-6 md:h-6" />
                            <span className="hidden md:block text-[10px] mt-0.5">{label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    )
}
