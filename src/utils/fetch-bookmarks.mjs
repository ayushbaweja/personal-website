/**
 * Build-time utility to fetch bookmarks from Raindrop.io
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const CACHE_PATH = path.resolve(process.cwd(), 'node_modules/.cache/bookmarks-cache.json');
const CACHE_VERSION = 3;
const CACHE_TTL_MS = 15 * 60 * 1000;
const BOOKMARK_SCOPE = 'all';

/**
 * Fetch recent bookmarks from Raindrop.io (disk-cached per build)
 * @returns {Promise<Array>} Array of bookmark objects
 */
export async function fetchBookmarks() {
    // Check disk cache first
    try {
        const cached = await fs.readFile(CACHE_PATH, 'utf-8');
        const { version, timestamp, scope, bookmarks } = JSON.parse(cached);
        if (
            version === CACHE_VERSION
            && scope === BOOKMARK_SCOPE
            && Date.now() - timestamp < CACHE_TTL_MS
        ) {
            return bookmarks;
        }
    } catch {}

    const token = process.env.RAINDROP_TOKEN || import.meta.env?.RAINDROP_TOKEN;

    if (!token || token === '<your_test_token_here>') {
        console.warn('RAINDROP_TOKEN not set — skipping bookmarks fetch.');
        return [];
    }

    try {
        const query = new URLSearchParams({
            sort: '-created',
            perpage: '30',
            nested: 'true',
        });
        const res = await fetch(
            `https://api.raindrop.io/rest/v1/raindrops/0?${query}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!res.ok) {
            throw new Error(`Raindrop API returned ${res.status}`);
        }

        const data = await res.json();

        const bookmarks = (data.items || []).map(item => {
            const domain = new URL(item.link).hostname.replace('www.', '');
            const date = new Date(item.created);
            return {
                title: item.title,
                url: item.link,
                domain,
                tags: item.tags || [],
                date,
                dateStr: date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            };
        }).sort((a, b) => b.date.getTime() - a.date.getTime());

        // Write disk cache
        try {
            await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
            await fs.writeFile(CACHE_PATH, JSON.stringify({
                version: CACHE_VERSION,
                timestamp: Date.now(),
                scope: BOOKMARK_SCOPE,
                bookmarks,
            }));
        } catch {}

        return bookmarks;
    } catch (error) {
        console.warn('Failed to fetch bookmarks:', error.message);
        return [];
    }
}
