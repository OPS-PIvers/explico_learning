/**
 * EventTypeHandlers Service for Explico Learning
 * Handles different hotspot event types and their specific behaviors
 */

import { Hotspot, EventType } from '../../shared/types';
import { UI_CONFIG, TOOLTIP_POSITIONS } from '../../shared/constants';

interface EventHandlerOptions {
  animationDuration: number;
  zoomTransitionDuration: number;
  spotlightFadeDuration: number;
}

interface ActiveEventData {
  type: EventType;
  elements: HTMLElement[];
  originalTransform?: string;
  backgroundElement?: HTMLElement;
  cleanup: () => void;
}

export class EventTypeHandlers {
  private options: EventHandlerOptions;
  private activeEvents: Map<string, ActiveEventData>;
  private animationFrames: Map<string, number>;
  private eventListeners: Map<string, EventListener>;

  constructor(options: Partial<EventHandlerOptions> = {}) {
    this.options = {
      animationDuration: 300,
      zoomTransitionDuration: 500,
      spotlightFadeDuration: 200,
      ...options
    };

    this.activeEvents = new Map(); // Track active event states
    this.animationFrames = new Map(); // Track animation frames
    this.eventListeners = new Map();
  }

  /**
   * Handle hotspot trigger based on event type
   */
  async handleHotspotEvent(hotspot: Hotspot, canvas: HTMLElement, hotspotElement: HTMLElement): Promise<void> {
    // Clear any existing event for this hotspot
    this.clearActiveEvent(hotspot.id);

    try {
      switch (hotspot.eventType) {
        case EventType.TEXT_ON_IMAGE:
          await this.handleTextOnImage(hotspot, canvas, hotspotElement);
          break;

        case EventType.TEXT_POPUP:
          await this.handleTextPopup(hotspot, canvas, hotspotElement);
          break;

        case EventType.PAN_ZOOM:
          await this.handlePanZoom(hotspot, canvas, hotspotElement);
          break;

        case EventType.SPOTLIGHT:
          await this.handleSpotlight(hotspot, canvas, hotspotElement);
          break;

        default:
          console.warn(`Unknown event type: ${hotspot.eventType}`);
      }
    } catch (error) {
      console.error(`Error handling hotspot event:`, error);
    }
  }

  /**
   * Handle text on image event
   */
  private async handleTextOnImage(hotspot: Hotspot, canvas: HTMLElement, hotspotElement: HTMLElement): Promise<void> {
    // Remove existing tooltip
    this.clearTooltipForHotspot(hotspot.id);

    // Create tooltip element
    const tooltip = this.createTooltip(hotspot);

    // Position tooltip relative to hotspot
    this.positionTooltip(tooltip, hotspotElement, hotspot.config.tooltipPosition);

    // Add to canvas
    canvas.appendChild(tooltip);

    // Animate in
    await this.animateTooltipIn(tooltip);

    // Store active event
    this.activeEvents.set(hotspot.id, {
      type: EventType.TEXT_ON_IMAGE,
      elements: [tooltip],
      cleanup: () => this.cleanupTextTooltip(tooltip)
    });

    // Auto-hide after delay (optional)
    if (hotspot.config.autoHideDelay) {
      setTimeout(() => {
        this.clearActiveEvent(hotspot.id);
      }, hotspot.config.autoHideDelay);
    }
  }

  /**
   * Handle text popup event
   */
  private async handleTextPopup(hotspot: Hotspot, canvas: HTMLElement, hotspotElement: HTMLElement): Promise<void> {
    // Create modal overlay
    const overlay = this.createModalOverlay();

    // Create popup content
    const popup = this.createTextPopup(hotspot);

    // Add to overlay
    overlay.appendChild(popup);

    // Add to document body for full screen coverage
    document.body.appendChild(overlay);

    // Animate in
    await this.animatePopupIn(overlay, popup);

    // Store active event
    this.activeEvents.set(hotspot.id, {
      type: EventType.TEXT_POPUP,
      elements: [overlay],
      cleanup: () => this.cleanupTextPopup(overlay)
    });

    // Add close handlers
    this.addPopupCloseHandlers(overlay, hotspot.id);
  }

  /**
   * Handle pan/zoom event
   */
  private async handlePanZoom(hotspot: Hotspot, canvas: HTMLElement, hotspotElement: HTMLElement): Promise<void> {
    const backgroundElement = canvas.querySelector('.background-image, .background-video, .background-youtube') as HTMLElement;
    if (!backgroundElement) return;

    // Calculate zoom and pan values
    const zoomLevel = hotspot.config.zoomLevel || 1.5;
    const panOffset = hotspot.config.panOffset || { x: -9, y: -15 }; // Default from original

    // Store original transform
    const originalTransform = backgroundElement.style.transform;

    // Apply zoom and pan
    backgroundElement.style.transition = `transform ${this.options.zoomTransitionDuration}ms ease-in-out`;
    backgroundElement.style.transform = `scale(${zoomLevel}) translate(${panOffset.x}%, ${panOffset.y}%)`;

    // Add banner overlay if specified
    let bannerElement: HTMLElement | null = null;
    if (hotspot.config.bannerText) {
      bannerElement = this.createBannerOverlay(hotspot.config.bannerText);
      canvas.appendChild(bannerElement);
      await this.animateBannerIn(bannerElement);
    }

    // Store active event
    this.activeEvents.set(hotspot.id, {
      type: EventType.PAN_ZOOM,
      elements: bannerElement ? [bannerElement] : [],
      originalTransform,
      backgroundElement,
      cleanup: () => this.cleanupPanZoom(backgroundElement, originalTransform, bannerElement)
    });
  }

  /**
   * Handle spotlight event
   */
  private async handleSpotlight(hotspot: Hotspot, canvas: HTMLElement, hotspotElement: HTMLElement): Promise<void> {
    // Create spotlight overlay
    const spotlightOverlay = this.createSpotlightOverlay(hotspot, hotspotElement);

    // Add to canvas
    canvas.appendChild(spotlightOverlay);

    // Animate in
    await this.animateSpotlightIn(spotlightOverlay);

    // Store active event
    this.activeEvents.set(hotspot.id, {
      type: EventType.SPOTLIGHT,
      elements: [spotlightOverlay],
      cleanup: () => this.cleanupSpotlight(spotlightOverlay)
    });

    // Add click handler to dismiss
    spotlightOverlay.addEventListener('click', () => {
      this.clearActiveEvent(hotspot.id);
    });
  }

  /**
   * Create tooltip element
   */
  private createTooltip(hotspot: Hotspot): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = `hotspot-tooltip absolute z-[${UI_CONFIG.zIndex.tooltip}] bg-gray-900/90 text-white text-sm rounded-md px-3 py-2 shadow-lg max-w-xs pointer-events-none`;
    tooltip.dataset.hotspotId = hotspot.id;

    // Add content
    if (hotspot.config.tooltipContent) {
      tooltip.textContent = hotspot.config.tooltipContent;
    }

    // Add arrow based on position
    this.addTooltipArrow(tooltip, hotspot.config.tooltipPosition);

    return tooltip;
  }

  /**
   * Position tooltip relative to hotspot
   */
  private positionTooltip(tooltip: HTMLElement, hotspotElement: HTMLElement, position: string = TOOLTIP_POSITIONS.BOTTOM): void {
    const hotspotRect = hotspotElement.getBoundingClientRect();
    const canvasElement = hotspotElement.closest('.main-canvas') as HTMLElement;
    if (!canvasElement) return;

    const canvasRect = canvasElement.getBoundingClientRect();

    // Calculate position relative to canvas
    const relativeX = hotspotRect.left - canvasRect.left + hotspotRect.width / 2;
    const relativeY = hotspotRect.top - canvasRect.top + hotspotRect.height / 2;

    switch (position) {
      case TOOLTIP_POSITIONS.TOP:
        tooltip.style.left = `${relativeX}px`;
        tooltip.style.bottom = `${canvasRect.height - relativeY + hotspotRect.height / 2 + 8}px`;
        tooltip.style.transform = 'translateX(-50%)';
        break;

      case TOOLTIP_POSITIONS.BOTTOM:
        tooltip.style.left = `${relativeX}px`;
        tooltip.style.top = `${relativeY + hotspotRect.height / 2 + 8}px`;
        tooltip.style.transform = 'translateX(-50%)';
        break;

      case TOOLTIP_POSITIONS.LEFT:
        tooltip.style.right = `${canvasRect.width - relativeX + hotspotRect.width / 2 + 8}px`;
        tooltip.style.top = `${relativeY}px`;
        tooltip.style.transform = 'translateY(-50%)';
        break;

      case TOOLTIP_POSITIONS.RIGHT:
        tooltip.style.left = `${relativeX + hotspotRect.width / 2 + 8}px`;
        tooltip.style.top = `${relativeY}px`;
        tooltip.style.transform = 'translateY(-50%)';
        break;
    }
  }

  /**
   * Add arrow to tooltip
   */
  private addTooltipArrow(tooltip: HTMLElement, position?: string): void {
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow absolute';

    switch (position) {
      case TOOLTIP_POSITIONS.TOP:
        arrow.className += ' top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90';
        break;
      case TOOLTIP_POSITIONS.BOTTOM:
        arrow.className += ' bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900/90';
        break;
      case TOOLTIP_POSITIONS.LEFT:
        arrow.className += ' left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900/90';
        break;
      case TOOLTIP_POSITIONS.RIGHT:
        arrow.className += ' right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900/90';
        break;
    }

    tooltip.appendChild(arrow);
  }

  /**
   * Create modal overlay
   */
  private createModalOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = `modal-overlay fixed inset-0 bg-black/80 z-[${UI_CONFIG.zIndex.modal}] flex items-center justify-center`;
    overlay.style.opacity = '0';

    return overlay;
  }

  /**
   * Create text popup
   */
  private createTextPopup(hotspot: Hotspot): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'text-popup bg-white rounded-lg shadow-xl max-w-md mx-4 transform scale-90';

    // Header
    const header = document.createElement('div');
    header.className = 'popup-header flex items-center justify-between p-4 border-b border-gray-200';

    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold text-gray-900';
    title.textContent = hotspot.config.title || 'Information';

    const closeButton = document.createElement('button');
    closeButton.className = 'text-gray-400 hover:text-gray-600 transition-colors';
    closeButton.innerHTML = '<span class="material-symbols-outlined">close</span>';
    closeButton.onclick = () => this.clearActiveEvent(hotspot.id);

    header.appendChild(title);
    header.appendChild(closeButton);

    // Content
    const content = document.createElement('div');
    content.className = 'popup-content p-4';
    content.textContent = hotspot.config.tooltipContent || 'No content provided.';

    popup.appendChild(header);
    popup.appendChild(content);

    return popup;
  }

  /**
   * Create banner overlay
   */
  private createBannerOverlay(text: string): HTMLElement {
    const banner = document.createElement('div');
    banner.className = 'banner-overlay absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white text-sm rounded-md px-3 py-2 shadow-lg max-w-xs text-center';
    banner.textContent = text;
    banner.style.opacity = '0';
    banner.style.transform = 'translateX(-50%) translateY(10px)';

    return banner;
  }

  /**
   * Create spotlight overlay
   */
  private createSpotlightOverlay(hotspot: Hotspot, hotspotElement: HTMLElement): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = `spotlight-overlay absolute inset-0 pointer-events-auto z-[${UI_CONFIG.zIndex.modal}]`;
    overlay.style.opacity = '0';

    // Calculate spotlight position and size
    const hotspotRect = hotspotElement.getBoundingClientRect();
    const canvasElement = hotspotElement.closest('.main-canvas') as HTMLElement;
    if (!canvasElement) return overlay;

    const canvasRect = canvasElement.getBoundingClientRect();

    const spotlightSize = hotspot.config.spotlightSize || 200;
    const centerX = hotspotRect.left - canvasRect.left + hotspotRect.width / 2;
    const centerY = hotspotRect.top - canvasRect.top + hotspotRect.height / 2;

    // Create radial gradient for spotlight effect
    const intensity = hotspot.config.spotlightIntensity || 0.8;
    overlay.style.background = `radial-gradient(circle at ${centerX}px ${centerY}px, transparent ${spotlightSize / 2}px, rgba(0,0,0,${intensity}) ${spotlightSize}px)`;

    return overlay;
  }

  /**
   * Animate tooltip in
   */
  private animateTooltipIn(tooltip: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      tooltip.style.opacity = '0';
      tooltip.style.transform += ' scale(0.9)';

      requestAnimationFrame(() => {
        tooltip.style.transition = `opacity ${this.options.animationDuration}ms ease, transform ${this.options.animationDuration}ms ease`;
        tooltip.style.opacity = '1';
        tooltip.style.transform = tooltip.style.transform.replace('scale(0.9)', 'scale(1)');

        setTimeout(resolve, this.options.animationDuration);
      });
    });
  }

  /**
   * Animate popup in
   */
  private animatePopupIn(overlay: HTMLElement, popup: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        overlay.style.transition = `opacity ${this.options.animationDuration}ms ease`;
        popup.style.transition = `transform ${this.options.animationDuration}ms ease`;

        overlay.style.opacity = '1';
        popup.style.transform = 'scale(1)';

        setTimeout(resolve, this.options.animationDuration);
      });
    });
  }

  /**
   * Animate banner in
   */
  private animateBannerIn(banner: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        banner.style.transition = `opacity ${this.options.animationDuration}ms ease, transform ${this.options.animationDuration}ms ease`;
        banner.style.opacity = '1';
        banner.style.transform = 'translateX(-50%) translateY(0)';

        setTimeout(resolve, this.options.animationDuration);
      });
    });
  }

  /**
   * Animate spotlight in
   */
  private animateSpotlightIn(spotlight: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        spotlight.style.transition = `opacity ${this.options.spotlightFadeDuration}ms ease`;
        spotlight.style.opacity = '1';

        setTimeout(resolve, this.options.spotlightFadeDuration);
      });
    });
  }

  /**
   * Add popup close handlers
   */
  private addPopupCloseHandlers(overlay: HTMLElement, hotspotId: string): void {
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.clearActiveEvent(hotspotId);
      }
    });

    // Close on escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.clearActiveEvent(hotspotId);
        document.removeEventListener('keydown', escapeHandler);
      }
    };

    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Clear tooltip for specific hotspot
   */
  private clearTooltipForHotspot(hotspotId: string): void {
    const existingTooltip = document.querySelector(`.hotspot-tooltip[data-hotspot-id="${hotspotId}"]`);
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }

  /**
   * Clear active event for hotspot
   */
  clearActiveEvent(hotspotId: string): void {
    const activeEvent = this.activeEvents.get(hotspotId);
    if (!activeEvent) return;

    // Run cleanup function
    if (activeEvent.cleanup) {
      activeEvent.cleanup();
    }

    // Remove from active events
    this.activeEvents.delete(hotspotId);
  }

  /**
   * Clear all active events
   */
  clearAllActiveEvents(): void {
    for (const hotspotId of this.activeEvents.keys()) {
      this.clearActiveEvent(hotspotId);
    }
  }

  /**
   * Cleanup text tooltip
   */
  private cleanupTextTooltip(tooltip: HTMLElement): void {
    if (tooltip && tooltip.parentNode) {
      tooltip.style.transition = `opacity ${this.options.animationDuration}ms ease, transform ${this.options.animationDuration}ms ease`;
      tooltip.style.opacity = '0';
      tooltip.style.transform += ' scale(0.9)';

      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.remove();
        }
      }, this.options.animationDuration);
    }
  }

  /**
   * Cleanup text popup
   */
  private cleanupTextPopup(overlay: HTMLElement): void {
    if (overlay && overlay.parentNode) {
      const popup = overlay.querySelector('.text-popup') as HTMLElement;

      overlay.style.transition = `opacity ${this.options.animationDuration}ms ease`;
      if (popup) {
        popup.style.transition = `transform ${this.options.animationDuration}ms ease`;
        popup.style.transform = 'scale(0.9)';
      }
      overlay.style.opacity = '0';

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, this.options.animationDuration);
    }
  }

  /**
   * Cleanup pan/zoom effect
   */
  private cleanupPanZoom(backgroundElement: HTMLElement, originalTransform: string, bannerElement: HTMLElement | null): void {
    // Restore original transform
    if (backgroundElement) {
      backgroundElement.style.transform = originalTransform;

      // Remove transition after animation completes
      setTimeout(() => {
        backgroundElement.style.transition = '';
      }, this.options.zoomTransitionDuration);
    }

    // Remove banner if present
    if (bannerElement && bannerElement.parentNode) {
      bannerElement.style.transition = `opacity ${this.options.animationDuration}ms ease, transform ${this.options.animationDuration}ms ease`;
      bannerElement.style.opacity = '0';
      bannerElement.style.transform += ' translateY(10px)';

      setTimeout(() => {
        if (bannerElement.parentNode) {
          bannerElement.remove();
        }
      }, this.options.animationDuration);
    }
  }

  /**
   * Cleanup spotlight effect
   */
  private cleanupSpotlight(spotlightOverlay: HTMLElement): void {
    if (spotlightOverlay && spotlightOverlay.parentNode) {
      spotlightOverlay.style.transition = `opacity ${this.options.spotlightFadeDuration}ms ease`;
      spotlightOverlay.style.opacity = '0';

      setTimeout(() => {
        if (spotlightOverlay.parentNode) {
          spotlightOverlay.remove();
        }
      }, this.options.spotlightFadeDuration);
    }
  }

  /**
   * Get active event for hotspot
   */
  getActiveEvent(hotspotId: string): ActiveEventData | null {
    return this.activeEvents.get(hotspotId) || null;
  }

  /**
   * Check if hotspot has active event
   */
  hasActiveEvent(hotspotId: string): boolean {
    return this.activeEvents.has(hotspotId);
  }

  /**
   * Get all active events
   */
  getAllActiveEvents(): Map<string, ActiveEventData> {
    return new Map(this.activeEvents);
  }

  /**
   * Set animation options
   */
  setAnimationOptions(options: Partial<EventHandlerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Destroy the event type handlers
   */
  destroy(): void {
    this.clearAllActiveEvents();
    this.animationFrames.clear();
    this.eventListeners.clear();
  }
}