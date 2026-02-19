/**
 * Build-time utility to fetch OpenGraph/meta data from URLs
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Fetch metadata from a URL
 * @param {string} url - The URL to fetch metadata from
 * @returns {Promise<Object>} - Metadata object with title, description, thumbnail, favicon
 */
export async function fetchMetadata(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +https://ayushbaweja.com)',
            },
            timeout: 8000,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const hostname = new URL(url).hostname;

        return {
            title: $('meta[property="og:title"]').attr('content')
                || $('meta[name="twitter:title"]').attr('content')
                || $('title').text().trim()
                || hostname,
            description: $('meta[property="og:description"]').attr('content')
                || $('meta[name="twitter:description"]').attr('content')
                || $('meta[name="description"]').attr('content')
                || '',
            thumbnail: $('meta[property="og:image"]').attr('content')
                || $('meta[name="twitter:image"]').attr('content')
                || null,
            favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
            url: url,
        };
    } catch (error) {
        console.warn(`Failed to fetch metadata for ${url}:`, error.message);
        const hostname = new URL(url).hostname;
        return {
            title: hostname.replace('www.', ''),
            description: '',
            thumbnail: null,
            favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
            url: url,
        };
    }
}

/**
 * Fetch metadata for multiple URLs
 * @param {string[]} urls - Array of URLs to fetch
 * @returns {Promise<Object>} - Object mapping URLs to their metadata
 */
export async function fetchAllMetadata(urls) {
    const results = {};

    for (const url of urls) {
        console.log(`  Fetching: ${url}`);
        results[url] = await fetchMetadata(url);
    }

    return results;
}
