import type { CollectionEntry } from 'astro:content';

const toPlainText = (line: string) => line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();

export function getPostSubtitle(post: CollectionEntry<'blog'>): string {
    const authoredSubtitle = post.data.subtitle?.trim();
    if (authoredSubtitle) return authoredSubtitle;

    const firstContentLine = post.body
        .split('\n')
        .map(line => line.trim())
        .find(line => line && !line.startsWith('<!--'));

    return firstContentLine ? toPlainText(firstContentLine) : '';
}
