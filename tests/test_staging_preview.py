"""The preview adapter is tested locally; these are not live Viator tests."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('preview_builder', ROOT / 'scripts/build_staging_preview.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PreviewTest(unittest.TestCase):
    def test_hard_off_routing_and_isolation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'concierge').mkdir()
            (root / 'assets/js').mkdir(parents=True)
            (root / 'admin').mkdir()
            html = '<head></head><body><meta name="gbd-api-photos" content="disabled"><meta name="gbd-interactions" content="disabled">Preview</body>'
            (root / 'concierge/index.html').write_text(html)
            (root / 'admin/index.html').write_text('Administrative UI must not be packaged')
            (root / 'assets/js/concierge.js').write_text('const API = ' + json.dumps(builder.PRODUCTION_API))
            # Tiny adapter fixture verifies the wrapper without upstream calls.
            source = "const SITE = 'https://greecebydan.com';\nexport default {async fetch(req,env){if(new URL(req.url).pathname !== '/health' && req.headers.get('Origin')!==SITE)return new Response('Origin not allowed',{status:403}); return Response.json({site:SITE,images:env.VIATOR_IMAGES_APPROVED,events:env.INTERACTIONS_ENABLED});}};"
            module = root / 'preview.mjs'
            module.write_text(builder.package(root, source, 'test-source'))
            check = root / 'check.mjs'
            check.write_text('''
import assert from 'node:assert/strict';
import worker from './preview.mjs';
const origin = 'https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const request = p => new Request(origin+p);
const html = await worker.fetch(request('/concierge/'), {});
assert.equal(html.status,200);
assert.equal(html.headers.get('X-Robots-Tag'),'noindex, nofollow');
assert.match(await html.text(),/STAGING/);
const js = await worker.fetch(request('/assets/js/concierge.js'), {});
assert.match(await js.text(),/greecebydan-travel-api-staging/);
assert.equal((await worker.fetch(request('/admin/'),{})).status,404);
assert.equal((await worker.fetch(request('/__proto__'),{})).status,404);
assert.equal((await worker.fetch(new Request('https://production.example/health'),{})).status,404);
const api = await worker.fetch(request('/health'), {VIATOR_IMAGES_APPROVED:'true',INTERACTIONS_ENABLED:'true'});
assert.deepEqual(await api.json(),{site:origin,images:'false',events:'false'});
assert.equal((await worker.fetch(new Request(origin+'/destinations',{headers:{'Sec-Fetch-Site':'same-origin'}}),{})).status,200);
assert.equal((await worker.fetch(new Request(origin+'/destinations',{headers:{Origin:'https://foreign.example','Sec-Fetch-Site':'cross-site'}}),{})).status,403);
assert.equal((await worker.fetch(request('/destinations'),{})).status,403);
assert.equal((await worker.fetch(new Request(origin+'/concierge/',{method:'POST'}),{})).status,405);
console.log('Preview isolation and hard-off checks passed');
''')
            result = subprocess.run(['node', str(check)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_refuses_enabled_frontend_and_unexpected_worker(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'concierge').mkdir()
            (root / 'concierge/index.html').write_text('<head><meta name="gbd-api-photos" content="enabled"></head><body>Enabled flag</body>')
            source = "const SITE = 'https://greecebydan.com';\nexport default {};"
            with self.assertRaisesRegex(ValueError, 'Hard-off flag not disabled'):
                builder.package(root, source, 'test')
            with self.assertRaisesRegex(ValueError, 'Unexpected Worker structure'):
                builder.package(root, 'export default {};', 'test')
