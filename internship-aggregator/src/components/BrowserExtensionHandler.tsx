'use client';

import { useEffect } from 'react';

/**
 * Component to handle browser extension conflicts that cause hydration errors
 * This is a common issue with extensions like Grammarly, LastPass, etc.
 */
export function BrowserExtensionHandler() {
  useEffect(() => {
    // Clean up any attributes added by browser extensions that might cause hydration issues
    const cleanup = () => {
      const body = document.body;
      if (body) {
        // Remove common extension attributes that cause hydration mismatches
        const extensionAttributes = [
          'data-new-gr-c-s-check-loaded',
          'data-gr-ext-installed',
          'data-lastpass-icon-root',
          'data-lastpass-root',
          'data-1password-root',
          'data-bitwarden-watching',
          'data-grammarly-shadow-root'
        ];
        
        extensionAttributes.forEach(attr => {
          if (body.hasAttribute(attr)) {
            body.removeAttribute(attr);
          }
        });
      }
    };

    // Run cleanup after a short delay to allow extensions to load
    const timeoutId = setTimeout(cleanup, 100);
    
    // Also run cleanup on DOM mutations (when extensions add attributes)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === document.body) {
          cleanup();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        'data-new-gr-c-s-check-loaded',
        'data-gr-ext-installed',
        'data-lastpass-icon-root',
        'data-lastpass-root',
        'data-1password-root',
        'data-bitwarden-watching',
        'data-grammarly-shadow-root'
      ]
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
}
