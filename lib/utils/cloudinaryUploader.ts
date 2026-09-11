/**
 * Cloudinary Automatic Media Re-Hosting Service
 * Automatically transfers external media (e.g. Amazon, web URLs) into your own Cloudinary storage:
 * - Images -> Cloud: dwgfox722 | Preset: lynke_app
 * - Videos -> Cloud: drkbqpxqf | Preset: vidgram
 */

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  format?: string;
  resourceType: 'image' | 'video';
  bytes?: number;
}

export class CloudinaryUploader {
  private imageCloudName: string;
  private imagePreset: string;
  private videoCloudName: string;
  private videoPreset: string;

  constructor() {
    this.imageCloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_IMAGE ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME_IMAGE ||
      'dwgfox722';
    this.imagePreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_IMAGE ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET_IMAGE ||
      'lynke_app';

    this.videoCloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_VIDEO ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME_VIDEO ||
      'drkbqpxqf';
    this.videoPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_VIDEO ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO ||
      'vidgram';
  }

  /**
   * Rehosts a single media URL to your own Cloudinary bucket.
   * If already hosted on Cloudinary, returns the URL as-is.
   */
  public async rehostMedia(
    remoteUrl: string,
    resourceType: 'image' | 'video' = 'image'
  ): Promise<string> {
    const trimmedUrl = remoteUrl.trim();
    if (!trimmedUrl || !trimmedUrl.startsWith('http')) {
      return trimmedUrl;
    }

    // Already on Cloudinary? Skip re-uploading
    if (trimmedUrl.includes('res.cloudinary.com')) {
      return trimmedUrl;
    }

    const cloudName = resourceType === 'video' ? this.videoCloudName : this.imageCloudName;
    const uploadPreset = resourceType === 'video' ? this.videoPreset : this.imagePreset;
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    // Attempt 1: Direct URL upload via Cloudinary API
    try {
      const formData = new FormData();
      formData.append('file', trimmedUrl);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.secure_url) {
          console.info(`☁️ [Cloudinary] Successfully re-hosted ${resourceType} to: ${data.secure_url}`);
          return data.secure_url;
        }
      } else {
        const errText = await res.text();
        console.warn(`⚠️ Cloudinary direct URL upload failed (status ${res.status}): ${errText.substring(0, 150)}`);
      }
    } catch (directErr) {
      console.warn(`⚠️ Direct Cloudinary URL upload error:`, directErr);
    }

    // Attempt 2: Blob buffer pre-fetch (bypasses Amazon CDN 403 bot blocks)
    try {
      console.info(`🔄 [Cloudinary] Fetching blob buffer for ${trimmedUrl.substring(0, 60)} with browser headers...`);
      const bufferRes = await fetch(trimmedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: resourceType === 'video' ? 'video/*,*/*' : 'image/*,*/*',
        },
      });

      if (bufferRes.ok) {
        const blob = await bufferRes.blob();
        const formData = new FormData();
        formData.append('file', blob, resourceType === 'video' ? 'video.mp4' : 'image.jpg');
        formData.append('upload_preset', uploadPreset);

        const uploadRes = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.secure_url) {
            console.info(`☁️ [Cloudinary] Blob upload success: ${data.secure_url}`);
            return data.secure_url;
          }
        }
      }
    } catch (blobErr) {
      console.warn(`⚠️ Cloudinary blob upload error:`, blobErr);
    }

    // Fallback: If both attempts fail, return original URL so the pipeline never breaks
    console.warn(`⚠️ Falling back to original external media URL for: ${trimmedUrl}`);
    return trimmedUrl;
  }

  /**
   * Batch rehosts multiple URLs in controlled chunks
   */
  public async rehostBatch(
    urls: string[],
    resourceType: 'image' | 'video' = 'image'
  ): Promise<string[]> {
    if (!urls || urls.length === 0) return [];
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    const chunkSize = resourceType === 'video' ? 2 : 3;
    const results: string[] = [];
    for (let i = 0; i < validUrls.length; i += chunkSize) {
      const chunk = validUrls.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map((u) => this.rehostMedia(u, resourceType)));
      results.push(...chunkResults);
    }
    return results;
  }
}

export const cloudinaryUploader = new CloudinaryUploader();
export default cloudinaryUploader;
