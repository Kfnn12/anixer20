import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import { getGenre } from '../api';
import { AnimeCard } from '../components/AnimeCard';

export function GenrePage() {
  const { genre } = useParams<{ genre: string }>();
  const [animes, setAnimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const { ref, inView } = useInView();

  useEffect(() => {
    setAnimes([]);
    setPage(1);
    setHasNextPage(false);
  }, [genre]);

  useEffect(() => {
    if (!genre) return;
    
    setLoading(true);
    // Convert to lowercase and replace spaces with hyphens for the API endpoint
    const formattedGenre = genre.toLowerCase().replace(/\s+/g, '-');
    
    getGenre(formattedGenre, page)
      .then((res) => {
        setAnimes((prev) => (page === 1 ? res.animes : [...prev, ...res.animes]));
        setHasNextPage(res.hasNextPage);
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setLoading(false);
      });
  }, [genre, page]);
  
  useEffect(() => {
    if (inView && hasNextPage && !loading) {
      setPage((p) => p + 1);
    }
  }, [inView, hasNextPage, loading]);

  return (
    <div className="min-h-screen pb-16 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white text-center md:text-left mb-6 capitalize">
          Genre: {genre?.replace(/-/g, ' ')}
        </h1>
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
          <p className="text-lg">No animes found for this genre.</p>
        </div>
      )}
    </div>
  );
}
