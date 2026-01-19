"use client"

import Image from "next/image"
import { X, Share2, Bookmark, CheckCircle2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"

interface ArticleDetailProps {
  article: {
    id: string
    title: string
    description: string
    image: string
    category: "breaking" | "protest" | "solidarity" | "liberation" | "alert"
    verified?: boolean
    content: string
    publishedAt: string
    source: string
  }
  onClose: () => void
  onSave: (articleId: string) => void
  isSaved: boolean
}

const categoryColors = {
  breaking: "bg-destructive/90 text-destructive-foreground",
  protest: "bg-primary/90 text-primary-foreground",
  solidarity: "bg-info/90 text-info-foreground",
  liberation: "bg-success/90 text-success-foreground",
  alert: "bg-warning/90 text-warning-foreground",
}

export default function ArticleDetail({ article, onClose, onSave, isSaved }: ArticleDetailProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: window.location.href,
        })
      } catch (err) {
        console.log("Share cancelled")
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Hero Image */}
      <div className="relative h-[50vh] min-h-[400px]">
        <Image
          src={article.image || "/placeholder.svg"}
          alt={article.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Header Actions */}
        <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-start p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white"
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => onSave(article.id)}
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
            </Button>
            <Button
              onClick={handleShare}
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative -mt-32 z-10">
        <div className="max-w-3xl mx-auto px-6 pb-32">
          {/* Category Badge */}
          <Badge
            className={`${categoryColors[article.category]} rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide mb-4`}
          >
            {article.category}
          </Badge>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight font-serif">
            {article.title}
            {article.verified && <CheckCircle2 className="inline-block w-8 h-8 ml-3 text-success" strokeWidth={2.5} />}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="font-medium">{article.source}</span>
            <span>•</span>
            <time>{article.publishedAt}</time>
          </div>

          {/* Description */}
          <p className="text-xl text-foreground/90 mb-8 leading-relaxed">{article.description}</p>

          {/* Content */}
          <div className="prose prose-lg prose-invert max-w-none">
            <p className="leading-relaxed text-foreground/80">{article.content}</p>
          </div>

          {/* Related Stories Placeholder */}
          <div className="mt-16 pt-8 border-t border-border">
            <h2 className="text-2xl font-bold mb-4">Related Stories</h2>
            <p className="text-muted-foreground">More stories coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
