/**
 * Build-time utility to fetch bookmarks from Raindrop.io
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const CACHE_PATH = path.resolve(process.cwd(), 'node_modules/.cache/bookmarks-cache.json');

/**
 * Fetch recent bookmarks from Raindrop.io (disk-cached per build)
 * @returns {Promise<Array>} Array of bookmark objects
 */
export async function fetchBookmarks() {
    // Check disk cache first
    try {
        const cached = await fs.readFile(CACHE_PATH, 'utf-8');
        const { timestamp, bookmarks } = JSON.parse(cached);
        if (Date.now() - timestamp < 60_000) {
            return bookmarks;
        }
    } catch {}

    const token = process.env.RAINDROP_TOKEN || import.meta.env?.RAINDROP_TOKEN;

    if (!token || token === '<your_test_token_here>') {
        console.warn('RAINDROP_TOKEN not set — skipping bookmarks fetch.');
        return [];
    }

    try {
        const res = await fetch(
            'https://api.raindrop.io/rest/v1/raindrops/0?sort=-created&perpage=30',
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
        });

        // Write disk cache
        try {
            await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
            await fs.writeFile(CACHE_PATH, JSON.stringify({ timestamp: Date.now(), bookmarks }));
        } catch {}

        return bookmarks;
    } catch (error) {
        console.warn('Failed to fetch bookmarks:', error.message);
        return [];
    }
}
