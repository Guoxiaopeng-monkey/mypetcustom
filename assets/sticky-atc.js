


class StickyATC extends HTMLElement {
    constructor() {
        super();
        /** @type {string} */
        this._targetSelector = '.product-form-buttons';
        /** @type {Element | null} */
        this._targetNode = null;
        /** @type {IntersectionObserver | null} */
        this._observer = null;
        /** @type {number | null} */
        this._retryFrame = null;
        /** @type {number} */
        this._retryCount = 0;

        this._handleIntersection = this._handleIntersection.bind(this);
        this._attachObserver = this._attachObserver.bind(this);
    }

    connectedCallback() {
        this._targetSelector = this.dataset.targetSelector || '.product-form-buttons';
        this._attachObserver();
    }

    disconnectedCallback() {
        if (this._observer && this._targetNode) {
            this._observer.unobserve(this._targetNode);
        }

        if (this._retryFrame !== null) {
            cancelAnimationFrame(this._retryFrame);
            this._retryFrame = null;
        }
    }

    _attachObserver() {
        this._targetNode = document.querySelector(this._targetSelector);

        if (!this._targetNode) {
            if (this._retryCount < 10) {
                this._retryCount += 1;
                this._retryFrame = requestAnimationFrame(this._attachObserver);
                return;
            }

            console.warn(`[sticky-atc] Target "${this._targetSelector}" not found.`);
            this.classList.add('is-visible');
            return;
        }

        this._retryCount = 0;
        this._observer = new IntersectionObserver(this._handleIntersection, {
            root: null,
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        });

        this._observer.observe(this._targetNode);
    }

    /**
     * @param {IntersectionObserverEntry[]} entries
     */
    _handleIntersection(entries) {
        for (const entry of entries) {
            if (entry.intersectionRatio === 0) {
                this.classList.add('is-visible');
                return;
            }

            if (entry.intersectionRatio >= 0.75) {
                this.classList.remove('is-visible');
                return;
            }
        }
    }
}

if (!customElements.get('sticky-atc')) {
    customElements.define('sticky-atc', StickyATC);
}