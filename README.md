# Greece by Dan

Static travel site at https://greecebydan.com, with Decap CMS and GitHub OAuth via Cloudflare Workers.

- Content: `content/stories/*.json`, `content/settings/*.json`.
- Editor: `/admin/` — Stories, Links, Settings. UI labels are in Russian; public content is in English.
- Build: `python scripts/build.py` → `_site/`. Only published stories are included.
- Hosting: GitHub Pages through `.github/workflows/pages.yml`.
- OAuth: `oauth-worker/worker.mjs`; secrets live in Cloudflare bindings.

**Initial setup and daily use:** [docs/admin-setup.md](docs/admin-setup.md).

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
node --test oauth-worker/worker.test.mjs
python scripts/build.py
```

Source HTML pages in the root are retained as the original site snapshot; the build output is the deployed site. For stories and editable site text, change JSON content through Decap rather than editing these original HTML files.
