"use client"

import Image from "next/image"
import { Badge } from "@/app/components/ui/badge"

export interface Topic {
    id: string
    title: string
    description: string
    image: string
    query: string // The search/filter query this topic maps to
    category: string
    categoryColor: string
}

interface TopicCardProps {
    topic: Topic
    onClick: () => void
    isActive?: boolean
}

const getCategoryColor = (color: string) => {
    // Simple mapping if colors are strict hex/tailwind classes, otherwise fallback
    return `${color} backdrop-blur-sm`
}

export default function TopicCard({ topic, onClick, isActive }: TopicCardProps) {
    return (
        <div className="flex-none w-[80vw] md:w-[60vw] max-w-[320px] snap-center pt-3 pb-2 first:pl-4 last:pr-4">
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
                aria-label={`Explore topic: ${topic.title}`}
                className={`group relative rounded-[1.5rem] overflow-hidden h-[200px] md:h-[240px] cursor-pointer
          bg-white/10 backdrop-blur-md border 
          ${isActive ? 'border-brand-warm ring-2 ring-brand-warm ring-offset-2 ring-offset-background' : 'border-white/20'}
          m3-elevation-2 hover:m3-elevation-3
          transition-all duration-300 m3-motion-emphasized
          hover:-translate-y-1 active:scale-[0.98]
          focus-visible:outline-none`}
            >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-colors duration-200 z-20 pointer-events-none" />

                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[1.5rem]">
                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 bg-white/20 transition-opacity duration-150" />
                </div>

                {/* Image with subtle gradient overlay */}
                <div className="absolute inset-0">
                    <Image
                        src={topic.image}
                        alt={topic.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="eager"
                        sizes="(max-width: 768px) 80vw, 320px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-end p-4">
                    {/* Category Badge */}
                    <div className="mb-2">
                        <Badge
                            className={`${topic.categoryColor} text-white border-none backdrop-blur-md rounded-full px-2.5 py-0.5 m3-label-small uppercase tracking-wide m3-elevation-1`}
                        >
                            {topic.category}
                        </Badge>
                    </div>

                    {/* Title */}
                    <h3 className="m3-title-large text-white mb-1 drop-shadow-lg leading-tight">
                        {topic.title}
                    </h3>

                    {/* Description */}
                    <p className="text-white/80 m3-body-small line-clamp-2 drop-shadow-md">
                        {topic.description}
                    </p>
                </div>
            </div>
        </div>
    )
}
