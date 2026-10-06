import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker, {handle} from './worker.mjs';

const env={ADMIN_ORIGIN:'https://greecebydan.com', GITHUB_CLIENT_ID:'test-client',
  GITHUB_CLIENT_SECRET:'test-secret-not-for-browser', ALLOWED_GITHUB_LOGIN:'onelionstudio-alt',
  GITHUB_REPO:'onelionstudio-alt/greecebydan'};
const origin='https://greecebydan-oauth.example.workers.dev';
async function session() {
  const response=await handle(new Request(origin+'/auth?provider=github&site_id=greecebydan.com&scope=repo'),env);
  const location=new URL(response.headers.get('Location'));
  return {response,location,cookie:response.headers.get('Set-Cookie').split(';')[0],
    state:location.searchParams.get('state')};
}
function callback(s, state=s.state) {
  return new Request(origin+'/callback?code=test-code&state='+encodeURIComponent(state),{headers:{Cookie:s.cookie}});
}
function mock(login='onelionstudio-alt', push=true) {
  const calls=[];
  const fetch=async (url, options) => {
    calls.push({url,options});
    if (url.endsWith('/access_token')) return Response.json({access_token:'test-access-token',token_type:'bearer'});
    if (url.endsWith('/user')) return Response.json({login});
    return Response.json({permissions:{push}});
  };
  return {fetch,calls};
}

test('Cloudflare entry ignores ExecutionContext and health reports readiness without secrets',async()=>{
  const response=await worker.fetch(new Request(origin+'/health',{headers:{Origin:env.ADMIN_ORIGIN}}),env,{waitUntil(){}});
  assert.deepEqual(await response.json(),{ready:true});
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ADMIN_ORIGIN);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  const notReady=await handle(new Request(origin+'/health'),{});
  assert.deepEqual(await notReady.json(),{ready:false});
});
test('OAuth requests use PKCE, unpredictable state, secure cookie and fixed public scope',async()=>{
  const a=await session(),b=await session();
  assert.equal(a.response.status,302);
  assert.notEqual(a.state,b.state);
  assert.equal(a.location.origin,'https://github.com');
  assert.equal(a.location.searchParams.get('scope'),'public_repo');
  assert.equal(a.location.searchParams.get('code_challenge_method'),'S256');
  assert.equal(a.location.searchParams.get('code_challenge').length,43);
  assert.equal(a.location.searchParams.get('redirect_uri'),origin+'/callback');
  assert.match(a.response.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.ok(!a.location.href.includes(env.GITHUB_CLIENT_SECRET));
});
test('Unknown site/provider and CSRF mismatch cannot reach the token endpoint',async()=>{
  const invalid=await handle(new Request(origin+'/auth?provider=gitlab&site_id=evil.example'),env);
  assert.equal(invalid.status,400);
  const s=await session(),m=mock();
  const mismatch=await handle(callback(s,'wrong-state'),env,m.fetch);
  assert.equal(mismatch.status,400);
  assert.equal(m.calls.length,0);
  const absent=await handle(new Request(origin+'/callback?code=test-code&state='+s.state),env,m.fetch);
  assert.equal(absent.status,400);
  assert.equal(m.calls.length,0);
});
test('Expired session is rejected',async()=>{
  const s=await session();
  const data=JSON.parse(decodeURIComponent(s.cookie.split('=')[1]));
  data.issued=Date.now()-601000;
  s.cookie='__Host-gbd-oauth='+encodeURIComponent(JSON.stringify(data));
  const m=mock();
  assert.equal((await handle(callback(s),env,m.fetch)).status,400);
  assert.equal(m.calls.length,0);
});
test('Successful callback verifies account and repository and only hands token to exact opener',async()=>{
  const s=await session(),m=mock();
  const response=await handle(callback(s),env,m.fetch);
  assert.equal(response.status,200);
  const body=await response.text();
  assert.equal(m.calls.length,3);
  assert.ok(!body.includes(env.GITHUB_CLIENT_SECRET));
  assert.ok(!body.includes('test-code'));
  const exchange=JSON.parse(m.calls[0].options.body);
  assert.equal(exchange.client_secret,env.GITHUB_CLIENT_SECRET);
  assert.equal(exchange.code_verifier.length,43);
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
  assert.match(response.headers.get('Content-Security-Policy'),/default-src 'none'/);
  const sent=[],listeners=[];
  const opener={postMessage:(value,target)=>sent.push({value,target})};
  const window={opener,addEventListener:(name,fn)=>listeners.push(fn),removeEventListener(){}};
  const script=body.match(/<script nonce="[^"]+">([\s\S]+)<\/script>/)[1];
  vm.runInNewContext(script,{window});
  assert.deepEqual(sent,[{value:'authorizing:github',target:env.ADMIN_ORIGIN}]);
  listeners[0]({origin:'https://evil.example',source:opener,data:'authorizing:github'});
  listeners[0]({origin:env.ADMIN_ORIGIN,source:{},data:'authorizing:github'});
  assert.equal(sent.length,1);
  listeners[0]({origin:env.ADMIN_ORIGIN,source:opener,data:'authorizing:github'});
  assert.match(sent[1].value,/^authorization:github:success:/);
  assert.equal(JSON.parse(sent[1].value.replace('authorization:github:success:','')).token,'test-access-token');
  assert.equal(sent[1].target,env.ADMIN_ORIGIN);
});
test('Wrong account or missing push rights cannot obtain a CMS token',async()=>{
  for(const [login,push] of [['someone-else',true],['onelionstudio-alt',false]]){
    const s=await session(),m=mock(login,push);
    const response=await handle(callback(s),env,m.fetch);
    assert.equal(response.status,400);
    assert.ok(!(await response.text()).includes('test-access-token'));
  }
});
test('Refresh requires the admin Origin and re-verifies identity',async()=>{
  const m=mock();
  const denied=await handle(new Request(origin+'/auth/refresh',{method:'POST',headers:{Origin:'https://evil.example'}}),env,m.fetch);
  assert.equal(denied.status,403);
  assert.equal(m.calls.length,0);
  const response=await handle(new Request(origin+'/auth/refresh',{method:'POST',headers:{Origin:env.ADMIN_ORIGIN},body:new URLSearchParams({refresh_token:'test-refresh'})}),env,m.fetch);
  assert.equal(response.status,200);
  assert.equal((await response.json()).token,'test-access-token');
  assert.equal(m.calls.length,3);
});
