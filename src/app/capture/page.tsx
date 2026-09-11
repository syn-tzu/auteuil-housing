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

  // Submits a trimmed copy of the page (scripts, styles and media removed, capped at ~3 MB) as a
  // form POST into a new tab. A form submit from a click is never popup-blocked, unlike window.open.
  const code =
    `javascript:(function(){try{var o=${JSON.stringify(origin)};` +
    `var c=document.documentElement.cloneNode(true);` +
    `c.querySelectorAll('script,style,noscript,svg,iframe,video,audio,link,template').forEach(function(e){e.remove()});` +
    `var h=c.outerHTML;if(h.length>3000000)h=h.slice(0,3000000);` +
    `var f=document.createElement('form');f.method='POST';f.action=o+'/capture/submit';f.target='_blank';f.enctype='multipart/form-data';f.style.display='none';` +
    `var add=function(n,v){var i=document.createElement('input');i.type='hidden';i.name=n;i.value=v;f.appendChild(i);};` +
    `add('url',location.href);add('title',document.title);add('html',h);` +
    `document.body.appendChild(f);f.submit();setTimeout(function(){f.remove();},2000);` +
    `}catch(e){alert('Save to Auteuil failed: '+e);}})();`;

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
        <a className="bookmarklet" href={code} onClick={(e) => e.preventDefault()}>
          ♥ Save to Auteuil
        </a>
      </p>
      <p>
        <b>Can't drag it?</b> Right-click your bookmarks bar → <i>Add page…</i>, name it "Save to Auteuil",
        and paste the text below as the URL.
      </p>
      <pre>{code}</pre>
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
    </main>
  );
}
