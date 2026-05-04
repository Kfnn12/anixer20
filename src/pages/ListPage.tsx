import { useEffect, useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getGridData, type Anime } from '../api';
import { AnimeCard } from '../components/AnimeCard';
import { ArrowDownAZ, ArrowDownZA, Calendar, Star, Clock } from 'lucide-react';

export function ListPage() {
  const { type } = useParams<{ type: string }>();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const { ref, inView } = useInView();
  
  // Sort state
  type SortOption = 'default' | 'name_az' | 'name_za' | 'rating' | 'release_date';
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const titles: Record<string, string> = {
    'trending': 'Trending Now',
    'recent': 'Recently Updated',
    'upcoming': 'Top Upcoming',
    'popular': 'Most Popular',
    'movies': 'Movies',
    'tv': 'TV Series',
  };

  const title = type ? titles[type] : null;

  useEffect(() => {
    setAnimes([]);
    setPage(1);
    setHasNextPage(false);
    setTotalPages(1);
    setSortBy('default');
  }, [type]);

  useEffect(() => {
    if (!type) return;
    setLoading(true);
    getGridData(type, page)
      .then((res) => {
        if (type === 'recent') {
          setAnimes(res.animes);
        } else {
          setAnimes((prev) => {
            const newAnimes = res.animes.filter(a => !prev.find(p => p.id === a.id));
            return page === 1 ? res.animes : [...prev, ...newAnimes];
          });
        }
        setHasNextPage(res.hasNextPage);
        setTotalPages(res.totalPages);
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setLoading(false);
      });
  }, [type, page]);

  useEffect(() => {
    if (type !== 'recent' && inView && hasNextPage && !loading) {
      setPage((p) => p + 1);
    }
  }, [inView, hasNextPage, loading, type]);

  // Client-side sort of displayed items
  const displayedAnimes = useMemo(() => {
    if (sortBy === 'default') return animes;
    
    return [...animes].sort((a, b) => {
      switch (sortBy) {
        case 'name_az':
          return a.name.localeCompare(b.name);
        case 'name_za':
          return b.name.localeCompare(a.name);
        case 'rating': 
          const ratingA = a.rating ? String(a.rating) : '';
          const ratingB = b.rating ? String(b.rating) : '';
          return ratingB.localeCompare(ratingA, undefined, { numeric: true });
        case 'release_date':
          // API might not give release date in grid, but we sort if it's there
          // fall back to relation or ID length or just duration as a proxy if we must
          // We will attempt to sort by 'duration' if 'releaseDate' isn't explicitly there since we lack it, 
          // but we won't crash if it's missing.
          const dateA = (a as any).releaseDate || (a as any).releaseYear || a.duration || '';
          const dateB = (b as any).releaseDate || (b as any).releaseYear || b.duration || '';
          return String(dateB).localeCompare(String(dateA));
        default:
          return 0;
      }
    });
  }, [animes, sortBy]);

  if (!title) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen pb-16 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white text-center md:text-left uppercase tracking-wide">
          {title}
        </h1>
        
        {/* Sort Controls */}
        <div className="flex items-center gap-3 self-center md:self-auto bg-[#1a1a1a] p-1.5 rounded-lg border border-gray-800">
           <button 
             onClick={() => setSortBy('default')}
             className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === 'default' ? 'bg-[#F27D26] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
           >
             Default
           </button>
           <button 
             onClick={() => setSortBy('name_az')}
             title="Sort A-Z"
             className={`p-1.5 rounded-md transition-colors ${sortBy === 'name_az' ? 'bg-[#F27D26] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
           >
             <ArrowDownAZ size={18} />
           </button>
           <button 
             onClick={() => setSortBy('name_za')}
             title="Sort Z-A"
             className={`p-1.5 rounded-md transition-colors ${sortBy === 'name_za' ? 'bg-[#F27D26] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
           >
             <ArrowDownZA size={18} />
           </button>
           <button 
             onClick={() => setSortBy('rating')}
             title="Sort by Rating"
             className={`p-1.5 rounded-md transition-colors ${sortBy === 'rating' ? 'bg-[#F27D26] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
           >
             <Star size={18} />
           </button>
           <button 
             onClick={() => setSortBy('release_date')}
             title="Sort by Release Date"
             className={`p-1.5 rounded-md transition-colors ${sortBy === 'release_date' ? 'bg-[#F27D26] text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
           >
             <Calendar size={18} />
           </button>
        </div>
      </div>

      {displayedAnimes.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-8">
            {displayedAnimes.map((anime, index) => (
              <AnimeCard key={`${anime.id}-${index}`} anime={anime} />
            ))}
          </div>
          {type === 'recent' ? (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded bg-[#1a1a1a] px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center px-4 font-medium text-gray-400">
                Page {page} of {totalPages}
              </div>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="rounded bg-[#F27D26] px-4 py-2 font-medium text-black transition-colors hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          ) : hasNextPage ? (
            <div ref={ref} className="flex justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
            </div>
          ) : null}
        </>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center text-gray-400">
          <p className="text-lg">No animes found.</p>
        </div>
      )}
    </div>
  );
}
