"""Package PR HTML and the real API Worker for the isolated dashboard staging target.

This never deploys anything. Copy the generated module ONLY to the named staging
Worker. The production Worker and production frontend sources are unchanged.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION_API = 'https://greecebydan-travel-api.onelion-studio.workers.dev'
STAGING_ORIGIN = 'https://greecebydan-travel-api-staging.onelion-studio.workers.dev'
TEXT_TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
}


def package(site, worker_source, source_commit, review_label="PR #21", supplier_covers=False, culture_enabled=False, food_enabled=False, transfers_enabled=False):
    if not review_label.replace('#', '').replace(' ', '').isalnum() or len(review_label) > 40:
        raise ValueError('Invalid review label')
    original = worker_source
    # Staging-only provenance diagnostics. Never expose raw upstream payloads,
    # captions, review fields, headers, credentials or complete unapproved URLs.
    photo_return = 'return reply({ products: recommendations(data.products || [], pref, coversEnabled) }, 200, origin);'
    image_audit = supplier_covers and worker_source.count(photo_return) == 1
    if image_audit:
        worker_source = worker_source.replace(photo_return,
            'return reply({ products: recommendations(data.products || [], pref, coversEnabled), imageAudit: stagingPhotoAudit(data.products || [], pref) }, 200, origin);')
        worker_source += r'''
function stagingPhotoAudit(products, pref) {
  const selected = new Set(recommendations(products, pref, false).map(p => p.productCode));
  return products.filter(p => selected.has(p.productCode)).slice(0,3).map(p => ({
    productCode: p.productCode,
    images: (Array.isArray(p.images) ? p.images : []).slice(0,20).map(i => ({
      keys: Object.keys(i || {}).slice(0,20),
      imageSource: typeof i?.imageSource === 'string' ? i.imageSource.slice(0,64) : null,
      isCover: i?.isCover === true,
      variants: (Array.isArray(i?.variants) ? i.variants : []).slice(0,20).map(v => {
        let u; try { u = new URL(v.url); } catch {}
        return {width: typeof v.width === 'number' ? v.width : null,
          height: typeof v.height === 'number' ? v.height : null,
          urlHost: u?.hostname || null, protocol: u?.protocol || null,
          mediaPath: u?.pathname.startsWith('/media/') || false,
          extension: u?.pathname.match(/\.[a-z0-9]+$/i)?.[0] || null,
          credentials: Boolean(u?.username || u?.password),
          port: Boolean(u?.port), fragment: Boolean(u?.hash)};
      })
    }))
  }));
}
'''
    marker = "const SITE = 'https://greecebydan.com';"
    if worker_source.count(marker) != 1 or worker_source.count('export default {') != 1:
        raise ValueError('Unexpected Worker structure; do not silently patch it')
    worker_source = worker_source.replace(marker, f'const SITE = {json.dumps(STAGING_ORIGIN)};')
    worker_source = worker_source.replace('export default {', 'const stagingApi = {', 1)
    assets, image_paths = {}, []
    for file in sorted(site.rglob('*')):
        if not file.is_file():
            continue
        rel = file.relative_to(site)
        if rel.parts[0] == 'admin':
            continue
        route = '/' + rel.as_posix()
        if route.startswith('/assets/images/'):
            image_paths.append(route)
            continue
        content_type = TEXT_TYPES.get(file.suffix)
        if not content_type:
            continue
        text = file.read_text(encoding='utf-8')
        if file.suffix == '.html':
            for flag in ('gbd-api-photos', 'gbd-interactions'):
                if f'name="{flag}"' not in text:
                    # Static legal/404 pages have no optional-feature scripts.
                    # Give their staging copy the same explicit hard-off meta.
                    text = text.replace('<head>', f'<head><meta name="{flag}" content="disabled">', 1)
                elif f'name="{flag}" content="disabled"' not in text:
                    raise ValueError(f'Hard-off flag not disabled: {route}: {flag}')
            text = text.replace('name="gbd-supplier-covers" content="enabled"', 'name="gbd-supplier-covers" content="' + ('enabled' if supplier_covers else 'disabled') + '"')
            text = text.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">', 1)
            text = text.replace('<body>', f'<body><aside style="padding:12px;background:#fff0bd;color:#222;text-align:center;font:14px Arial">STAGING · {review_label} review only · Legacy API photos and events disabled · supplier covers {'enabled' if supplier_covers else 'disabled'}</aside>', 1)
        if route in ('/assets/js/concierge.js', '/assets/js/events.js', '/assets/js/article-offers.js'):
            text = text.replace(PRODUCTION_API, STAGING_ORIGIN)
            if PRODUCTION_API in text:
                raise ValueError('Production API left in staging client')
        assets[route] = [content_type, text]
    if '/concierge/index.html' not in assets:
        raise ValueError('Build the site before packaging staging')
    metadata = {
        'purpose': f'{review_label} isolated staging preview, not a production release',
        'sourceCommit': source_commit,
        'apiSourceSha256': hashlib.sha256(original.encode()).hexdigest(),
        'origin': STAGING_ORIGIN,
        'apiPhotos': False, 'interactionEvents': False, 'supplierCovers': bool(supplier_covers),
        'imageProvenanceAudit': image_audit,
        'cultureEnabled': bool(culture_enabled),
        'foodEnabled': bool(food_enabled),
        'transfersEnabled': bool(transfers_enabled),
        'changesFromSource': ['staging-only SITE origin', 'staging-only client API URL',
                              'noindex headers and preview banner', 'hard-off feature overrides'],
        'assetSha256': {k: hashlib.sha256(v[1].encode()).hexdigest() for k, v in assets.items()},
    }
    if image_audit:
        metadata['changesFromSource'].append('staging-only image provenance metadata; no raw unapproved URLs or private fields')
    prefix = '// GENERATED staging-only module. Never deploy to the production Worker.\n'
    prefix += f'const PREVIEW_ORIGIN = {json.dumps(STAGING_ORIGIN)};\n'
    prefix += f'const PREVIEW_ASSETS = {json.dumps(assets, ensure_ascii=False)};\n'
    prefix += f'const PREVIEW_IMAGES = new Set({json.dumps(image_paths)});\n'
    prefix += f'const PREVIEW_META = {json.dumps(metadata)};\n'
    wrapper = r'''
const previewHeaders = {
  'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'
};
function previewResponse(body, status = 200, extra = {}) {
  return new Response(body, {status, headers: {...previewHeaders, ...extra}});
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Fail closed if someone pastes this bundle into another Worker.
    if (url.origin !== PREVIEW_ORIGIN) return previewResponse('Staging target only', 404);
    if (['/health', '/destinations', '/search', '/events'].includes(url.pathname)) {
      // Browsers can omit Origin on a same-origin GET. Accept that browser
      // case only; explicit foreign origins still go through core rejection.
      if (url.pathname === '/destinations' && request.method === 'GET' &&
          !request.headers.get('Origin') && request.headers.get('Sec-Fetch-Site') === 'same-origin') {
        const headers = new Headers(request.headers);
        headers.set('Origin', PREVIEW_ORIGIN);
        request = new Request(request, {headers});
      }
      const response = await stagingApi.fetch(request, {
        ...env, VIATOR_IMAGES_APPROVED: 'false', INTERACTIONS_ENABLED: 'false', SUPPLIER_COVERS_ENABLED: PREVIEW_META.supplierCovers ? 'true' : 'false', CULTURE_ENABLED: PREVIEW_META.cultureEnabled ? 'true' : 'false', FOOD_ENABLED: PREVIEW_META.foodEnabled ? 'true' : 'false', TRANSFERS_ENABLED: PREVIEW_META.transfersEnabled ? 'true' : 'false'
      }, ctx);
      const headers = new Headers(response.headers);
      for (const [k,v] of Object.entries(previewHeaders)) headers.set(k,v);
      return new Response(response.body, {status: response.status, headers});
    }
    if (!['GET', 'HEAD'].includes(request.method)) return previewResponse('Method not allowed', 405);
    if (url.pathname === '/robots.txt') return previewResponse('User-agent: *\nDisallow: /\n', 200, {'Content-Type': 'text/plain'});
    if (url.pathname === '/_preview/meta') return previewResponse(request.method === 'HEAD' ? null : JSON.stringify(PREVIEW_META), 200, {'Content-Type': 'application/json'});
    // Existing editorial artwork is loaded from its public production asset URL.
    // No API photo URL is used, proxied, downloaded or stored by this bundle.
    if (PREVIEW_IMAGES.has(url.pathname)) return previewResponse(null, 302, {Location: 'https://greecebydan.com' + url.pathname});
    const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    const asset = Object.hasOwn(PREVIEW_ASSETS, path) ? PREVIEW_ASSETS[path] : null;
    if (!asset) return previewResponse('Not found in staging preview', 404);
    return previewResponse(request.method === 'HEAD' ? null : asset[1], 200, {'Content-Type': asset[0]});
  }
};
'''
    return prefix + worker_source + '\n' + wrapper


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=ROOT / '_site')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/release-readiness/staging-preview.generated.mjs')
    parser.add_argument('--source-commit', help='Reviewed source commit recorded in preview metadata')
    parser.add_argument('--review-label', default='PR #21')
    parser.add_argument('--supplier-covers', action='store_true', help='Enable ONLY strict supplier cover images on staging')
    parser.add_argument('--culture', action='store_true', help='Enable only Culture extension on isolated staging')
    parser.add_argument('--food', action='store_true', help='Enable Food only on isolated staging')
    parser.add_argument('--transfers', action='store_true', help='Enable Transfers only on isolated staging')
    args = parser.parse_args()
    commit = args.source_commit or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    if len(commit) != 40 or any(c not in '0123456789abcdef' for c in commit):
        raise ValueError('source commit must be a full SHA-1')
    output = package(args.site, (ROOT / 'travel-worker/worker.mjs').read_text(), commit, args.review_label, args.supplier_covers, args.culture, args.food, args.transfers)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output)
    print(f'Packaged staging preview: {args.output.name} ({len(output.encode())} bytes)')


if __name__ == '__main__':
    main()
