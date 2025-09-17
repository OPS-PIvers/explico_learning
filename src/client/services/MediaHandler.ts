/**
 * MediaHandler Service for Explico Learning
 * Handles background media management, validation, and optimization
 */

import { MediaType } from '../../shared/types';
import { UI_CONFIG, API_CONFIG } from '../../shared/constants';

interface MediaHandlerOptions {
  maxFileSize: number;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
  thumbnailSize: { width: number; height: number };
  cacheEnabled: boolean;
  compressionQuality: number;
}

interface MediaInfo {
  url: string;
  type: MediaType;
  isValid: boolean;
  error: string | null;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    aspectRatio?: number;
    videoId?: string;
    embedUrl?: string;
  };
  thumbnailUrl: string | null;
  file?: FileInfo;
  objectUrl?: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  mediaType: MediaType;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fileInfo: FileInfo | null;
}

interface PreloadResult {
  url: string;
  success: boolean;
  mediaInfo?: MediaInfo;
  error?: string;
}

interface CacheStats {
  mediaCache: {
    size: number;
    keys: string[];
  };
  thumbnailCache: {
    size: number;
    keys: string[];
  };
  loadingPromises: number;
}

interface MediaCapabilities {
  supportsAutoplay: boolean;
  supportsLoop: boolean;
  supportsControls: boolean;
  supportsFullscreen: boolean;
  canGenerateThumbnail: boolean;
}

export class MediaHandler {
  private options: MediaHandlerOptions;
  private mediaCache: Map<string, MediaInfo>;
  private thumbnailCache: Map<string, string>;
  private loadingPromises: Map<string, Promise<MediaInfo>>;

  constructor(options: Partial<MediaHandlerOptions> = {}) {
    this.options = {
      maxFileSize: UI_CONFIG.MAX_FILE_SIZE,
      allowedImageTypes: UI_CONFIG.ALLOWED_IMAGE_TYPES,
      allowedVideoTypes: UI_CONFIG.ALLOWED_VIDEO_TYPES,
      thumbnailSize: { width: 240, height: 135 }, // 16:9 aspect ratio
      cacheEnabled: true,
      compressionQuality: 0.8,
      ...options
    };

    this.mediaCache = new Map(); // Cache for processed media
    this.thumbnailCache = new Map(); // Cache for generated thumbnails
    this.loadingPromises = new Map(); // Track loading promises
  }

  /**
   * Process media URL and return media information
   */
  async processMediaUrl(url: string): Promise<MediaInfo> {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid media URL provided');
    }

    // Check cache first
    if (this.options.cacheEnabled && this.mediaCache.has(url)) {
      return this.mediaCache.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start processing
    const processingPromise = this._processMediaUrl(url);
    this.loadingPromises.set(url, processingPromise);

    try {
      const result = await processingPromise;

      // Cache result
      if (this.options.cacheEnabled) {
        this.mediaCache.set(url, result);
      }

      return result;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Internal media processing method
   */
  private async _processMediaUrl(url: string): Promise<MediaInfo> {
    const mediaType = this.detectMediaType(url);
    const mediaInfo: MediaInfo = {
      url: url,
      type: mediaType,
      isValid: false,
      error: null,
      metadata: {},
      thumbnailUrl: null
    };

    try {
      switch (mediaType) {
        case MediaType.IMAGE:
          await this.processImage(url, mediaInfo);
          break;

        case MediaType.VIDEO:
          await this.processVideo(url, mediaInfo);
          break;

        case MediaType.YOUTUBE:
          await this.processYouTube(url, mediaInfo);
          break;

        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }

      mediaInfo.isValid = true;
    } catch (error) {
      mediaInfo.error = (error as Error).message;
      console.error('Media processing error:', error);
    }

    return mediaInfo;
  }

  /**
   * Detect media type from URL
   */
  detectMediaType(url: string): MediaType {
    const lowercaseUrl = url.toLowerCase();

    // YouTube detection
    if (this.isYouTubeUrl(url)) {
      return MediaType.YOUTUBE;
    }

    // Video file extensions
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    if (videoExtensions.some(ext => lowercaseUrl.includes(ext))) {
      return MediaType.VIDEO;
    }

    // Image file extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    if (imageExtensions.some(ext => lowercaseUrl.includes(ext))) {
      return MediaType.IMAGE;
    }

    // Default to image for unknown types
    return MediaType.IMAGE;
  }

  /**
   * Check if URL is a YouTube URL
   */
  isYouTubeUrl(url: string): boolean {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    return youtubeRegex.test(url);
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }

  /**
   * Process image media
   */
  private async processImage(url: string, mediaInfo: MediaInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        mediaInfo.metadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        };

        // Generate thumbnail
        this.generateImageThumbnail(img, url).then(thumbnailUrl => {
          mediaInfo.thumbnailUrl = thumbnailUrl;
          resolve();
        }).catch(() => resolve()); // Continue even if thumbnail generation fails
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      // Add timeout
      setTimeout(() => {
        if (!mediaInfo.metadata.width) {
          reject(new Error('Image load timeout'));
        }
      }, 10000);

      img.src = url;
    });
  }

  /**
   * Process video media
   */
  private async processVideo(url: string, mediaInfo: MediaInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        mediaInfo.metadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          aspectRatio: video.videoWidth / video.videoHeight
        };

        // Generate video thumbnail
        this.generateVideoThumbnail(video, url).then(thumbnailUrl => {
          mediaInfo.thumbnailUrl = thumbnailUrl;
          resolve();
        }).catch(() => resolve()); // Continue even if thumbnail generation fails
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      // Add timeout
      setTimeout(() => {
        if (!mediaInfo.metadata.width) {
          reject(new Error('Video load timeout'));
        }
      }, 15000);

      video.src = url;
    });
  }

  /**
   * Process YouTube media
   */
  private async processYouTube(url: string, mediaInfo: MediaInfo): Promise<void> {
    const videoId = this.extractYouTubeId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    mediaInfo.metadata = {
      videoId: videoId,
      embedUrl: `${API_CONFIG.YOUTUBE_EMBED_URL}${videoId}`,
      aspectRatio: 16 / 9 // Standard YouTube aspect ratio
    };

    // Use YouTube thumbnail
    mediaInfo.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    // Validate that video exists by trying to load thumbnail
    try {
      await this.validateYouTubeThumbnail(mediaInfo.thumbnailUrl);
    } catch (error) {
      throw new Error('YouTube video not found or not accessible');
    }
  }

  /**
   * Validate YouTube thumbnail exists
   */
  private validateYouTubeThumbnail(thumbnailUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('YouTube thumbnail not found'));
      img.src = thumbnailUrl;
    });
  }

  /**
   * Generate thumbnail for image
   */
  private async generateImageThumbnail(img: HTMLImageElement, originalUrl: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.thumbnailCache.has(originalUrl)) {
        return this.thumbnailCache.get(originalUrl)!;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const { width: thumbWidth, height: thumbHeight } = this.options.thumbnailSize;
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;

      // Calculate scaling to maintain aspect ratio
      const scale = Math.min(thumbWidth / img.naturalWidth, thumbHeight / img.naturalHeight);
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;

      // Center the image
      const x = (thumbWidth - scaledWidth) / 2;
      const y = (thumbHeight - scaledHeight) / 2;

      // Fill background
      ctx.fillStyle = '#374151'; // Gray background
      ctx.fillRect(0, 0, thumbWidth, thumbHeight);

      // Draw scaled image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      const thumbnailUrl = canvas.toDataURL('image/jpeg', this.options.compressionQuality);

      // Cache thumbnail
      this.thumbnailCache.set(originalUrl, thumbnailUrl);

      return thumbnailUrl;
    } catch (error) {
      console.error('Failed to generate image thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate thumbnail for video
   */
  private async generateVideoThumbnail(video: HTMLVideoElement, originalUrl: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.thumbnailCache.has(originalUrl)) {
        return this.thumbnailCache.get(originalUrl)!;
      }

      return new Promise((resolve, reject) => {
        video.addEventListener('seeked', () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;

            const { width: thumbWidth, height: thumbHeight } = this.options.thumbnailSize;
            canvas.width = thumbWidth;
            canvas.height = thumbHeight;

            // Calculate scaling to maintain aspect ratio
            const scale = Math.min(thumbWidth / video.videoWidth, thumbHeight / video.videoHeight);
            const scaledWidth = video.videoWidth * scale;
            const scaledHeight = video.videoHeight * scale;

            // Center the video frame
            const x = (thumbWidth - scaledWidth) / 2;
            const y = (thumbHeight - scaledHeight) / 2;

            // Fill background
            ctx.fillStyle = '#374151'; // Gray background
            ctx.fillRect(0, 0, thumbWidth, thumbHeight);

            // Draw video frame
            ctx.drawImage(video, x, y, scaledWidth, scaledHeight);

            const thumbnailUrl = canvas.toDataURL('image/jpeg', this.options.compressionQuality);

            // Cache thumbnail
            this.thumbnailCache.set(originalUrl, thumbnailUrl);

            resolve(thumbnailUrl);
          } catch (error) {
            reject(error);
          }
        }, { once: true });

        // Seek to 10% of video duration for thumbnail
        video.currentTime = Math.min(video.duration * 0.1, 5); // Max 5 seconds
      });
    } catch (error) {
      console.error('Failed to generate video thumbnail:', error);
      return null;
    }
  }

  /**
   * Validate file upload
   */
  async validateFileUpload(file: File): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      fileInfo: null
    };

    // Check file size
    if (file.size > this.options.maxFileSize) {
      result.errors.push(`File size must be less than ${this.formatFileSize(this.options.maxFileSize)}`);
    }

    // Check file type
    const isValidImage = this.options.allowedImageTypes.includes(file.type);
    const isValidVideo = this.options.allowedVideoTypes.includes(file.type);

    if (!isValidImage && !isValidVideo) {
      result.errors.push('Invalid file type. Please upload an image or video file.');
    }

    if (result.errors.length === 0) {
      result.isValid = true;
      result.fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        mediaType: isValidImage ? MediaType.IMAGE : MediaType.VIDEO
      };
    }

    return result;
  }

  /**
   * Process uploaded file
   */
  async processFileUpload(file: File): Promise<MediaInfo> {
    const validation = await this.validateFileUpload(file);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Create object URL
    const objectUrl = URL.createObjectURL(file);

    try {
      // Process the file as media
      const mediaInfo = await this.processMediaUrl(objectUrl);

      // Add file information
      mediaInfo.file = validation.fileInfo!;
      mediaInfo.objectUrl = objectUrl;

      return mediaInfo;
    } catch (error) {
      // Clean up object URL on error
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  /**
   * Get optimized media URL for canvas display
   */
  async getOptimizedMediaUrl(originalUrl: string, options: any = {}): Promise<string> {
    const mediaInfo = await this.processMediaUrl(originalUrl);

    if (!mediaInfo.isValid) {
      throw new Error(mediaInfo.error || 'Invalid media');
    }

    // For now, return original URL
    // In a real implementation, this could resize/compress images for better performance
    return originalUrl;
  }

  /**
   * Generate thumbnail URL
   */
  async getThumbnailUrl(mediaUrl: string): Promise<string | null> {
    try {
      const mediaInfo = await this.processMediaUrl(mediaUrl);
      return mediaInfo.thumbnailUrl;
    } catch (error) {
      console.error('Failed to get thumbnail:', error);
      return null;
    }
  }

  /**
   * Preload media for better performance
   */
  async preloadMedia(urls: string[]): Promise<PreloadResult[]> {
    const preloadPromises = urls.map(async (url): Promise<PreloadResult> => {
      try {
        const mediaInfo = await this.processMediaUrl(url);
        return { url, success: true, mediaInfo };
      } catch (error) {
        return { url, success: false, error: (error as Error).message };
      }
    });

    return Promise.all(preloadPromises);
  }

  /**
   * Clear cached media
   */
  clearCache(url: string | null = null): void {
    if (url) {
      this.mediaCache.delete(url);
      this.thumbnailCache.delete(url);

      // Revoke object URL if it exists
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    } else {
      // Clear all caches
      this.mediaCache.clear();
      this.thumbnailCache.clear();

      // Note: We can't revoke all object URLs without tracking them
      console.warn('Cleared media cache. Object URLs may still exist.');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      mediaCache: {
        size: this.mediaCache.size,
        keys: Array.from(this.mediaCache.keys())
      },
      thumbnailCache: {
        size: this.thumbnailCache.size,
        keys: Array.from(this.thumbnailCache.keys())
      },
      loadingPromises: this.loadingPromises.size
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check if media type is supported
   */
  isMediaTypeSupported(mediaType: string): boolean {
    return Object.values(MediaType).includes(mediaType as MediaType);
  }

  /**
   * Get media type capabilities
   */
  getMediaTypeCapabilities(mediaType: MediaType): MediaCapabilities {
    const capabilities: MediaCapabilities = {
      supportsAutoplay: false,
      supportsLoop: false,
      supportsControls: false,
      supportsFullscreen: false,
      canGenerateThumbnail: false
    };

    switch (mediaType) {
      case MediaType.IMAGE:
        capabilities.canGenerateThumbnail = true;
        break;

      case MediaType.VIDEO:
        capabilities.supportsAutoplay = true;
        capabilities.supportsLoop = true;
        capabilities.supportsControls = true;
        capabilities.supportsFullscreen = true;
        capabilities.canGenerateThumbnail = true;
        break;

      case MediaType.YOUTUBE:
        capabilities.supportsAutoplay = true;
        capabilities.supportsLoop = true;
        capabilities.supportsControls = true;
        capabilities.supportsFullscreen = true;
        capabilities.canGenerateThumbnail = false; // Uses YouTube's thumbnails
        break;
    }

    return capabilities;
  }

  /**
   * Destroy the media handler
   */
  destroy(): void {
    // Clear all caches
    this.clearCache();

    // Cancel any pending loading promises
    this.loadingPromises.clear();
  }
}