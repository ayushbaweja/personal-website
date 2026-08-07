import { getCollection } from 'astro:content';
import { getPostSubtitle } from '../utils/blog';

const escapeXml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export async function get() {
    const posts = (await getCollection('blog', ({ data }) => !data.draft))
        .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
    const origin = 'https://ayushbaweja.com';

    const items = posts.map(post => `
        <item>
            <title>${escapeXml(post.data.title)}</title>
            <description>${escapeXml(getPostSubtitle(post))}</description>
            <link>${origin}/blog/${post.slug}/</link>
            <guid>${origin}/blog/${post.slug}/</guid>
            <pubDate>${post.data.published.toUTCString()}</pubDate>
        </item>`).join('');

    const body = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
    <channel>
        <title>Ayush Baweja — Writing</title>
        <description>Essays and notes by Ayush Baweja.</description>
        <link>${origin}/blog/</link>${items}
    </channel>
</rss>`;

    return new Response(body, {
        headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
    });
}
