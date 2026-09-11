"use client";
import { useEffect, useState } from "react";

/**
 * Shows the "Save to Auteuil" bookmarklet. Dragging it to the bookmarks bar gives a one-click
 * button that sends the page you are looking at (in your normal, logged-in browser) to the app.
 * Works on a single listing page AND on a search-results page (imports every listing shown).
 */
export default function CapturePage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  // Method 1: submit a trimmed copy of the page as a form POST into a new tab (never popup-blocked).
  // If the site's Content-Security-Policy forbids that (a "form-action" violation), method 2 kicks in:
  // open a popup at the app and hand the page over with postMessage. Any hard failure shows an alert.
  const code =
    `javascript:(function(){try{var o=${JSON.stringify(origin)};` +
    `var c=document.documentElement.cloneNode(true);` +
    `c.querySelectorAll('script,style,noscript,svg,iframe,video,audio,link,template').forEach(function(e){e.remove()});` +
    `var h=c.outerHTML;if(h.length>3000000)h=h.slice(0,3000000);` +
    `var blocked=false;document.addEventListener('securitypolicyviolation',function(e){if(String(e.violatedDirective).indexOf('form-action')===0)blocked=true;});` +
    `var f=document.createElement('form');f.method='POST';f.action=o+'/capture/submit';f.target='_blank';f.enctype='multipart/form-data';f.style.display='none';` +
    `var add=function(n,v){var i=document.createElement('input');i.type='hidden';i.name=n;i.value=v;f.appendChild(i);};` +
    `add('url',location.href);add('title',document.title);add('html',h);` +
    `document.body.appendChild(f);f.submit();` +
    `setTimeout(function(){f.remove();if(!blocked)return;` +
    `var w=window.open(o+'/capture/receive','auteuil_capture','width=460,height=600');` +
    `if(!w){alert('Save to Auteuil: this site blocks sending the page, and your browser blocked the popup. Allow popups for this site and click again.');return;}` +
    `var done=false,n=0;var send=function(){if(done||n++>90)return;try{w.postMessage({type:'auteuil-capture',url:location.href,title:document.title,html:h},o);}catch(e){}setTimeout(send,1000);};` +
    `window.addEventListener('message',function(ev){if(ev.origin!==o||!ev.data)return;if(ev.data.type==='auteuil-ready')send();if(ev.data.type==='auteuil-received')done=true;});` +
    `setTimeout(send,1500);},400);` +
    `}catch(e){alert('Save to Auteuil failed: '+e);}})();`;

  const testCode = `javascript:alert('Save to Auteuil test: the button works on '+location.host)`;

  return (
    <main className="page">
      <p><a href="/">← Back</a></p>
      <h1>Save listings from any website</h1>
      <p>
        This button grabs the page you are looking at and adds its listings to the app. It works on SeLoger,
        LeBonCoin, Bien'ici, PAP and agency sites because it runs inside your own browser, not from a server.
      </p>
      <ul>
        <li><b>On a search results page</b> it imports every listing shown. This is how to do a manual search:
          search the site with your criteria, then click the button on each page of results.</li>
        <li><b>On a single listing page</b> it imports that listing with its full description and photos.</li>
      </ul>

      <h2>1. Add the button to your browser (once)</h2>
      <p>
        Drag this blue button up onto your bookmarks bar and drop it there (on desktop Chrome or Edge, press
        Ctrl+Shift+B if the bar is hidden). Clicking it here on this page does nothing on purpose.
      </p>
      <p>
        {origin ? (
          <a className="bookmarklet" href={code} onClick={(e) => e.preventDefault()}>
            ♥ Save to Auteuil
          </a>
        ) : (
          <span className="bookmarklet" style={{ opacity: 0.5 }}>Loading…</span>
        )}
      </p>
      <p>
        <b>Can't drag it?</b> Right-click your bookmarks bar → <i>Add page…</i>, name it "Save to Auteuil",
        and paste the text below as the URL. (If Chrome removes the <code>javascript:</code> at the start
        when you paste, type it back in.)
      </p>
      <pre>{origin ? code : "…"}</pre>
      <p>
        On Android Chrome: bookmark any page, then edit that bookmark and replace its address with the text
        above. Afterwards, typing "Save to Auteuil" in the address bar while on a listing runs it.
      </p>

      <h2>2. Use it</h2>
      <p>
        On a listing or results page, click the bookmark. A new tab opens, sends the page to the app, and tells
        you how many listings were added. Reading a results page takes 20 to 60 seconds. You must be signed in
        to the app in the same browser; if not, the new tab will ask you to sign in.
      </p>

      <h2>Troubleshooting: nothing happens when I click it</h2>
      <p>
        Drag this grey test button to your bookmarks bar too, then click it while on the property website:
      </p>
      <p>
        <a className="bookmarklet" style={{ background: "#6b6b6b" }} href={testCode} onClick={(e) => e.preventDefault()}>
          Test button
        </a>
      </p>
      <ul>
        <li>If a message pops up saying "the button works on …", bookmarks are running fine and the problem is
          with sending the page; tell Claude which website you were on.</li>
        <li>If nothing appears, the bookmark isn't running at all. Bookmarks like these only work while a normal
          website is showing (not on Chrome's new-tab page or settings), and only when clicked in the bookmarks
          bar, not opened from the bookmark manager. Check the bookmark's address starts with
          <code>javascript:</code>.</li>
      </ul>
    </main>
  );
}
