"use client"

import { useState, useEffect } from "react"
import { stories } from "@/app/data/stories"
import type { Story } from "@/app/types/story"
import HeroSection from "./HeroSection"
import FeedCards from "./FeedCards"
import BottomNav from "./BottomNav"
import SearchPage from "../Search/SearchPage"
import SavedPage from "../SavedArticles/SavedPage"
import ProfilePage from "../Profile/ProfilePage"
import DashboardPage from "../Dashboard/DashboardPage"
import MapPage from "../Map/MapPage"
import ArticleDetail from "../ArticleDetail/ArticleDetail"
import StatusIndicator from "../StatusIndicator/StatusIndicator"

interface FullStory extends Story {
  content: string
  publishedAt: string
  source: string
}

const fullStories: FullStory[] = stories.map((story) => ({
  ...story,
  content: `${story.description} This is a developing story with ongoing coverage from our correspondents on the ground. The situation continues to evolve as citizens across the region demonstrate remarkable courage and unity in their peaceful pursuit of fundamental rights and democratic reforms.`,
  publishedAt: "2 hours ago",
  source: "Persian Uprising News",
}))

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"home" | "search" | "saved" | "profile" | "dashboard" | "map">("home")
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [savedArticleIds, setSavedArticleIds] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem("savedArticles")
    if (saved) {
      try {
        setSavedArticleIds(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load saved articles")
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("savedArticles", JSON.stringify(savedArticleIds))
  }, [savedArticleIds])

  const handleNavChange = (view: "home" | "search" | "saved" | "profile" | "dashboard" | "map") => {
    setCurrentView(view)
    setSelectedArticleId(null)
  }

  const handleArticleClick = (articleId: string) => {
    setSelectedArticleId(articleId)
  }

  const handleArticleClose = () => {
    setSelectedArticleId(null)
  }

  const handleSaveArticle = (articleId: string) => {
    setSavedArticleIds((prev) =>
      prev.includes(articleId) ? prev.filter((id) => id !== articleId) : [...prev, articleId],
    )
  }

  const handleRemoveSaved = (articleId: string) => {
    setSavedArticleIds((prev) => prev.filter((id) => id !== articleId))
  }

  const selectedArticle = fullStories.find((story) => story.id === selectedArticleId)
  const savedArticles = fullStories
    .filter((story) => savedArticleIds.includes(story.id))
    .map((story) => ({
      ...story,
      savedAt: "today",
    }))

  if (selectedArticle) {
    return (
      <ArticleDetail
        article={selectedArticle}
        onClose={handleArticleClose}
        onSave={handleSaveArticle}
        isSaved={savedArticleIds.includes(selectedArticle.id)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-pattern">
      <StatusIndicator initialStatus="normal" />

      {/* Main Content based on current view */}
      {currentView === "home" && (
        <>
          <HeroSection />
          <FeedCards stories={fullStories} onArticleClick={handleArticleClick} />
        </>
      )}

      {currentView === "search" && <SearchPage stories={fullStories} onArticleClick={handleArticleClick} />}

      {currentView === "saved" && (
        <SavedPage savedArticles={savedArticles} onRemove={handleRemoveSaved} onOpen={handleArticleClick} />
      )}

      {currentView === "profile" && <ProfilePage />}

      {currentView === "dashboard" && <DashboardPage />}

      {currentView === "map" && <MapPage />}

      {/* Bottom Navigation */}
      <BottomNav currentView={currentView} onNavigate={handleNavChange} />
    </div>
  )
}
