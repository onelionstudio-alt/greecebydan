# Contextual affiliate buttons

In Decap, open a story's Body in rich-text mode. Use the insert component menu and choose **Партнёрская кнопка**. Fill in the English label and full HTTPS affiliate URL. Insert the component after the paragraph where the recommendation is explained.

Portable Markdown representation (standalone paragraph):

```markdown
[See the sunset wine tour](https://example.com/affiliate "affiliate-button")
```

The builder renders this as a styled sponsored link, adds an affiliate disclosure before the article body, and rejects non-HTTPS button destinations. Ordinary Markdown links retain their existing appearance. Existing end-of-article affiliate links remain available.

Use only a real tracking link to the relevant offer. Preview destinations must match the claims in the surrounding paragraph. Source Markdown itself remains readable without the custom renderer.
