import { Play, Star, Clock, Captions, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Anime } from '../api';

interface AnimeCardProps {
  anime: Anime;
  rank?: number;
}

export function AnimeCard({ anime, rank }: AnimeCardProps) {
  return (
    <Link to={`/anime/${anime.id}`} className="group relative flex flex-col gap-2 rounded-lg transition-all duration-300">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
        <img
          src={anime.poster}
          alt={anime.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {rank && (
          <div className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#F27D26] text-sm font-bold text-white shadow-lg">
            #{rank}
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {anime.episodes?.sub != null && anime.episodes.sub > 0 && (
            <div className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <Captions className="h-3 w-3 text-green-400" />
              {anime.episodes.sub}
            </div>
          )}
          {anime.episodes?.dub != null && anime.episodes.dub > 0 && (
            <div className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <Mic className="h-3 w-3 text-cyan-400" />
              {anime.episodes.dub}
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F27D26] shadow-lg shadow-[#F27D26]/30 transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-1 h-6 w-6 fill-white text-white" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 text-sm font-medium text-white transition-colors group-hover:text-[#F27D26]">
          {anime.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-secondary text-[#8E9299]">
          <span className="capitalize">{anime.type || 'TV'}</span>
          {anime.duration && (
            <>
              <span className="h-1 w-1 rounded-full bg-[#8E9299]" />
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {anime.duration}
              </div>
            </>
          )}
          {anime.relation && (
            <>
              <span className="h-1 w-1 rounded-full bg-[#8E9299]" />
              <span className="capitalize text-[#F27D26]">{anime.relation}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
