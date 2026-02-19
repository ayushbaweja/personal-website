/**
 * Build-time utility to fetch paper metadata from Semantic Scholar
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const PAPERS_PATH = path.resolve(process.cwd(), 'src/data/papers.json');
const CACHE_PATH = path.resolve(process.cwd(), 'node_modules/.cache/papers-cache.json');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch metadata for all papers in papers.json (disk-cached per build)
 * @returns {Promise<Array>} Array of paper objects with metadata
 */
export async function fetchPapers() {
    // Check disk cache first (survives across module contexts within a build)
    try {
        const cached = await fs.readFile(CACHE_PATH, 'utf-8');
        const { timestamp, papers } = JSON.parse(cached);
        // Cache valid for 60 seconds (covers a single build)
        if (Date.now() - timestamp < 60_000) {
            return papers;
        }
    } catch {}

    let entries;
    try {
        const raw = await fs.readFile(PAPERS_PATH, 'utf-8');
        entries = JSON.parse(raw);
    } catch (error) {
        console.warn('Failed to read papers.json:', error.message);
        return [];
    }

    if (!entries.length) return [];

    const papers = [];

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const paperId = entry.type === 'arxiv' ? `arXiv:${entry.id}` : entry.id;
        const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=title,authors,year,venue,url`;

        try {
            if (i > 0) await delay(500);

            const res = await fetch(url, {
                headers: { 'User-Agent': 'PersonalWebsite/1.0' },
            });

            if (!res.ok) {
                throw new Error(`Semantic Scholar API returned ${res.status}`);
            }

            const data = await res.json();

            papers.push({
                title: data.title,
                authors: (data.authors || []).map(a => a.name),
                year: data.year,
                venue: data.venue || '',
                url: entry.type === 'arxiv' ? `https://arxiv.org/abs/${entry.id}` : data.url,
                tags: entry.tags || [],
                dateAdded: entry.date_added,
                dateStr: new Date(entry.date_added).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            });
        } catch (error) {
            console.warn(`Failed to fetch metadata for ${entry.id}:`, error.message);
            papers.push({
                title: entry.id,
                authors: [],
                year: null,
                venue: '',
                url: entry.type === 'arxiv' ? `https://arxiv.org/abs/${entry.id}` : '',
                tags: entry.tags || [],
                dateAdded: entry.date_added,
                dateStr: new Date(entry.date_added).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            });
        }
    }

    const sorted = papers.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    // Write disk cache
    try {
        await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
        await fs.writeFile(CACHE_PATH, JSON.stringify({ timestamp: Date.now(), papers: sorted }));
    } catch {}

    return sorted;
}
