/**
 * Hover Preview Module
 * Gwern.net-style floating preview windows for links
 */

const HoverPreview = {
    config: {
        hoverDelay: 300,        // ms before showing preview
        hideDelay: 150,         // ms before hiding on mouse leave
        margin: 16,             // px margin from viewport edges
    },

    state: {
        previewEl: null,
        currentLink: null,
        showTimeout: null,
        hideTimeout: null,
        previewData: null,
        pageCache: new Map(),
        isVisible: false,
    },

    /**
     * Initialize the hover preview system
     */
    init() {
        // Check for touch device - disable hover previews
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            return;
        }

        this.state.previewEl = document.getElementById('hover-preview');
        if (!this.state.previewEl) return;

        this.loadPreviewData().then(() => {
            this.attachEventListeners();
        });
    },

    /**
     * Load preview data from JSON manifest
     */
    async loadPreviewData() {
        try {
            const response = await fetch('/_preview-data.json');
            if (response.ok) {
                this.state.previewData = await response.json();
            }
        } catch (e) {
            console.warn('Could not load preview data:', e);
            this.state.previewData = { internal: {}, external: {} };
        }
    },

    /**
     * Attach event listeners to document
     */
    attachEventListeners() {
        document.addEventListener('mouseover', (e) => this.handleMouseEnter(e));
        document.addEventListener('mouseout', (e) => this.handleMouseLeave(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hidePreview();
        });
    },

    /**
     * Handle mouse entering a link
     */
    handleMouseEnter(e) {
        const link = e.target.closest('a[href]');
        if (!link || this.isExcluded(link)) return;

        clearTimeout(this.state.hideTimeout);

        // If same link, don't restart timer
        if (link === this.state.currentLink && this.state.isVisible) return;

        this.state.currentLink = link;

        clearTimeout(this.state.showTimeout);
        this.state.showTimeout = setTimeout(() => {
            this.showPreview(link);
        }, this.config.hoverDelay);
    },

    /**
     * Handle mouse leaving a link
     */
    handleMouseLeave(e) {
        const link = e.target.closest('a[href]');
        if (!link) return;

        clearTimeout(this.state.showTimeout);

        this.state.hideTimeout = setTimeout(() => {
            this.hidePreview();
        }, this.config.hideDelay);
    },

    /**
     * Check if link should be excluded from previews
     */
    isExcluded(link) {
        const href = link.getAttribute('href');
        if (!href) return true;

        // Exclude mailto links
        if (href.startsWith('mailto:')) return true;

        // Exclude javascript: links
        if (href.startsWith('javascript:')) return true;

        // Allow individual links and navigation groups to opt out.
        if (link.hasAttribute('data-no-preview')) return true;
        if (link.closest('.section-nav, .page-nav')) return true;

        // Exclude nav links within fixed-nav (they have special scroll behavior)
        if (link.closest('.fixed-nav')) return true;

        return false;
    },

    /**
     * Detect link type
     */
    detectLinkType(href) {
        if (!href) return 'invalid';
        if (href.startsWith('#')) return 'internal-section';
        if (href.startsWith('/') || href.startsWith(window.location.origin)) {
            return 'internal-page';
        }
        return 'external';
    },

    /**
     * Show preview for a link
     */
    async showPreview(link) {
        const href = link.getAttribute('href');
        const linkType = this.detectLinkType(href);

        const previewContent = await this.getPreviewContent(href, linkType, link);
        if (link !== this.state.currentLink) return;
        if (!previewContent) {
            this.hidePreview();
            return;
        }

        this.renderPreview(previewContent, linkType);
        this.positionPreview(link);

        this.state.previewEl.classList.add('visible');
        this.state.previewEl.setAttribute('aria-hidden', 'false');
        this.state.isVisible = true;
    },

    /**
     * Hide the preview
     */
    hidePreview() {
        if (!this.state.previewEl) return;

        this.state.previewEl.classList.remove('visible');
        this.state.previewEl.setAttribute('aria-hidden', 'true');
        this.state.isVisible = false;
        this.state.currentLink = null;
    },

    /**
     * Get preview content for a URL
     */
    async getPreviewContent(href, linkType, link) {
        if (!this.state.previewData) return null;

        if (linkType === 'internal-section') {
            return this.state.previewData.internal?.[href] || null;
        }

        if (linkType === 'external') {
            // Try to find in pre-fetched data
            const cached = this.state.previewData.external?.[href];
            if (cached) return cached;

            // For URLs not pre-fetched, show basic info from URL
            return this.createBasicPreview(href);
        }

        if (linkType === 'internal-page') {
            const embeddedTitle = link.dataset.previewTitle;
            const embeddedDescription = link.dataset.previewDescription;
            if (embeddedTitle || embeddedDescription) {
                return {
                    title: embeddedTitle || link.textContent.trim(),
                    description: embeddedDescription || '',
                };
            }

            return this.fetchInternalPreview(href);
        }

        return null;
    },

    /**
     * Read metadata from an internal page and cache it for future hovers.
     */
    async fetchInternalPreview(href) {
        const url = new URL(href, window.location.origin).href;
        if (this.state.pageCache.has(url)) {
            return this.state.pageCache.get(url);
        }

        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const html = await response.text();
            const document = new DOMParser().parseFromString(html, 'text/html');
            const preview = {
                title: document.querySelector('meta[property="og:title"]')?.content
                    || document.querySelector('title')?.textContent
                    || '',
                description: document.querySelector('meta[name="description"]')?.content || '',
                thumbnail: document.querySelector('meta[property="og:image"]')?.content || null,
            };

            this.state.pageCache.set(url, preview);
            return preview;
        } catch {
            return null;
        }
    },

    /**
     * Create basic preview from URL when no metadata available
     */
    createBasicPreview(href) {
        try {
            const url = new URL(href);
            return {
                title: url.hostname.replace('www.', ''),
                description: href,
                favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`,
                thumbnail: null,
            };
        } catch {
            return null;
        }
    },

    /**
     * Render preview content to DOM
     */
    renderPreview(data, linkType) {
        const el = this.state.previewEl;

        // Title
        const titleEl = el.querySelector('.hover-preview__title');
        titleEl.textContent = data.title || '';

        // Description
        const descEl = el.querySelector('.hover-preview__description');
        descEl.textContent = data.description || '';

        // Thumbnail
        const thumbEl = el.querySelector('.hover-preview__thumbnail');
        if (data.thumbnail) {
            thumbEl.src = data.thumbnail;
            thumbEl.classList.add('has-image');
        } else {
            thumbEl.src = '';
            thumbEl.classList.remove('has-image');
        }

        // Favicon and domain
        const faviconEl = el.querySelector('.hover-preview__favicon');
        const urlEl = el.querySelector('.hover-preview__url');

        if (linkType === 'external' && data.favicon) {
            faviconEl.src = data.favicon;
            faviconEl.classList.add('has-image');
        } else {
            faviconEl.classList.remove('has-image');
        }

        if (linkType === 'external') {
            try {
                urlEl.textContent = new URL(data.url || data.description).hostname.replace('www.', '');
            } catch {
                urlEl.textContent = '';
            }
        } else {
            urlEl.textContent = '';
        }

        // Internal links do not need the external domain row.
        el.classList.toggle('internal', linkType !== 'external');
        el.classList.remove('loading');
    },

    /**
     * Position preview relative to link, avoiding viewport edges
     */
    positionPreview(link) {
        const el = this.state.previewEl;
        const linkRect = link.getBoundingClientRect();
        const margin = this.config.margin;

        // Temporarily show to measure
        el.style.visibility = 'hidden';
        el.style.display = 'block';
        const previewRect = el.getBoundingClientRect();
        el.style.visibility = '';

        const viewport = {
            w: window.innerWidth,
            h: window.innerHeight,
        };

        let x, y;

        // Prefer positioning to the right of the link
        if (linkRect.right + margin + previewRect.width < viewport.w) {
            x = linkRect.right + margin;
        }
        // Try left of the link
        else if (linkRect.left - margin - previewRect.width > 0) {
            x = linkRect.left - margin - previewRect.width;
        }
        // Fall back to constraining within viewport
        else {
            x = Math.max(margin, viewport.w - previewRect.width - margin);
        }

        // Position vertically centered with link, constrained to viewport
        y = linkRect.top + (linkRect.height / 2) - (previewRect.height / 2);
        y = Math.max(margin, Math.min(y, viewport.h - previewRect.height - margin));

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
    },
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => HoverPreview.init());
