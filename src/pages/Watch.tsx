import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Flag, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Hls from 'hls.js';
import { useAuth } from '../FirebaseProvider';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { 
  getAnimeDetails, 
  getAnimeEpisodes, 
  getEpisodeServers, 
  getEpisodeSources,
  getM3U8ProxyUrl,
  switchToNextProxy,
  type Episode,
  type Server,
  type Source,
  type Subtitle
} from '../api';

const ServerSelection = memo(({ 
  currentEp, 
  servers, 
  activeCategory, 
  activeServer, 
  onSelectServer 
}: {
  currentEp?: Episode,
  servers: {sub: Server[], dub: Server[], raw: Server[]},
  activeCategory: string,
  activeServer: string,
  onSelectServer: (cat: string, server: string) => void
}) => {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-white mb-4">You are watching: {currentEp?.title}</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        {(['sub', 'dub', 'raw'] as const).map((cat) => (
          servers[cat]?.length > 0 && (
            <div key={cat} className="flex gap-2 p-2 bg-[#111111] rounded border border-[#1a1a1a] items-center">
              <span className="font-semibold text-gray-400 capitalize px-2">{cat}</span>
              {servers[cat].map(s => (
                <button 
                  key={s.serverName}
                  onClick={() => onSelectServer(cat, s.serverName)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    activeCategory === cat && activeServer === s.serverName
                      ? 'bg-[#F27D26] text-black font-bold'
                      : 'bg-[#1a1a1a] text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {s.serverName}
                </button>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
});
ServerSelection.displayName = 'ServerSelection';

const EpisodeSidebar = memo(({ 
  episodes, 
  currentEpIndex, 
  setCurrentEpIndex 
}: { 
  episodes: Episode[], 
  currentEpIndex: number, 
  setCurrentEpIndex: (idx: number) => void 
}) => {
  const episodesContainerRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: episodes.length,
    getScrollElement: () => episodesContainerRef.current,
    estimateSize: () => 80, // estimated height of an episode item
    overscan: 5,
  });

  useEffect(() => {
    if (episodes.length > 0 && currentEpIndex >= 0) {
      rowVirtualizer.scrollToIndex(currentEpIndex, { align: 'center' });
    }
  }, [currentEpIndex, episodes.length, rowVirtualizer]);

  return (
    <div className="w-full lg:w-80 lg:min-h-screen max-h-screen bg-[#0a0a0a] border-l border-[#1a1a1a] p-4 flex flex-col">
      <h3 className="text-white font-bold flex-shrink-0 mb-4 flex items-center justify-between">
        Episodes
        <span className="text-gray-500 font-normal text-sm">{episodes.length} Episodes</span>
      </h3>
      <div ref={episodesContainerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const idx = virtualItem.index;
            const ep = episodes[idx];
            const isActive = currentEpIndex === idx;
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '8px',
                }}
              >
                <button
                  onClick={() => setCurrentEpIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-all border flex items-start gap-3 group ${
                    isActive
                      ? 'bg-[#1a1a1a] border-[#F27D26] text-white border-l-4 shadow-md'
                      : 'bg-transparent hover:bg-[#111111] border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className={`mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${isActive ? 'bg-[#F27D26]/20 text-[#F27D26]' : 'bg-[#1a1a1a] text-gray-500 group-hover:bg-[#222]'}`}>
                    {isActive ? <Play size={12} fill="currentColor" /> : <span className="font-mono text-[10px]">{ep.number}</span>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono text-xs font-bold ${isActive ? 'text-[#F27D26]' : 'text-gray-500'}`}>
                        Episode {ep.number}
                      </span>
                      {ep.isFiller && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-orange-900/30 text-orange-500 rounded">Filler</span>
                      )}
                    </div>
                    <div className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-medium text-white' : 'text-gray-400'}`} title={ep.title}>
                      {ep.title}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
EpisodeSidebar.displayName = 'EpisodeSidebar';

export interface ThumbnailData {
  start: number;
  end: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

async function fetchThumbnailsData(vttUrl: string, referer?: string): Promise<ThumbnailData[]> {
  try {
    const proxiedVttUrl = getM3U8ProxyUrl(vttUrl, referer);
    const res = await fetch(proxiedVttUrl);
    const text = await res.text();
    const basePath = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);
    
    const lines = text.split('\n');
    const thumbnails: ThumbnailData[] = [];
    
    let currentStart = 0;
    let currentEnd = 0;

    const parseTime = (timeStr: string) => {
      const parts = timeStr.split(':');
      let secs = 0;
      if (parts.length === 3) {
        secs = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        secs = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return secs;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('-->')) {
            const [start, end] = line.split('-->').map(s => s.trim());
            currentStart = parseTime(start);
            currentEnd = parseTime(end);
        } else if (line.includes('#xywh=')) {
            const [urlPart, xywhPart] = line.split('#xywh=');
            const [x, y, w, h] = xywhPart.split(',').map(Number);
            const absoluteUrl = urlPart.startsWith('http') ? urlPart : basePath + urlPart;
            thumbnails.push({
                start: currentStart,
                end: currentEnd,
                url: getM3U8ProxyUrl(absoluteUrl, referer),
                x, y, w, h
            });
        }
    }
    return thumbnails;
  } catch(e) {
    console.error("Failed to parse thumbnails VTT", e);
    return [];
  }
}

export function Watch() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const epFromParams = searchParams.get('ep');

  const { user } = useAuth();
  const lastSaveTimeRef = useRef<number>(0);
  const initialTimeRef = useRef<number>(0);
  const animeDetailsRef = useRef<any>(null); // To keep full title/image
  const hasLoadedSavedProgressRef = useRef(false);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpError, setActiveEpError] = useState<string | null>(null);
  
  // Episode Selection State
  const [currentEpIndex, setCurrentEpIndex] = useState<number>(0);
  const currentEp = episodes[currentEpIndex];
  
  // Auto-play State
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);

  // Server & Sources State
  const [servers, setServers] = useState<{sub: Server[], dub: Server[], raw: Server[]}>({sub: [], dub: [], raw: []});
  const [activeServer, setActiveServer] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'sub' | 'dub' | 'raw'>('sub');
  
  const [sources, setSources] = useState<Source[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [referer, setReferer] = useState<string | undefined>(undefined);
  const [introInfo, setIntroInfo] = useState<{ start: number; end: number } | undefined>(undefined);
  const [outroInfo, setOutroInfo] = useState<{ start: number; end: number } | undefined>(undefined);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Video Player Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const wasPlayingRef = useRef(false);

  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Time formatter
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name !== 'AbortError') console.log('Play prevented:', error);
          });
        }
      } else {
        videoRef.current.pause();
      }
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curTime = videoRef.current.currentTime;
      const dur = videoRef.current.duration;
      setCurrentTime(curTime);
      if (!isScrubbing) {
        setProgress((curTime / dur) * 100);
      }

      if (user && id && currentEp && animeDetailsRef.current && (Date.now() - lastSaveTimeRef.current > 5000)) {
        lastSaveTimeRef.current = Date.now();
        const docRef = doc(db, 'users', user.uid, 'watchProgress', id);
        
        // Don't save if we watched the whole thing (e.g. >95%) to keep watchlist clean,
        // actually wait, let's keep it to say we finished the latest episode watched.
        const currentEps = animeDetailsRef.current?.info?.stats?.episodes?.sub || animeDetailsRef.current?.info?.stats?.episodes?.dub || 0;
        setDoc(docRef, {
          userId: user.uid,
          animeId: id,
          title: animeDetailsRef.current.info.name,
          image: animeDetailsRef.current.info.poster,
          episodeId: currentEp.episodeId,
          episodeNumber: currentEp.number,
          currentTime: curTime,
          duration: dur,
          latestEpisode: currentEps,
          lastCheckedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/watchProgress/${id}`);
        });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate;
      
      // Resume from saved progress if available for this session
      if (initialTimeRef.current > 0 && initialTimeRef.current < videoRef.current.duration) {
        videoRef.current.currentTime = initialTimeRef.current;
        initialTimeRef.current = 0; // Clear it so it only applies once
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(Number(e.target.value));
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
    if (videoRef.current && !videoRef.current.paused) {
      wasPlayingRef.current = true;
      videoRef.current.pause();
    } else {
      wasPlayingRef.current = false;
    }
  };

  const handleScrubEnd = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsScrubbing(false);
    const seekTime = (progress / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      if (wasPlayingRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const hoverProg = (x / rect.width) * 100;
    const hoverSeconds = Math.max(0, (hoverProg / 100) * duration);
    setHoverProgress(hoverProg);
    setHoverTime(hoverSeconds);
    setHoverX(x);
  };
  
  const handleMouseLeave = () => {
    setHoverProgress(null);
    setHoverTime(null);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (!newMuted && volume === 0) {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 1. Initial Load: Get Episodes
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const loadData = async () => {
      try {
        const [detailsRes, episodesRes] = await Promise.all([
          getAnimeDetails(id),
          getAnimeEpisodes(id)
        ]);

        if (detailsRes?.anime) {
          animeDetailsRef.current = detailsRes.anime;
        }

        const eps = episodesRes.episodes;
        setEpisodes(eps);

        let initialIndex = 0;

        if (user && !hasLoadedSavedProgressRef.current) {
          hasLoadedSavedProgressRef.current = true;
          try {
            const docRef = doc(db, 'users', user.uid, 'watchProgress', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              // If we deep-linked to an ep, check if it matches the saved one
              const targetEpId = epFromParams || data.episodeId;
              
              if (targetEpId === data.episodeId) {
                 initialTimeRef.current = data.currentTime || 0;
              }

              if (!epFromParams) {
                const epIndex = eps.findIndex(e => e.episodeId === data.episodeId);
                if (epIndex !== -1) initialIndex = epIndex;
              }
            }
          } catch (err) {
            console.error('Error fetching watch progress:', err);
          }
        }

        if (epFromParams) {
          const index = eps.findIndex(e => e.episodeId === epFromParams);
          if (index !== -1) initialIndex = index;
        }

        if (eps.length > 0) {
          setCurrentEpIndex(initialIndex);
        } else {
          setActiveEpError('No episodes found for this anime.');
          setLoading(false);
        }
      } catch (err) {
        console.warn(err);
        setActiveEpError('Failed to fetch episodes.');
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, user]); // Note: excluding epFromParams so it only runs on mount/id change

  // Handle countdown
  useEffect(() => {
    if (autoPlayCountdown === null) return;

    if (autoPlayCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoPlayCountdown(prev => prev! - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setAutoPlayCountdown(null);
      setCurrentEpIndex(prev => prev + 1);
    }
  }, [autoPlayCountdown]);

  // Reset countdown if user manually changes episode
  useEffect(() => {
    setAutoPlayCountdown(null);
  }, [currentEpIndex]);

  // 2. Load Servers for Selected Episode
  useEffect(() => {
    if (!currentEp) return;
    setLoading(true);
    setActiveEpError(null);
    setSources([]);
    setSearchParams({ ep: currentEp.episodeId }, { replace: true });

    getEpisodeServers(currentEp.episodeId)
      .then((res) => {
        setServers({ sub: res.sub, dub: res.dub, raw: res.raw });
        
        let initialCat: 'sub' | 'dub' | 'raw' = 'sub';
        let initialServer = '';

        if (res.sub.length > 0) {
          initialCat = 'sub';
          initialServer = res.sub[0].serverName;
        } else if (res.dub.length > 0) {
          initialCat = 'dub';
          initialServer = res.dub[0].serverName;
        } else if (res.raw.length > 0) {
          initialCat = 'raw';
          initialServer = res.raw[0].serverName;
        }

        if (initialServer) {
          setActiveCategory(initialCat);
          setActiveServer(initialServer);
        } else {
          setActiveEpError('No servers available for this episode.');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn(err);
        setActiveEpError('Failed to fetch servers.');
        setLoading(false);
      });
  }, [currentEp]);

  // 3. Load Sources from Active Server
  useEffect(() => {
    if (!currentEp || !activeServer || !activeCategory) return;
    setLoading(true);
    setActiveEpError(null);

    getEpisodeSources(currentEp.episodeId, activeCategory, activeServer.toLowerCase())
      .then((res) => {
        setSources(res.sources);
        setSubtitles(res.subtitles);
        setReferer(res.referer);
        setIntroInfo(res.intro);
        setOutroInfo(res.outro);
        
        const thumbTrack = res.subtitles.find((s: any) => s.kind === 'thumbnails');
        if (thumbTrack && thumbTrack.file) {
           fetchThumbnailsData(thumbTrack.file, res.referer).then(setThumbnails);
        } else {
           setThumbnails([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn(err);
        setActiveEpError('Failed to fetch source from this server.');
        setSources([]);
        setIntroInfo(undefined);
        setOutroInfo(undefined);
        setLoading(false);
      });
  }, [currentEp, activeServer, activeCategory]);

  // 4. Initialize HLS Player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sources.length) return;

    const source = sources.find(s => s.type === 'hls')?.url || sources[0].url;

    let hls: Hls | null = null;
    let fallbackLevel = 0;
    let fragmentFallback = 0;

    const initPlayer = (streamUrl: string) => {
      if (hls) {
        hls.destroy();
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          maxBufferSize: 0,
          maxBufferLength: 30,
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
           const p = video.play();
           if (p !== undefined) p.catch(e => { if (e.name !== 'AbortError') console.log('Auto-play blocked'); });
        });
        
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('Fatal network error encountered', data);
                if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
                   if (fallbackLevel < 4) {
                      fallbackLevel++;
                      if (fallbackLevel > 1) {
                          switchToNextProxy();
                      }
                      console.log(`Trying proxy ${fallbackLevel}...`);
                      setTimeout(() => initPlayer(getM3U8ProxyUrl(source, referer)), 100);
                   } else {
                      setActiveEpError('Network error while loading video. Server might be blocked by CORS or down.');
                      if (hls) hls.destroy();
                   }
                } else {
                   // For other network errors (like segments), try to recover a few times
                   if (fragmentFallback < 5) {
                      fragmentFallback++;
                      setTimeout(() => {
                         if (hls) hls.startLoad();
                      }, 1000);
                   } else {
                      setActiveEpError('Stream interrupted. Please refresh or try another server.');
                      if (hls) hls.destroy();
                   }
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error encountered, try to recover');
                if (hls) hls.recoverMediaError();
                break;
              default:
                console.error('Fatal streaming error', data);
                setActiveEpError('Fatal streaming error. Please try another server.');
                if (hls) hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        
        const onNativeError = () => {
           if (fallbackLevel < 4) {
               fallbackLevel++;
               if (fallbackLevel > 1) {
                   switchToNextProxy();
               }
               console.log(`Trying proxy ${fallbackLevel}...`);
               video.src = getM3U8ProxyUrl(source, referer);
           } else {
               setActiveEpError('Video playback error. Please try another server.');
           }
        };
        video.addEventListener('loadedmetadata', () => {
          const p = video.play();
          if (p !== undefined) p.catch(e => { if (e.name !== 'AbortError') console.log('Auto-play blocked'); });
        });
        video.addEventListener('error', onNativeError);
      }
    };

    // Start with proxied source immediately since direct usually fails CORS
    initPlayer(getM3U8ProxyUrl(source, referer));

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [sources, referer]);


  return (
    <div className="min-h-screen pt-16 flex flex-col lg:flex-row">
      <div className="flex-1 px-4 lg:px-8 py-8">
        <div 
          ref={playerContainerRef} 
          className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-8 shadow-2xl relative border border-[#1a1a1a] group"
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
          onTouchStart={resetControlsTimeout}
        >
          {loading && !sources.length && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
             </div>
          )}
          {activeEpError && (
             <div className="absolute inset-0 flex items-center justify-center z-10 text-red-500 bg-black/90 p-4 text-center">
                {activeEpError}
             </div>
          )}
          <video 
            ref={videoRef} 
            className="w-full h-full cursor-pointer" 
            crossOrigin="anonymous"
            playsInline
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(e) => {
              const tgt = e.target as HTMLVideoElement;
              setVolume(tgt.volume);
              setIsMuted(tgt.muted);
            }}
            onEnded={() => {
              if (isAutoPlayEnabled && currentEpIndex + 1 < episodes.length) {
                setAutoPlayCountdown(5);
              }
            }}
          >
            {subtitles && subtitles.map((sub, idx) => (
               <track 
                 key={idx}
                 kind={sub.kind}
                 label={sub.label}
                 src={sub.file}
                 srcLang={sub.label}
                 default={sub.default}
               />
            ))}
          </video>
          
          {/* Skip Intro / Outro Buttons */}
          {introInfo && currentTime >= introInfo.start && currentTime <= introInfo.end && (
            <button 
              onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = introInfo.end; }}
              className={`absolute bottom-24 right-8 z-30 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-lg font-bold transition-opacity duration-300 text-sm uppercase tracking-wider flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              Skip Intro
            </button>
          )}

          {outroInfo && currentTime >= outroInfo.start && currentTime <= outroInfo.end && (
            <button 
              onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = outroInfo.end; }}
              className={`absolute bottom-24 right-8 z-30 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-lg font-bold transition-opacity duration-300 text-sm uppercase tracking-wider flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              Skip Outro
            </button>
          )}

          {/* Custom Controls Overlays */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${(showControls || autoPlayCountdown !== null) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex flex-col gap-2">
              <div 
                className="relative w-full h-4 flex items-center group/progress cursor-pointer" 
                ref={progressBarRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {hoverProgress !== null && hoverTime !== null && (
                  <div 
                    className="absolute bottom-6 pointer-events-none transform -translate-x-1/2 flex flex-col items-center z-50"
                    style={{ left: `${hoverProgress}%` }}
                  >
                    {thumbnails.length > 0 && (
                      (() => {
                        const thumb = thumbnails.find(t => hoverTime >= t.start && hoverTime < t.end);
                        if (thumb) {
                          return (
                            <div 
                              className="mb-1 border-2 border-white rounded shadow-xl bg-black" 
                              style={{ 
                                width: thumb.w, 
                                height: thumb.h,
                                backgroundImage: `url("${thumb.url}")`,
                                backgroundPosition: `-${thumb.x}px -${thumb.y}px`,
                                backgroundRepeat: 'no-repeat'
                              }}
                            />
                          );
                        }
                        return null;
                      })()
                    )}
                    <span className="bg-black/80 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap shadow-md">
                      {formatTime(hoverTime)}
                    </span>
                  </div>
                )}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.1"
                  value={progress || 0} 
                  onChange={handleSeek}
                  onMouseDown={handleScrubStart}
                  onMouseUp={handleScrubEnd}
                  onTouchStart={handleScrubStart}
                  onTouchEnd={handleScrubEnd}
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                />
                <div className="w-full h-1 bg-gray-600 rounded-lg overflow-hidden group-hover/progress:h-1.5 transition-all">
                  <div className="h-full bg-[#f27d26]" style={{ width: `${progress}%` }} />
                </div>
                {hoverProgress !== null && (
                  <div className="absolute top-1/2 transform -translate-y-1/2 h-1 group-hover/progress:h-1.5 bg-white/30 pointer-events-none rounded-lg" style={{ left: 0, width: `${hoverProgress}%` }} />
                )}
                <div className="absolute top-1/2 transform -translate-y-1/2 h-3 w-3 bg-[#f27d26] rounded-full pointer-events-none opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `calc(${progress}% - 6px)` }} />
              </div>
              <div className="flex items-center justify-between text-white mt-2">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => { if (currentEpIndex > 0) setCurrentEpIndex(currentEpIndex - 1); }} 
                    disabled={currentEpIndex === 0} 
                    className={`hover:text-[#F27D26] transition-colors ${currentEpIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    aria-label="Previous Episode"
                    title="Previous Episode"
                  >
                    <SkipBack size={20} fill="currentColor" />
                  </button>
                  <button onClick={skipBackward} className="hover:text-[#F27D26] transition-colors" aria-label="Rewind 10 seconds" title="Rewind 10 seconds">
                    <Rewind size={20} fill="currentColor" />
                  </button>
                  <button onClick={togglePlay} className="hover:text-[#F27D26] transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button onClick={skipForward} className="hover:text-[#F27D26] transition-colors" aria-label="Fast Forward 10 seconds" title="Fast Forward 10 seconds">
                    <FastForward size={20} fill="currentColor" />
                  </button>
                  <button 
                    onClick={() => { if (currentEpIndex < episodes.length - 1) setCurrentEpIndex(currentEpIndex + 1); }} 
                    disabled={currentEpIndex === episodes.length - 1} 
                    className={`hover:text-[#F27D26] transition-colors ${currentEpIndex === episodes.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    aria-label="Next Episode"
                    title="Next Episode"
                  >
                    <SkipForward size={20} fill="currentColor" />
                  </button>
                  <div className="flex items-center gap-2 group/volume relative">
                    <button onClick={toggleMute} className="hover:text-[#F27D26] transition-colors" aria-label="Toggle Mute">
                      {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={isMuted ? 0 : volume} 
                      onChange={handleVolumeChange}
                      className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-[#F27D26] hidden md:block hover:h-1.5 transition-all outline-none"
                      style={{ background: `linear-gradient(to right, #F27D26 ${(isMuted ? 0 : volume) * 100}%, #4b5563 ${(isMuted ? 0 : volume) * 100}%)` }}
                      aria-label="Volume"
                    />
                  </div>
                  <div className="text-xs font-mono select-none">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)} 
                    className={`text-xs font-bold px-2 py-1 rounded transition border ${isAutoPlayEnabled ? 'bg-[#F27D26] text-black border-[#F27D26]' : 'bg-[#1a1a1a] text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                    aria-label="Toggle Auto-Play"
                    title="Auto-Play Next Episode"
                  >
                    Auto-Play: {isAutoPlayEnabled ? 'ON' : 'OFF'}
                  </button>
                  <div className="relative group/speed" onMouseLeave={() => setShowSpeedMenu(false)}>
                    <button 
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                      className="text-xs font-bold bg-[#1a1a1a] px-2 py-1 rounded hover:bg-gray-700 transition border border-gray-700 h-full flex items-center justify-center min-w-[40px]"
                      aria-label="Playback Speed"
                    >
                      {playbackRate}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col w-20 z-50">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].reverse().map(rate => (
                          <button
                            key={rate}
                            onClick={() => {
                              setPlaybackRate(rate);
                              if (videoRef.current) {
                                videoRef.current.playbackRate = rate;
                              }
                              setShowSpeedMenu(false);
                            }}
                            className={`px-3 py-2 text-xs font-bold text-center hover:bg-gray-700 transition-colors ${playbackRate === rate ? 'text-[#F27D26] bg-gray-800' : 'text-gray-300'}`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                        alert('Issue reported. Thank you for your feedback!');
                    }} 
                    className="hover:text-[#F27D26] transition-colors" 
                    title="Report Issue"
                    aria-label="Report Issue"
                  >
                    <Flag size={20} />
                  </button>
                  <button onClick={toggleFullscreen} className="hover:text-[#F27D26] transition-colors" aria-label="Fullscreen">
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {autoPlayCountdown !== null && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                <div className="text-white text-xl font-bold mb-4">
                  Next episode starting in {autoPlayCountdown}s...
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setAutoPlayCountdown(null);
                      setCurrentEpIndex(currentEpIndex + 1);
                    }}
                    className="px-6 py-2 bg-[#F27D26] text-black font-bold rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Play Now
                  </button>
                  <button 
                    onClick={() => setAutoPlayCountdown(null)}
                    className="px-6 py-2 bg-[#1a1a1a] text-white font-bold rounded-lg hover:bg-gray-700 transition-colors border border-gray-600"
                  >
                    Cancel
                  </button>
                </div>
             </div>
          )}
        </div>

        <ServerSelection
          currentEp={currentEp}
          servers={servers}
          activeCategory={activeCategory}
          activeServer={activeServer}
          onSelectServer={useCallback((cat: string, server: string) => {
            setSources([]);
            setActiveCategory(cat as any);
            setActiveServer(server);
          }, [])}
        />
      </div>

      <EpisodeSidebar
        episodes={episodes}
        currentEpIndex={currentEpIndex}
        setCurrentEpIndex={setCurrentEpIndex}
      />
    </div>
  );
}
