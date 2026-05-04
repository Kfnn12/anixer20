import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Star, Clock, Calendar, Check, Info, Video, X, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { getAnimeDetails, type AnimeDetails as AnimeDetailsType } from '../api';
import { AnimeCard } from '../components/AnimeCard';
import { Reviews } from '../components/Reviews';
import { useAuth } from '../FirebaseProvider';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AnimeDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string | null>(null);
  const [hasTrailer, setHasTrailer] = useState(false);

  const { user, login } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    if (!data) return;
    
    const info = data.anime.info;
    const moreInfo = data.anime.moreInfo;
    
    if (info.promotionalVideos && info.promotionalVideos.length > 0) {
      let url = info.promotionalVideos[0].source;
      if (url && url.includes('youtube.com/watch?v=')) {
        url = url.replace('watch?v=', 'embed/');
      }
      setActiveTrailerUrl(url);
      setHasTrailer(true);
    } else if (moreInfo.malId) {
      fetch(`https://api.jikan.moe/v4/anime/${moreInfo.malId}`)
        .then(res => res.json())
        .then(jikanData => {
          if (jikanData?.data?.trailer?.embed_url) {
            setActiveTrailerUrl(jikanData.data.trailer.embed_url);
            setHasTrailer(true);
          } else if (jikanData?.data?.trailer?.youtube_id) {
            setActiveTrailerUrl(`https://www.youtube.com/embed/${jikanData.data.trailer.youtube_id}`);
            setHasTrailer(true);
          } else {
            setHasTrailer(false);
          }
        })
        .catch(err => {
          console.log('Failed to fetch trailer from Jikan:', err);
          setHasTrailer(false);
        });
    } else {
      setHasTrailer(false);
    }
  }, [data]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAnimeDetails(id)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setLoading(false);
      });
    
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!user || !id) {
      setIsInWatchlist(false);
      return;
    }
    const checkWatchlist = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'watchlist', id);
        const docSnap = await getDoc(docRef);
        setIsInWatchlist(docSnap.exists());
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/watchlist/${id}`);
      }
    };
    checkWatchlist();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 font-bold">
        Failed to load anime details.
      </div>
    );
  }

  const { anime, relatedAnimes, recommendedAnimes } = data;
  const { info, moreInfo } = anime;

  const handleWatchTrailer = () => {
    if (activeTrailerUrl) {
      setShowTrailer(true);
    }
  };

  const toggleWatchlist = async () => {
    if (!user) {
      await login();
      return;
    }
    if (!id || !data?.anime) return;

    setWatchlistLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid, 'watchlist', id);
      if (isInWatchlist) {
        await deleteDoc(docRef);
        setIsInWatchlist(false);
      } else {
        const currentEps = data.anime.info.stats.episodes.sub || data.anime.info.stats.episodes.dub || 0;
        await setDoc(docRef, {
          userId: user.uid,
          animeId: id,
          title: data.anime.info.name,
          image: data.anime.info.poster,
          type: data.anime.info.stats.type || '',
          latestEpisode: currentEps,
          lastCheckedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        setIsInWatchlist(true);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/watchlist/${id}`);
    } finally {
      setWatchlistLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-16 pt-16">
      {/* Background blur */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] overflow-hidden z-[-1]">
        <img src={info.poster} alt="" className="w-full h-full object-cover opacity-20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start lg:gap-12">
          {/* Poster */}
          <div className="mx-auto w-64 shrink-0 md:mx-0 lg:w-72">
            <div className="overflow-hidden rounded-xl bg-[#111111] shadow-2xl">
              <img src={info.poster} alt={info.name} className="w-full h-auto object-cover" />
            </div>
            
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to={`/watch/${id}`}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#F27D26] px-6 py-4 font-bold text-black transition-transform hover:scale-105"
              >
                <Play className="h-5 w-5 fill-current" />
                Watch Now
              </Link>
              
              {hasTrailer && (
                <button
                  onClick={handleWatchTrailer}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a1a1a] border border-gray-700 px-6 py-3 font-bold text-white transition-colors hover:bg-gray-800"
                >
                  <Video className="h-5 w-5" />
                  Watch Trailer
                </button>
              )}

              <button
                onClick={toggleWatchlist}
                disabled={watchlistLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a1a1a] border border-gray-700 px-6 py-3 font-bold text-white transition-colors hover:bg-[#F27D26] hover:text-black hover:border-transparent disabled:opacity-50"
              >
                {isInWatchlist ? (
                  <>
                    <BookmarkCheck className="h-5 w-5" />
                    In Watchlist
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-5 w-5" />
                    Add to Watchlist
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <Link to="/" className="text-sm text-gray-400 hover:text-white">Home</Link>
              <span className="h-1 w-1 rounded-full bg-gray-600" />
              <span className="text-sm text-gray-400 capitalize">{info.stats.type || 'TV'}</span>
              <span className="h-1 w-1 rounded-full bg-gray-600" />
              <span className="text-sm font-medium text-white">{info.name}</span>
            </div>

            <h1 className="mb-4 text-3xl font-bold text-white md:text-5xl lg:text-6xl leading-tight">
              {info.name}
            </h1>

            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-white">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-semibold">{moreInfo.malscore || info.stats.rating || 'N/A'}</span>
              </div>
              <div className="rounded bg-white/10 px-2 py-1 text-white font-medium">
                {info.stats.quality || 'HD'}
              </div>
              {(info.stats.episodes.sub > 0 || info.stats.episodes.dub > 0) && (
                <div className="flex items-center gap-2 rounded bg-white/10 px-2 py-1 text-white font-medium">
                  {info.stats.episodes.sub > 0 && <span>SUB {info.stats.episodes.sub}</span>}
                  {info.stats.episodes.dub > 0 && <span className="text-gray-400 border-l border-white/20 pl-2">DUB {info.stats.episodes.dub}</span>}
                </div>
              )}
              <div className="text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {info.stats.duration || moreInfo.duration || 'Unknown'}
              </div>
            </div>

            <div className="prose prose-invert mb-8 max-w-none">
              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                {info.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Type:</span>
                  <span className="text-gray-300 capitalize">{info.stats.type || '?'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Studios:</span>
                  <span className="text-gray-300">{moreInfo.studios || '?'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Aired:</span>
                  <span className="text-gray-300">{moreInfo.aired || '?'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Status:</span>
                  <span className="text-gray-300">{moreInfo.status || '?'}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Genres:</span>
                  <div className="flex flex-wrap gap-1">
                    {moreInfo.genres?.map(g => (
                      <Link key={g} to={`/genre/${g.toLowerCase().replace(/\s+/g, '-')}`} className="rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:text-[#F27D26] hover:border-[#F27D26] transition-colors">
                        {g}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Synonyms:</span>
                  <span className="text-gray-300 line-clamp-1">{moreInfo.synonyms || '?'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 text-gray-500 shrink-0">Japanese:</span>
                  <span className="text-gray-300 line-clamp-1">{moreInfo.japanese || '?'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {id && <Reviews animeId={id} />}

        {/* Recommended & Related */}
        {relatedAnimes && relatedAnimes.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide text-white">Related Anime</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {relatedAnimes.slice(0, 24).map((a) => (
                <AnimeCard key={a.id} anime={a} />
              ))}
            </div>
          </div>
        )}
        
        {recommendedAnimes && recommendedAnimes.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide text-white">Recommended for you</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {recommendedAnimes.slice(0, 12).map((a) => (
                <AnimeCard key={a.id} anime={a} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && activeTrailerUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-5xl aspect-video rounded-lg shadow-2xl">
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute -top-12 right-0 text-white hover:text-[#F27D26]"
            >
              <X size={32} />
            </button>
            <div className="w-full h-full bg-black rounded-lg overflow-hidden">
              <iframe
                src={activeTrailerUrl}
                title="Trailer"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>
          <button 
            className="absolute inset-0 z-[-1]" 
            onClick={() => setShowTrailer(false)}
          />
        </div>
      )}
    </div>
  );
}
