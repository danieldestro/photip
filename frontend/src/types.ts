export interface Photo {
  id: string;
  productUrl: string;
  thumbs: {
    p: string;
    m: string;
    g: string;
  };
}

export interface EventSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  location: string;
  date: string | null;
  dateEnd: string | null;
  categoryId: string;
  photosCount: number;
  hasEventPhoto: boolean;
  coverUrl: string | null;
  providerSlug: string;
}

export interface FavoritedEventSummary extends EventSummary {
  favoritesCount: number;
}

// Data shown in the event page's header card. A full EventSummary (from the
// Home/Eventos listing) satisfies this; the autocomplete suggestion only
// ever fills part of it.
export interface EventHeaderInfo {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  location: string | null;
  date: string | null;
  photosCount: number | null;
  categoryId: string | null;
  /** true = provedor próprio (galeria local, sem busca por selfie). */
  proprio: boolean;
  providerSlug: string | null;
}

export interface EventNameSuggestion {
  id: string;
  name: string;
  date: string | null;
  location: string;
  slug: string;
  status: string;
}

export interface Categoria {
  id: number;
  slug: string;
  nome: string;
  icone: string | null;
}

export interface Provedor {
  id: number;
  slug: string;
  nome: string;
}
