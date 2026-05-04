import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { searchAnime } from '../api';
import { AnimeCard } from '../components/AnimeCard';

export function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const { ref, inView } = useInView();

  useEffect(() => {
    setAnimes([]);
    setPage(1);
    setHasNextPage(false);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setAnimes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchAnime(query, page)
      .then((res) => {
        setAnimes((prev) => (page === 1 ? res.animes : [...prev, ...res.animes]));
        setHasNextPage(res.hasNextPage);
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setLoading(false);
      });
  }, [query, page]);

  useEffect(() => {
    if (inView && hasNextPage && !loading) {
      setPage((p) => p + 1);
    }
  }, [inView, hasNextPage, loading]);

  return (
    <div className="min-h-screen pb-16 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <h1 className="mb-8 text-2xl font-bold text-white text-center md:text-left">
        {query ? `Search Results for "${query}"` : 'Search Anime'}
      </h1>

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
          <p className="text-lg">No results found for "{query}"</p>
          <p className="mt-2 text-sm">Try using different keywords.</p>
        </div>
      )}
    </div>
  );
}
