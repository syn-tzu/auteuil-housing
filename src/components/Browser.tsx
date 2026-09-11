"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Interaction, Lang, ListingRow } from "@/lib/types";
import { t } from "@/lib/i18n";
import { scoreListings, type Verdict } from "@/lib/score";
import ListingCard from "./ListingCard";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type Tx = "all" | "rent" | "buy";
type Sort = "new" | "price" | "size" | "foryou";

export type Names = Record<string, string>;

type Props = { listings: ListingRow[]; userId: string; names: Names };

function readLang(): Lang {
  try {
    const v = localStorage.getItem("lang");
    return v === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

export default function Browser({ listings: initial, userId, names }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [listings, setListings] = useState(initial);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<string | null>(null);

  const [tx, setTx] = useState<Tx>("rent"); // Stuart and Diana are renting; "All"/"Buy" stay available
  const [quartier, setQuartier] = useState("");
  const [ptype, setPtype] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSurface, setMinSurface] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [needOutdoor, setNeedOutdoor] = useState(false);
  const [needElevator, setNeedElevator] = useState(false);
  const [needParking, setNeedParking] = useState(false);
  const [hideRejected, setHideRejected] = useState(true);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [sort, setSort] = useState<Sort>("new");
  const [showFilters, setShowFilters] = useState(false); // phones: extra filters collapsed by default
  const activeFilters =
    [quartier, ptype, minPrice, maxPrice, minSurface, bedrooms].filter(Boolean).length +
    [needOutdoor, needElevator, needParking, onlyFavs].filter(Boolean).length;

  useEffect(() => {
    setLang(readLang());
  }, []);
  function toggleLang() {
    const next: Lang = lang === "en" ? "fr" : "en";
    setLang(next);
    try {
      localStorage.setItem("lang", next);
    } catch {}
  }

  // ----- verdicts from both users, used for filters and the "For you" ranking -----
  const verdicts = useMemo<Verdict[]>(() => {
    const out: Verdict[] = [];
    for (const l of listings)
      for (const i of l.interactions)
        if (i.action === "favorite" || i.action === "reject") out.push({ listing_id: l.id, action: i.action });
    return out;
  }, [listings]);
  const scores = useMemo(() => scoreListings(listings, verdicts), [listings, verdicts]);

  const myVerdict = (l: ListingRow) => l.interactions.find((i) => i.user_id === userId && (i.action === "favorite" || i.action === "reject"))?.action;
  const anyFav = (l: ListingRow) => l.interactions.some((i) => i.action === "favorite");

  const filtered = useMemo(() => {
    const minP = Number(minPrice) || 0;
    const maxP = Number(maxPrice) || Infinity;
    const minS = Number(minSurface) || 0;
    const minB = Number(bedrooms) || 0;
    let rows = listings.filter((l) => {
      if (tx !== "all" && l.transaction_type !== tx) return false;
      if (quartier && l.quartier !== quartier) return false;
      if (ptype && l.property_type !== ptype) return false;
      if (l.price_eur != null && (l.price_eur < minP || l.price_eur > maxP)) return false;
      if (minS && (l.surface_sqm ?? 0) < minS) return false;
      if (minB && (l.bedroom_count ?? 0) < minB) return false;
      if (needOutdoor && !l.has_balcony && !l.has_terrace) return false;
      if (needElevator && !l.has_elevator) return false;
      if (needParking && !l.has_parking) return false;
      if (hideRejected && myVerdict(l) === "reject") return false;
      if (onlyFavs && !anyFav(l)) return false;
      return true;
    });
    const by: Record<Sort, (a: ListingRow, b: ListingRow) => number> = {
      new: (a, b) => b.first_seen_at.localeCompare(a.first_seen_at),
      price: (a, b) => (a.price_eur ?? Infinity) - (b.price_eur ?? Infinity),
      size: (a, b) => (b.surface_sqm ?? 0) - (a.surface_sqm ?? 0),
      foryou: (a, b) => (scores?.get(b.id) ?? -9) - (scores?.get(a.id) ?? -9),
    };
    rows = [...rows].sort(by[sort]);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, tx, quartier, ptype, minPrice, maxPrice, minSurface, bedrooms, needOutdoor, needElevator, needParking, hideRejected, onlyFavs, sort, scores]);

  // ----- optimistic verdict / note updates -----
  async function setVerdict(listingId: string, action: "favorite" | "reject" | "clear") {
    setListings((rows) =>
      rows.map((l) => {
        if (l.id !== listingId) return l;
        const others = l.interactions.filter((i) => !(i.user_id === userId && (i.action === "favorite" || i.action === "reject")));
        const mine: Interaction[] = action === "clear" ? [] : [{ user_id: userId, action, note_text: null, created_at: new Date().toISOString() }];
        return { ...l, interactions: [...others, ...mine] };
      })
    );
    await fetch("/api/interactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listing_id: listingId, action }) });
  }
  async function addNote(listingId: string, text: string) {
    setListings((rows) =>
      rows.map((l) =>
        l.id === listingId
          ? { ...l, interactions: [...l.interactions, { user_id: userId, action: "note", note_text: text, created_at: new Date().toISOString() }] }
          : l
      )
    );
    await fetch("/api/interactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listing_id: listingId, action: "note", note_text: text }) });
  }

  const T = (k: Parameters<typeof t>[1]) => t(lang, k);

  const [checking, setChecking] = useState(false);
  async function checkInbox() {
    setChecking(true);
    try {
      const res = await fetch("/api/ingest/run", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? res.statusText);
      const created = (j.details ?? []).reduce((n: number, d: { summary?: { created: number } }) => n + (d.summary?.created ?? 0), 0);
      const msg =
        lang === "fr"
          ? `${j.matched} email(s) d'annonces non lus, ${j.processed} traité(s), ${created} nouvelle(s) annonce(s)${j.errors ? `, ${j.errors} erreur(s)` : ""}.`
          : `${j.matched} unread listing email(s), ${j.processed} processed, ${created} new listing(s)${j.errors ? `, ${j.errors} error(s)` : ""}.`;
      alert(msg);
      if (created > 0 || j.processed > 0) window.location.reload();
    } catch (e) {
      alert((lang === "fr" ? "Échec : " : "Failed: ") + (e instanceof Error ? e.message : String(e)));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Auteuil &amp; Passy</h1>
        <div className="spacer" />
        <button onClick={checkInbox} disabled={checking}>{checking ? "…" : T("checkInbox")}</button>
        <a href="/capture">{T("capture")}</a>
        <a href="/log">{T("log")}</a>
        <button onClick={toggleLang} title="Français / English">{lang === "en" ? "FR" : "EN"}</button>
        <form action="/auth/signout" method="post">
          <button type="submit">{T("signOut")}</button>
        </form>
      </header>

      <div className={"filters" + (showFilters ? " open" : "")}>
        <div className="seg">
          {(["all", "buy", "rent"] as Tx[]).map((v) => (
            <button key={v} className={tx === v ? "on" : ""} onClick={() => setTx(v)}>{T(v)}</button>
          ))}
        </div>
        <button className={"chip toggle" + (activeFilters ? " on" : "")} onClick={() => setShowFilters(!showFilters)}>
          {T("filters")}{activeFilters ? ` · ${activeFilters}` : ""} {showFilters ? "▴" : "▾"}
        </button>
        <div className="more">
          <select value={quartier} onChange={(e) => setQuartier(e.target.value)}>
            <option value="">{T("anyQuartier")}</option>
            <option value="auteuil_nord">{T("auteuil_nord")}</option>
            <option value="auteuil_sud">{T("auteuil_sud")}</option>
            <option value="muette">{T("muette")}</option>
            <option value="other">{T("other")}</option>
          </select>
          <select value={ptype} onChange={(e) => setPtype(e.target.value)}>
            <option value="">{T("anyType")}</option>
            <option value="apartment">{T("apartment")}</option>
            <option value="house">{T("house")}</option>
            <option value="hotel_particulier">{T("hotel_particulier")}</option>
          </select>
          <input inputMode="numeric" placeholder={T("minPrice")} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ width: 90 }} />
          <input inputMode="numeric" placeholder={T("maxPrice")} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ width: 90 }} />
          <input inputMode="numeric" placeholder={T("minSurface")} value={minSurface} onChange={(e) => setMinSurface(e.target.value)} style={{ width: 80 }} />
          <input inputMode="numeric" placeholder={T("bedrooms")} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} style={{ width: 90 }} />
          <button className={"chip" + (needOutdoor ? " on" : "")} onClick={() => setNeedOutdoor(!needOutdoor)}>{T("balcony")}</button>
          <button className={"chip" + (needElevator ? " on" : "")} onClick={() => setNeedElevator(!needElevator)}>{T("elevator")}</button>
          <button className={"chip" + (needParking ? " on" : "")} onClick={() => setNeedParking(!needParking)}>{T("parking")}</button>
          <button className={"chip" + (hideRejected ? " on" : "")} onClick={() => setHideRejected(!hideRejected)}>{T("hideRejected")}</button>
          <button className={"chip" + (onlyFavs ? " on" : "")} onClick={() => setOnlyFavs(!onlyFavs)}>{T("onlyFavs")}</button>
        </div>
        <div className="seg" title={T("forYouHint")}>
          {(["new", "price", "size", "foryou"] as Sort[]).map((v) => (
            <button key={v} className={sort === v ? "on" : ""} disabled={v === "foryou" && !scores} onClick={() => setSort(v)}>
              {T(v === "new" ? "sortNew" : v === "price" ? "sortPrice" : v === "size" ? "sortSize" : "sortForYou")}
            </button>
          ))}
        </div>
        <span className="count">{filtered.length} {T("listings")}</span>
      </div>

      <div className={`main mode-${mode}`}>
        <section className="list">
          {filtered.length === 0 ? (
            <div className="empty">{T("empty")}</div>
          ) : (
            <div className="cards">
              {filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  lang={lang}
                  userId={userId}
                  names={names}
                  score={scores?.get(l.id) ?? null}
                  selected={selected === l.id}
                  onSelect={() => setSelected(l.id)}
                  onVerdict={(a) => setVerdict(l.id, a)}
                  onNote={(text) => addNote(l.id, text)}
                />
              ))}
            </div>
          )}
        </section>
        <aside className="mapwrap">
          <MapView
            listings={filtered}
            lang={lang}
            userId={userId}
            selected={selected}
            visibleKey={mode}
            onSelect={(id) => { setSelected(id); setMode("list"); }}
          />
        </aside>
      </div>

      <nav className="bottomnav">
        <button className={mode === "list" ? "on" : ""} onClick={() => setMode("list")}>{T("listView")}</button>
        <button className={mode === "map" ? "on" : ""} onClick={() => setMode("map")}>{T("mapView")}</button>
      </nav>
    </div>
  );
}
