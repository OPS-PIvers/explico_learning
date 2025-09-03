/**
 * MediaHandler Service for Explico Learning
 * Handles background media management, validation, and optimization
 */

function MediaHandler(options) {
  options = options || {};
  this.options = {
    maxFileSize: UI_CONFIG.MAX_FILE_SIZE,
    allowedImageTypes: UI_CONFIG.ALLOWED_IMAGE_TYPES,
    allowedVideoTypes: UI_CONFIG.ALLOWED_VIDEO_TYPES,
    thumbnailSize: { width: 240, height: 135 }, // 16:9 aspect ratio
    cacheEnabled: true,
    compressionQuality: 0.8
  };
  this.options = Object.assign(this.options, options);
  
  this.mediaCache = {}; // Cache for processed media
  this.thumbnailCache = {}; // Cache for generated thumbnails
  this.loadingPromises = {}; // Track loading promises
}
  
/**
 * Process media URL and return media information
 * @param {string} url - Media URL
 * @returns {Object} Media information
 */
MediaHandler.prototype.processMediaUrl = function(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid media URL provided');
    }
    
    // Check cache first
    if (this.options.cacheEnabled && this.mediaCache[url]) {
      return this.mediaCache[url];
    }
    
    // Check if already loading
    if (this.loadingPromises[url]) {
      return this.loadingPromises[url];
    }
    
    // Start processing
    var result = this._processMediaUrl(url);
    this.loadingPromises[url] = result;
    
    try {
      
      // Cache result
      if (this.options.cacheEnabled) {
        this.mediaCache[url] = result;
      }
      
      return result;
    } finally {
      delete this.loadingPromises[url];
    }
  }
  
/**
 * Internal media processing method
 * @param {string} url - Media URL
 * @returns {Object} Media information
 */
MediaHandler.prototype._processMediaUrl = function(url) {
    var mediaType = this.detectMediaType(url);
    var mediaInfo = {
      url: url,
      type: mediaType,
      isValid: false,
      error: null,
      metadata: {},
      thumbnailUrl: null
    };
    
    try {
      switch (mediaType) {
        case MEDIA_TYPES.IMAGE:
          this.processImage(url, mediaInfo);
          break;
        
        case MEDIA_TYPES.VIDEO:
          this.processVideo(url, mediaInfo);
          break;
        
        case MEDIA_TYPES.YOUTUBE:
          this.processYouTube(url, mediaInfo);
          break;
        
        default:
          throw new Error('Unsupported media type: ' + mediaType);
      }
      
      mediaInfo.isValid = true;
    } catch (error) {
      mediaInfo.error = error.message;
      console.error('Media processing error:', error);
    }
    
    return mediaInfo;
  }
  
/**
 * Detect media type from URL
 * @param {string} url - Media URL
 * @returns {string} Media type
 */
MediaHandler.prototype.detectMediaType = function(url) {
    var lowercaseUrl = url.toLowerCase();
    
    // YouTube detection
    if (this.isYouTubeUrl(url)) {
      return MEDIA_TYPES.YOUTUBE;
    }
    
    // Video file extensions
    var videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
    for (var i = 0; i < videoExtensions.length; i++) {
      if (lowercaseUrl.indexOf(videoExtensions[i]) !== -1) {
        return MEDIA_TYPES.VIDEO;
      }
    }
    
    // Image file extensions
    var imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    for (var j = 0; j < imageExtensions.length; j++) {
      if (lowercaseUrl.indexOf(imageExtensions[j]) !== -1) {
        return MEDIA_TYPES.IMAGE;
      }
    }
    
    // Default to image for unknown types
    return MEDIA_TYPES.IMAGE;
};

/**
 * Check if URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} Whether URL is YouTube
 */
MediaHandler.prototype.isYouTubeUrl = function(url) {
    var youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    return youtubeRegex.test(url);
};

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID
 */
MediaHandler.prototype.extractYouTubeId = function(url) {
    var match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  }
  
  /**
   * Process image media
   * @param {string} url - Image URL
   * @param {Object} mediaInfo - Media info object to populate
   */
  async processImage(url, mediaInfo) {
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
          resolve(mediaInfo);
        }).catch(resolve); // Continue even if thumbnail generation fails
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
   * @param {string} url - Video URL
   * @param {Object} mediaInfo - Media info object to populate
   */
  async processVideo(url, mediaInfo) {
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
          resolve(mediaInfo);
        }).catch(resolve); // Continue even if thumbnail generation fails
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
   * @param {string} url - YouTube URL
   * @param {Object} mediaInfo - Media info object to populate
   */
  async processYouTube(url, mediaInfo) {
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
   * @param {string} thumbnailUrl - Thumbnail URL
   * @returns {Promise<void>}
   */
  validateYouTubeThumbnail(thumbnailUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('YouTube thumbnail not found'));
      img.src = thumbnailUrl;
    });
  }
  
  /**
   * Generate thumbnail for image
   * @param {HTMLImageElement} img - Image element
   * @param {string} originalUrl - Original image URL
   * @returns {Promise<string>} Thumbnail data URL
   */
  async generateImageThumbnail(img, originalUrl) {
    try {
      // Check cache first
      if (this.thumbnailCache.has(originalUrl)) {
        return this.thumbnailCache.get(originalUrl);
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
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
   * @param {HTMLVideoElement} video - Video element
   * @param {string} originalUrl - Original video URL
   * @returns {Promise<string>} Thumbnail data URL
   */
  async generateVideoThumbnail(video, originalUrl) {
    try {
      // Check cache first
      if (this.thumbnailCache.has(originalUrl)) {
        return this.thumbnailCache.get(originalUrl);
      }
      
      return new Promise((resolve, reject) => {
        video.addEventListener('seeked', () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
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
   * @param {File} file - File to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFileUpload(file) {
    const result = {
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
        mediaType: isValidImage ? MEDIA_TYPES.IMAGE : MEDIA_TYPES.VIDEO
      };
    }
    
    return result;
  }
  
  /**
   * Process uploaded file
   * @param {File} file - File to process
   * @returns {Promise<Object>} Processed file information
   */
  async processFileUpload(file) {
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
      mediaInfo.file = validation.fileInfo;
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
   * @param {string} originalUrl - Original media URL
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Optimized URL
   */
  async getOptimizedMediaUrl(originalUrl, options = {}) {
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
   * @param {string} mediaUrl - Media URL
   * @returns {Promise<string|null>} Thumbnail URL
   */
  async getThumbnailUrl(mediaUrl) {
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
   * @param {Array<string>} urls - Array of media URLs to preload
   * @returns {Promise<Array<Object>>} Array of preload results
   */
  async preloadMedia(urls) {
    const preloadPromises = urls.map(async (url) => {
      try {
        const mediaInfo = await this.processMediaUrl(url);
        return { url, success: true, mediaInfo };
      } catch (error) {
        return { url, success: false, error: error.message };
      }
    });
    
    return Promise.all(preloadPromises);
  }
  
  /**
   * Clear cached media
   * @param {string} url - Specific URL to clear (optional)
   */
  clearCache(url = null) {
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
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
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
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
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
   * @param {string} mediaType - Media type to check
   * @returns {boolean} Whether media type is supported
   */
  isMediaTypeSupported(mediaType) {
    return Object.values(MEDIA_TYPES).includes(mediaType);
  }
  
  /**
   * Get media type capabilities
   * @param {string} mediaType - Media type
   * @returns {Object} Capabilities object
   */
  getMediaTypeCapabilities(mediaType) {
    const capabilities = {
      supportsAutoplay: false,
      supportsLoop: false,
      supportsControls: false,
      supportsFullscreen: false,
      canGenerateThumbnail: false
    };
    
    switch (mediaType) {
      case MEDIA_TYPES.IMAGE:
        capabilities.canGenerateThumbnail = true;
        break;
      
      case MEDIA_TYPES.VIDEO:
        capabilities.supportsAutoplay = true;
        capabilities.supportsLoop = true;
        capabilities.supportsControls = true;
        capabilities.supportsFullscreen = true;
        capabilities.canGenerateThumbnail = true;
        break;
      
      case MEDIA_TYPES.YOUTUBE:
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
  destroy() {
    // Clear all caches
    this.clearCache();
    
    // Cancel any pending loading promises
    this.loadingPromises.clear();
  }
}