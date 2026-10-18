import importlib.util
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('article_builder',ROOT/'scripts/build.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
URL='https://www.viator.com/tours/Milos/Milos-oneiro/d22323-345728P2?mcid=42383&pid=P00320497&medium=api&api_version=2.0'
class ArticleOffers(unittest.TestCase):
    def component(self,**patch):
        return '```viator-card\n'+json.dumps({'title':'An option <to consider>','text':'Check route & weather.','url':URL,**patch})+'\n```'
    def test_inline_safe_and_exact_affiliate_url(self):
        html=builder.markdown('Before.\n\n'+self.component()+'\n\nAfter.')
        self.assertLess(html.index('Before.'),html.index('class="article-offer"'))
        self.assertLess(html.index('class="article-offer"'),html.index('After.'))
        self.assertIn('data-product-code="345728P2"',html)
        self.assertIn(URL.replace('&','&amp;'),html)
        self.assertIn('sponsored noopener noreferrer',html)
        self.assertIn('&lt;to consider&gt;',html)
        self.assertNotIn('<img',html)
        self.assertNotIn('fromPrice',html)
        self.assertNotIn('rating',html)
        self.assertNotIn('GBDARTICLE',html)
        self.assertEqual(html,builder.markdown('Before.\n\n'+self.component()+'\n\nAfter.'))
    def test_bad_or_overloaded_components_fail_build(self):
        for url in ['https://evil.test/d22323-345728P2','http://www.viator.com/d22323-345728P2','https://user@www.viator.com/d22323-345728P2','https://www.viator.com/d22323-345728P2#x','https://www.viator.com/','javascript:alert(1)']:
            with self.assertRaises(ValueError):builder.markdown(self.component(url=url))
        for patch in [{'title':''},{'text':'a'*501},{'title':'x'*181}]:
            with self.assertRaises(ValueError):builder.markdown(self.component(**patch))
        with self.assertRaises(ValueError):builder.markdown('\n\n'.join([self.component()]*4))
    def test_only_component_pages_load_optional_script(self):
        settings={'site_title':'Greece by Dan','tagline':'Greece','footer_note':''}
        normal=builder.page('Test','Test','/test/','<main>Hello</main>',settings)
        offer=builder.page('Test','Test','/test/',builder.markdown(self.component()),settings)
        self.assertNotIn('article-offers.js',normal)
        self.assertIn('article-offers.js',offer)
    def test_regular_code_and_buttons_unchanged(self):
        self.assertIn('<pre><code>',builder.markdown('```json\n{}\n```'))
        self.assertIn('class="affiliate-button"',builder.markdown('[Old button](https://example.com/ "affiliate-button")'))
