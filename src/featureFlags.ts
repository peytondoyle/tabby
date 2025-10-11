export const FF_TABBY_UI = 
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('ui') === 'tabby' ||
   (window as any).__TABBY_FLAGS__?.tabby === true);
