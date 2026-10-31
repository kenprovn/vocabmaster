/**
 * Image Preloader & Concurrency Queue for Flashcards
 * - Fixed preload window: 20 upcoming cards + 5 previous cards
 * - Concurrency limit: max 4 simultaneous requests
 * - Absolute priority for the current card image
 * - Pre-decoding with img.decode() for zero-latency rendering
 * - LRU memory cache management to prevent memory leaks
 */

const MAX_CONCURRENT = 4;
const MAX_STATUS_CACHE = 300;
const MAX_IMAGE_ELEMENTS = 50;

// URL -> 'loading' | 'loaded' | 'error'
const statusMap = new Map();

// URL -> HTMLImageElement (keeps decoded bitmaps in browser memory)
const imageElementMap = new Map();

// Queue of URLs waiting to be fetched
let pendingQueue = [];

// Active in-flight requests count
let activeCount = 0;

/**
 * Check if an image is already preloaded and decoded in memory
 */
export function isImageLoaded(url) {
  if (!url) return false;
  return statusMap.get(url) === 'loaded';
}

/**
 * Check if an image failed to load previously
 */
export function isImageError(url) {
  if (!url) return false;
  return statusMap.get(url) === 'error';
}

/**
 * Clean up old entries from maps to keep memory bounded
 */
function pruneCache(map, maxSize) {
  if (map.size > maxSize) {
    const keysToDelete = Array.from(map.keys()).slice(0, map.size - maxSize);
    for (const key of keysToDelete) {
      map.delete(key);
    }
  }
}

/**
 * Pump the queue, executing up to MAX_CONCURRENT requests
 */
function pumpQueue() {
  while (activeCount < MAX_CONCURRENT && pendingQueue.length > 0) {
    const url = pendingQueue.shift();
    if (!url) continue;

    // Skip if already loaded or actively loading
    const currentStatus = statusMap.get(url);
    if (currentStatus === 'loaded' || currentStatus === 'loading') {
      continue;
    }

    activeCount++;
    statusMap.set(url, 'loading');

    const img = new Image();
    if (url.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.decoding = 'async';

    img.onload = () => {
      // Decode image in background thread to avoid GPU/main thread stutters
      if (typeof img.decode === 'function') {
        img.decode()
          .catch(() => {})
          .finally(() => {
            statusMap.set(url, 'loaded');
            imageElementMap.set(url, img);
            pruneCache(imageElementMap, MAX_IMAGE_ELEMENTS);
            pruneCache(statusMap, MAX_STATUS_CACHE);
            activeCount--;
            pumpQueue();
          });
      } else {
        statusMap.set(url, 'loaded');
        imageElementMap.set(url, img);
        pruneCache(imageElementMap, MAX_IMAGE_ELEMENTS);
        pruneCache(statusMap, MAX_STATUS_CACHE);
        activeCount--;
        pumpQueue();
      }
    };

    img.onerror = () => {
      statusMap.set(url, 'error');
      pruneCache(statusMap, MAX_STATUS_CACHE);
      activeCount--;
      pumpQueue();
    };

    img.src = url;
  }
}

/**
 * Update the preload queue with new priorities:
 * 1. currentUrl (Highest priority - placed at the front)
 * 2. upcomingUrls (Next 20 images)
 * 3. previousUrls (Recent 3-5 images for back-navigation)
 */
export function updatePreloadQueue(currentUrl, upcomingUrls = [], previousUrls = []) {
  const activeSet = new Set();
  const prioritizedList = [];

  if (currentUrl) {
    activeSet.add(currentUrl);
    if (statusMap.get(currentUrl) !== 'loaded') {
      prioritizedList.push(currentUrl);
    }
  }

  for (const url of upcomingUrls) {
    if (url && !activeSet.has(url)) {
      activeSet.add(url);
      if (statusMap.get(url) !== 'loaded') {
        prioritizedList.push(url);
      }
    }
  }

  for (const url of previousUrls) {
    if (url && !activeSet.has(url)) {
      activeSet.add(url);
      if (statusMap.get(url) !== 'loaded') {
        prioritizedList.push(url);
      }
    }
  }

  // Purge any pending tasks that are outside the current active window
  // (e.g. When the user jumps or scrolls rapidly)
  pendingQueue = prioritizedList.filter(url => statusMap.get(url) !== 'loading');

  // Trigger processing
  pumpQueue();
}

