"""Build a deployable static site from Decap's JSON content."""
import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, urlencode
import bleach
from markdown_it import MarkdownIt

ROOT = Path(__file__).resolve().parents[1]
SITE_URL = 'https://greecebydan.com'
AI_IMAGE_LABEL = 'AI-generated image · Not a real photograph'
ANALYTICS = """<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "971422e6b6124de18dd8de4ebeb6149c"}'></script><!-- End Cloudflare Web Analytics -->"""
RESERVED = {'admin', 'about', 'stories', 'concierge', 'travel-worker', 'contact', 'privacy', 'cookies', 'terms',
            'affiliate-disclosure', 'assets', 'content', 'scripts', 'tests',
            'oauth-worker', 'templates', '_site', 'index', '404'}
md = MarkdownIt('commonmark', {'html': False})

def esc(value):
    return html.escape(str(value), quote=True)

def text(data, key, default=''):
    value = data.get(key, default)
    if not isinstance(value, str):
        raise ValueError(f'{key} must be text')
    return value.strip()

def url(value, image=False):
    """Reject executable URLs, traversal, protocol-relative URLs and credentials."""
    if not isinstance(value, str):
        raise ValueError('URL must be text')
    if not value:
        return ''
    if any(ord(c) < 33 for c in value) or '\\' in value:
        raise ValueError(f'Invalid URL: {value!r}')
    p = urlsplit(value)
    if image and value.startswith('/assets/') and not p.query and not p.fragment:
        if any(part in ('.', '..') for part in p.path.split('/')) or '%' in p.path:
            raise ValueError('Invalid image path')
        return value
    if p.scheme == 'https' and p.hostname and not p.username and not p.password:
        return value
    raise ValueError('Links must use https://; images may also use /assets/...')

def markdown(value):
    rendered = md.render(value)
    rendered = bleach.clean(rendered,
        tags={'p','h2','h3','h4','ul','ol','li','em','strong','a','blockquote',
              'br','hr','code','pre','img'},
        attributes={'a':['href','title'], 'img':['src','alt','title']},
        protocols={'https','http','mailto'}, strip=True)
    return re.sub(r'<a href="(https?://)', r'<a rel="noopener noreferrer" href="\1', rendered)

def read(path):
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, dict):
        raise ValueError(f'{path.name} must contain an object')
    return data

def slug_for(path):
    slug = path.stem
    if '..' in path.parts or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) or slug in RESERVED:
        raise ValueError(f'Invalid or reserved story filename: {slug}')
    return slug

def header():
    return '<header class="site-header"><a class="brand" href="/">Greece <em>by Dan</em></a><button class="menu" aria-label="Open menu" aria-expanded="false">Menu</button><nav><a href="/stories/">Stories</a><a href="/concierge/">Your concierge</a><a href="/about/">About</a><a href="/#plan">Plan your trip</a></nav></header>'

def footer(s):
    links = [('stories','All stories'),('concierge','Your concierge'),('about','About'),('affiliate-disclosure','Affiliate disclosure'),
             ('privacy','Privacy'),('cookies','Cookies'),('terms','Terms'),('contact','Contact')]
    return '<footer><a class="brand" href="/">Greece <em>by Dan</em></a><p>'+esc(s['tagline'])+'</p><div>'+''.join(f'<a href="/{p}/">{t}</a>' for p,t in links)+'</div><small>© 2026 '+esc(s['site_title'])+' · '+esc(s['footer_note'])+'</small></footer>'

def page(title, description, route, main, s, image=''):
    canonical = SITE_URL + route
    social_image = f'<meta property="og:image" content="{esc(SITE_URL+image if image.startswith("/") else image)}">' if image else ''
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="impact-site-verification" value="37535e28-c2d5-49a4-9c33-0cbce4256c05"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(canonical)+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'"><meta property="og:type" content="'+('website' if route=='/' else 'article')+'">'+social_image+'<link rel="icon" href="/favicon.svg"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/assets/css/style.css"></head><body>'+header()+main+footer(s)+'<script src="/assets/js/main.js"></script></body></html>\n'

def card(story):
    s=story
    picture = '<img src="'+esc(s['hero_image'])+'" alt="'+esc(s['hero_alt'])+'" loading="lazy">' if s['hero_image'] else '<span>'+esc(s['greek_name'] or s['title'])+'</span>'
    if s['hero_image'] and s.get('hero_image_ai',False):
        picture += '<small class="image-ai-badge">'+AI_IMAGE_LABEL+'</small>'
    return '<a class="feature-card" href="/'+s['slug']+'/"><div class="feature-art">'+picture+'</div><div class="feature-copy"><div><small>'+esc(s.get('place') or s['region'])+' · Greece</small><h3>'+esc(s['title'])+'</h3><p>'+esc(s['subtitle'])+'</p></div><b>Read the story →</b></div></a>'

def story_metadata(story):
    chips=[]
    for key, values in [('region',[story['region']]), ('place',[story['place']]), ('topic',story['topics'])]:
        for value in values:
            if value:
                href='/stories/?'+urlencode({key:value})
                chips.append('<a href="'+esc(href)+'">'+esc(value)+'</a>')
    return '<nav class="story-tags" aria-label="Explore related stories">'+''.join(chips)+'</nav>'

def catalog(stories):
    ordered=sorted(stories,key=lambda s:(s['title'].casefold(),s['slug']))
    ordered.sort(key=lambda s:s['published_date'],reverse=True)
    def select(name,label,values,all_label):
        options='<option value="">'+all_label+'</option>'+''.join('<option value="'+esc(v)+'">'+esc(v)+'</option>' for v in sorted(set(values)) if v)
        return '<label>'+label+'<select name="'+name+'">'+options+'</select></label>'
    controls='<form class="catalog-controls" hidden role="search" aria-label="Find a story"><label class="catalog-search">Search<input name="q" type="search" placeholder="Search titles, places and topics" autocomplete="off"></label>'
    controls+=select('region','Region',[s['region'] for s in stories],'All regions')
    controls+=select('place','Place',[s['place'] for s in stories],'All places')
    controls+=select('topic','Topic',[t for s in stories for t in s['topics']],'All topics')
    controls+='<label>Sort by<select name="sort"><option value="newest">Newest first</option><option value="az">Title A–Z</option></select></label><button type="reset">Reset filters</button></form>'
    cards=[]
    for s in ordered:
        attrs={'region':s['region'],'place':s['place'],'topics':json.dumps(s['topics'],ensure_ascii=False),'date':s['published_date'],'title':s['title'],'search':' '.join([s['title'],s['subtitle'],s['region'],s['place'],s['greek_name'],*s['topics']])}
        data=' '.join('data-'+k+'="'+esc(v)+'"' for k,v in attrs.items())
        stamp='<time datetime="'+s['published_date']+'">'+date.fromisoformat(s['published_date']).strftime('%d %b %Y')+'</time>' if s['published_date'] else ''
        cards.append('<div class="catalog-item" '+data+'>'+card(s)+'<div class="catalog-meta">'+stamp+''.join('<span>'+esc(t)+'</span>' for t in s['topics'])+'</div></div>')
    return '<main class="catalog page" id="stories-catalog"><span class="kicker">Explore Greece</span><h1>Stories from Greece</h1><p class="catalog-intro">Small discoveries, useful details and a slower look at Greece. Find your next story by place or topic.</p>'+controls+'<p class="catalog-count" role="status" aria-live="polite">'+str(len(stories))+' stories</p><div class="catalog-grid">'+''.join(cards)+'</div><p class="catalog-empty" hidden>No stories match these filters. Try another place or topic, or reset the filters.</p><nav class="catalog-pagination" hidden aria-label="Story pages"><button type="button" data-page="previous">← Previous</button><span></span><button type="button" data-page="next">Next →</button></nav><noscript><p>All stories are shown below. Enable JavaScript to search and filter them.</p></noscript></main>'

def affiliate_links(items):
    result=[]
    for item in items:
        target=url(text(item,'url'))
        if target:
            result.append('<p><a href="'+esc(target)+'" rel="sponsored noopener noreferrer" target="_blank">'+esc(text(item,'label'))+' ↗</a></p>')
    return ''.join(result)

def youtube(value):
    if not value:
        return ''
    value=url(value)
    p=urlsplit(value)
    if p.hostname not in {'youtube.com','www.youtube.com','youtu.be','m.youtube.com'}:
        raise ValueError('YouTube URL must point to YouTube')
    # A direct link avoids loading third-party tracking until the reader clicks.
    return '<section class="story-video"><h2>Watch the story</h2><a href="'+esc(value)+'" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></section>'

def support():
    return '''<section class="support-coffee" aria-label="Support Greece by Dan"><p>Enjoyed this little corner of Greece? You can buy me a coffee.</p><script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="somewhereingreece" data-color="#FFDD00" data-emoji="" data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff"></script><noscript><a href="https://www.buymeacoffee.com/somewhereingreece" target="_blank" rel="noopener noreferrer">Buy me a coffee ↗</a></noscript></section>'''

def build(source=ROOT, output=None):
    source=Path(source).resolve()
    output=Path(output or source/'_site').resolve()
    if output==source or source in output.parents and output.name!='_site':
        raise ValueError('Build output must be _site or outside the source tree')
    if output in source.parents:
        raise ValueError('Output cannot be an ancestor of the source tree')
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    settings=read(source/'content/settings/site.json')
    required=['site_title','description','tagline','hero_eyebrow','hero_title',
        'hero_emphasis','hero_description','discover_title','manifesto_eyebrow',
        'manifesto_title','manifesto_note','plan_title','affiliate_disclosure',
        'about_teaser','about_body','footer_note']
    s={k:text(settings,k) for k in required}
    if not s['site_title']:
        raise ValueError('Site title cannot be empty')
    links=read(source/'content/settings/links.json').get('items',[])
    if not isinstance(links,list):
        raise ValueError('Links items must be a list')
    stories=[]
    for path in sorted((source/'content/stories').glob('*.json')):
        slug=slug_for(path)
        data=read(path)
        if not isinstance(data.get('published',False),bool):
            raise ValueError('Published must be true or false')
        if not data.get('published',False):
            continue
        story={k:text(data,k) for k in ['title','subtitle','region','greek_name',
            'hero_image','hero_alt','youtube_url','body']}
        if not story['title'] or not story['body']:
            raise ValueError(f'{slug}: title and body are required')
        story['hero_image']=url(story['hero_image'],image=True)
        story['hero_image_ai']=data.get('hero_image_ai',False)
        if not isinstance(story['hero_image_ai'],bool):
            raise ValueError('hero_image_ai must be true or false')
        story['slug']=slug
        story['place']=text(data,'place','Greece — General')
        story['topics']=data.get('topics',[])
        if not isinstance(story['topics'],list) or any(not isinstance(t,str) or not t.strip() for t in story['topics']):
            raise ValueError('topics must be a list of non-empty text values')
        story['topics']=list(dict.fromkeys(t.strip() for t in story['topics']))
        story['featured']=data.get('featured',True)
        if not isinstance(story['featured'],bool):
            raise ValueError('featured must be true or false')
        story['published_date']=text(data,'published_date')
        if story['published_date']:
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',story['published_date']):
                raise ValueError('published_date must use YYYY-MM-DD')
            date.fromisoformat(story['published_date'])
        order=data.get('order',100)
        if not isinstance(order,(int,float)):
            raise ValueError('Story order must be numeric')
        story['order']=order
        aff=data.get('affiliate_links',[])
        if not isinstance(aff,list):
            raise ValueError('affiliate_links must be a list')
        hero='<img class="story-hero" src="'+esc(story['hero_image'])+'" alt="'+esc(story['hero_alt'])+'">' if story['hero_image'] else ''
        if hero and story['hero_image_ai']:
            hero='<figure class="story-image">'+hero+'<figcaption class="image-ai-caption">'+AI_IMAGE_LABEL+'</figcaption></figure>'
        article='<main class="page"><article><span class="kicker">'+esc(story['region'])+' · Greece</span><h1>'+esc(story['title'])+'</h1><p class="story-subtitle">'+esc(story['subtitle'])+'</p>'+story_metadata(story)+hero+markdown(story['body'])+youtube(story['youtube_url'])
        story_links=affiliate_links(aff)
        if not story_links:
            story_links=affiliate_links([{'label':x.get('title',''), 'url':x.get('url','')} for x in links if x.get('enabled',True) and x.get('url')])
        if story_links:
            article+='<section><h2>Plan your trip</h2>'+story_links+'<p class="note">'+esc(s['affiliate_disclosure'])+'</p></section>'
        article+='''<section class="story-share" aria-label="Share this story" hidden><p>Know someone planning a trip to Greece?</p><div class="story-share-actions"><button type="button" data-share-native hidden>Share this story</button><button type="button" data-share-copy>Copy link</button></div><p class="story-share-status" role="status" aria-live="polite"></p><input class="story-share-link" aria-label="Story link" type="url" readonly hidden></section>'''
        article+=support()+'</article></main>'
        dest=output/slug
        dest.mkdir()
        (dest/'index.html').write_text(page(story['title']+' — '+s['site_title'],story['subtitle'],'/'+slug+'/',article,s,story['hero_image']),encoding='utf-8')
        stories.append(story)
    stories.sort(key=lambda x:(x['order'],x['title']))
    plan=[]
    for item in links:
        if not isinstance(item.get('enabled',True),bool):
            raise ValueError('Enabled must be true or false')
        if not item.get('enabled',True):
            continue
        target=url(text(item,'url'))
        n=len(plan)+1
        inside='<span>'+f'{n:02}'+'</span><h3>'+esc(text(item,'title'))+'</h3><p>'+esc(text(item,'description'))+'</p>'
        plan.append('<a href="'+esc(target)+'" rel="sponsored noopener noreferrer" target="_blank">'+inside+'<b>'+esc(text(item,'button'))+'</b></a>' if target else '<div>'+inside+'</div>')
    home='<main><section class="hero"><div class="eyebrow">'+esc(s['hero_eyebrow'])+'</div><h1>'+esc(s['hero_title'])+'<br><i>'+esc(s['hero_emphasis'])+'</i></h1><p>'+esc(s['hero_description'])+'</p><a class="arrow-link" href="#discover">Explore Greece ↓</a></section><section id="discover" class="section"><div class="section-head"><span>01 / Discover</span><h2>'+esc(s['discover_title'])+'</h2></div><div class="stories-list">'+''.join(map(card,[s for s in stories if s['featured']][:6]))+'</div><a class="browse-stories" href="/stories/">Browse all stories →</a></section><section class="manifesto"><p>'+esc(s['manifesto_eyebrow'])+'</p><h2>'+esc(s['manifesto_title'])+'</h2><span>'+esc(s['manifesto_note'])+'</span></section><section id="plan" class="section plan"><div class="section-head"><span>02 / Plan</span><h2>'+esc(s['plan_title'])+'</h2></div><div class="plan-grid">'+''.join(plan)+'</div><p class="disclosure">'+esc(s['affiliate_disclosure'])+'</p></section><section class="about-strip"><div><span>Made by Dan</span><h2>'+esc(s['about_teaser'])+'</h2></div><a href="/about/">My story →</a></section></main>'
    (output/'index.html').write_text(page(s['site_title']+' — A slower Greece',s['description'],'/',home,s),encoding='utf-8')
    (output/'about').mkdir()
    (output/'about/index.html').write_text(page('About — '+s['site_title'],s['about_teaser'],'/about/','<main class="page"><span class="kicker">The story</span><h1>About</h1>'+markdown(s['about_body'])+support()+'</main>',s),encoding='utf-8')
    (output/'stories').mkdir()
    (output/'stories/index.html').write_text(page('Stories — '+s['site_title'],'Explore Greek places, food, history and travel stories.','/stories/',catalog(stories),s),encoding='utf-8')
    (output/'concierge').mkdir()
    concierge=(source/'templates/concierge.html').read_text(encoding='utf-8')
    (output/'concierge/index.html').write_text(page('Your Greece Concierge — '+s['site_title'],'Find a boat trip or wine experience in Greece with two simple travel helpers.','/concierge/',concierge,s),encoding='utf-8')
    routes=['/','/about/','/stories/','/concierge/']+['/'+x['slug']+'/' for x in stories]
    for name in ['contact','privacy','cookies','terms','affiliate-disclosure']:
        raw=(source/name/'index.html').read_text(encoding='utf-8')
        main=re.search(r'<main\b[^>]*>.*?</main>',raw,re.S).group(0)
        title=re.search(r'<title>(.*?)</title>',raw,re.S).group(1).split(' — ')[0]
        (output/name).mkdir()
        (output/name/'index.html').write_text(page(title+' — '+s['site_title'],title+' — '+s['site_title']+'.','/'+name+'/',main,s),encoding='utf-8')
        routes.append('/'+name+'/')
    for name in ['assets','admin']:
        shutil.copytree(source/name,output/name)
    for name in ['CNAME','favicon.svg','site.webmanifest','404.html']:
        shutil.copy2(source/name,output/name)
    for document in output.rglob('*.html'):
        if document.relative_to(output).parts[0] != 'admin':
            markup = document.read_text(encoding='utf-8')
            document.write_text(markup.replace('</body>', ANALYTICS+'</body>', 1), encoding='utf-8')
    (output/'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /assets/js/concierge.js\nSitemap: '+SITE_URL+'/sitemap.xml\n')
    (output/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+SITE_URL+p+'</loc></url>' for p in routes)+'</urlset>\n')
    (output/'.nojekyll').touch()
    print(f'Built {len(stories)} published stories into {output}')
    return output

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path)
    args=parser.parse_args()
    build(output=args.output)
