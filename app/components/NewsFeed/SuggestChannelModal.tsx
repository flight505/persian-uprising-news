'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

interface SuggestChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ChannelType = 'telegram' | 'twitter' | 'reddit' | 'instagram' | 'youtube' | 'rss' | 'other';

export default function SuggestChannelModal({ isOpen, onClose }: SuggestChannelModalProps) {
  const [type, setType] = useState<ChannelType>('telegram');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const channelTypes = [
    { value: 'telegram' as ChannelType, label: 'Telegram Channel', placeholder: '@username or channel ID' },
    { value: 'twitter' as ChannelType, label: 'Twitter/X Account', placeholder: '@username' },
    { value: 'reddit' as ChannelType, label: 'Reddit Subreddit', placeholder: 'r/SubredditName' },
    { value: 'instagram' as ChannelType, label: 'Instagram Account', placeholder: '@username' },
    { value: 'youtube' as ChannelType, label: 'YouTube Channel', placeholder: 'Channel URL or @handle' },
    { value: 'rss' as ChannelType, label: 'RSS Feed', placeholder: 'Feed URL' },
    { value: 'other' as ChannelType, label: 'Other Source', placeholder: 'URL or identifier' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/channels/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          handle,
          displayName: displayName || undefined,
          description: description || undefined,
          url: url || undefined,
          submitterEmail: submitterEmail || undefined,
          reason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      logger.error('channel_suggestion_failed', {
        component: 'SuggestChannelModal',
        error: error instanceof Error ? error.message : 'Unknown error',
        channelType: type,
      });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('telegram');
    setHandle('');
    setDisplayName('');
    setDescription('');
    setUrl('');
    setSubmitterEmail('');
    setReason('');
    setSubmitStatus('idle');
  };

  if (!isOpen) return null;

  const selectedType = channelTypes.find((t) => t.value === type);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Suggest a News Source
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Help us track more channels covering the Iran uprising
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Source Type *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {channelTypes.map((channelType) => (
                <button
                  key={channelType.value}
                  type="button"
                  onClick={() => setType(channelType.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    type === channelType.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {channelType.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Handle/Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {selectedType?.label} Handle/ID *
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={selectedType?.placeholder}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Examples: @BBCPersian (Telegram), @iranprotests (Twitter), r/NewIran (Reddit)
            </p>
          </div>

          {/* Display Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., BBC Persian"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Direct URL (Optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://t.me/BBCPersian"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this source..."
              rows={2}
              maxLength={500}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Why should we track this source? *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Posts hourly updates with verified videos from Tehran protests, has 500k+ followers, etc."
              rows={3}
              maxLength={1000}
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {reason.length}/1000 characters
            </p>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Email (Optional)
            </label>
            <input
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              We'll notify you if your suggestion is approved
            </p>
          </div>

          {/* Submit Status */}
          {submitStatus === 'success' && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Thank you! Your suggestion has been submitted for review.
              </p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                ❌ Failed to submit. Please try again.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
