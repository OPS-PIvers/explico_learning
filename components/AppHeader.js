/**
 * AppHeader Component for Explico Learning
 * Provides consistent header with logo, navigation, and user controls
 */

class AppHeader {
  
  constructor(options = {}) {
    this.options = {
      title: 'Expli.co Learning',
      showSaveButton: true,
      showShareButton: true,
      showUserAvatar: true,
      userAvatarUrl: '',
      onSave: null,
      onShare: null,
      onUserClick: null,
      customActions: [],
      ...options
    };
    
    this.element = null;
    this.isDirty = false;
  }
  
  /**
   * Create and return the header element
   * @returns {HTMLElement} Header element
   */
  render() {
    this.element = document.createElement('header');
    this.element.className = 'flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#1f2937] px-6 py-4';
    this.element.style.height = `${UI_CONFIG.HEADER_HEIGHT}px`;
    
    // Left section - Logo and title
    const leftSection = this.createLeftSection();
    this.element.appendChild(leftSection);
    
    // Right section - Actions and user
    const rightSection = this.createRightSection();
    this.element.appendChild(rightSection);
    
    return this.element;
  }
  
  /**
   * Create left section with logo and title
   * @returns {HTMLElement} Left section element
   */
  createLeftSection() {
    const section = document.createElement('div');
    section.className = 'flex items-center gap-4 text-white';
    
    // Logo
    const logo = this.createLogo();
    section.appendChild(logo);
    
    // Title
    const title = document.createElement('h1');
    title.className = 'text-white text-xl font-bold';
    title.textContent = this.options.title;
    section.appendChild(title);
    
    return section;
  }
  
  /**
   * Create logo element
   * @returns {HTMLElement} Logo SVG element
   */
  createLogo() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'h-8 w-8 text-[#4f46e5]');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('viewBox', '0 0 48 48');
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('clip-path', 'url(#clip0_6_319)');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z');
    path.setAttribute('fill', 'currentColor');
    
    g.appendChild(path);
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.setAttribute('id', 'clip0_6_319');
    
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('fill', 'white');
    rect.setAttribute('height', '48');
    rect.setAttribute('width', '48');
    
    clipPath.appendChild(rect);
    defs.appendChild(clipPath);
    
    svg.appendChild(g);
    svg.appendChild(defs);
    
    return svg;
  }
  
  /**
   * Create right section with actions and user controls
   * @returns {HTMLElement} Right section element
   */
  createRightSection() {
    const section = document.createElement('div');
    section.className = 'flex items-center gap-4';
    
    // Custom actions
    this.options.customActions.forEach(action => {
      const button = this.createActionButton(action);
      section.appendChild(button);
    });
    
    // Save button
    if (this.options.showSaveButton) {
      const saveButton = this.createSaveButton();
      section.appendChild(saveButton);
    }
    
    // Share button
    if (this.options.showShareButton) {
      const shareButton = this.createShareButton();
      section.appendChild(shareButton);
    }
    
    // Notification button (optional)
    const notificationButton = this.createNotificationButton();
    section.appendChild(notificationButton);
    
    // User avatar
    if (this.options.showUserAvatar) {
      const userAvatar = this.createUserAvatar();
      section.appendChild(userAvatar);
    }
    
    return section;
  }
  
  /**
   * Create save button
   * @returns {HTMLElement} Save button element
   */
  createSaveButton() {
    const button = document.createElement('button');
    button.className = 'flex items-center justify-center gap-2 overflow-hidden rounded-md h-10 px-4 bg-[#4f46e5] text-white text-sm font-semibold tracking-wide shadow-sm hover:bg-[#4338ca] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5] transition-colors';
    button.id = 'save-button';
    
    // Add loading state capability
    button.dataset.originalContent = button.innerHTML;
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'save';
    
    const text = document.createElement('span');
    text.textContent = 'Save';
    
    button.appendChild(icon);
    button.appendChild(text);
    
    // Event listener
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.options.onSave && !button.disabled) {
        this.setSaveButtonLoading(true);
        this.options.onSave().finally(() => {
          this.setSaveButtonLoading(false);
        });
      }
    });
    
    return button;
  }
  
  /**
   * Create share button
   * @returns {HTMLElement} Share button element
   */
  createShareButton() {
    const button = document.createElement('button');
    button.className = 'flex items-center justify-center gap-2 overflow-hidden rounded-md h-10 px-4 bg-gray-700 text-white text-sm font-semibold tracking-wide shadow-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700 transition-colors';
    button.id = 'share-button';
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'share';
    
    const text = document.createElement('span');
    text.textContent = 'Share';
    
    button.appendChild(icon);
    button.appendChild(text);
    
    // Event listener
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.options.onShare) {
        this.options.onShare();
      }
    });
    
    return button;
  }
  
  /**
   * Create notification button
   * @returns {HTMLElement} Notification button element
   */
  createNotificationButton() {
    const button = document.createElement('button');
    button.className = 'relative transition-colors hover:text-white';
    button.id = 'notification-button';
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined text-[#999999]';
    icon.textContent = 'notifications';
    
    button.appendChild(icon);
    
    // Notification badge (hidden by default)
    const badge = StatusBadge.createCountBadge({
      count: 0,
      size: 'sm',
      showZero: false
    });
    
    if (badge) {
      badge.className += ' absolute -top-1 -right-1';
      button.appendChild(badge);
    }
    
    return button;
  }
  
  /**
   * Create user avatar
   * @returns {HTMLElement} User avatar element
   */
  createUserAvatar() {
    const avatar = document.createElement('div');
    avatar.className = 'bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ml-4 border-2 border-gray-700 cursor-pointer hover:border-gray-500 transition-colors';
    avatar.id = 'user-avatar';
    
    if (this.options.userAvatarUrl) {
      avatar.style.backgroundImage = `url("${this.options.userAvatarUrl}")`;
    } else {
      // Default avatar
      avatar.style.backgroundImage = `url("https://lh3.googleusercontent.com/aida-public/AB6AXuDu8bjMQr034fyr7equOxCU4KABNMl_-DNCpSf7aXHVarMYldfnYLfjTaFko1LfEMVrmZUi_H97vWJr0dQQS3_uh2ew2o42Gcaz4I3evYYuLFYnpY8z2Hk7UjfM-8EWQTSW-YWJVMKwCvAOGciVQ5dMwvrzIDii-59qmFvPIHsf8CbCnFYfsYqpn_ib8Dtrb7n-vSPhK4IlhQThnUYJilByFJ8GrHLMLjxzKpAb0GHdK_Y4vZ9JlWSD1j4c8pGeIWhoeWkgQa2du7Y")`;
    }
    
    // Event listener
    avatar.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.options.onUserClick) {
        this.options.onUserClick();
      }
    });
    
    return avatar;
  }
  
  /**
   * Create custom action button
   * @param {Object} action - Action configuration
   * @returns {HTMLElement} Action button element
   */
  createActionButton(action) {
    const button = document.createElement('button');
    button.className = action.className || 'btn btn-secondary';
    button.id = action.id || '';
    button.title = action.tooltip || '';
    
    if (action.icon) {
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = action.icon;
      button.appendChild(icon);
    }
    
    if (action.text) {
      const text = document.createElement('span');
      text.textContent = action.text;
      button.appendChild(text);
    }
    
    if (action.onClick) {
      button.addEventListener('click', action.onClick);
    }
    
    return button;
  }
  
  /**
   * Set save button loading state
   * @param {boolean} loading - Whether button is loading
   */
  setSaveButtonLoading(loading) {
    const button = this.element?.querySelector('#save-button');
    if (!button) return;
    
    if (loading) {
      button.disabled = true;
      button.innerHTML = `
        <span class="material-symbols-outlined animate-spin">refresh</span>
        <span>Saving...</span>
      `;
    } else {
      button.disabled = false;
      button.innerHTML = `
        <span class="material-symbols-outlined">save</span>
        <span>Save</span>
      `;
    }
  }
  
  /**
   * Set dirty state (shows unsaved changes indicator)
   * @param {boolean} dirty - Whether there are unsaved changes
   */
  setDirty(dirty) {
    this.isDirty = dirty;
    const button = this.element?.querySelector('#save-button');
    if (!button) return;
    
    if (dirty) {
      button.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
      button.classList.remove('bg-[#4f46e5]', 'hover:bg-[#4338ca]');
    } else {
      button.classList.remove('bg-yellow-600', 'hover:bg-yellow-700');
      button.classList.add('bg-[#4f46e5]', 'hover:bg-[#4338ca]');
    }
  }
  
  /**
   * Update notification count
   * @param {number} count - Notification count
   */
  setNotificationCount(count) {
    const button = this.element?.querySelector('#notification-button');
    if (!button) return;
    
    // Remove existing badge
    const existingBadge = button.querySelector('span:last-child');
    if (existingBadge && existingBadge.classList.contains('absolute')) {
      existingBadge.remove();
    }
    
    // Add new badge if count > 0
    if (count > 0) {
      const badge = StatusBadge.createCountBadge({
        count: count,
        size: 'sm'
      });
      
      if (badge) {
        badge.className += ' absolute -top-1 -right-1';
        button.appendChild(badge);
      }
    }
  }
  
  /**
   * Update user avatar
   * @param {string} avatarUrl - New avatar URL
   */
  setUserAvatar(avatarUrl) {
    const avatar = this.element?.querySelector('#user-avatar');
    if (!avatar) return;
    
    avatar.style.backgroundImage = `url("${avatarUrl}")`;
    this.options.userAvatarUrl = avatarUrl;
  }
  
  /**
   * Update header title
   * @param {string} title - New title
   */
  setTitle(title) {
    const titleEl = this.element?.querySelector('h1');
    if (!titleEl) return;
    
    titleEl.textContent = title;
    this.options.title = title;
  }
  
  /**
   * Show/hide save button
   * @param {boolean} show - Whether to show save button
   */
  toggleSaveButton(show) {
    const button = this.element?.querySelector('#save-button');
    if (!button) return;
    
    button.style.display = show ? 'flex' : 'none';
    this.options.showSaveButton = show;
  }
  
  /**
   * Show/hide share button
   * @param {boolean} show - Whether to show share button
   */
  toggleShareButton(show) {
    const button = this.element?.querySelector('#share-button');
    if (!button) return;
    
    button.style.display = show ? 'flex' : 'none';
    this.options.showShareButton = show;
  }
  
  /**
   * Add custom CSS to header
   * @param {string} css - CSS string
   */
  addCustomStyles(css) {
    if (!this.element) return;
    
    const style = document.createElement('style');
    style.textContent = css;
    this.element.appendChild(style);
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
  
  /**
   * Get header element
   * @returns {HTMLElement|null} Header element
   */
  getElement() {
    return this.element;
  }
}