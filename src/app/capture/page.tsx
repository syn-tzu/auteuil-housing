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

  // Sends a trimmed copy of the page: scripts, styles and embedded media removed, capped at ~3 MB.
  const code =
    `javascript:(function(){var o=${JSON.stringify(origin)};` +
    `var c=document.documentElement.cloneNode(true);` +
    `c.querySelectorAll('script,style,noscript,svg,iframe,video,audio,link').forEach(function(e){e.remove()});` +
    `var h=c.outerHTML;if(h.length>3000000)h=h.slice(0,3000000);` +
    `var w=window.open(o+'/capture/receive','auteuil_capture','width=440,height=560');` +
    `var n=0;var send=function(){n++;try{w.postMessage({type:'auteuil-capture',url:location.href,title:document.title,html:h},o);}catch(e){}if(n<6)setTimeout(send,800);};` +
    `setTimeout(send,600);})();`;

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
      <p>Drag this to your bookmarks bar (on desktop Chrome, press Ctrl+Shift+B if the bar is hidden):</p>
      <p>
        <a className="bookmarklet" href={code} onClick={(e) => e.preventDefault()}>
          ♥ Save to Auteuil
        </a>
      </p>
      <p>
        On Android Chrome: bookmark any page, then edit that bookmark and replace its address with the text below.
        Afterwards, typing "Save to Auteuil" in the address bar while on a listing runs it.
      </p>
      <pre>{code}</pre>

      <h2>2. Use it</h2>
      <p>
        On a listing or results page, click the button. A small window opens, sends the page to the app, and
        tells you how many listings were added. Reading a results page takes 20 to 60 seconds. You must be
        signed in to the app in the same browser.
      </p>
    </main>
  );
}
