"use client"

import type React from "react"
import { useState } from "react"
import StoryCard from "./StoryCard"
import type { Story } from "@/app/types/story"

interface FeedCardsProps {
  stories: Story[]
  onArticleClick: (articleId: string) => void
}

export default function FeedCards({ stories, onArticleClick }: FeedCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const scrollLeft = container.scrollLeft
    const cardWidth = container.offsetWidth * 0.66
    const newIndex = Math.round(scrollLeft / cardWidth)
    setCurrentIndex(newIndex)
  }

  return (
    <div className="py-1">
      <div className="relative">
        {/* Left fade indicator */}
        <div className="absolute left-0 top-0 bottom-16 w-8 bg-gradient-to-r from-[#2d4a3e] to-transparent z-10 pointer-events-none" />
        {/* Right fade indicator */}
        <div className="absolute right-0 top-0 bottom-16 w-8 bg-gradient-to-l from-[#2d4a3e] to-transparent z-10 pointer-events-none" />

        {/* Horizontal Scrolling Cards */}
        <div
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4"
          onScroll={handleScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          tabIndex={0}
          role="region"
          aria-label="Story cards"
        >
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} onClick={() => onArticleClick(story.id)} />
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-4 mb-20 md:mb-24">
        {stories.map((_, index) => (
          <button
            key={index}
            className={`rounded-full transition-all duration-300 m3-motion-standard
              focus-visible:ring-2 focus-visible:ring-[#E9D1B2] focus-visible:ring-offset-2 focus-visible:outline-none
              ${index === currentIndex ? "w-5 h-2 bg-[#E9D1B2]" : "w-2 h-2 bg-white/30 hover:bg-white/50"}`}
            onClick={() => {
              const container = document.querySelector(".overflow-x-auto")
              if (container) {
                const cardWidth = container.clientWidth * 0.66
                container.scrollTo({ left: cardWidth * index, behavior: "smooth" })
              }
            }}
            aria-label={`Go to card ${index + 1} of ${stories.length}`}
            aria-current={index === currentIndex ? "true" : "false"}
          />
        ))}
      </div>
    </div>
  )
}
