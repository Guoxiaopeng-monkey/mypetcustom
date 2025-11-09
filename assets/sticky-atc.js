import { ThemeEvents, VariantUpdateEvent } from '@theme/events';

/**
 * @typedef {Object} VariantResource
 * @property {string} [url]
 * @property {string} [title]
 * @property {{ preview_image?: { src?: string, alt?: string } }} [featured_media]
 */

class StickyAtcElement extends HTMLElement {
    connectedCallback() {
        this.section = this.closest('.shopify-section');
        /** @type {string} */
        this.productId = this.dataset.productId || '';
        /** @type {HTMLAnchorElement | null} */
        this.titleLink = this.querySelector('.sticky-atc__title');
        this.variantTarget = this.querySelector('[data-sticky-atc-variant]');
        /** @type {HTMLAnchorElement | null} */
        this.mediaLink = this.querySelector('[data-sticky-atc-media]');
        /** @type {HTMLImageElement | null} */
        this.mediaImage = this.mediaLink?.querySelector('img') || null;
        this.anchorElement = null;

        /** @type {IntersectionObserver | null} */
        this.intersectionObserver = null;
        /** @type {MutationObserver | null} */
        this.anchorMutationObserver = null;

        this.handleVariantUpdate = this.handleVariantUpdate.bind(this);
        this.handleAnchorIntersect = this.handleAnchorIntersect.bind(this);

        if (this.section) {
            this.section.addEventListener(ThemeEvents.variantUpdate, this.handleVariantUpdate);
        }

        this.observeAnchor();

        const initialVariantTitle = this.dataset.initialVariantTitle;
        if (initialVariantTitle) {
            this.updateVariantTitle(initialVariantTitle);
        } else {
            this.toggleVariantVisibility(false);
        }
    }

    disconnectedCallback() {
        this.section?.removeEventListener(ThemeEvents.variantUpdate, this.handleVariantUpdate);
        this.disconnectObservers();
    }

    observeAnchor() {
        const anchor = this.getAnchor();
        if (anchor) {
            this.createIntersectionObserver(anchor);
        } else if (this.section) {
            this.anchorMutationObserver = new MutationObserver(() => {
                const anchorCandidate = this.getAnchor();
                if (!anchorCandidate) return;
                this.createIntersectionObserver(anchorCandidate);
                this.anchorMutationObserver?.disconnect();
                this.anchorMutationObserver = null;
            });
            this.anchorMutationObserver.observe(this.section, {
                childList: true,
                subtree: true,
            });
        }
    }

    getAnchor() {
        return this.section?.querySelector('[data-sticky-atc-anchor]') ?? null;
    }

    /**
     * @param {Element} anchor
     */
    createIntersectionObserver(anchor) {
        if (this.intersectionObserver) return;

        this.intersectionObserver = new IntersectionObserver(this.handleAnchorIntersect, {
            root: null,
            threshold: 0,
        });
        this.intersectionObserver.observe(anchor);
        this.anchorElement = anchor;

        const anchorRect = anchor.getBoundingClientRect();
        const shouldShow = anchorRect.bottom <= 0;
        this.setVisibility(shouldShow);
    }

    /**
     * @param {IntersectionObserverEntry[]} entries
     */
    handleAnchorIntersect(entries) {
        const [entry] = entries;
        if (!entry) return;
        const shouldShow = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        this.setVisibility(shouldShow);
    }

    /**
     * @param {boolean} shouldShow
     */
    setVisibility(shouldShow) {
        const currentState = this.getAttribute('aria-hidden') !== 'false';
        if (shouldShow === !currentState) return;

        this.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        this.dataset.visible = shouldShow ? 'true' : 'false';
    }

    /**
     * @param {VariantUpdateEvent} event
     */
    handleVariantUpdate(event) {
        const { detail } = event;
        if (!detail || !detail.data) return;

        const { resource, data } = detail;
        const productId = (data.newProduct?.id ?? data.productId)?.toString();

        if (!productId || productId !== this.productId) return;

        this.productId = productId;
        this.dataset.productId = productId;

        /** @type {VariantResource} */
        const variantResource = resource ?? {};

        const targetUrl = variantResource.url || data.newProduct?.url || this.dataset.productUrl;
        if (targetUrl) {
            if (this.titleLink) {
                this.titleLink.href = targetUrl;
            }
            if (this.mediaLink) {
                this.mediaLink.href = targetUrl;
            }
            this.dataset.productUrl = targetUrl;
        }

        const currentAnchor = this.getAnchor();
        if (currentAnchor && currentAnchor !== this.anchorElement) {
            this.resetIntersectionObserver(currentAnchor);
        }

        const variantTitle = variantResource.title ?? '';
        this.updateVariantTitle(variantTitle);
        this.updateMedia(variantResource);
    }

    /**
     * @param {string} title
     */
    updateVariantTitle(title) {
        if (!this.variantTarget) return;

        const hasTitle = Boolean(title && title !== 'Default Title');
        this.toggleVariantVisibility(hasTitle);

        if (!hasTitle) {
            this.variantTarget.textContent = '';
            return;
        }

        this.variantTarget.textContent = title;
    }

    /**
     * @param {boolean} visible
     */
    toggleVariantVisibility(visible) {
        if (!this.variantTarget) return;
        if (visible) {
            this.variantTarget.removeAttribute('hidden');
        } else if (!this.variantTarget.hasAttribute('hidden')) {
            this.variantTarget.setAttribute('hidden', '');
        }
    }

    /**
     * @param {VariantResource} variant
     */
    updateMedia(variant) {
        if (!this.mediaLink) return;

        const previewImage = variant?.featured_media?.preview_image;
        const previewSrc = previewImage?.src;

        if (!previewSrc) {
            this.mediaLink.setAttribute('hidden', '');
            return;
        }

        this.mediaLink.removeAttribute('hidden');

        if (!this.mediaImage) {
            this.mediaImage = document.createElement('img');
            this.mediaImage.loading = 'lazy';
            this.mediaLink.appendChild(this.mediaImage);
        }

        const widths = [80, 120, 160];
        /**
         * @param {number} width
         */
        const buildSrc = (width) => {
            try {
                const url = new URL(previewSrc);
                url.searchParams.set('width', width.toString());
                return url.toString();
            } catch (_error) {
                const separator = previewSrc.includes('?') ? '&' : '?';
                return `${previewSrc}${separator}width=${width}`;
            }
        };

        this.mediaImage.src = buildSrc(120);
        this.mediaImage.srcset = widths.map((width) => `${buildSrc(width)} ${width}w`).join(', ');
        this.mediaImage.sizes = '(max-width: 480px) 80px, 120px';
        this.mediaImage.alt = previewImage?.alt || this.dataset.productTitle || '';
    }

    disconnectObservers() {
        this.intersectionObserver?.disconnect();
        this.intersectionObserver = null;
        this.anchorElement = null;
        this.anchorMutationObserver?.disconnect();
        this.anchorMutationObserver = null;
    }

    /**
     * @param {Element} anchor
     */
    resetIntersectionObserver(anchor) {
        this.intersectionObserver?.disconnect();
        this.intersectionObserver = null;
        this.createIntersectionObserver(anchor);
    }
}

if (!customElements.get('sticky-atc')) {
    customElements.define('sticky-atc', StickyAtcElement);
}

