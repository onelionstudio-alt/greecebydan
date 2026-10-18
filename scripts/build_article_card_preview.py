"""Build a noindex review page only into the isolated preview, not production."""
import json
from pathlib import Path
from build import ROOT, article_offer, page

def preview(output):
    settings=json.loads((ROOT/'content/settings/site.json').read_text())
    data={
        'title':'Explore a Milos sailing option',
        'text':'Review the route, weather policy and meeting instructions on Viator before choosing.',
        'url':'https://www.viator.com/tours/Milos/Milos-oneiro/d22323-345728P2?mcid=42383&pid=P00320497&medium=api&api_version=2.0'
    }
    main='<main class="page"><h1>Article offer preview</h1><p>Review only · Proposed editorial copy, not a published article.</p>'+article_offer(data)+'<p>The article continues here.</p></main>'
    document=page('Article offer preview','Review only','/article-card-preview/',main,settings)
    document=document.replace('<head>','<head><meta name="robots" content="noindex,nofollow">',1)
    target=output/'article-card-preview/index.html';target.parent.mkdir(exist_ok=True,parents=True);target.write_text(document)

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=ROOT/'_site');args=parser.parse_args();preview(args.output)
