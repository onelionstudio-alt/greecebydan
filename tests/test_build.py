import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'scripts/build.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class Publishing(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)/'source'
        shutil.copytree(ROOT,self.root,ignore=shutil.ignore_patterns('.git','_site','__pycache__'))
        self.out=Path(self.temp.name)/'out'

    def tearDown(self):
        self.temp.cleanup()

    def write(self,path,data):
        (self.root/path).write_text(json.dumps(data),encoding='utf-8')

    def test_publish_update_unpublish_and_delete(self):
        story=json.loads((self.root/'content/stories/sikinos.json').read_text())
        story.update(title='Milos',region='Cyclades',body='## A quiet place\n\nNew story.',hero_image='/assets/images/uploads/milos.jpg',hero_alt='Milos bay',youtube_url='https://youtu.be/test123',affiliate_links=[{'label':'A boat tour','url':'https://example.com/tour'}])
        self.write('content/stories/milos.json',story)
        builder.build(self.root,self.out)
        home=(self.out/'index.html').read_text()
        article=(self.out/'milos/index.html').read_text()
        self.assertIn('href="/milos/"',home)
        self.assertIn('/assets/images/uploads/milos.jpg',home)
        self.assertIn('https://youtu.be/test123',article)
        self.assertIn('rel="sponsored noopener noreferrer"',article)
        self.assertIn('<h2>A quiet place</h2>',article)
        self.assertIn('https://greecebydan.com/milos/',(self.out/'sitemap.xml').read_text())
        story['published']=False
        self.write('content/stories/milos.json',story)
        builder.build(self.root,self.out)
        self.assertFalse((self.out/'milos').exists())
        self.assertNotIn('/milos/',(self.out/'index.html').read_text())
        self.assertNotIn('/milos/',(self.out/'sitemap.xml').read_text())
        (self.root/'content/stories/sikinos.json').unlink()
        builder.build(self.root,self.out)
        self.assertFalse((self.out/'sikinos').exists())

    def test_settings_links_and_only_public_files(self):
        settings=json.loads((self.root/'content/settings/site.json').read_text())
        settings.update(hero_title='New heading',tagline='New tagline',about_body='## About Dan\n\nUpdated bio.')
        self.write('content/settings/site.json',settings)
        self.write('content/settings/links.json',{'items':[{'title':'Ferries','description':'Go by sea','url':'https://example.com/ferry','button':'Find a ferry','enabled':True}, {'title':'Hidden card','enabled':False}]})
        builder.build(self.root,self.out)
        home=(self.out/'index.html').read_text()
        self.assertIn('New heading',home)
        self.assertIn('https://example.com/ferry',home)
        self.assertNotIn('Hidden card',home)
        self.assertIn('https://example.com/ferry',(self.out/'sikinos/index.html').read_text())
        self.assertIn('Updated bio.',(self.out/'about/index.html').read_text())
        for forbidden in ['content','oauth-worker','scripts','tests','.git','.github','requirements.txt']:
            self.assertFalse((self.out/forbidden).exists(),forbidden)
        self.assertTrue((self.out/'admin/config.yml').exists())
        self.assertEqual((self.out/'CNAME').read_text().strip(),'greecebydan.com')
        ElementTree.parse(self.out/'sitemap.xml')

    def test_html_is_escaped_and_links_keep_scheme(self):
        safe=builder.markdown('<script>alert(1)</script>\n\n[Safe](https://example.com)\n\n[Bad](javascript:alert(1))')
        self.assertNotIn('<script>',safe)
        self.assertNotIn('href="javascript:',safe)
        self.assertIn('href="https://example.com"',safe)
        self.assertEqual(builder.esc('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;')

    def test_catalog_featured_dates_and_drafts(self):
        story=json.loads((self.root/'content/stories/sikinos.json').read_text())
        story.update(title='Catalog only',place='Milos',topics=['Things to Do'],featured=False,published_date='2026-10-10')
        self.write('content/stories/catalog-only.json',story)
        builder.build(self.root,self.out)
        home=(self.out/'index.html').read_text()
        catalog=(self.out/'stories/index.html').read_text()
        self.assertNotIn('href="/catalog-only/"',home)
        self.assertIn('href="/catalog-only/"',catalog)
        self.assertIn('data-place="Milos"',catalog)
        self.assertIn('data-date="2026-10-10"',catalog)
        self.assertNotIn('CMS Test',catalog)
        self.assertIn('https://greecebydan.com/stories/',(self.out/'sitemap.xml').read_text())
        article=(self.out/'catalog-only/index.html').read_text()
        self.assertIn('/stories/?place=Milos',article)
        self.assertIn('/stories/?topic=Things+to+Do',article)
        self.assertNotIn('Island story',catalog)
        self.assertIn('Browse all stories',home)
        for i in range(8):
            story.update(title=f'Featured {i}',featured=True,order=i)
            self.write(f'content/stories/featured-{i}.json',story)
        builder.build(self.root,self.out)
        self.assertEqual((self.out/'index.html').read_text().count('class="feature-card"'),6)
        story['published']=False
        self.write('content/stories/catalog-only.json',story)
        builder.build(self.root,self.out)
        self.assertNotIn('/catalog-only/',(self.out/'stories/index.html').read_text())
        self.assertFalse((self.out/'catalog-only').exists())

    def test_catalog_metadata_validation_and_escaping(self):
        story=json.loads((self.root/'content/stories/sikinos.json').read_text())
        for changes in [{'topics':'History'}, {'topics':[1]}, {'featured':'yes'}, {'published_date':'2026-02-30'}, {'published_date':'2026-1-1'}]:
            with self.subTest(changes=changes):
                self.write('content/stories/sikinos.json',{**story,**changes})
                with self.assertRaises(ValueError):
                    builder.build(self.root,self.out)
        story.update(title='<script>unsafe</script>',place='A "quoted" place',topics=['Food & Wine'])
        self.write('content/stories/sikinos.json',story)
        builder.build(self.root,self.out)
        catalog=(self.out/'stories/index.html').read_text()
        self.assertNotIn('<script>unsafe</script>',catalog)
        self.assertIn('data-place="A &quot;quoted&quot; place"',catalog)
        self.assertIn('/stories/?topic=Food+%26+Wine',(self.out/'sikinos/index.html').read_text())

    def test_unsafe_urls_and_reserved_slugs_are_rejected(self):
        for unsafe in ['javascript:alert(1)','//evil.example/a','https://a.example/\nfile','https://user:pass@example.com','/assets/../secret','/assets/%2e%2e/secret']:
            with self.subTest(unsafe=unsafe),self.assertRaises(ValueError):
                builder.url(unsafe,image=True)
        for name in ['admin','about','stories','../escape','Milos']:
            with self.subTest(name=name),self.assertRaises(ValueError):
                builder.slug_for(Path(name+'.json'))

if __name__=='__main__':
    unittest.main()
