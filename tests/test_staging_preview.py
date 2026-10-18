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
    def test_culture_enable_is_staging_only_and_hard_off_features_stay_off(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'concierge').mkdir()
            (root/'concierge/index.html').write_text('<head></head><body>Culture preview</body>')
            source="const SITE = 'https://greecebydan.com';\nexport default {async fetch(req,env){return Response.json({culture:env.CULTURE_ENABLED,events:env.INTERACTIONS_ENABLED,photos:env.VIATOR_IMAGES_APPROVED});}};"
            for enabled in (False, True):
                (root/'preview.mjs').write_text(builder.package(root,source,'unit','PR #25',True,enabled))
                (root/'check.mjs').write_text("""import assert from 'node:assert/strict';import w from './preview.mjs';
const o='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const env={CULTURE_ENABLED:'true',INTERACTIONS_ENABLED:'true',VIATOR_IMAGES_APPROVED:'true'};
assert.equal((await w.fetch(new Request('https://greecebydan.com/health'),env)).status,404);
const d=await(await w.fetch(new Request(o+'/health'),env)).json();
assert.deepEqual(d,{culture:"""+json.dumps(str(enabled).lower())+""",events:'false',photos:'false'});
const m=await(await w.fetch(new Request(o+'/_preview/meta'),env)).json();assert.equal(m.cultureEnabled,"""+json.dumps(enabled)+""");
""")
                r=subprocess.run(['node',str(root/'check.mjs')],capture_output=True,text=True)
                self.assertEqual(r.returncode,0,r.stderr)

    def test_food_gate_is_staging_only_and_cannot_enable_events(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            (root/'concierge').mkdir()
            (root/'concierge/index.html').write_text('<head></head><body>Food</body>')
            source="const SITE = 'https://greecebydan.com';\nexport default {async fetch(req,env){return Response.json({food:env.FOOD_ENABLED,culture:env.CULTURE_ENABLED,events:env.INTERACTIONS_ENABLED,photos:env.VIATOR_IMAGES_APPROVED});}};"
            (root/'preview.mjs').write_text(builder.package(root,source,'unit','Food preview',True,True,True))
            (root/'check.mjs').write_text("""import assert from 'node:assert/strict';import w from './preview.mjs';
const o='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const d=await(await w.fetch(new Request(o+'/health'),{FOOD_ENABLED:'false',INTERACTIONS_ENABLED:'true',VIATOR_IMAGES_APPROVED:'true'})).json();
assert.deepEqual(d,{food:'true',culture:'true',events:'false',photos:'false'});
assert.equal((await w.fetch(new Request('https://greecebydan-travel-api.onelion-studio.workers.dev/health'),{})).status,404);
""")
            r=subprocess.run(['node',str(root/'check.mjs')],capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stderr)

    def test_provenance_audit_does_not_expose_private_values_or_raw_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'concierge').mkdir()
            (root / 'concierge/index.html').write_text('<head></head><body>Fixture</body>')
            source = '''const SITE = 'https://greecebydan.com';
function recommendations(p){return p.map(p=>({productCode:p.productCode}));}
function reply(data){return Response.json(data);}
export default {async fetch(){
const data={products:[{productCode:'UI',images:[{imageSource:'SUPPLIER_PROVIDED',isCover:true,caption:'PRIVATE_CAPTION',photographer:'PRIVATE_PERSON',variants:[{url:'https://example.invalid/media/a.jpg?private=PRIVATE_QUERY',width:720,height:480}]}]}]};
const pref={},coversEnabled=true,origin=SITE;
return reply({ products: recommendations(data.products || [], pref, coversEnabled) }, 200, origin);
}};'''
            (root / 'preview.mjs').write_text(builder.package(root, source, 'unit', 'PR #24', True))
            (root / 'check.mjs').write_text('''import assert from 'node:assert/strict';import worker from './preview.mjs';
const o='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const r=await worker.fetch(new Request(o+'/health'),{VIATOR_API_KEY:'PRIVATE_KEY'});
const text=await r.text();assert.doesNotMatch(text,/PRIVATE_|https:\\/\\//);
const d=JSON.parse(text);assert.equal(d.imageAudit[0].images[0].imageSource,'SUPPLIER_PROVIDED');
assert.deepEqual(d.products,[{productCode:'UI'}]);assert.equal(d.imageAudit[0].images[0].variants[0].urlHost,'example.invalid');
const meta=await (await worker.fetch(new Request(o+'/_preview/meta'),{})).json();assert.equal(meta.imageProvenanceAudit,true);
''')
            result = subprocess.run(['node', str(root / 'check.mjs')], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_supplier_mode_is_separate_and_explicit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'concierge').mkdir()
            (root / 'concierge/index.html').write_text('<head><meta name="gbd-supplier-covers" content="enabled"></head><body>Cards</body>')
            source = "const SITE = 'https://greecebydan.com';\nexport default {async fetch(req,env){return Response.json({covers:env.SUPPLIER_COVERS_ENABLED,legacy:env.VIATOR_IMAGES_APPROVED,events:env.INTERACTIONS_ENABLED});}};"
            for enabled in (False, True):
                module = root / 'preview.mjs'
                module.write_text(builder.package(root, source, 'unit-only', 'PR #24', enabled))
                check = root / 'check.mjs'
                check.write_text('''import assert from 'node:assert/strict';import worker from './preview.mjs';
const o='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const r=await worker.fetch(new Request(o+'/health'),{SUPPLIER_COVERS_ENABLED:'true',VIATOR_IMAGES_APPROVED:'true',INTERACTIONS_ENABLED:'true'});
assert.deepEqual(await r.json(),{covers:''' + json.dumps(str(enabled).lower()) + ''',legacy:'false',events:'false'});
const h=await (await worker.fetch(new Request(o+'/concierge/'),{})).text();
assert.ok(h.includes('name="gbd-supplier-covers" content="''' + ('enabled' if enabled else 'disabled') + '''"'));
''')
                result = subprocess.run(['node', str(check)], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)

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
