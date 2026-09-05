"use client";
import { useEffect, useState } from "react";

/**
 * Shows the "Save to Auteuil" bookmarklet. Dragging it to the bookmarks bar gives a one-click
 * button that sends the page you are looking at (in your normal, logged-in browser) to the app.
 */
export default function CapturePage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const code =
    `javascript:(function(){var o=${JSON.stringify(origin)};` +
    `var w=window.open(o+'/capture/receive','auteuil_capture','width=440,height=560');` +
    `var n=0;var send=function(){n++;try{w.postMessage({type:'auteuil-capture',url:location.href,title:document.title,html:document.documentElement.outerHTML},o);}catch(e){}if(n<6)setTimeout(send,800);};` +
    `setTimeout(send,600);})();`;

  return (
    <main className="page">
      <p><a href="/">← Back</a></p>
      <h1>Save a listing from any website</h1>
      <p>
        For listings the email alerts miss (a boutique agency page, something a friend sent), this button grabs the
        page you are looking at and adds it to the app. It works on SeLoger, LeBonCoin and every other site because
        it runs inside your own browser, not from a server.
      </p>

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
        On a listing page, click the button. A small window opens, sends the page to the app, and tells you when the
        listing has been added. You must be signed in to the app in the same browser.
      </p>
    </main>
  );
}
