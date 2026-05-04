import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getAZList } from '../api';
import { AnimeCard } from '../components/AnimeCard';

const letters = ['All', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export function AZListPage() {
  const { letter } = useParams<{ letter: string }>();
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const { ref, inView } = useInView();

  const currentSort = letter === 'all' ? 'all' : letter === '0-9' ? '0-9' : letter?.toUpperCase();

  useEffect(() => {
    setAnimes([]);
    setPage(1);
    setHasNextPage(false);
  }, [letter]);

  useEffect(() => {
    if (!currentSort) return;
    
    setLoading(true);
    getAZList(currentSort, page)
      .then((res) => {
        setAnimes((prev) => (page === 1 ? res.animes : [...prev, ...res.animes]));
        setHasNextPage(res.hasNextPage);
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setLoading(false);
      });
  }, [currentSort, page]);
  
  useEffect(() => {
    if (inView && hasNextPage && !loading) {
      setPage((p) => p + 1);
    }
  }, [inView, hasNextPage, loading]);

  return (
    <div className="min-h-screen pb-16 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white text-center md:text-left mb-6">
          A-Z List: {letter?.toUpperCase()}
        </h1>
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {letters.map((l) => {
            const path = l === 'All' ? '/az-list/all' : l === '#' ? '/az-list/0-9' : `/az-list/${l}`;
            const isActive = (l === 'All' && letter === 'all') || (l === '#' && letter === '0-9') || (l.toLowerCase() === letter?.toLowerCase());
            return (
              <Link
                key={l}
                to={path}
                className={`w-10 h-10 flex items-center justify-center rounded transition-colors font-medium text-sm ${isActive ? 'bg-[#F27D26] text-black' : 'bg-[#1a1a1a] text-white hover:bg-[#F27D26] hover:text-black'}`}
              >
                {l}
              </Link>
            );
          })}
        </div>
      </div>

      {animes.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-8">
            {animes.map((anime, index) => (
              <AnimeCard key={`${anime.id}-${index}`} anime={anime} />
            ))}
          </div>
          {hasNextPage && (
            <div ref={ref} className="flex justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
            </div>
          )}
        </>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center text-gray-400">
          <p className="text-lg">No animes found for this letter.</p>
        </div>
      )}
    </div>
  );
}
