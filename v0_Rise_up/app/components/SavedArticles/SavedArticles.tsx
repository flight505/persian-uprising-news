"use client"
import Image from "next/image"
import { Bookmark, Trash2, ChevronRight } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"

interface SavedArticle {
  id: string
  title: string
  description: string
  image: string
  category: "breaking" | "protest" | "solidarity" | "liberation" | "alert"
  savedAt: string
}

interface SavedArticlesProps {
  savedArticles: SavedArticle[]
  onRemove: (articleId: string) => void
  onOpen: (articleId: string) => void
}

const categoryColors = {
  breaking: "bg-destructive/90 text-destructive-foreground",
  protest: "bg-primary/90 text-primary-foreground",
  solidarity: "bg-info/90 text-info-foreground",
  liberation: "bg-success/90 text-success-foreground",
  alert: "bg-warning/90 text-warning-foreground",
}

export default function SavedArticles({ savedArticles, onRemove, onOpen }: SavedArticlesProps) {
  if (savedArticles.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <Bookmark className="w-20 h-20 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">No Saved Articles</h2>
        <p className="text-muted-foreground max-w-md">
          Articles you bookmark will appear here so you can easily find them later.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Saved Articles</h1>
        <p className="text-muted-foreground">
          {savedArticles.length} article{savedArticles.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      <div className="space-y-4">
        {savedArticles.map((article) => (
          <div
            key={article.id}
            className="glass-dark rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer"
            onClick={() => onOpen(article.id)}
          >
            <div className="flex gap-4 p-4">
              {/* Thumbnail */}
              <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                <Image
                  src={article.image || "/placeholder.svg"}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Badge
                  className={`${categoryColors[article.category]} rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide mb-2`}
                >
                  {article.category}
                </Badge>
                <h3 className="text-base font-bold text-foreground mb-1 line-clamp-2">{article.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{article.description}</p>
                <p className="text-xs text-muted-foreground mt-2">Saved {article.savedAt}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(article.id)
                  }}
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/20 text-primary">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
