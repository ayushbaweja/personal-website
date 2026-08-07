/**
 * Build-time utility to fetch paper metadata.
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

const PAPERS_PATH = path.resolve(process.cwd(), 'src/data/papers.json');
const CACHE_PATH = path.resolve(process.cwd(), 'node_modules/.cache/papers-cache.json');
const CACHE_VERSION = 2;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const decodeXml = (value = '') => value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeText = (value = '') => decodeXml(value).replace(/\s+/g, ' ').trim();

function getXmlTag(xml, tag) {
    return normalizeText(xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1]);
}

function formatDate(dateValue) {
    return new Date(`${dateValue}T00:00:00Z`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

async function fetchArxivMetadata(entry) {
    const response = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(entry.id)}`, {
        headers: { 'User-Agent': 'ayushbaweja.com paper metadata' },
    });

    if (!response.ok) throw new Error(`arXiv API returned ${response.status}`);

    const xml = await response.text();
    const entryXml = xml.match(/<entry>([\s\S]*?)<\/entry>/)?.[1];
    if (!entryXml) throw new Error('arXiv API returned no matching paper');

    const title = getXmlTag(entryXml, 'title');
    if (!title) throw new Error('arXiv API returned no title');

    const authors = [...entryXml.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)]
        .map(match => normalizeText(match[1]));
    const published = getXmlTag(entryXml, 'published');

    return {
        title,
        authors,
        year: published ? new Date(published).getUTCFullYear() : null,
        venue: getXmlTag(entryXml, 'arxiv:journal_ref'),
        url: `https://arxiv.org/abs/${entry.id}`,
    };
}

async function fetchSemanticScholarMetadata(entry) {
    const paperId = entry.type === 'arxiv' ? `arXiv:${entry.id}` : entry.id;
    const url = `https://api.semanticscholar.org/graph/v1/paper/${paperId}?fields=title,authors,year,venue,url`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'PersonalWebsite/1.0' },
    });

    if (!response.ok) throw new Error(`Semantic Scholar API returned ${response.status}`);

    const data = await response.json();
    if (!data.title) throw new Error('Semantic Scholar returned no title');

    return {
        title: data.title,
        authors: (data.authors || []).map(author => author.name),
        year: data.year,
        venue: data.venue || '',
        url: entry.type === 'arxiv' ? `https://arxiv.org/abs/${entry.id}` : data.url,
    };
}

async function fetchMetadata(entry) {
    const fetchers = entry.type === 'arxiv'
        ? [fetchArxivMetadata, fetchSemanticScholarMetadata]
        : [fetchSemanticScholarMetadata];

    for (const fetcher of fetchers) {
        try {
            return await fetcher(entry);
        } catch (error) {
            console.warn(`Metadata source failed for ${entry.id}:`, error.message);
        }
    }

    return {
        title: entry.title || 'Paper metadata unavailable',
        authors: entry.authors || [],
        year: entry.year || null,
        venue: entry.venue || '',
        url: entry.type === 'arxiv' ? `https://arxiv.org/abs/${entry.id}` : entry.url || '',
    };
}

/**
 * Fetch metadata for all papers in papers.json.
 * @returns {Promise<Array>} Array of paper objects with metadata
 */
export async function fetchPapers() {
    try {
        const cached = JSON.parse(await fs.readFile(CACHE_PATH, 'utf-8'));
        if (
            cached.version === CACHE_VERSION
            && Date.now() - cached.timestamp < CACHE_TTL_MS
            && cached.papers?.every(paper => paper.title && !/^\d+(\.\d+)+$/.test(paper.title))
        ) {
            return cached.papers;
        }
    } catch {}

    let entries;
    try {
        entries = JSON.parse(await fs.readFile(PAPERS_PATH, 'utf-8'));
    } catch (error) {
        console.warn('Failed to read papers.json:', error.message);
        return [];
    }

    const papers = [];
    for (const entry of entries) {
        const metadata = await fetchMetadata(entry);
        papers.push({
            ...metadata,
            tags: entry.tags || [],
            dateAdded: entry.date_added,
            dateStr: formatDate(entry.date_added),
        });
    }

    const sorted = papers.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    try {
        await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
        await fs.writeFile(CACHE_PATH, JSON.stringify({
            version: CACHE_VERSION,
            timestamp: Date.now(),
            papers: sorted,
        }));
    } catch {}

    return sorted;
}
