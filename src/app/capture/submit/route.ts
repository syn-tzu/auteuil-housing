import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Target of the bookmarklet's form submit (opens in a new tab, so no popup blocking).
 * Cookies aren't sent on a cross-site POST, so this page doesn't need sign-in itself:
 * it just echoes the captured page back to the browser, and the script below then calls
 * /api/capture from the app's own origin, where the sign-in cookie is available.
 */
export async function POST(request: Request) {
  let url = "";
  let title = "";
  let html = "";
  try {
    const form = await request.formData();
    url = String(form.get("url") ?? "");
    title = String(form.get("title") ?? "");
    html = String(form.get("html") ?? "");
  } catch {
    return new NextResponse(page("Could not read the page data. Close this tab and click the bookmark again.", null), { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  if (!url || !html) {
    return new NextResponse(page("Nothing was received. Close this tab and click the bookmark again.", null), { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const payload = JSON.stringify({ url, title, html }).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
  return new NextResponse(page("Reading the page with Claude… about 15 seconds for one listing, 1 to 3 minutes for a results page. Keep this tab open.", payload), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET() {
  return NextResponse.redirect(new URL("/capture", process.env.NEXT_PUBLIC_APP_URL ?? "https://auteuil-housing.vercel.app"));
}

function page(message: string, payload: string | null): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Save to Auteuil</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f7f5f0;color:#1c1c1c;margin:0;padding:24px;font-size:15px;line-height:1.5}
h1{font-size:20px;margin:0 0 12px}.ok{color:#2e7d4f}.err{color:#b3372e}small{color:#6b6b6b;word-break:break-all}
a{color:#1f3a5f}
</style></head><body>
<h1>Save to Auteuil</h1>
<p id="s">${escapeHtml(message)}</p>
${payload ? `<script id="d" type="application/json">${payload}</script>
<script>
(function(){
  var d=JSON.parse(document.getElementById('d').textContent);
  var s=document.getElementById('s');
  var base=s.textContent,t0=Date.now();
  var tick=setInterval(function(){s.innerHTML=base+' ('+Math.round((Date.now()-t0)/1000)+'s)<br><small>'+d.url.replace(/</g,'&lt;')+'</small>';},1000);
  var stop=function(){clearInterval(tick);};
  fetch('/api/capture',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(d)})
  .then(function(r){return r.text().then(function(t){stop();var j;try{j=JSON.parse(t)}catch(e){throw new Error('The app answered with '+r.status+'. Try again in a minute.')}
    if(r.status===401){s.className='err';s.innerHTML='You are not signed in to the app in this browser. <a href="/login" target="_blank">Sign in</a>, then close this tab and click the bookmark again.';return;}
    if(!r.ok)throw new Error(j.error||r.statusText);
    if(j.ok){s.className='ok';s.innerHTML='&#10003; Added '+j.created+' new, updated '+j.updated+' (source: '+j.source_site+'). <a href="/">Open the app</a>';}
    else{s.className='err';s.textContent='✕ '+(j.reason||'No listing found on that page.');}
  })})
  .catch(function(e){stop();s.className='err';s.textContent='✕ '+(e&&e.message?e.message:e);});
})();
</script>` : ""}
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
