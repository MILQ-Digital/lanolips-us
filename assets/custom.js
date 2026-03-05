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
