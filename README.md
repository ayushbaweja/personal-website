# ayushbaweja.com

## Publishing a blog post

Create a Markdown file in `src/content/blog/`. The filename becomes the URL, so
`my-post.md` is published at `/blog/my-post/`.

````md
---
title: "Post title"
subtitle: "A short summary used on the post, writing index, and link previews."
published: 2026-08-07T12:00:00Z
draft: false
---

Write with regular **Markdown**. Inline math uses $E = mc^2$ and display math
uses:

$$
\nabla_\theta \mathcal{L}(\theta) = 0
$$

Code fences are syntax highlighted:

```python
def hello(name: str) -> str:
    return f"Hello, {name}"
```
````

Place local media under `public/blog/` and reference it from Markdown:

```md
![Useful alternative text](/blog/my-image.jpg)

<video controls preload="metadata" poster="/blog/my-poster.jpg">
  <source src="/blog/my-video.mp4" type="video/mp4" />
</video>

<iframe
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
  title="Description of the video"
  loading="lazy"
  allowfullscreen>
</iframe>
```

Set `draft: true` to keep a post out of the writing index, generated pages, and
RSS feed. The `subtitle` field is optional; when it is omitted, the first
non-empty line of the Markdown body is used instead. Run `npm run build` before
publishing.
