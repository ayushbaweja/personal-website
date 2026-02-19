import { defineConfig } from 'astro/config';
import { fetchAllMetadata } from './src/utils/fetch-metadata.mjs';
import fs from 'fs/promises';

// External URLs to pre-fetch metadata for
const externalUrls = [
    'https://yongxin.ae.gatech.edu',
    'https://xavihart.github.io',
    'https://www.epic.gatech.edu/',
    'https://github.com/ayushbaweja/i2v-attack',
    'https://www.goodreads.com/user/show/153799802-ayush-baweja',
];

// https://astro.build/config
export default defineConfig({
    integrations: [{
        name: 'link-preview-generator',
        hooks: {
            'astro:build:start': async () => {
                console.log('\n📎 Fetching link preview metadata...');

                // Fetch external metadata
                const externalMetadata = await fetchAllMetadata(externalUrls);

                // Load existing preview data (for internal sections)
                let previewData;
                try {
                    const existing = await fs.readFile('./public/_preview-data.json', 'utf-8');
                    previewData = JSON.parse(existing);
                } catch {
                    previewData = { internal: {}, external: {} };
                }

                // Merge external metadata
                previewData.external = externalMetadata;

                // Write updated preview data
                await fs.writeFile(
                    './public/_preview-data.json',
                    JSON.stringify(previewData, null, 2)
                );

                console.log('✅ Link preview metadata generated.\n');
            }
        }
    }]
});
