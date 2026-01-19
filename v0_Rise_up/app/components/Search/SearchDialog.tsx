"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, X, Clock, Flame, Users, AlertTriangle, Globe } from "lucide-react"

interface SearchDialogProps {
  isOpen: boolean
  onClose: () => void
}

type FilterCategory = "all" | "breaking" | "protests" | "alerts" | "solidarity"

const filterOptions = [
  { id: "all" as const, label: "All Stories", icon: Globe, color: "text-blue-400" },
  { id: "breaking" as const, label: "Breaking", icon: Flame, color: "text-red-400" },
  { id: "protests" as const, label: "Protests", icon: Users, color: "text-teal-400" },
  { id: "alerts" as const, label: "Alerts", icon: AlertTriangle, color: "text-amber-400" },
  { id: "solidarity" as const, label: "Solidarity", icon: Globe, color: "text-blue-400" },
]

const mockResults = [
  {
    id: "1",
    title: "Woman, Life, Freedom movement continues",
    category: "breaking" as const,
    time: "2 hours ago",
  },
  {
    id: "2",
    title: "International support grows for protesters",
    category: "solidarity" as const,
    time: "5 hours ago",
  },
  {
    id: "3",
    title: "Internet disruptions reported nationwide",
    category: "alerts" as const,
    time: "3 hours ago",
  },
  {
    id: "4",
    title: "Peaceful demonstrations in multiple cities",
    category: "protests" as const,
    time: "8 hours ago",
  },
]

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>("all")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("recentSearches")
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved))
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [])

  const saveSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return

      const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(0, 5)

      setRecentSearches(updated)
      if (typeof window !== "undefined") {
        localStorage.setItem("recentSearches", JSON.stringify(updated))
      }
    },
    [recentSearches],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "Enter" && query.trim()) {
        saveSearch(query)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, query, onClose, saveSearch])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleRecentSearch = (searchQuery: string) => {
    setQuery(searchQuery)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    if (typeof window !== "undefined") {
      localStorage.removeItem("recentSearches")
    }
  }

  const filteredResults =
    selectedFilter === "all" ? mockResults : mockResults.filter((r) => r.category === selectedFilter)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-surface/95 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-primary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories, topics, or keywords..."
            className="flex-1 bg-transparent text-lg outline-none text-foreground placeholder-muted-foreground"
          />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/10 overflow-x-auto">
          <div className="flex gap-2">
            {filterOptions.map((filter) => {
              const FilterIcon = filter.icon
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    selectedFilter === filter.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  <FilterIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{filter.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Searches
                </h3>
                <button onClick={clearRecentSearches} className="text-xs text-red-400 hover:text-red-300">
                  Clear All
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentSearch(search)}
                    className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/5 text-foreground flex items-center gap-3 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-6 space-y-3">
              {filteredResults.length > 0 ? (
                filteredResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{result.title}</h4>
                        <p className="text-sm text-muted-foreground">{result.time}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          result.category === "breaking"
                            ? "bg-red-500/20 text-red-400"
                            : result.category === "alerts"
                              ? "bg-amber-500/20 text-amber-400"
                              : result.category === "protests"
                                ? "bg-teal-500/20 text-teal-400"
                                : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {result.category}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No results found for "{query}"</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Try different keywords or filters</p>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!query && recentSearches.length === 0 && (
            <div className="py-16 text-center px-6">
              <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-foreground/80 font-medium mb-2">Search for stories and updates</p>
              <p className="text-sm text-muted-foreground">Try "protests", "freedom", or "solidarity"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
