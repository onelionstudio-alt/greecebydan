"""Prepare a read-only category audit on existing staging; never deploys."""
import argparse
import importlib.util
import hashlib
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('preview',ROOT/'scripts/build_staging_preview.py')
preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)

def prepare(site,source_commit):
    original=(ROOT/'travel-worker/worker.mjs').read_text()
    helper=(ROOT/'scripts/category-audit/probe.mjs').read_text()
    detail="""
async function auditProductDetail(code,env) {
  if(!/^[A-Za-z0-9_-]{1,40}$/.test(code))return {status:400};
  const r=await fetch(BASE+'/products/'+encodeURIComponent(code),{headers:{'exp-api-key':env.VIATOR_API_KEY,Accept:'application/json;version=2.0','Accept-Language':'en-US'},signal:AbortSignal.timeout(10000)});
  return {status:r.status,data:r.status===200?await r.json():null};
}
"""
    marker="    if (route === '/events') return eventRequest(request, env, origin);"
    if original.count(marker)!=1:raise ValueError('Unexpected Worker; do not patch silently')
    hook="""
    if(route==='/__category-audit')return categoryAudit(request,env,origin,{
      destinations:async()=>greekDestinations((await cached(request,env,'/destinations',WEEK)).destinations||[]),
      tags:async()=>(await cached(request,env,'/products/tags',WEEK)).tags||[],
      search:body=>viator('/products/search',env,body),detail:code=>auditProductDetail(code,env)
    });"""
    source=original.replace(marker,marker+hook).replace('export default {',helper+'\n'+detail+'\nexport default {',1)
    output=preview.package(site,source,source_commit,'Category audit',True)
    marker2="['/health', '/destinations', '/search', '/events'].includes(url.pathname)"
    if output.count(marker2)!=1:raise ValueError('Unexpected preview adapter')
    output=output.replace(marker2,"['/health', '/destinations', '/search', '/events', '/__category-audit'].includes(url.pathname)")
    output=output.replace('const PREVIEW_META = {','const PREVIEW_META = {"categoryAudit":true,"auditTaxonomyRevision":2,"baselineApiSha256":"'+hashlib.sha256(original.encode()).hexdigest()+'",',1)
    return output

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source-commit');args=parser.parse_args()
    sha=args.source_commit or subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    output=ROOT/'docs/category-expansion/staging-category-audit.mjs'
    output.write_text(prepare(ROOT/'_site',sha));print(f'Prepared {output.name}; production source unchanged')
