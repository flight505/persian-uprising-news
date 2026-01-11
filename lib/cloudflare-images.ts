/**
 * Cloudflare Images upload utility
 * Handles image uploads to Cloudflare Images CDN
 */

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

interface CloudflareImageResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
  success: boolean;
  errors: any[];
  messages: any[];
}

/**
 * Upload an image to Cloudflare Images
 * @param file - File blob or buffer
 * @param filename - Original filename
 * @returns Image URL or null on failure
 */
export async function uploadImageToCloudflare(
  file: File | Buffer,
  filename: string
): Promise<string | null> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('Cloudflare credentials not configured');
    return null;
  }

  try {
    const formData = new FormData();

    if (file instanceof File) {
      formData.append('file', file);
    } else {
      // For Buffer/server-side uploads
      const blob = new Blob([new Uint8Array(file)]);
      formData.append('file', blob, filename);
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare upload failed:', response.status, errorText);
      return null;
    }

    const data: CloudflareImageResponse = await response.json();

    if (!data.success) {
      console.error('Cloudflare upload error:', data.errors);
      return null;
    }

    // Return the public variant URL (you can customize the variant)
    const imageId = data.result.id;
    const imageUrl = `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_ID}/${imageId}/public`;

    console.log(`✅ Image uploaded to Cloudflare: ${imageUrl}`);
    return imageUrl;

  } catch (error) {
    console.error('Error uploading to Cloudflare:', error);
    return null;
  }
}

/**
 * Upload multiple images to Cloudflare Images
 * @param files - Array of files
 * @returns Array of image URLs
 */
export async function uploadMultipleImages(files: File[]): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImageToCloudflare(file, file.name));
  const results = await Promise.all(uploadPromises);

  // Filter out failed uploads (null values)
  return results.filter((url): url is string => url !== null);
}

/**
 * Delete an image from Cloudflare Images
 * @param imageId - The image ID to delete
 * @returns Success boolean
 */
export async function deleteImageFromCloudflare(imageId: string): Promise<boolean> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    console.error('Cloudflare credentials not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const data = await response.json();
    return data.success;

  } catch (error) {
    console.error('Error deleting from Cloudflare:', error);
    return false;
  }
}

/**
 * Get image ID from Cloudflare URL
 * @param url - Full Cloudflare image URL
 * @returns Image ID or null
 */
export function getImageIdFromUrl(url: string): string | null {
  // URL format: https://imagedelivery.net/{ACCOUNT_ID}/{IMAGE_ID}/{VARIANT}
  const match = url.match(/imagedelivery\.net\/[^\/]+\/([^\/]+)\//);
  return match ? match[1] : null;
}
