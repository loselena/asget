import type { LinkPreview } from '../types';

/**
 * A service for fetching Open Graph link previews.
 * IMPORTANT: This implementation uses a public CORS proxy (api.codetabs.com)
 * for demonstration purposes. This is NOT suitable for production due to
 * security, reliability, and rate-limiting concerns. A production app
 * should use a dedicated server-side endpoint (e.g., a Firebase Cloud Function)
 * to fetch and parse this data.
 */
export const LinkPreviewService = {
  async fetchLinkPreview(url: string): Promise<LinkPreview | null> {
    try {
      // Using a CORS proxy to bypass browser restrictions in this demo environment.
      const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL with status: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const getMetaTag = (property: string): string | null => {
          const el = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
          return el?.getAttribute('content')?.trim() || null;
      };
      
      const getLinkTag = (rel: string): string | null => {
          const el = doc.querySelector(`link[rel="${rel}"]`);
          return el?.getAttribute('href') || null;
      }

      const createAbsoluteUrl = (baseUrl: string, relativeUrl: string | null): string | null => {
        if (!relativeUrl) return null;
        try {
            return new URL(relativeUrl, baseUrl).href;
        } catch (e) {
            console.error(`Could not create absolute URL from base "${baseUrl}" and relative "${relativeUrl}"`);
            return relativeUrl;
        }
      }
      
      const title = getMetaTag('og:title') || getMetaTag('twitter:title') || doc.querySelector('title')?.textContent?.trim() || null;
      
      // A preview without a title is not very useful.
      if (!title) {
        return null;
      }
      
      const description = getMetaTag('og:description') || getMetaTag('twitter:description') || getMetaTag('description');
      const siteName = getMetaTag('og:site_name');

      // Enhanced image search with more fallbacks
      let imageUrl = 
        getMetaTag('og:image:secure_url') ||
        getMetaTag('og:image:url') ||
        getMetaTag('og:image') ||
        getMetaTag('twitter:image:src') ||
        getMetaTag('twitter:image');
        
      if (!imageUrl) {
          imageUrl = getLinkTag('apple-touch-icon') || getLinkTag('icon') || getLinkTag('shortcut icon');
          if (!imageUrl) {
              imageUrl = '/favicon.ico';
          }
      }
      const absoluteImageUrl = createAbsoluteUrl(url, imageUrl);
      
      const videoWidthStr = getMetaTag('og:video:width');
      const videoHeightStr = getMetaTag('og:video:height');

      return {
        url: url, // Return the original URL to prevent state loops in the input component
        title,
        description: description || undefined,
        image: absoluteImageUrl || undefined,
        siteName: siteName || undefined,
        videoWidth: videoWidthStr ? parseInt(videoWidthStr, 10) : undefined,
        videoHeight: videoHeightStr ? parseInt(videoHeightStr, 10) : undefined,
      };

    } catch (error) {
      console.error('Error fetching link preview:', error);
      return null;
    }
  },
};