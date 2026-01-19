"use client"

import { useState } from "react"
import TopicCard, { Topic } from "./TopicCard"

// Static "Perfect" Data from v0 design
export const TOPICS: Topic[] = [
    {
        id: "breaking",
        title: "Breaking News & Global Updates",
        description: "The latest verified reports from across Iran and the international community. Stay informed on critical developments.",
        image: "/images/breaking-news-gen.png", // Generated via Antigravity Image Gen
        query: "", // Empty query matches all
        category: "Live Feed",
        categoryColor: "bg-red-600/90",
    },
    {
        id: "women-life-freedom",
        title: "Women, Life, Freedom",
        description: "The movement led by brave Iranian women demanding fundamental rights and liberty from oppression.",
        image: "/images/M3_Woman_Life_Freedom.png",
        query: "women hijab freedom",
        category: "Movement",
        categoryColor: "bg-purple-600/90",
    },
    {
        id: "international",
        title: "International Response",
        description: "Global sanctions, UN resolutions, and diplomatic actions taken against the regime.",
        image: "/images/M3_UN_International_Response.png",
        query: "sanctions UN biden eu",
        category: "Global",
        categoryColor: "bg-blue-600/90",
    },
    {
        id: "protests",
        title: "Street Protests",
        description: "Video evidence and reports of citizens marching for change in cities across the nation.",
        image: "/images/M3_people_marching.png",
        query: "protest street tehran",
        category: "On The Ground",
        categoryColor: "bg-orange-600/90",
    },
    {
        id: "unity",
        title: "Network of Solidarity",
        description: "Uniting voices from all sectors of society in a common struggle for a free Iran.",
        image: "/images/M3_shoulder_to_shoulder.png",
        query: "unity strike labor",
        category: "Solidarity",
        categoryColor: "bg-green-600/90",
    },
]

interface FeatureCarouselProps {
    onTopicSelect: (query: string) => void
}

export default function FeatureCarousel({ onTopicSelect }: FeatureCarouselProps) {
    const [activeTopicId, setActiveTopicId] = useState("breaking")

    const handleTopicClick = (topic: Topic) => {
        setActiveTopicId(topic.id)
        onTopicSelect(topic.query)
    }

    return (
        <div className="py-4 relative">
            {/* Left fade indicator */}
            <div className="absolute left-0 top-0 bottom-4 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            {/* Right fade indicator */}
            <div className="absolute right-0 top-0 bottom-4 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            {/* Horizontal Scrolling Cards */}
            <div
                className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 pb-4"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {TOPICS.map((topic) => (
                    <TopicCard
                        key={topic.id}
                        topic={topic}
                        onClick={() => handleTopicClick(topic)}
                        isActive={activeTopicId === topic.id}
                    />
                ))}
            </div>
        </div>
    )
}
