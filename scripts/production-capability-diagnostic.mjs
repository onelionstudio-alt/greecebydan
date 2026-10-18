// Fixed production diagnostics only. No valid search, booking or analytics event.
import fs from 'node:fs';
const api='https://greecebydan-travel-api.onelion-studio.workers.dev';
const headers={'Origin':'https://greecebydan.com','Content-Type':'application/json'};
const report={testedAt:new Date().toISOString(),target:api,checks:[]};
async function read(path,body){const r=await fetch(api+path,{method:body===undefined?'GET':'POST',headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});let d;try{d=await r.json()}catch{d={error:'Non-JSON response'}}return {path,status:r.status(),data:d};}
for(const path of ['/health','/destinations']){const r=await read(path);report.checks.push({path,status:r.status,...(path==='/health'?{ready:r.data.ready}:{capabilities:r.data.capabilities||null,error:r.data.error||null})});}
for(const kind of ['food','transfer']){const r=await read('/search',{kind,destination:'99999999',style:'any',mood:'any',budget:0,cancellation:false});report.checks.push({kind,path:r.path,status:r.status,error:r.data.error||null});}
const event=await read('/events',{});report.checks.push({path:'/events',status:event.status,error:event.data.error||null,probe:'Empty invalid payload; cannot store an event'});
fs.mkdirSync('docs/production-check/evidence',{recursive:true});fs.writeFileSync('docs/production-check/evidence/diagnostic.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
