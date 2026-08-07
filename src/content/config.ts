import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    schema: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        published: z.date(),
        updated: z.date().optional(),
        draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
