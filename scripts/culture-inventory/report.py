"""Summarize audited, supplier-confirmed inventory; never infer transport/routes."""
import argparse
import collections
import json
from pathlib import Path


def summarize(data):
    results=data.get('results',[])
    observations=collections.defaultdict(list)
    cases=[]
    for result in results:
        d=result.get('data',{})
        cases.append({'case':d.get('case'),'status':result.get('status'),
                      'searchCount':d.get('searchCount'),'candidateCount':d.get('candidateCount'),
                      'details':len(d.get('products',[])),
                      'qualified':sum(p.get('qualifiesGuided') is True for p in d.get('products',[]))})
        for p in d.get('products',[]):
            key=(d['config']['scope'],p['summary']['productCode'])
            observations[key].append(p)
    products=[]
    for (scope,code),rows in sorted(observations.items()):
        # Contradictory checks do not become positive evidence by taking a union.
        signatures={json.dumps({'status':r['detail'].get('status'),
                     'conditions':{k:r['detail'].get('conditions',{}).get(k) for k in ['guide','languages','group','pickup']}},sort_keys=True)
                    for r in rows if isinstance(r['detail'].get('conditions'),dict)}
        stable=len(signatures)==1 and len([r for r in rows if isinstance(r['detail'].get('conditions'),dict)])==len(rows)
        latest=rows[-1];c=latest['detail'].get('conditions') or {}
        qualified=stable and all(r.get('qualifiesGuided') is True and r['detail'].get('status')=='ACTIVE' for r in rows)
        products.append({'scope':scope,'productCode':code,'title':latest['summary']['title'],
                         'url':latest['summary']['productUrl'],'confirmedGuide':qualified,
                         'languages':c.get('languages',[]) if qualified else [],'group':c.get('group','unknown'),
                         'stable':stable,'observations':len(rows),'transport':'NOT_ESTABLISHED',
                         'departure':'NOT_ESTABLISHED','availability':'NOT_CHECKED'})
    return {'complete':len(results)==30 and len({r.get('data',{}).get('case') for r in results})==30 and all(r.get('status')==200 for r in results),
            'caseCount':len(results),'cases':cases,'products':products,
            'uniqueConfirmedByScope':dict(collections.Counter(p['scope'] for p in products if p['confirmedGuide'])),
            'englishConfirmedByScope':dict(collections.Counter(p['scope'] for p in products if p['confirmedGuide'] and 'en' in p['languages'])),
            'warning':'Counts describe inspected ACTIVE products, not catalogue totals or date/party availability. Destination cohort is not departure or included transport.'}


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('output')
    args=parser.parse_args();report=summarize(json.loads(Path(args.input).read_text()))
    Path(args.output).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['complete','caseCount','uniqueConfirmedByScope','englishConfirmedByScope']},indent=2))
