import type { Lang } from "./types";

const STRINGS = {
  en: {
    all: "All", rent: "Rent", buy: "Buy", filters: "Filters", checkInbox: "Check inbox",
    quartier: "Quartier", anyQuartier: "Any quartier",
    auteuil_nord: "Auteuil Nord", auteuil_sud: "Auteuil Sud", muette: "Muette / Passy", other: "Other 16e",
    apartment: "Apartment", house: "House", hotel_particulier: "Hôtel particulier",
    type: "Type", anyType: "Any type",
    minPrice: "Min €", maxPrice: "Max €", minSurface: "Min m²", bedrooms: "Bedrooms+",
    balcony: "Balcony/terrace", elevator: "Elevator", parking: "Parking",
    hideRejected: "Hide rejected", onlyFavs: "Favourites only",
    sortNew: "Newest", sortPrice: "Price", sortSize: "Size", sortForYou: "For you",
    forYouHint: "Ranked by similarity to what you both favourited. Needs at least 5 favourites/rejects.",
    listings: "listings", perMonth: "/month", perSqm: "/m²",
    floor: "floor", groundFloor: "ground floor", pieces: "rooms", bedroomsShort: "bed",
    favorite: "Favourite", reject: "Pass", open: "Open", noPhoto: "No photo",
    addNote: "Add a note…", send: "Save", new: "New", approx: "Approx. location",
    listView: "List", mapView: "Map", signOut: "Sign out", capture: "Capture", log: "Log",
    empty: "No listings yet. They arrive from alert emails (press Check inbox), or search on SeLoger / Bien'ici / PAP and use the Save to Auteuil button on the results page (see Capture).",
    you: "you", furnished: "Furnished", cellar: "Cellar", terrace: "Terrace", balconyTag: "Balcony",
    parkingTag: "Parking", elevatorTag: "Elevator", land: "land",
  },
  fr: {
    all: "Tous", rent: "Louer", buy: "Acheter", filters: "Filtres", checkInbox: "Relever",
    quartier: "Quartier", anyQuartier: "Tous quartiers",
    auteuil_nord: "Auteuil Nord", auteuil_sud: "Auteuil Sud", muette: "Muette / Passy", other: "Autre 16e",
    apartment: "Appartement", house: "Maison", hotel_particulier: "Hôtel particulier",
    type: "Type", anyType: "Tous types",
    minPrice: "Min €", maxPrice: "Max €", minSurface: "Min m²", bedrooms: "Chambres+",
    balcony: "Balcon/terrasse", elevator: "Ascenseur", parking: "Parking",
    hideRejected: "Masquer refusés", onlyFavs: "Favoris seulement",
    sortNew: "Récents", sortPrice: "Prix", sortSize: "Surface", sortForYou: "Pour vous",
    forYouHint: "Classé par similarité avec vos favoris. Nécessite au moins 5 favoris/refus.",
    listings: "annonces", perMonth: "/mois", perSqm: "/m²",
    floor: "étage", groundFloor: "rez-de-chaussée", pieces: "pièces", bedroomsShort: "ch.",
    favorite: "Favori", reject: "Passer", open: "Ouvrir", noPhoto: "Pas de photo",
    addNote: "Ajouter une note…", send: "Enregistrer", new: "Nouveau", approx: "Position approx.",
    listView: "Liste", mapView: "Carte", signOut: "Quitter", capture: "Capturer", log: "Journal",
    empty: "Pas encore d'annonces. Elles arrivent par les alertes email (bouton Relever), ou cherchez sur SeLoger / Bien'ici / PAP et utilisez le bouton Save to Auteuil sur la page de résultats (voir Capturer).",
    you: "vous", furnished: "Meublé", cellar: "Cave", terrace: "Terrasse", balconyTag: "Balcon",
    parkingTag: "Parking", elevatorTag: "Ascenseur", land: "terrain",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

export function t(lang: Lang, key: StringKey): string {
  return STRINGS[lang][key] ?? STRINGS.en[key];
}

export function formatPrice(lang: Lang, n: number | null, tx: "rent" | "buy" | null): string {
  if (n == null) return "—";
  const s = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 0 }).format(n);
  return `${s} €${tx === "rent" ? t(lang, "perMonth") : ""}`;
}

export function formatNumber(lang: Lang, n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 0 }).format(n);
}
