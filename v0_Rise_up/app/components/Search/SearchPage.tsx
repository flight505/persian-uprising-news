"use client"

import { useState } from "react"
import { Search, X, Filter } from "lucide-react"
import Image from "next/image"

interface Story {
  id: string
  title: string
  description: string
  image: string
  category: "breaking" | "protest" | "solidarity" | "liberation" | "alert"
  verified?: boolean
}

interface SearchPageProps {
  stories: Story[]
  onArticleClick: (articleId: string) => void
}

const categories = [
  { id: "all", label: "All" },
  { id: "breaking", label: "Breaking" },
  { id: "protest", label: "Protests" },
  { id: "solidarity", label: "Solidarity" },
  { id: "liberation", label: "Liberation" },
]

export default function SearchPage({ stories, onArticleClick }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredStories = stories.filter((story) => {
    const matchesSearch =
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || story.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen pt-6 px-4 pb-28">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E9D1B2] mb-4 font-serif">Search</h1>

        {/* Search Input - M3 styled */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 
              rounded-full py-3 pl-12 pr-12 
              text-[#F5F1E8] placeholder:text-white/40
              focus:outline-none focus:ring-2 focus:ring-white/30
              m3-elevation-1 transition-all duration-200 m3-motion-standard"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips - M3 styled */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-all duration-200 m3-motion-standard
              ${
                selectedCategory === cat.id
                  ? "bg-[#F5F1E8] text-[#2d4a3e] m3-elevation-2"
                  : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filteredStories.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/50">No stories found</p>
          </div>
        ) : (
          filteredStories.map((story) => (
            <button
              key={story.id}
              onClick={() => onArticleClick(story.id)}
              className="w-full flex items-center gap-4 p-3 
                bg-white/10 backdrop-blur-md rounded-2xl border border-white/20
                m3-elevation-1 hover:m3-elevation-2
                transition-all duration-200 m3-motion-standard
                hover:bg-white/15 active:scale-[0.98]
                text-left"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <Image src={story.image || "/placeholder.svg"} alt={story.title} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Applied brand color #E9D1B2 to story title */}
                <h3 className="text-sm font-semibold text-[#E9D1B2] truncate">{story.title}</h3>
                <p className="text-xs text-white/60 line-clamp-2 mt-0.5">{story.description}</p>
                <span className="text-[10px] text-white/40 uppercase tracking-wide mt-1 inline-block">
                  {story.category}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
