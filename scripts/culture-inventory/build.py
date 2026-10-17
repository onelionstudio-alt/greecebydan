"""Add a fixed, bounded diagnostic to the existing PR25 staging bundle only."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
base=(ROOT/'docs/culture-history/staging-pr25.mjs').read_text()
line=next(x for x in base.splitlines() if x.startswith('const PREVIEW_META = '))
meta=json.loads(line[len('const PREVIEW_META = '):-1])
meta['cultureInventoryAuditRevision']=1
base=base.replace(line,'const PREVIEW_META = '+json.dumps(meta)+';')
probe=(ROOT/'scripts/culture-inventory/probe.mjs').read_text().replace('export const ','const ').replace('export function ','function ').replace('export async function ','async function ')
marker="    if (url.origin !== PREVIEW_ORIGIN) return previewResponse('Staging target only', 404);"
assert base.count(marker)==1
route="""
    if (url.pathname === '/__culture-inventory') return runInventoryAudit(request,env,{
      destinations:async deadline=>greekDestinations((await viator('/destinations',env,undefined,deadline)).destinations||[]),
      tags:async deadline=>(await viator('/products/tags',env,undefined,deadline)).tags||[],
      search:(body,deadline)=>viator('/products/search',env,body,deadline),
      detail:(code,deadline)=>viator('/products/'+code,env,undefined,deadline),
      candidates:cultureCandidates,conditions:cultureConditions
    });
"""
assert "'/destinations'" in base
out=base.replace(marker,marker+route)+ '\n'+probe
path=ROOT/'docs/culture-history/staging-pr25-inventory.mjs'
path.write_text(out)
print(path.name,hashlib.sha256(out.encode()).hexdigest())
