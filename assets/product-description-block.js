import { Component } from '@theme/component';

class ProductDescriptionBlock extends Component {
    requiredRefs = ['content', 'toggle'];

    /** @type {number} */
    #collapsedHeight = 0;

    /** @type {boolean} */
    #expanded = false;

    /** @type {number} */
    #lineClamp = 5;

    /** @type {ResizeObserver | undefined} */
    #resizeObserver;

    /** @type {(event: Event) => void} */
    #boundResizeHandler = () => this.#onWindowResize();

    /**
     * @returns {HTMLElement | null}
     */
    #contentRef() {
        const ref = this.refs.content;
        const node = Array.isArray(ref) ? ref.find((item) => item instanceof HTMLElement) : ref;
        return node instanceof HTMLElement ? node : null;
    }

    /**
     * @returns {HTMLButtonElement | null}
     */
    #toggleRef() {
        const ref = this.refs.toggle;
        const node = Array.isArray(ref) ? ref.find((item) => item instanceof HTMLButtonElement) : ref;
        return node instanceof HTMLButtonElement ? node : null;
    }

    connectedCallback() {
        super.connectedCallback();

        const clampValue = Number.parseInt(this.dataset.lineClamp ?? '', 10);
        this.#lineClamp = Number.isFinite(clampValue) && clampValue > 0 ? clampValue : 5;

        this.dataset.expanded = 'false';
        this.dataset.hasOverflow = 'false';

        if (typeof ResizeObserver !== 'undefined' && !this.#resizeObserver) {
            this.#resizeObserver = new ResizeObserver(() => this.#handleContentResize());
        }

        requestAnimationFrame(() => {
            this.#initialize();
            const content = this.#contentRef();
            if (content) {
                this.#resizeObserver?.observe(content);
            }
        });

        window.addEventListener('resize', this.#boundResizeHandler, { passive: true });
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.#boundResizeHandler);
        this.#resizeObserver?.disconnect();

        super.disconnectedCallback();
    }

    /**
     * Handles the initial setup by calculating the collapsed height and applying the default state.
     */
    #initialize() {
        if (!this.#contentRef() || !this.#toggleRef()) return;

        this.#collapsedHeight = this.#calculateCollapsedHeight();
        this.#updateOverflowState();
    }

    /**
     * Calculates the collapsed height based on the configured line clamp value.
     *
     * @returns {number}
     */
    #calculateCollapsedHeight() {
        const content = this.#contentRef();
        if (!content) return 0;

        const textElement =
            content.querySelector('.text-block > *') ||
            content.querySelector('.text-block') ||
            content.firstElementChild;

        if (!textElement) return 0;

        const computed = window.getComputedStyle(textElement);
        let lineHeight = parseFloat(computed.lineHeight);

        if (!lineHeight || computed.lineHeight === 'normal') {
            const fontSize = parseFloat(computed.fontSize);
            lineHeight = fontSize ? fontSize * 1.2 : 0;
        }

        return Math.max(0, lineHeight * this.#lineClamp);
    }

    /**
     * Updates the toggle visibility and content max height based on overflow.
     */
    #updateOverflowState() {
        const content = this.#contentRef();
        const toggle = this.#toggleRef();
        if (!content || !toggle) return;

        if (this.#collapsedHeight <= 0) {
            toggle.hidden = true;
            content.style.maxHeight = 'none';
            this.dataset.hasOverflow = 'false';
            this.#expanded = false;
            this.dataset.expanded = 'false';
            toggle.setAttribute('aria-expanded', 'false');
            return;
        }

        const hasOverflow = content.scrollHeight > this.#collapsedHeight + 1;
        this.dataset.hasOverflow = hasOverflow ? 'true' : 'false';

        if (!hasOverflow) {
            toggle.hidden = true;
            content.style.maxHeight = 'none';
            this.#expanded = false;
            this.dataset.expanded = 'false';
            toggle.setAttribute('aria-expanded', 'false');
            return;
        }

        const wasHidden = toggle.hidden;
        toggle.hidden = false;

        if (!this.#expanded || wasHidden) {
            this.#expanded = false;
            content.style.maxHeight = `${this.#collapsedHeight}px`;
            content.scrollTop = 0;
            this.dataset.expanded = 'false';
            toggle.setAttribute('aria-expanded', 'false');
        } else {
            toggle.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Handles resize events triggered by window resizing.
     */
    #onWindowResize() {
        const content = this.#contentRef();
        if (!content) return;

        this.#collapsedHeight = this.#calculateCollapsedHeight();
        this.#updateOverflowState();

        if (this.#expanded) {
            content.style.maxHeight = 'none';
        }
    }

    /**
     * Handles content resize events (e.g., images loading).
     */
    #handleContentResize() {
        const content = this.#contentRef();
        if (!content) return;

        if (!this.#expanded) {
            const newCollapsedHeight = this.#calculateCollapsedHeight();
            if (newCollapsedHeight > 0 && Math.abs(newCollapsedHeight - this.#collapsedHeight) > 1) {
                this.#collapsedHeight = newCollapsedHeight;
                content.style.maxHeight = `${this.#collapsedHeight}px`;
            }
        }

        this.#updateOverflowState();

        if (this.#expanded) {
            content.style.maxHeight = 'none';
        }
    }

    /**
     * Toggles the expanded state of the description block.
     *
     * @param {Event} event
     */
    toggleDescription = (event) => {
        event.preventDefault();

        const content = this.#contentRef();
        const toggle = this.#toggleRef();
        if (!content || !toggle || toggle.hidden) return;

        if (!this.#expanded) {
            const startHeight = content.offsetHeight || this.#collapsedHeight;
            const targetHeight = content.scrollHeight;

            content.style.maxHeight = `${startHeight}px`;
            requestAnimationFrame(() => {
                content.style.maxHeight = `${targetHeight}px`;
            });

            const onExpandEnd = () => {
                content.style.maxHeight = 'none';
                content.removeEventListener('transitionend', onExpandEnd);
            };

            content.addEventListener('transitionend', onExpandEnd, { once: true });

            this.#expanded = true;
            this.dataset.expanded = 'true';
            toggle.setAttribute('aria-expanded', 'true');
        } else {
            const startHeight = content.offsetHeight;
            const targetHeight = this.#collapsedHeight;

            content.style.maxHeight = `${startHeight}px`;
            requestAnimationFrame(() => {
                content.style.maxHeight = `${targetHeight}px`;
            });

            const onCollapseEnd = () => {
                content.style.maxHeight = `${targetHeight}px`;
                content.removeEventListener('transitionend', onCollapseEnd);
            };

            content.addEventListener('transitionend', onCollapseEnd, { once: true });

            this.#expanded = false;
            this.dataset.expanded = 'false';
            toggle.setAttribute('aria-expanded', 'false');
            content.scrollTop = 0;
        }
    };
}

if (!customElements.get('product-description-block')) {
    customElements.define('product-description-block', ProductDescriptionBlock);
}

