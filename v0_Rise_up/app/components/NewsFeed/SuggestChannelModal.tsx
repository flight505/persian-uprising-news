"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/app/components/ui/button"

interface SuggestChannelModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SuggestChannelModal({ isOpen, onClose }: SuggestChannelModalProps) {
  const [channelType, setChannelType] = useState<"telegram" | "twitter" | "other">("telegram")
  const [channelUrl, setChannelUrl] = useState("")
  const [channelName, setChannelName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate submission - in real app this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setSubmitSuccess(true)
    setIsSubmitting(false)

    // Reset form after 2 seconds
    setTimeout(() => {
      setSubmitSuccess(false)
      setChannelUrl("")
      setChannelName("")
      setDescription("")
      onClose()
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Suggest a News Source</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Success Message */}
        {submitSuccess ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h3>
            <p className="text-gray-600 dark:text-gray-400">Your suggestion has been submitted for review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Channel Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChannelType("telegram")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    channelType === "telegram"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  ✈️ Telegram
                </button>
                <button
                  type="button"
                  onClick={() => setChannelType("twitter")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    channelType === "twitter"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  𝕏 Twitter
                </button>
                <button
                  type="button"
                  onClick={() => setChannelType("other")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    channelType === "other"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  🌐 Other
                </button>
              </div>
            </div>

            {/* Channel URL */}
            <div>
              <label htmlFor="channelUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {channelType === "telegram"
                  ? "Channel/Group URL"
                  : channelType === "twitter"
                    ? "Twitter Handle"
                    : "URL"}
                <span className="text-red-500">*</span>
              </label>
              <input
                id="channelUrl"
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder={
                  channelType === "telegram"
                    ? "https://t.me/channelname"
                    : channelType === "twitter"
                      ? "@username"
                      : "https://..."
                }
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Channel Name */}
            <div>
              <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel/Account Name
              </label>
              <input
                id="channelName"
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g., Iran Freedom News"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Why should we track this source?
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide relevant information, news coverage, credibility, etc."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button type="button" onClick={onClose} variant="outline" className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !channelUrl} className="flex-1">
                {isSubmitting ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
