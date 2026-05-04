import { useEffect, useState } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getHome, type HomeData, type SpotlightAnime } from '../api';
import { AnimeCard } from '../components/AnimeCard';
import { HomeSchedule } from '../components/HomeSchedule';
import { ContinueWatching } from '../components/ContinueWatching';

export function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSpotlight, setActiveSpotlight] = useState(0);

  useEffect(() => {
    getHome().then((res) => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.warn("Home API failed:", err.message);
      setError("Failed to load anime data. The API might be down.");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!data?.spotlightAnimes?.length) return;
    const interval = setInterval(() => {
      setActiveSpotlight((prev) => (prev + 1) % data.spotlightAnimes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [data]);

  if (loading || (!data && !error)) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  const spotlight = data!.spotlightAnimes[activeSpotlight];

  return (
    <div className="pb-16 pt-16">
      {/* Hero Section */}
      {spotlight && (
        <div className="relative h-[70vh] min-h-[500px] w-full bg-black">
          <div className="absolute inset-0">
            <img
              src={spotlight.poster}
              alt={spotlight.name}
              className="h-full w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent" />
          </div>

          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl">
                <div className="mb-4 inline-block font-mono text-sm font-bold tracking-wider text-[#F27D26]">
                  #{spotlight.rank} SPOTLIGHT
                </div>
                <h1 className="mb-4 text-4xl font-black uppercase leading-tight tracking-tight text-white sm:text-6xl text-shadow-xl" style={{ fontFamily: '"Anton", sans-serif' }}>
                  {spotlight.name}
                </h1>
                
                <div className="mb-6 flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300">
                  <div className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    <span>{spotlight.otherInfo?.find(i => ['TV', 'Movie', 'OVA', 'ONA'].includes(i)) || 'TV'}</span>
                  </div>
                  {spotlight.duration && (
                    <div className="flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-gray-500" />
                      <span>{spotlight.duration}</span>
                    </div>
                  )}
                  {spotlight.otherInfo?.find(i => ['HD', 'SD'].includes(i)) && (
                    <div className="rounded bg-white/20 px-2 py-0.5 text-xs text-white">
                      HD
                    </div>
                  )}
                </div>

                <p className="mb-8 line-clamp-3 text-lg text-gray-400">
                  {spotlight.description}
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    to={`/anime/${spotlight.id}`}
                    className="flex items-center gap-2 rounded-full bg-[#F27D26] px-8 py-3 font-semibold text-black transition-transform hover:scale-105"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Watch Now
                  </Link>
                  <Link
                    to={`/anime/${spotlight.id}`}
                    className="flex items-center gap-2 rounded-full bg-[#111111] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#1a1a1a]"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ContinueWatching />
        <Section title="Trending Now" items={data.trendingAnimes} viewAllLink="/grid/trending" />
        <Section title="Recently Updated" items={data.latestEpisodeAnimes} viewAllLink="/grid/recent" />
        <HomeSchedule />
        <Section title="Top Upcoming" items={data.topUpcomingAnimes} viewAllLink="/grid/upcoming" />
        <Section title="Most Popular" items={data.mostPopularAnimes} viewAllLink="/grid/popular" />
        <Section title="Most Favorite" items={data.mostFavoriteAnimes} />
        <Section title="Recommended For You" items={data.topAiringAnimes} />
      </div>
    </div>
  );
}

function Section({ title, items, viewAllLink }: { title: string; items: any[]; viewAllLink?: string }) {
  if (!items?.length) return null;
  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-white">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-sm font-medium text-gray-400 hover:text-[#F27D26] transition-colors flex items-center gap-1 group">
            View all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} />
        ))}
      </div>
    </div>
  );
}
