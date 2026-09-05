"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Lang, ListingRow } from "@/lib/types";
import { formatNumber, formatPrice, t } from "@/lib/i18n";
import type { Names } from "./Browser";

type Props = {
  listing: ListingRow;
  lang: Lang;
  userId: string;
  names: Names;
  score: number | null;
  selected: boolean;
  onSelect: () => void;
  onVerdict: (a: "favorite" | "reject" | "clear") => void;
  onNote: (text: string) => void;
};

const NEW_DAYS = 3;

export default function ListingCard({ listing: l, lang, userId, names, score, selected, onSelect, onVerdict, onNote }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const T = (k: Parameters<typeof t>[1]) => t(lang, k);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  const mine = l.interactions.find((i) => i.user_id === userId && (i.action === "favorite" || i.action === "reject"))?.action;
  const theirs = l.interactions.filter((i) => i.user_id !== userId && (i.action === "favorite" || i.action === "reject"));
  const notes = l.interactions.filter((i) => i.action === "note");
  const isNew = Date.now() - new Date(l.first_seen_at).getTime() < NEW_DAYS * 86400e3;
  const who = (id: string) => (id === userId ? T("you") : names[id] ?? "partner");

  const title = (lang === "fr" ? l.title_fr : l.title_en) ?? l.title_fr ?? l.title_en ?? "";
  const desc = (lang === "fr" ? l.description_fr : l.description_en) ?? l.description_fr ?? l.description_en ?? "";

  const floorText =
    l.floor == null ? null : l.floor === 0 ? T("groundFloor") : `${l.floor}${lang === "fr" ? "e" : ordinal(l.floor)} ${T("floor")}${l.total_floors ? `/${l.total_floors}` : ""}`;

  function submitNote(e: FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    onNote(text);
    setNote("");
  }

  const cls = ["card", mine === "favorite" ? "fav" : "", mine === "reject" ? "rej" : "", selected ? "selected" : "", open ? "open" : ""].join(" ");

  return (
    <article className={cls} ref={ref} onClick={onSelect}>
      <div className="photo">
        {l.photo_urls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.photo_urls[0]} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="nophoto">{T("noPhoto")}</div>
        )}
        <div className="badges">
          {isNew && <span className="badge new">{T("new")}</span>}
          {l.transaction_type && <span className="badge">{T(l.transaction_type)}</span>}
          {l.quartier && <span className="badge">{T(l.quartier)}</span>}
          {score != null && <span className="badge score">{Math.round(score * 100)}</span>}
          {!l.geocode_precise && <span className="badge" title={T("approx")}>≈</span>}
        </div>
      </div>
      <div className="body">
        <div className="price">
          {formatPrice(lang, l.price_eur, l.transaction_type)}
          {l.price_per_sqm_eur ? <small>{formatNumber(lang, l.price_per_sqm_eur)} €{T("perSqm")}</small> : null}
        </div>
        {title && <div className="title">{title}</div>}
        <div className="meta">
          {l.surface_sqm != null && <span>{formatNumber(lang, l.surface_sqm)} m²</span>}
          {l.pieces_count != null && <span>{l.pieces_count} {T("pieces")}</span>}
          {l.bedroom_count != null && <span>{l.bedroom_count} {T("bedroomsShort")}</span>}
          {floorText && <span>{floorText}</span>}
          {l.land_sqm != null && <span>{formatNumber(lang, l.land_sqm)} m² {T("land")}</span>}
          {l.street_address && <span>{l.street_address}</span>}
          {l.dpe_rating && <span>DPE {l.dpe_rating}</span>}
        </div>
        <div className="tags">
          {l.has_balcony && <span className="tag">{T("balconyTag")}</span>}
          {l.has_terrace && <span className="tag">{T("terrace")}</span>}
          {l.has_elevator && <span className="tag">{T("elevatorTag")}</span>}
          {l.has_parking && <span className="tag">{T("parkingTag")}</span>}
          {l.has_cellar && <span className="tag">{T("cellar")}</span>}
          {l.is_furnished && <span className="tag">{T("furnished")}</span>}
          {l.property_type && <span className="tag">{T(l.property_type)}</span>}
          <span className="tag">{l.agency_name ?? l.source_site}</span>
        </div>
        {desc && (
          <div className="desc" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {desc}
          </div>
        )}
        <div className="actions" onClick={(e) => e.stopPropagation()}>
          <button className={"fav" + (mine === "favorite" ? " on" : "")} onClick={() => onVerdict(mine === "favorite" ? "clear" : "favorite")}>
            ♥ {T("favorite")}
          </button>
          <button className={"rej" + (mine === "reject" ? " on" : "")} onClick={() => onVerdict(mine === "reject" ? "clear" : "reject")}>
            ✕ {T("reject")}
          </button>
          {l.source_url && (
            <a className="open" href={l.source_url} target="_blank" rel="noreferrer">
              {T("open")} ↗
            </a>
          )}
        </div>
        {theirs.length > 0 && (
          <div className="who">
            {theirs.map((i) => (
              <span key={i.user_id}>
                {i.action === "favorite" ? <b>♥</b> : "✕"} {who(i.user_id)}{" "}
              </span>
            ))}
          </div>
        )}
        <div className="notes" onClick={(e) => e.stopPropagation()}>
          {notes.map((n, i) => (
            <div className="note" key={i}>
              <div className="by">{who(n.user_id)} · {new Date(n.created_at).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}</div>
              {n.note_text}
            </div>
          ))}
          <form onSubmit={submitNote}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={T("addNote")} />
            {note && <button type="submit">{T("send")}</button>}
          </form>
        </div>
      </div>
    </article>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
