'use client';

import { useState, FormEvent, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { offlineDB, isOnline, waitForOnline } from '@/lib/offline-db';

// Dynamic import for LocationPicker to avoid SSR issues
const LocationPicker = dynamic(
  () => import('../components/Map/LocationPicker'),
  { ssr: false }
);

interface FormData {
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other' | '';
  title: string;
  description: string;
  location: {
    lat: number | null;
    lon: number | null;
    address: string;
  };
  images: File[];
}

export default function ReportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    type: '',
    title: '',
    description: '',
    location: {
      lat: null,
      lon: null,
      address: '',
    },
    images: [],
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedOffline, setQueuedOffline] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    handleOnlineStatus();
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleTypeChange = (type: FormData['type']) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleInputChange = (field: 'title' | 'description', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (lat: number, lon: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        lat,
        lon,
        address: address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      },
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Limit to 3 images
    if (files.length + formData.images.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }

    // Validate file sizes (max 5MB each)
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      setError('Each image must be under 5MB');
      return;
    }

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }));
    setError(null);
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.type) return 'Please select an incident type';
    if (!formData.title.trim()) return 'Please enter a title';
    if (formData.title.length < 10) return 'Title must be at least 10 characters';
    if (!formData.description.trim()) return 'Please enter a description';
    if (formData.description.length < 20) return 'Description must be at least 20 characters';
    if (!formData.location.lat || !formData.location.lon) {
      return 'Please select a location on the map';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        location: {
          lat: formData.location.lat!,
          lon: formData.location.lon!,
          address: formData.location.address,
        },
        timestamp: Date.now(),
      };

      // If offline, queue the report for background sync
      if (!isOnline()) {
        await offlineDB.queueReport(reportData);
        setQueuedOffline(true);
        setSuccess(true);
        console.log('📝 Report queued for background sync');

        // Redirect to map after 2 seconds
        setTimeout(() => {
          router.push('/map');
        }, 2000);
        return;
      }

      // Online: submit immediately
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      // Success
      setSuccess(true);

      // Redirect to map after 2 seconds
      setTimeout(() => {
        router.push('/map');
      }, 2000);

    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const incidentTypes = [
    { value: 'protest', label: 'Protest', icon: '📢', color: 'bg-red-500' },
    { value: 'arrest', label: 'Arrest', icon: '🚨', color: 'bg-amber-500' },
    { value: 'injury', label: 'Injury', icon: '🩹', color: 'bg-orange-500' },
    { value: 'death', label: 'Casualty', icon: '💔', color: 'bg-red-600' },
    { value: 'other', label: 'Other', icon: '📝', color: 'bg-indigo-500' },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">{queuedOffline ? '📝' : '✅'}</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {queuedOffline ? 'Report Queued!' : 'Report Submitted!'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {queuedOffline
              ? 'Your report has been saved and will be submitted automatically when you\'re back online.'
              : 'Thank you for your report. It will be reviewed and added to the map shortly.'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Redirecting to map...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/map"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              ← Back to Map
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Report Incident
            </h1>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {isOffline && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📡</span>
              <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-200">You're Offline</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your report will be saved and submitted automatically when you're back online.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              ℹ️ <strong>Anonymous Reporting:</strong> Your report will be submitted anonymously and
              reviewed for verification. Please provide accurate information to help others stay informed.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800 dark:text-red-300">
                ⚠️ {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Incident Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Incident Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {incidentTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value as FormData['type'])}
                    className={`p-3 rounded-lg border-2 transition ${
                      formData.type === type.value
                        ? `${type.color} text-white border-transparent`
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-xs font-medium">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief summary of the incident"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.title.length}/200 characters (minimum 10)
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of what happened, when, and any other relevant details..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formData.description.length}/1000 characters (minimum 20)
              </p>
            </div>

            {/* Location Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <LocationPicker onLocationSelect={handleLocationSelect} />
              {formData.location.address && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <strong>Address:</strong> {formData.location.address}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Images (Optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Upload up to 3 images (max 5MB each). Supported formats: JPG, PNG, WebP
              </p>

              {imagePreviews.length < 3 && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 cursor-pointer transition">
                    <div className="text-4xl mb-2">📸</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload images
                    </p>
                  </div>
                </label>
              )}

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Link
                href="/map"
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                {isSubmitting ? '📤 Submitting...' : '📤 Submit Report'}
              </button>
            </div>
          </form>
        </div>

        {/* Rate Limit Notice */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Rate limit: 5 reports per hour to prevent spam</p>
        </div>
      </main>
    </div>
  );
}
