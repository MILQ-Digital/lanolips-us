class ReadMore extends HTMLElement {
  constructor() {
    super();
    this.isExpanded = false;
    this.expandText = this.dataset.expandText || 'Read more';
    this.collapseText = this.dataset.collapseText || 'Read less';
    this.content = this.querySelector('[data-read-more-content]');
    this.button = this.querySelector('[data-read-more-button]');
    
    this.init();
  }

  init() {
    if (!this.content || !this.button) {
      console.warn('ReadMore: Required elements not found');
      return;
    }

    // Store the full height for smooth transitions
    this.fullHeight = this.content.scrollHeight;
    this.initialHeight = parseInt(getComputedStyle(this.content).getPropertyValue('--initial-height')) || 200;

    // Check if content needs the read more functionality
    if (this.fullHeight <= this.initialHeight) {
      this.button.style.display = 'none';
      return;
    }

    this.button.addEventListener('click', () => this.toggle());
    this.updateButtonText();
  }

  toggle() {
    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded) {
      this.content.style.maxHeight = this.fullHeight + 'px';
      this.content.classList.add('expanded');
      this.classList.add('expanded');
    } else {
      this.content.style.maxHeight = this.initialHeight + 'px';
      this.content.classList.remove('expanded');
      this.classList.remove('expanded');
    }
    
    this.updateButtonText();
  }

  updateButtonText() {
    this.button.textContent = this.isExpanded ? this.collapseText : this.expandText;
  }
}

if (!customElements.get('read-more')) {
  customElements.define('read-more', ReadMore);
}