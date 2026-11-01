import json
import re
import unittest
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOP = set('a an and are at be by can do for from how if in is it of on or the to was what when where which why with you your'.split())


def words(text):
    text = unicodedata.normalize('NFKD', text.lower()).replace('’', '').replace("'", '')
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return {w for w in re.findall(r'[a-z0-9]+', text) if len(w) > 1 and w not in STOP}


class StoryIdentityTests(unittest.TestCase):
    def test_cms_uses_ascii_safe_slugs_and_guard(self):
        config = (ROOT / 'admin/config.yml').read_text(encoding='utf-8')
        self.assertRegex(config, r'(?m)^  encoding: ascii$')
        html = (ROOT / 'admin/index.html').read_text(encoding='utf-8')
        js = (ROOT / 'admin/start.js').read_text(encoding='utf-8')
        self.assertIn('/admin/story-identity.js', html)
        self.assertIn('registerStoryIdentityGuard(window.CMS)', js)

    def test_published_titles_still_match_their_file_identity(self):
        files = sorted((ROOT / 'content/stories').glob('*.json'))
        self.assertTrue(files)
        for path in files:
            with self.subTest(path=path.name):
                self.assertRegex(path.stem, r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
                data = json.loads(path.read_text(encoding='utf-8'))
                slug_words = words(path.stem)
                title_words = words(data['title'])
                self.assertTrue(title_words, 'Article title has no searchable words')
                overlap = len(slug_words & title_words)
                self.assertGreaterEqual(overlap * 2, len(title_words),
                    f'Possible CMS overwrite: {path.name} now contains {data["title"]!r}')

    def test_known_accidental_overwrites_are_detected(self):
        cases = [
            ('why-sifnos-became-greeces-quiet-food-island',
             'Knossos Palace From Heraklion: Bus, Tour or Taxi?'),
            ('which-santorini-cruise-should-you-choose-if-you-dislike-loud-music',
             'Can You Join a Santorini Wine Tour With Children?'),
        ]
        for slug, title in cases:
            with self.subTest(title=title):
                self.assertLess(len(words(slug) & words(title)) * 2, len(words(title)))


if __name__ == '__main__':
    unittest.main()
