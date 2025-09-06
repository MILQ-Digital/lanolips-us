function removeCartUpsellIfFlagged() {
  if (sessionStorage.getItem('hideCartUpsell') === 'true') {
    document.querySelectorAll('.cart-upsell').forEach(el => el.remove());
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', removeCartUpsellIfFlagged);

// Also run after Shopify AJAX cart updates (for themes using Sections)
document.addEventListener('shopify:section:load', removeCartUpsellIfFlagged);

// Fallback: Observe DOM changes inside cart drawer
const cartDrawer = document.querySelector('cart-drawer');
if (cartDrawer) {
  const observer = new MutationObserver(() => {
    removeCartUpsellIfFlagged();
  });
  observer.observe(cartDrawer, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", function() {
  var observer = new MutationObserver(function() {
    var productButton = document.querySelector('.product_button_price.button.button--full-width.button--primary');
    var nmPortal = document.querySelector('.nm-portal');
    var priceContainer = document.querySelector('.product_button_price .price .price__regular .price-item'); // adjust if needed

    if (productButton && nmPortal) {
      // Move Notify Me after product button
      productButton.insertAdjacentElement('afterend', nmPortal);

      // Get price text
      var priceText = priceContainer
        ? priceContainer.innerText.replace(/\s+/g, ' ').trim()
        : '';

      // Find the button inside nm-portal
      var nmButton = nmPortal.querySelector('button, .button');

      if (nmButton && priceText) {
        // If we haven't added a span yet, add one
        let priceSpan = nmButton.querySelector('.nm-price');
        if (!priceSpan) {
          priceSpan = document.createElement('span');
          priceSpan.className = 'nm-price';
          nmButton.appendChild(priceSpan);
        }

        // Update only the price span text
        priceSpan.textContent = ` – ${priceText}`;
      }

      // ✅ Add "sold-out" class if disabled or has "Sold out" text
      if (productButton.disabled || productButton.textContent.toLowerCase().includes('sold out')) {
        productButton.classList.add('sold-out');
      } else {
        productButton.classList.remove('sold-out');
      }

      observer.disconnect(); // Stop watching once moved
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
