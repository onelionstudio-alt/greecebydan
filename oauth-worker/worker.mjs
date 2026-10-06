/* GitHub OAuth bridge for Decap. Deploy this module to Cloudflare Workers.
 * Secrets are read only from Worker bindings, never from the public site. */
const COOKIE = '__Host-gbd-oauth';
const TTL = 600;
const encoder = new TextEncoder();

function headers(extra = {}) {
  return {'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY', ...extra};
}
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {status, headers:headers({'Content-Type':'application/json', ...extra})});
}
function random() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function cookie(value, maxAge = TTL) {
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function config(env) {
  const origin = new URL(env.ADMIN_ORIGIN || 'https://greecebydan.com');
  if (origin.protocol !== 'https:' || origin.origin !== (env.ADMIN_ORIGIN || 'https://greecebydan.com')) {
    throw new Error('Invalid admin origin');
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.ALLOWED_GITHUB_LOGIN || !env.GITHUB_REPO) {
    throw new Error('Missing OAuth settings');
  }
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(env.GITHUB_REPO)) throw new Error('Invalid repository');
  return {origin:origin.origin, host:origin.hostname};
}
function completion(origin, payload, status = 200) {
  const nonce = random();
  const message = `authorization:github:${payload.error ? 'error' : 'success'}:${JSON.stringify(payload)}`;
  const safe = value => JSON.stringify(value).replaceAll('<','\\u003c');
  const body = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Greece by Dan — вход</title><p>Возвращаемся в редактор. Это окно можно закрыть после входа.</p><script nonce="${nonce}">
    const origin=${safe(origin)}, message=${safe(message)};
    if(window.opener){
      window.addEventListener('message', function handshake(event){
        if(event.origin!==origin || event.source!==window.opener || event.data!=='authorizing:github') return;
        window.removeEventListener('message',handshake);
        window.opener.postMessage(message,origin);
      });
      window.opener.postMessage('authorizing:github',origin);
    }
  </script></html>`;
  return new Response(body, {status, headers:headers({'Content-Type':'text/html; charset=utf-8',
    'Set-Cookie':cookie('',0),
    'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`})});
}
async function identity(token, env, requestFetch) {
  const h = {'Authorization':`Bearer ${token}`, 'Accept':'application/vnd.github+json',
    'User-Agent':'GreeceByDan-OAuth', 'X-GitHub-Api-Version':'2022-11-28'};
  const user = await requestFetch('https://api.github.com/user', {headers:h, signal:AbortSignal.timeout(10000)});
  if (!user.ok) throw new Error('Identity verification failed');
  const profile = await user.json();
  if (typeof profile.login !== 'string' || profile.login.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN.toLowerCase()) {
    throw new Error('This account is not allowed');
  }
  const repo = await requestFetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, {headers:h, signal:AbortSignal.timeout(10000)});
  if (!repo.ok || !(await repo.json()).permissions?.push) throw new Error('Repository access denied');
}
async function exchange(values, env, requestFetch) {
  const response = await requestFetch('https://github.com/login/oauth/access_token', {
    method:'POST', headers:{'Accept':'application/json', 'Content-Type':'application/json'},
    body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID, client_secret:env.GITHUB_CLIENT_SECRET, ...values}),
    signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Token exchange failed');
  const token = await response.json();
  if (token.error || typeof token.access_token !== 'string') throw new Error('Token exchange failed');
  await identity(token.access_token, env, requestFetch);
  const result = {token:token.access_token, provider:'github'};
  // Compatible with Decap's optional token refresh support.
  if (token.refresh_token) result.refresh_token = token.refresh_token;
  if (token.expires_in) result.expires_in = token.expires_in;
  return result;
}

export async function handle(request, env, requestFetch = fetch) {
  const u = new URL(request.url);
  let c;
  try { c = config(env); } catch {
    const origin = env.ADMIN_ORIGIN || 'https://greecebydan.com';
    return json({ready:false}, u.pathname==='/health' ? 200 : 503,
      request.headers.get('Origin')===origin ? {'Access-Control-Allow-Origin':origin,'Vary':'Origin'} : {});
  }
  const cors = request.headers.get('Origin')===c.origin ? {'Access-Control-Allow-Origin':c.origin,'Vary':'Origin'} : {};
  if (u.pathname==='/health' && request.method==='GET') return json({ready:true},200,cors);
  if (u.pathname==='/auth' && request.method==='GET') {
    if (u.searchParams.get('provider')!=='github' || u.searchParams.get('site_id')!==c.host) {
      return json({error:'Invalid site or provider'},400);
    }
    const state=random(), verifier=random();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)));
    const challenge=btoa(String.fromCharCode(...digest)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
    const authorize = new URL('https://github.com/login/oauth/authorize');
    for (const [key,value] of Object.entries({client_id:env.GITHUB_CLIENT_ID,redirect_uri:u.origin+'/callback',
      scope:'public_repo',state,code_challenge:challenge,code_challenge_method:'S256',
      login:env.ALLOWED_GITHUB_LOGIN,allow_signup:'false'})) authorize.searchParams.set(key,value);
    return new Response(null,{status:302,headers:headers({Location:authorize.href,
      'Set-Cookie':cookie(JSON.stringify({state,verifier,issued:Date.now()}))})});
  }
  if (u.pathname==='/callback' && request.method==='GET') {
    try {
      const value=(request.headers.get('Cookie') || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
      if (!value) throw new Error('Missing session');
      const session=JSON.parse(decodeURIComponent(value.slice(COOKIE.length+1)));
      if (!session.state || session.state!==u.searchParams.get('state') ||
          typeof session.verifier!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(session.verifier) ||
          typeof session.issued!=='number' || Date.now()-session.issued>TTL*1000 || session.issued>Date.now()+10000 ||
          u.searchParams.has('error') || !u.searchParams.get('code')) throw new Error('Invalid session');
      const result=await exchange({code:u.searchParams.get('code'),redirect_uri:u.origin+'/callback',
        code_verifier:session.verifier},env,requestFetch);
      return completion(c.origin,result);
    } catch {
      return completion(c.origin,{error:true,message:'Вход не завершён. Используй аккаунт onelionstudio-alt и попробуй ещё раз.'},400);
    }
  }
  if (u.pathname==='/auth/refresh') {
    if (request.method==='OPTIONS' && request.headers.get('Origin')===c.origin) {
      return new Response(null,{status:204,headers:headers({...cors,'Access-Control-Allow-Methods':'POST',
        'Access-Control-Allow-Headers':'Content-Type'})});
    }
    if (request.method!=='POST' || request.headers.get('Origin')!==c.origin) return json({error:'Forbidden'},403);
    try {
      const data=await request.formData();
      const refresh=data.get('refresh_token');
      if (typeof refresh!=='string' || refresh.length>1000 || !refresh) throw new Error('Invalid refresh');
      const result=await exchange({grant_type:'refresh_token',refresh_token:refresh},env,requestFetch);
      return json(result,200,cors);
    } catch { return json({error:true,message:'Войди через GitHub ещё раз.'},400,cors); }
  }
  return json({error:'Not found'},404);
}
export default {fetch(request, env) { return handle(request, env); }};
