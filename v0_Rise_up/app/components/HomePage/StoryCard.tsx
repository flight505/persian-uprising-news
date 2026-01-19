"use client"

import Image from "next/image"
import { Badge } from "@/app/components/ui/badge"
import type { Story } from "@/app/types/story"

interface StoryCardProps {
  story: Story
  onClick: () => void
}

const getCategoryColor = (color: string) => {
  return `${color}/90 backdrop-blur-sm`
}

export default function StoryCard({ story, onClick }: StoryCardProps) {
  return (
    <div className="flex-none w-[62vw] max-w-[280px] snap-center pt-3 pb-2">
      <div
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onClick()
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Read article: ${story.title}`}
        className="group relative rounded-[1.5rem] overflow-hidden h-[240px] md:h-[275px] lg:h-[320px] cursor-pointer
          bg-white/10 backdrop-blur-md border border-white/20 
          m3-elevation-2 hover:m3-elevation-3
          transition-all duration-300 m3-motion-emphasized
          hover:-translate-y-2 active:scale-[0.98]
          focus-visible:ring-2 focus-visible:ring-brand-warm focus-visible:ring-offset-2 focus-visible:ring-offset-background
          focus-visible:outline-none"
      >
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors duration-200 z-20 pointer-events-none" />

        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[1.5rem]">
          <div className="absolute inset-0 opacity-0 group-active:opacity-100 bg-white/20 transition-opacity duration-150" />
        </div>

        {/* Image with subtle gradient overlay */}
        <div className="absolute inset-0">
          <Image
            src={story.image || "/placeholder.svg"}
            alt={story.title}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(max-width: 768px) 62vw, (max-width: 1024px) 50vw, 280px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-3.5">
          {/* Category Badge */}
          <div className="mb-1.5">
            <Badge
              className={`${getCategoryColor(story.categoryColor)} rounded-full px-2.5 py-0.5 m3-label-small uppercase tracking-wide m3-elevation-1`}
            >
              {story.category}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="m3-title-medium md:m3-title-large text-white mb-1 text-balance drop-shadow-lg">
            {story.title}
            {story.verified && (
              <svg
                className="inline-block w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 text-success"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-label="Verified"
              >
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            )}
          </h3>

          {/* Description */}
          <p className="text-brand-warm/90 m3-body-small mb-2 line-clamp-2 drop-shadow-md">{story.description}</p>

          <div className="flex items-center justify-end">
            <div className="flex items-center gap-1 text-white/60 group-hover:text-brand-warm transition-all duration-200 m3-motion-standard">
              <span className="m3-label-small opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Read story
              </span>
              <svg
                className="w-4 h-4 transform translate-x-0 group-hover:translate-x-1 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
