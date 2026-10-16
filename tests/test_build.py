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

class SearchFoundation(unittest.TestCase):
    def test_related_stories_only_link_relevant_published_candidates(self):
        current={'slug':'wine','place':'Santorini','topics':['Food & Wine']}
        candidates=[current,{'slug':'food','place':'Santorini','topics':['Food & Wine'],'title':'Tomatoes'}, {'slug':'sparta','place':'Sparta','topics':['History & Culture'],'title':'Sparta'}]
        markup=builder.related_stories(current,candidates)
        self.assertIn('href="/food/"',markup)
        self.assertNotIn('href="/sparta/"',markup)
        self.assertNotIn('href="/wine/"',markup)

    def test_article_schema_escapes_script_markup(self):
        story={'title':'</script><script>bad</script>','subtitle':'Sea','slug':'wine','hero_image':'','published_date':'2026-10-10','modified_date':'2026-10-12'}
        data=builder.article_schema(story,{'site_title':'Greece by Dan'})
        self.assertEqual(data['author']['name'],'Dan')
        page=builder.page('Story','Sea','/wine/','<main>Text</main>',{'site_title':'Greece by Dan','tagline':'Greece','footer_note':''},structured=data)
        import re
        block=re.search(r'<script type="application/ld\+json">(.*?)</script>',page).group(1)
        self.assertEqual(json.loads(block)['headline'],story['title'])
        self.assertNotIn('</script>',block)

class AdvisorContext(unittest.TestCase):
    def test_only_explicit_articles_get_allowlisted_context(self):
        from urllib.parse import parse_qs, urlsplit
        import re, html
        markup=builder.advisor_entry(ROOT,'how-to-taste-santorini-wine-without-driving')
        href=html.unescape(re.search(r'href="([^"]+)"',markup).group(1))
        self.assertEqual(urlsplit(href).path,'/concierge/')
        self.assertEqual(parse_qs(urlsplit(href).query),{'kind':['wine'],'place':['santorini'],'profile':['wine-choice'],'source':['wine-santorini']})
        self.assertEqual(builder.advisor_entry(ROOT,'sikinos'),'')
        self.assertIn('data-advisor-source="boat-milos"',builder.advisor_entry(ROOT,'milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose'))
        self.assertEqual(builder.advisor_entry(ROOT,'greek-feta-sheeps-milk-wooden-barrels-and-a-taste-of-place'),'')
        self.assertIn('href="/concierge/">Plan your trip',builder.header())

class EditorialIntegrity(unittest.TestCase):
    def test_feta_record_preserved_and_tour_codes_not_mixed(self):
        feta=json.loads((ROOT/'content/stories/greek-feta-sheeps-milk-wooden-barrels-and-a-taste-of-place.json').read_text())
        original=json.loads((ROOT/'docs/audit-iteration-1/feta-proposed.json').read_text())
        self.assertEqual(feta,original)
        milos=json.loads((ROOT/'content/stories/milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose.json').read_text())
        self.assertEqual(milos['place'],'Milos')
        self.assertNotIn('349808P1',milos['body'])
        for code in ['420612P1','32830P6','272308P1']:
            self.assertEqual(sum(code in x['url'] for x in milos['affiliate_links']),1)
        self.assertIn('passenger cap needs confirmation',milos['body'])
        self.assertIn('No date-specific availability or final price has been confirmed',milos['body'])

class ResponsiveImages(unittest.TestCase):
    def test_derivatives_decode_and_preserve_original(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);source=root/'source';output=root/'out'
            image=source/'assets/sample.png';image.parent.mkdir(parents=True)
            Image.new('RGB',(1200,675),'teal').save(image)
            before=image.read_bytes();cache={}
            result=builder.prepare_image(source,output,'/assets/sample.png',cache)
            self.assertEqual([width for _,width in result['variants']],[480,960,1200])
            for name,width in result['variants']:
                with Image.open(output/name.lstrip('/')) as decoded:
                    decoded.load();self.assertEqual(decoded.width,width)
            self.assertEqual(before,image.read_bytes())
            story={'hero_image':'/assets/sample.png','hero_alt':'Sea','_image':result}
            markup=builder.story_image(story,hero=True)
            self.assertIn('srcset=',markup)
            self.assertIn('fetchpriority="high"',markup)
            self.assertIn('width="1200" height="675"',markup)
            self.assertNotIn('loading="lazy"',markup)
            self.assertIn('loading="lazy"',builder.story_image(story))
            self.assertIs(result,builder.prepare_image(source,output,'/assets/sample.png',cache))

class AffiliateButtons(unittest.TestCase):
    def test_button_is_explicit_and_escaped(self):
        output = builder.markdown('[See wine & sunset](https://example.com/tour?a=1&b=2 "affiliate-button")')
        self.assertIn('class="affiliate-button"', output)
        self.assertIn('rel="sponsored noopener noreferrer"', output)
        self.assertIn('See wine &amp; sunset', output)
        self.assertIn('?a=1&amp;b=2', output)
        ordinary = builder.markdown('[Read source](https://example.com)')
        self.assertNotIn('affiliate-button', ordinary)
        inline = builder.markdown('See [wine](https://example.com "affiliate-button") for details.')
        self.assertNotIn('class="affiliate-button"', inline)

    def test_non_https_button_is_rejected(self):
        with self.assertRaises(ValueError):
            builder.markdown('[Book](http://example.com "affiliate-button")')

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

    def test_concierge_publishing_and_protected_api_content(self):
        builder.build(self.root,self.out)
        page=(self.out/'concierge/index.html').read_text()
        self.assertIn('Your Greece Concierge',page)
        self.assertIn('I may earn a commission at no extra cost to you',page)
        self.assertIn('local tour operator provides the experience',page)
        self.assertIn('id="concierge-form" hidden',page)
        self.assertIn('/concierge/',(self.out/'sitemap.xml').read_text())
        self.assertIn('Disallow: /assets/js/concierge.js',(self.out/'robots.txt').read_text())
        self.assertIn('/assets/js/events.js',page)
        self.assertTrue((self.out/'assets/data/advisor-contexts.json').exists())
        wine=(self.out/'how-to-taste-santorini-wine-without-driving/index.html').read_text()
        self.assertIn('data-advisor-source="wine-santorini"',wine)
        milos_slug='milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose'
        feta_slug='greek-feta-sheeps-milk-wooden-barrels-and-a-taste-of-place'
        milos=(self.out/milos_slug/'index.html').read_text()
        feta=(self.out/feta_slug/'index.html').read_text()
        for slug,document in [(milos_slug,milos),(feta_slug,feta)]:
            self.assertEqual(document.count('rel="canonical"'),1)
            self.assertIn('rel="canonical" href="https://greecebydan.com/'+slug+'/',document)
            self.assertIn('https://greecebydan.com/'+slug+'/',(self.out/'sitemap.xml').read_text())
        self.assertIn('Milos Boat Tours If You Get Seasick',milos)
        self.assertNotIn('Greek Feta: Sheep',milos)
        self.assertIn('data-advisor-source="boat-milos"',milos)
        self.assertIn('Greek Feta: Sheep',feta)
        self.assertNotIn('data-advisor-source="boat-milos"',feta)
        self.assertIn('/assets/images/uploads/greek-feta-barrels.png',feta)
        self.assertNotIn('349808P1',milos)
        self.assertNotIn('searchResults/all',milos)
        self.assertIn('272308P1?pid=P00320497&amp;mcid=42383',milos)
        self.assertNotIn('combinedAverageRating',page)
        self.assertFalse((self.out/'travel-worker').exists())

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
