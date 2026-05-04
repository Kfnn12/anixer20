import { useState, useEffect, useRef } from 'react';
import { Bell, X, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc, 
  serverTimestamp, 
  deleteDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../FirebaseProvider';
import { getAnimeDetails } from '../api';
import { motion, AnimatePresence } from 'motion/react';

interface Notification {
  id: string;
  animeId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Timestamp;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Real-time listener for notifications
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/notifications`);
    });

    // Check for updates periodically (when user is active)
    checkForUpdates();
    checkIntervalRef.current = setInterval(checkForUpdates, 1000 * 60 * 60); // Every 1 hour

    return () => {
      unsubscribe();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [user]);

  const checkForUpdates = async () => {
    if (!user) return;

    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      const watchlistQuery = query(collection(db, 'users', user.uid, 'watchlist'));
      const progressQuery = query(collection(db, 'users', user.uid, 'watchProgress'));
      
      const [watchlistSnap, progressSnap] = await Promise.all([
        getDocs(watchlistQuery),
        getDocs(progressQuery)
      ]);
      
      const animeToTrack = new Map<string, { ref: any, data: any, source: string }>();
      
      watchlistSnap.docs.forEach(d => {
        animeToTrack.set(d.id, { ref: d.ref, data: d.data(), source: 'watchlist' });
      });
      
      progressSnap.docs.forEach(d => {
        // watchlist takes priority if it's in both
        if (!animeToTrack.has(d.id)) {
          animeToTrack.set(d.id, { ref: d.ref, data: d.data(), source: 'watchProgress' });
        }
      });
      
      for (const [animeId, { ref, data }] of animeToTrack.entries()) {
        const lastChecked = data.lastCheckedAt?.toDate() || new Date(0);
        
        if (lastChecked < fourHoursAgo) {
          const details = await getAnimeDetails(animeId);
          const currentEps = details.anime.info.stats.episodes.sub || details.anime.info.stats.episodes.dub || 0;
          const lastKnownEps = data.latestEpisode || 0;
          
          if (currentEps > lastKnownEps && lastKnownEps > 0) {
            await addDoc(collection(db, 'users', user.uid, 'notifications'), {
              userId: user.uid,
              animeId: animeId,
              title: 'New Episode Alert!',
              message: `Episode ${currentEps} of "${data.title}" is now available.`,
              type: 'new_episode',
              read: false,
              createdAt: serverTimestamp()
            });
          }
          
          await updateDoc(ref, {
            latestEpisode: currentEps,
            lastCheckedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error('Error checking for anime updates:', err);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;
    try {
      await updateDoc(doc(db, 'users', user!.uid, 'notifications', notification.id), {
        read: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user!.uid}/notifications/${notification.id}`);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/notifications`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user!.uid, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user!.uid}/notifications/${id}`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-[#111111] hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F27D26] text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[#1a1a1a] bg-[#0A0A0A] shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#1a1a1a] p-4">
                <h3 className="font-bold text-white">Notifications</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-[#F27D26] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)}>
                    <X className="h-4 w-4 text-gray-500 hover:text-white" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Bell className="mb-2 h-8 w-8 text-gray-700" />
                    <p className="text-sm text-gray-500">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1a1a1a]">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`relative p-4 transition-colors hover:bg-[#111111] ${!notif.read ? 'bg-[#F27D26]/5' : ''}`}
                        onClick={() => markAsRead(notif)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                              {notif.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                              {notif.message}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <Link 
                                to={`/watch/${notif.animeId}`}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#F27D26] hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Watch Now
                              </Link>
                              <span className="text-[10px] text-gray-600">
                                {notif.createdAt?.toDate().toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="text-gray-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {!notif.read && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-[#F27D26]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
