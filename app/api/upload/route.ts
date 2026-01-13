import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToCloudflare } from '@/lib/cloudflare-images';
import { logger } from '@/lib/logger';

/**
 * POST /api/upload
 * Upload an image to Cloudflare Images
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload to Cloudflare
    const imageUrl = await uploadImageToCloudflare(file, file.name);

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to upload image to Cloudflare' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: imageUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error) {
    logger.error('image_upload_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Failed to upload image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
