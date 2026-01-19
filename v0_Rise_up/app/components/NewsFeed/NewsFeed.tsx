"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import NewsCard from "./NewsCard"
import NotificationButton from "../Shared/NotificationButton"
import SearchBar from "../Search/SearchBar"
import Filters, { type FilterState } from "../Search/Filters"
import SuggestChannelModal from "./SuggestChannelModal"

interface Article {
  id: string
  title: string
  summary: string
  url: string
  publishedAt: string
  topics: string[]
  source?: "perplexity" | "twitter" | "telegram"
  author?: string
  channelName?: string
}

const mockArticles: Article[] = [
  {
    id: "1",
    title: "زن، زندگی، آزادی",
    summary: "تظاهرات گسترده در سراسر کشور برای آزادی و حقوق زنان ادامه دارد.",
    url: "#",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    topics: ["iran.now", "top.breaking_global"],
    source: "twitter",
    author: "news_source",
  },
  {
    id: "2",
    title: "International Support Growing",
    summary:
      "World leaders continue to express solidarity with the Iranian people in their fight for freedom and human rights.",
    url: "#",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    topics: ["leaders.world_statements", "protests.solidarity_global"],
    source: "perplexity",
  },
  {
    id: "3",
    title: "Breaking the Chains of Oppression",
    summary:
      "Citizens across multiple cities unite in peaceful demonstrations calling for democratic reforms and accountability.",
    url: "#",
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    topics: ["iran.now", "iran.statements_opposition"],
    source: "telegram",
    channelName: "FreedomNews",
  },
]

export default function NewsFeed() {
  const [allArticles] = useState<Article[]>(mockArticles)
  const [filters, setFilters] = useState<FilterState>({
    topics: [],
    dateRange: {},
  })
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false)

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Offline Banner */}
      {/* Removed all API/database imports and using mock data */}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-headline text-foreground mb-2">Persian Uprising News</h1>
            <p className="text-sm text-muted-foreground">Real-time news aggregation and incident mapping</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchBar />
            <NotificationButton />
            <Button asChild variant="secondary">
              <Link href="/map">🗺️ Map</Link>
            </Button>
            <Button
              onClick={() => setIsSuggestModalOpen(true)}
              variant="outline"
              title="Suggest a news source to track"
            >
              📡 Suggest Source
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Filters
          filters={filters}
          onChange={setFilters}
          onReset={() => {
            setFilters({ topics: [], dateRange: {} })
          }}
        />
      </div>

      {/* Loading State */}
      {/* Removed all API/database imports and using mock data */}

      {/* Empty State */}
      {/* Removed all API/database imports and using mock data */}

      {/* Articles Grid */}
      <div className="space-y-6">
        {allArticles.map((article) => (
          <NewsCard
            key={article.id}
            id={article.id}
            title={article.title}
            summary={article.summary}
            url={article.url}
            publishedAt={article.publishedAt}
            topics={article.topics}
            source={article.source}
            author={article.author}
            channelName={article.channelName}
          />
        ))}
      </div>

      {/* Load More Button */}
      {/* Removed all API/database imports and using mock data */}

      {/* Stats */}
      {allArticles.length > 0 && (
        <div className="mt-8 text-center text-sm text-muted-foreground">Showing {allArticles.length} articles</div>
      )}

      {/* Suggest Channel Modal */}
      <SuggestChannelModal isOpen={isSuggestModalOpen} onClose={() => setIsSuggestModalOpen(false)} />
    </div>
  )
}
