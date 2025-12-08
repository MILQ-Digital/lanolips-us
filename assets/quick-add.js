if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');

        this.addEventListener('product-info:loaded', ({ target }) => {
          target.addPreProcessCallback(this.preprocessHTML.bind(this));
        });
      }

      connectedCallback() {
        // Ensure modalContent is found after connection
        if (!this.modalContent) {
          this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');
        }
        
        // Move modal to body if not already moved
        if (!this.moved) {
          this.moved = true;
          // Try to find section, but don't fail if not found
          const section = this.closest('.shopify-section');
          if (section) {
            this.dataset.section = section.id.replace('shopify-section-', '');
          }
          // Ensure modal is at the end of body for proper z-index stacking
          document.body.appendChild(this);
        }
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        opener.querySelector('.loading__spinner').classList.remove('hidden');

        fetch(opener.getAttribute('data-product-url'))
          .then((response) => response.text())
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            const productElement = responseHTML.querySelector('product-info');

            if (!productElement) {
              console.error('Quick-add: product-info element not found in response');
              // Show modal anyway with empty content
              super.show(opener);
              return;
            }

            this.preprocessHTML(productElement);
            
            // Extract scripts BEFORE inserting HTML to prevent immediate execution
            const htmlString = productElement.outerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            const scripts = Array.from(tempDiv.querySelectorAll('script'));
            const scriptData = scripts.map(script => ({
              attributes: Array.from(script.attributes).map(attr => ({ name: attr.name, value: attr.value })),
              content: script.innerHTML
            }));
            // Remove scripts from HTML before insertion
            scripts.forEach(script => script.remove());
            
            // Ensure modalContent exists
            if (!this.modalContent) {
              this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');
            }
            
            if (!this.modalContent) {
              console.error('Quick-add: modalContent not found!');
              super.show(opener);
              return;
            }
            
            // Insert HTML WITHOUT scripts
            this.modalContent.innerHTML = tempDiv.innerHTML;
            
            // Verify content was inserted
            if (!this.modalContent.innerHTML.trim()) {
              console.error('Quick-add: No content inserted, using fallback');
              // Fallback to original method
              HTMLUpdateUtility.setInnerHTML(this.modalContent, htmlString);
            } else {
              console.log('Quick-add: Content inserted successfully', this.modalContent.innerHTML.length, 'chars');
            }
            
            // Get product-info element and ensure it's ready
            const productInfoElement = this.modalContent.querySelector('product-info');
            
            if (productInfoElement) {
              // Upgrade to custom element IMMEDIATELY
              customElements.upgrade(productInfoElement);
              
              // FORCE initialize arrays on the element instance BEFORE anything else
              Object.defineProperty(productInfoElement, 'preProcessHtmlCallbacks', {
                value: [],
                writable: true,
                configurable: true,
                enumerable: true
              });
              Object.defineProperty(productInfoElement, 'postProcessHtmlCallbacks', {
                value: [],
                writable: true,
                configurable: true,
                enumerable: true
              });
              
              // Ensure addPreProcessCallback exists and is safe
              if (typeof productInfoElement.addPreProcessCallback !== 'function') {
                productInfoElement.addPreProcessCallback = function(callback) {
                  if (!this.preProcessHtmlCallbacks || !Array.isArray(this.preProcessHtmlCallbacks)) {
                    this.preProcessHtmlCallbacks = [];
                  }
                  this.preProcessHtmlCallbacks.push(callback);
                };
              }
              
              // Wait for connectedCallback to complete, then inject scripts
              const injectScripts = () => {
                // Triple-check arrays exist
                if (!Array.isArray(productInfoElement.preProcessHtmlCallbacks)) {
                  productInfoElement.preProcessHtmlCallbacks = [];
                }
                if (!Array.isArray(productInfoElement.postProcessHtmlCallbacks)) {
                  productInfoElement.postProcessHtmlCallbacks = [];
                }
                
                // Inject scripts one at a time with verification between each
                scriptData.forEach(({ attributes, content }, index) => {
                  setTimeout(() => {
                    // CRITICAL: Force arrays to exist using defineProperty before script executes
                    // Do this RIGHT before appending to ensure it's fresh
                    Object.defineProperty(productInfoElement, 'preProcessHtmlCallbacks', {
                      value: productInfoElement.preProcessHtmlCallbacks && Array.isArray(productInfoElement.preProcessHtmlCallbacks) 
                        ? productInfoElement.preProcessHtmlCallbacks 
                        : [],
                      writable: true,
                      configurable: true,
                      enumerable: true
                    });
                    Object.defineProperty(productInfoElement, 'postProcessHtmlCallbacks', {
                      value: productInfoElement.postProcessHtmlCallbacks && Array.isArray(productInfoElement.postProcessHtmlCallbacks)
                        ? productInfoElement.postProcessHtmlCallbacks
                        : [],
                      writable: true,
                      configurable: true,
                      enumerable: true
                    });
                    
                    // Ensure addPreProcessCallback method exists and is bulletproof
                    Object.defineProperty(productInfoElement, 'addPreProcessCallback', {
                      value: function(callback) {
                        if (!this.preProcessHtmlCallbacks || !Array.isArray(this.preProcessHtmlCallbacks)) {
                          Object.defineProperty(this, 'preProcessHtmlCallbacks', {
                            value: [],
                            writable: true,
                            configurable: true,
                            enumerable: true
                          });
                        }
                        this.preProcessHtmlCallbacks.push(callback);
                      },
                      writable: true,
                      configurable: true,
                      enumerable: true
                    });
                    
                    // Verify one more time before injecting
                    ensureArrays();
                    
                    const script = document.createElement('script');
                    attributes.forEach(attr => script.setAttribute(attr.name, attr.value));
                    
                    // For inline scripts only, wrap to ensure element is ready
                    // External scripts (with src) should not be wrapped
                    const hasSrc = attributes.some(attr => attr.name === 'src');
                    
                    if (content && !hasSrc) {
                      // Inline script - wrap it
                      script.textContent = `(function() {
                        try {
                          const el = document.currentScript?.closest('product-info');
                          if (el) {
                            if (!el.preProcessHtmlCallbacks || !Array.isArray(el.preProcessHtmlCallbacks)) {
                              el.preProcessHtmlCallbacks = [];
                            }
                            if (!el.postProcessHtmlCallbacks || !Array.isArray(el.postProcessHtmlCallbacks)) {
                              el.postProcessHtmlCallbacks = [];
                            }
                          }
                          ${content}
                        } catch (e) {
                          console.error('Script error:', e);
                        }
                      })();`;
                    } else if (content) {
                      // Inline script without src but has content
                      script.textContent = content;
                    }
                    // If has src, script.src will be set by attributes, don't set textContent
                    
                    // Inject script
                    productInfoElement.appendChild(script);
                  }, index * 30); // Even longer delay between scripts
                });
              };
              
              // CRITICAL: Set up a proxy or ensure element is bulletproof BEFORE any scripts
              // Make sure arrays exist and can't be undefined
              const ensureArrays = () => {
                if (!Array.isArray(productInfoElement.preProcessHtmlCallbacks)) {
                  Object.defineProperty(productInfoElement, 'preProcessHtmlCallbacks', {
                    value: [],
                    writable: true,
                    configurable: true,
                    enumerable: true
                  });
                }
                if (!Array.isArray(productInfoElement.postProcessHtmlCallbacks)) {
                  Object.defineProperty(productInfoElement, 'postProcessHtmlCallbacks', {
                    value: [],
                    writable: true,
                    configurable: true,
                    enumerable: true
                  });
                }
                if (typeof productInfoElement.addPreProcessCallback !== 'function') {
                  Object.defineProperty(productInfoElement, 'addPreProcessCallback', {
                    value: function(callback) {
                      if (!this.preProcessHtmlCallbacks || !Array.isArray(this.preProcessHtmlCallbacks)) {
                        Object.defineProperty(this, 'preProcessHtmlCallbacks', {
                          value: [],
                          writable: true,
                          configurable: true,
                          enumerable: true
                        });
                      }
                      this.preProcessHtmlCallbacks.push(callback);
                    },
                    writable: true,
                    configurable: true,
                    enumerable: true
                  });
                }
              };
              
              // Ensure arrays exist IMMEDIATELY
              ensureArrays();
              
              // Wait for the loaded event - CRITICAL: don't inject until this fires
              let injected = false;
              const handleLoaded = () => {
                if (injected) return;
                injected = true;
                
                // Ensure arrays one more time
                ensureArrays();
                
                // Wait for next event loop to ensure everything is settled
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    ensureArrays();
                    injectScripts();
                  });
                });
              };
              
              productInfoElement.addEventListener('product-info:loaded', handleLoaded, { once: true });
              
              // Fallback: if event doesn't fire, wait and check
              setTimeout(() => {
                if (!injected) {
                  ensureArrays();
                  // Check if element is connected and initialized
                  if (productInfoElement.isConnected) {
                    handleLoaded();
                  } else {
                    // Wait longer
                    setTimeout(() => {
                      if (!injected) {
                        ensureArrays();
                        handleLoaded();
                      }
                    }, 200);
                  }
                }
              }, 50);
            } else {
              // No product-info element, use standard method
              HTMLUpdateUtility.setInnerHTML(this.modalContent, htmlString);
            }

            // Ensure modal is in the DOM and at the end of body for proper stacking
            if (!this.isConnected || this.parentElement !== document.body) {
              console.log('Quick-add: Modal not in body, moving to body');
              document.body.appendChild(this);
            }
            
            // Ensure content div has proper height before showing
            const contentDiv = this.querySelector('.quick-add-modal__content');
            if (contentDiv) {
              // Force content div to have height
              const viewportHeight = window.innerHeight;
              if (window.innerWidth >= 750) {
                const modalHeightOffset = 10; // 10rem in pixels (assuming 1rem = 16px)
                contentDiv.style.maxHeight = `calc(100vh - ${modalHeightOffset * 2 * 16}px)`;
                contentDiv.style.height = `calc(100vh - ${modalHeightOffset * 2 * 16}px)`;
              } else {
                contentDiv.style.height = 'auto';
                contentDiv.style.minHeight = '400px';
              }
            }
            
            // Ensure modalContent has height
            if (this.modalContent) {
              this.modalContent.style.height = '100%';
              this.modalContent.style.minHeight = '400px';
            }
            
            // Show modal IMMEDIATELY - don't wait for scripts
            console.log('Quick-add: Showing modal', {
              isConnected: this.isConnected,
              parentElement: this.parentElement?.tagName || 'none',
              isInBody: this.parentElement === document.body,
              hasOpenAttr: this.hasAttribute('open'),
              modalContent: this.modalContent?.innerHTML?.length || 0,
              modalId: this.id,
              nextSibling: this.nextElementSibling?.tagName || 'none',
              previousSibling: this.previousElementSibling?.tagName || 'none'
            });
            super.show(opener);
            
            // Verify modal is visible after showing
            setTimeout(() => {
              const contentDiv = this.querySelector('.quick-add-modal__content');
              const productInfo = this.modalContent?.querySelector('product-info');
              const computedStyle = window.getComputedStyle(this);
              const contentStyle = contentDiv ? window.getComputedStyle(contentDiv) : null;
              const modalContentStyle = this.modalContent ? window.getComputedStyle(this.modalContent) : null;
              
              const debugInfo = {
                hasOpen: this.hasAttribute('open'),
                isConnected: this.isConnected,
                modal: {
                  display: computedStyle.display,
                  visibility: computedStyle.visibility,
                  opacity: computedStyle.opacity,
                  zIndex: computedStyle.zIndex,
                  position: computedStyle.position,
                  top: computedStyle.top,
                  left: computedStyle.left,
                  width: computedStyle.width,
                  height: computedStyle.height,
                  backgroundColor: computedStyle.backgroundColor
                },
                contentDiv: contentDiv ? {
                  display: contentStyle.display,
                  visibility: contentStyle.visibility,
                  width: contentStyle.width,
                  height: contentStyle.height,
                  top: contentStyle.top,
                  left: contentStyle.left
                } : null,
                modalContent: this.modalContent ? {
                  display: modalContentStyle.display,
                  visibility: modalContentStyle.visibility,
                  width: modalContentStyle.width,
                  height: modalContentStyle.height,
                  innerHTMLLength: this.modalContent.innerHTML.length,
                  childrenCount: this.modalContent.children.length,
                  hasProductInfo: !!productInfo,
                  productInfoDisplay: productInfo ? window.getComputedStyle(productInfo).display : null
                } : null
              };
              
              console.log('Quick-add: Full visibility check', debugInfo);
              
              // Check if modal has zero height or is positioned off-screen
              if (computedStyle.height === '0px' || computedStyle.height === 'auto') {
                console.warn('Quick-add: Modal has zero or auto height!');
                this.style.height = '100%';
              }
              
              if (contentDiv && (contentStyle.height === '0px' || contentStyle.height === 'auto')) {
                console.warn('Quick-add: Content div has zero or auto height! Fixing...');
                // Force content div to have proper height
                const viewportHeight = window.innerHeight;
                const modalHeightOffset = parseFloat(getComputedStyle(contentDiv).getPropertyValue('--modal-height-offset')) || 10;
                contentDiv.style.height = `calc(100vh - ${modalHeightOffset * 2}rem)`;
                contentDiv.style.minHeight = '400px';
              }
              
              if (this.modalContent && (modalContentStyle.height === '0px' || modalContentStyle.height === 'auto')) {
                console.warn('Quick-add: Modal content has zero or auto height! Fixing...');
                // Force modalContent to have proper height
                this.modalContent.style.height = '100%';
                this.modalContent.style.minHeight = '400px';
              }
              
              // Force visibility if needed
              if (computedStyle.opacity === '0' || computedStyle.visibility === 'hidden') {
                console.warn('Quick-add: Forcing modal visibility');
                this.style.opacity = '1';
                this.style.visibility = 'visible';
                this.style.zIndex = '101';
              }
            }, 100);

            // Initialize payment buttons and product model after modal is shown
            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }
            if (window.ProductModel) window.ProductModel.loadShopifyXR();
          })
          .catch((error) => {
            console.error('Quick-add error:', error);
            // Show modal even if there's an error
            super.show(opener);
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
            const spinner = opener.querySelector('.loading__spinner');
            if (spinner) spinner.classList.add('hidden');
          });
      }

      preprocessHTML(productElement) {
        productElement.classList.forEach((classApplied) => {
          if (classApplied.startsWith('color-') || classApplied === 'gradient')
            this.modalContent.classList.add(classApplied);
        });
        this.preventDuplicatedIDs(productElement);
        this.removeDOMElements(productElement);
        this.removeGalleryListSemantic(productElement);
        this.updateImageSizes(productElement);
        this.preventVariantURLSwitching(productElement);
      }

      preventVariantURLSwitching(productElement) {
        productElement.setAttribute('data-update-url', 'false');
      }

      removeDOMElements(productElement) {
        const pickupAvailability = productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        const modalDialog = productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());
      }

      preventDuplicatedIDs(productElement) {
        const sectionId = productElement.dataset.section;

        const oldId = sectionId;
        const newId = `quickadd-${sectionId}`;
        productElement.innerHTML = productElement.innerHTML.replaceAll(oldId, newId);
        Array.from(productElement.attributes).forEach((attribute) => {
          if (attribute.value.includes(oldId)) {
            productElement.setAttribute(attribute.name, attribute.value.replace(oldId, newId));
          }
        });

        productElement.dataset.originalSection = sectionId;
      }

      removeGalleryListSemantic(productElement) {
        const galleryList = productElement.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      updateImageSizes(productElement) {
        const product = productElement.querySelector('.product');
        const desktopColumns = product?.classList.contains('product--columns');
        if (!desktopColumns) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }
    }
  );
}