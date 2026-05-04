const BASE_API_URL = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : process?.env?.VITE_API_URL) || 'https://xerv2.vercel.app';

const M3U8_PROXIES = [
  '/api/proxy?url=',
];

let activeProxyIndex = 0;

async function fetchFromApi(path: string) {
  const url = `${BASE_API_URL}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch(e) {}
    throw new Error(`API request failed: ${response.status} for ${url} - ${errorText}`);
  }
  return response.json();
}

export function getM3U8ProxyUrl(url: string, referer?: string) {
  let proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  if (referer) {
    proxyUrl += `&referer=${encodeURIComponent(referer)}`;
  }
  return proxyUrl;
}

export function switchToNextProxy() {
  activeProxyIndex = (activeProxyIndex + 1) % M3U8_PROXIES.length;
  return activeProxyIndex;
}

// Normalize anime object from API response
function normalizeAnime(anime: any): Anime {
  return {
    id: anime.id,
    name: anime.title || anime.name,
    jname: anime.jname || anime.romaji,
    poster: anime.poster || anime.posterImage,
    rating: anime.rating,
    episodes: anime.episodes,
    type: anime.type || anime.format,
    duration: anime.duration,
    relation: anime.relation,
  };
}

function normalizeSpotlightAnime(anime: any): SpotlightAnime {
  const rankMatch = anime.spotlight?.match(/#(\d+)/);
  const rank = rankMatch ? parseInt(rankMatch[1]) : (anime.rank || 1);
  return {
    ...normalizeAnime(anime),
    rank,
    description: anime.description || anime.synopsis || '',
    otherInfo: [anime.type || anime.format, anime.releaseDate || anime.releaseYear, anime.quality].filter(Boolean) as string[],
  };
}

// Home - returns normalized data matching API structure
export async function getHome(): Promise<HomeData> {
  const rawResponse = await fetchFromApi('/api/v2/animekai/home');
  const raw = rawResponse?.data || rawResponse || {};
  
  const topAnimeData = raw.topTrending || raw.topAnime || {};
  const top10Animes = {
    today: (topAnimeData.day || topAnimeData.today || topAnimeData.daily || []).map(normalizeAnime),
    week: (topAnimeData.week || topAnimeData.weekly || []).map(normalizeAnime),
    month: (topAnimeData.month || topAnimeData.monthly || []).map(normalizeAnime),
  };
  
  return {
    spotlightAnimes: (raw.featuredAnimes || raw.spotlightAnimes || []).map(normalizeSpotlightAnime),
    trendingAnimes: (raw.topTrending?.now || raw.trending || []).map(normalizeAnime),
    latestEpisodeAnimes: (raw.latestUpdates?.all || raw.recentlyUpdated || []).map(normalizeAnime),
    topUpcomingAnimes: (raw.quickLists?.upcoming || raw.topUpcoming || []).map(normalizeAnime),
    top10Animes,
    topAiringAnimes: (raw.topAiring || []).map(normalizeAnime),
    mostPopularAnimes: (raw.mostPopular || []).map(normalizeAnime),
    mostFavoriteAnimes: (raw.favourites || []).map(normalizeAnime),
    latestCompletedAnimes: (raw.quickLists?.completed || raw.recentlyCompleted || []).map(normalizeAnime),
    recentlyAddedAnimes: (raw.quickLists?.newReleases || raw.recentlyAdded || []).map(normalizeAnime),
    genres: [],
  };
}

// Search - returns data array
export async function searchAnime(query: string, page = 1) {
  const rawResponse = await fetchFromApi(`/api/v2/animekai/search?q=${encodeURIComponent(query)}&page=${page}`);
  const raw = rawResponse?.data || rawResponse || {};
  return {
    animes: (raw.animes || raw.data || raw.results || []).map(normalizeAnime),
    currentPage: raw.currentPage || page,
    hasNextPage: raw.hasNextPage || false,
    totalPages: raw.totalPages || raw.lastPage || 1,
  };
}

// Suggestions - returns data array
export async function getSuggestions(query: string) {
  const raw = await fetchFromApi(`/api/v2/animekai/search/suggest?keyword=${encodeURIComponent(query)}`);
  return {
    suggestions: ((raw?.data?.suggestions) || []).map(normalizeAnime),
  };
}

// Categories: subbed, dubbed, favourites, popular, airing
export async function getCategory(category: string, page = 1) {
  const raw = await fetchFromApi(`/api/v2/animekai/category/${category}?page=${page}`);
  return {
    animes: (raw.data?.animes || []).map(normalizeAnime),
    currentPage: raw.data?.currentPage || 1,
    hasNextPage: raw.data?.hasNextPage || false,
    totalPages: raw.data?.totalPages || 1,
  };
}

// Recent: completed, added, updated
export async function getRecent(status: string, page = 1) {
  const raw = await fetchFromApi(`/api/v2/animekai/recent/${status}?page=${page}`);
  return {
    animes: (raw.data?.animes || []).map(normalizeAnime),
    currentPage: raw.data?.currentPage || 1,
    hasNextPage: raw.data?.hasNextPage || false,
    totalPages: raw.data?.totalPages || 1,
  };
}

// Genre
export async function getGenre(genre: string, page = 1) {
  const raw = await fetchFromApi(`/api/v2/animekai/genre/${genre}?page=${page}`);
  return {
    animes: (raw.data?.animes || []).map(normalizeAnime),
    currentPage: raw.data?.currentPage || 1,
    hasNextPage: raw.data?.hasNextPage || false,
    totalPages: raw.data?.totalPages || 1,
  };
}

// Format: TV, MOVIE, SPECIALS, OVA, ONA
export async function getFormat(format: string, page = 1) {
  const raw = await fetchFromApi(`/api/v2/animekai/format/${format}?page=${page}`);
  return {
    animes: (raw.data?.animes || []).map(normalizeAnime),
    currentPage: raw.data?.currentPage || 1,
    hasNextPage: raw.data?.hasNextPage || false,
    totalPages: raw.data?.totalPages || 1,
  };
}

// A-Z List
export async function getAZList(sort: string, page = 1) {
  const raw = await fetchFromApi(`/api/v2/animekai/azlist/${sort}?page=${page}`);
  return {
    animes: (raw.data?.animes || []).map(normalizeAnime),
    currentPage: raw.data?.currentPage || 1,
    hasNextPage: raw.data?.hasNextPage || false,
    totalPages: raw.data?.totalPages || 1,
  };
}

// Helper to load grid lists dynamically with pagination when possible
export async function getGridData(type: string, page = 1) {
  try {
    if (type === 'trending') {
      return await getCategory('trending', page);
    } else if (type === 'upcoming') {
      return await getCategory('upcoming', page);
    } else if (type === 'recent') {
      // Map 'recent' to 'updates' category to get recently updated episodes properly paginated
      return await getCategory('updates', page);
    } else if (type === 'movies') {
      return await getCategory('movie', page);
    } else if (type === 'tv') {
      return await getCategory('tv', page);
    } else if (type === 'popular') {
      const rawResponse = await fetchFromApi(`/api/v2/animekai/search/advanced?q=%20&sort=most_viewed&page=${page}`);
      const raw = rawResponse?.data || rawResponse || {};
      return {
        animes: (raw.animes || raw.data || raw.results || []).map(normalizeAnime),
        currentPage: raw.currentPage || page,
        hasNextPage: raw.hasNextPage || false,
        totalPages: raw.totalPages || raw.lastPage || 1,
      };
    } else {
      // Fallback for unpaginated lists
      const homeData = await getHome();
      let animes: Anime[] = [];
      if (type === 'recent') animes = homeData.latestEpisodeAnimes;
      else if (type === 'popular') animes = homeData.mostPopularAnimes;
      
      return {
        animes,
        currentPage: 1,
        hasNextPage: false,
        totalPages: 1,
      };
    }
  } catch (err) {
    console.warn(`Grid data fetch failed for ${type}, falling back to home data`, err);
    // Silent fallback just in case
    const homeData = await getHome();
    let animes: Anime[] = [];
    if (type === 'trending') animes = homeData.trendingAnimes;
    else if (type === 'recent') animes = homeData.latestEpisodeAnimes;
    else if (type === 'upcoming') animes = homeData.topUpcomingAnimes;
    else if (type === 'popular') animes = homeData.mostPopularAnimes;
    
    return {
      animes,
      currentPage: 1,
      hasNextPage: false,
      totalPages: 1,
    };
  }
}

// Anime Details
export async function getAnimeDetails(id: string): Promise<AnimeDetails> {
  const rawResponse = await fetchFromApi(`/api/v2/animekai/anime/${id}`);
  const data = rawResponse?.data || rawResponse || {};
  const details = data.details || {};
  
  return {
    anime: {
      info: {
        id: data.id || id,
        name: data.title || data.name,
        poster: data.poster || data.posterImage,
        description: data.description || data.synopsis || '',
        stats: {
          rating: data.rating,
          quality: data.quality,
          episodes: data.episodes || { sub: 0, dub: 0 },
          type: data.type || data.format,
          duration: details.duration || data.duration,
        },
        promotionalVideos: (data.promotionVideos || []).map((v: any) => ({
          title: v.title,
          source: v.url,
          thumbnail: v.thumbnail,
        })),
        charactersVoiceActors: (data.characters || []).map((c: any) => ({
          character: {
            id: c.id,
            poster: c.posterImage,
            name: c.name,
            cast: c.role,
          },
          voiceActor: c.voiceActor ? {
            id: c.voiceActor.id,
            poster: c.voiceActor.posterImage,
            name: c.voiceActor.name,
            cast: c.voiceActor.language,
          } : null,
        })),
      },
      moreInfo: {
        malId: data.externalLinks?.mal ? data.externalLinks.mal.split('/').filter(Boolean).pop() : undefined,
        japanese: data.jname || details.japanese,
        synonyms: data.altTitle || details.synonyms,
        aired: details.aired || data.releaseDate,
        status: details.status || data.status,
        malscore: details.malScore || data.score,
        genres: data.genres,
        studios: details.studios,
        producers: Array.isArray(details.producers) ? details.producers : (details.producers ? [details.producers] : []),
      },
    },
    seasons: (data.relatedSeasons || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      title: s.season || s.name,
      poster: s.seasonPoster,
      isCurrent: s.id === id,
    })),
    mostPopularAnimes: [],
    relatedAnimes: (data.relations || data.relatedAnime || []).map(normalizeAnime),
    recommendedAnimes: (data.recommendedAnime || []).map(normalizeAnime),
  };
}

// Episodes - uses the episodes endpoint
export async function getAnimeEpisodes(id: string): Promise<EpisodeData> {
  const rawResponse = await fetchFromApi(`/api/v2/animekai/anime/${id}/episodes`);
  const data = rawResponse?.data || rawResponse || {};
  const episodes = data.episodes || [];
  
  return {
    totalEpisodes: episodes.length,
    episodes: episodes.map((ep: any) => ({
      title: ep.title || `Episode ${ep.number || ep.episodeNumber}`,
      episodeId: ep.episodeId,
      number: ep.number || ep.episodeNumber,
      isFiller: ep.isFiller || false,
      hasSub: ep.hasSub,
      hasDub: ep.hasDub,
    })),
  };
}

// Episode Servers
export async function getEpisodeServers(episodeId: string): Promise<ServersData> {
  const rawResponse = await fetchFromApi(`/api/v2/animekai/episode/servers?animeEpisodeId=${encodeURIComponent(episodeId)}`);
  const raw = rawResponse?.data || rawResponse || {};
  const categories = raw.categories || {};
  
  return {
    sub: (categories.sub || []).map((s: any) => ({
      serverId: s.serverId,
      serverName: s.serverName,
    })),
    dub: (categories.dub || []).map((s: any) => ({
      serverId: s.serverId,
      serverName: s.serverName,
    })),
    raw: (categories.softsub || categories.raw || []).map((s: any) => ({
      serverId: s.serverId,
      serverName: s.serverName,
    })),
    episodeId: raw.animeId || episodeId.split('?')[0],
    episodeNo: raw.episode || parseInt(episodeId.split('ep=')[1] || '1'),
  };
}

// Episode Sources
export async function getEpisodeSources(episodeId: string, version = 'sub', server = 'server-1'): Promise<SourcesData> {
  // ensure server name is dash case (e.g., 'Server 1' -> 'server-1')
  const formattedServer = server.toLowerCase().replace(/\s+/g, '-');
  const formattedCategory = version === 'raw' ? 'softsub' : version;
  
  const rawResponse = await fetchFromApi(`/api/v2/animekai/episode/sources?animeEpisodeId=${encodeURIComponent(episodeId)}&server=${formattedServer}&category=${formattedCategory}`);
  const data = rawResponse?.data || rawResponse || {};
  
  return {
    referer: data.referer,
    sources: (data.sources || []).map((s: any) => ({
      url: s.url || s.source,
      type: s.type === 'm3u8' ? 'hls' : (s.type || 'hls'),
    })),
    subtitles: (data.tracks || data.subtitles || []).map((s: any) => ({
      file: s.file || s.url || '',
      label: s.label || s.lang || 'Unknown',
      kind: s.kind || 'captions',
      default: s.default || false,
    })),
    intro: data.intro && data.intro.length === 2 ? { start: data.intro[0], end: data.intro[1] } : undefined,
    outro: data.outro && data.outro.length === 2 ? { start: data.outro[0], end: data.outro[1] } : undefined,
  };
}

// Raw types from API
interface RawAnime {
  id: string;
  name: string;
  romaji?: string;
  posterImage: string;
  rating?: string;
  episodes?: { sub?: number; dub?: number };
  type?: string;
  duration?: string;
  totalEpisodes?: number;
}

interface RawSpotlightAnime extends RawAnime {
  spotlight?: string;
  synopsis?: string;
  releaseDate?: string;
  quality?: string;
}

interface RawSeason {
  id: string;
  name: string;
  season?: string;
  seasonPoster?: string;
}

interface RawEpisode {
  episodeId: string;
  title?: string;
  romaji?: string;
  episodeNumber: number;
  hasSub?: boolean;
  hasDub?: boolean;
}

interface RawServer {
  severId?: number;
  serverId?: number;
  serverName: string;
  mediaId?: string;
}

interface RawSource {
  url: string;
  isM3u8?: boolean;
  type?: string;
}

interface RawSubtitle {
  file: string;
  label: string;
  kind?: string;
  default?: boolean;
}

interface RawPromoVideo {
  url: string;
  title: string;
  thumbnail: string;
}

interface RawCharacter {
  id: string;
  name: string;
  posterImage: string;
  role: string;
  voiceActor?: {
    id: string;
    name: string;
    posterImage: string;
    language: string;
  };
}

export interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  episode: number;
  url: string;
}

export async function getAnimeSchedule(date: string): Promise<ScheduleItem[]> {
  try {
    const response = await fetch(`/api/agenda?date=${date}`);
    if (!response.ok) {
       throw new Error(`Proxy request failed: ${response.status}`);
    }
    const rawResponse = await response.json();
    return rawResponse?.schedule || [];
  } catch (error) {
    console.error(`Error fetching schedule for ${date}:`, error);
    return [];
  }
}

// Normalized types
export interface Anime {
  id: string;
  name: string;
  jname?: string;
  poster: string;
  rating?: string;
  episodes?: {
    sub?: number;
    dub?: number;
  };
  type?: string;
  duration?: string;
  relation?: string;
}

export interface SpotlightAnime extends Anime {
  rank: number;
  description: string;
  otherInfo?: string[];
}

export interface HomeData {
  spotlightAnimes: SpotlightAnime[];
  trendingAnimes: Anime[];
  latestEpisodeAnimes: Anime[];
  topUpcomingAnimes: Anime[];
  top10Animes: {
    today: Anime[];
    week: Anime[];
    month: Anime[];
  };
  topAiringAnimes: Anime[];
  mostPopularAnimes: Anime[];
  mostFavoriteAnimes: Anime[];
  latestCompletedAnimes: Anime[];
  recentlyAddedAnimes: Anime[];
  genres: string[];
}

export interface AnimeDetails {
  anime: {
    info: {
      id: string;
      name: string;
      poster: string;
      description: string;
      stats: {
        rating?: string;
        quality?: string;
        episodes: { sub: number; dub: number };
        type?: string;
        duration?: string;
      };
      promotionalVideos?: { title: string; source: string; thumbnail: string }[];
      charactersVoiceActors?: { character: { id: string; poster: string; name: string; cast: string }; voiceActor: { id: string; poster: string; name: string; cast: string } | null }[];
    };
    moreInfo: {
      malId?: string;
      japanese?: string;
      synonyms?: string;
      aired?: string;
      premiered?: string;
      duration?: string;
      status?: string;
      malscore?: string;
      genres?: string[];
      studios?: string;
      producers?: string[];
    };
  };
  seasons?: { id: string; name: string; title: string; poster: string; isCurrent: boolean }[];
  mostPopularAnimes?: Anime[];
  relatedAnimes?: Anime[];
  recommendedAnimes?: Anime[];
}

export interface Episode {
  title: string;
  episodeId: string;
  number: number;
  isFiller: boolean;
  hasSub?: boolean;
  hasDub?: boolean;
}

export interface EpisodeData {
  totalEpisodes: number;
  episodes: Episode[];
}

export interface Server {
  serverName: string;
  serverId: string;
}

export interface ServersData {
  sub: Server[];
  dub: Server[];
  raw: Server[];
  episodeId: string;
  episodeNo: number;
}

export interface Source {
  url: string;
  type: string;
}

export interface Subtitle {
  file: string;
  label: string;
  kind: string;
  default?: boolean;
}

export interface SourcesData {
  sources: Source[];
  subtitles: Subtitle[];
  referer?: string;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}
