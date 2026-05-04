import { useEffect, useState } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../FirebaseProvider';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WatchProgress {
  animeId: string;
  title: string;
  image: string;
  episodeId: string;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  updatedAt: any;
}

export function ContinueWatching() {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<WatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProgressData([]);
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const q = query(
          collection(db, 'users', user.uid, 'watchProgress'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => doc.data() as WatchProgress);
        
        // Sort by updatedAt desc and limit to 6
        items.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        setProgressData(items.slice(0, 6));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/watchProgress`);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  if (loading || progressData.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-white">Continue Watching</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {progressData.map((item) => (
          <Link
            key={item.animeId}
            to={`/watch/${item.animeId}?ep=${item.episodeId}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-[#111111]"
          >
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            {/* Progress Bar */}
            {item.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                <div 
                  className="h-full bg-[#F27D26]" 
                  style={{ width: `${Math.min(100, (item.currentTime / item.duration) * 100)}%` }}
                />
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F27D26] text-black">
                <Play className="h-6 w-6 ml-1 fill-current" />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-3 mb-1">
              <h3 className="line-clamp-2 text-sm font-bold text-white mb-1">{item.title}</h3>
              <p className="text-xs font-semibold text-[#F27D26]">Episode {item.episodeNumber}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
