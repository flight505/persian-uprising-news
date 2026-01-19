"use client"

import { Bookmark, Trash2 } from "lucide-react"
import Image from "next/image"

interface SavedArticle {
  id: string
  title: string
  description: string
  image: string
  category: string
  savedAt: string
}

interface SavedPageProps {
  savedArticles: SavedArticle[]
  onRemove: (id: string) => void
  onOpen: (id: string) => void
}

export default function SavedPage({ savedArticles, onRemove, onOpen }: SavedPageProps) {
  return (
    <div className="min-h-screen pt-6 px-4 pb-28">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#E9D1B2] mb-2 font-serif">Saved Stories</h1>
        <p className="text-white/60 text-sm">
          {savedArticles.length} {savedArticles.length === 1 ? "story" : "stories"} saved
        </p>
      </div>

      {/* Saved Articles Grid */}
      {savedArticles.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-10 h-10 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-[#E9D1B2] mb-2">No saved stories</h3>
          <p className="text-white/50 text-sm max-w-xs mx-auto">
            Tap the bookmark icon on any story to save it here for later reading.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden
                m3-elevation-1 hover:m3-elevation-2
                transition-all duration-200 m3-motion-standard"
            >
              <button onClick={() => onOpen(article.id)} className="w-full text-left">
                <div className="relative h-32 w-full">
                  <Image src={article.image || "/placeholder.svg"} alt={article.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-[#E9D1B2] line-clamp-1">{article.title}</h3>
                  <p className="text-xs text-white/60 line-clamp-2 mt-1">{article.description}</p>
                </div>
              </button>
              <div className="px-3 pb-3 flex justify-between items-center">
                <span className="text-[10px] text-white/40">Saved {article.savedAt}</span>
                <button
                  onClick={() => onRemove(article.id)}
                  className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-red-400
                    transition-all duration-200 m3-motion-standard"
                  aria-label="Remove from saved"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
