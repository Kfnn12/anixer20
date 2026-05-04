import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../FirebaseProvider';
import { Star, Trash2 } from 'lucide-react';

interface Review {
  id: string;
  animeId: string;
  userId: string;
  username: string;
  userPhoto: string;
  rating: number;
  text: string;
  createdAt: any;
  updatedAt: any;
}

interface ReviewsProps {
  animeId: string;
}

export function Reviews({ animeId }: ReviewsProps) {
  const { user, login } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!animeId) return;
    
    // We fetch all reviews for this anime (could limit to newest if there are too many)
    const q = query(
      collection(db, `anime/${animeId}/reviews`),
      where('animeId', '==', animeId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Review[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Review);
      });
      setReviews(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `anime/${animeId}/reviews`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [animeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return login();
    if (!text.trim()) return setError("Review text is required");
    
    setSubmitting(true);
    setError(null);
    try {
      const reviewRef = doc(collection(db, `anime/${animeId}/reviews`));
      
      const reviewData = {
        animeId,
        userId: user.uid,
        username: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        rating,
        text: text.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(reviewRef, reviewData);
      setText('');
      setRating(5);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `anime/${animeId}/reviews`);
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteDoc(doc(db, `anime/${animeId}/reviews`, reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `anime/${animeId}/reviews/${reviewId}`);
      alert('Failed to delete review');
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-8 mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-white">Reviews</h2>
        {averageRating && (
          <div className="flex items-center gap-2">
            <Star className="text-yellow-400 fill-yellow-400 h-5 w-5" />
            <span className="text-lg font-bold">{averageRating}</span>
            <span className="text-sm text-gray-400">({reviews.length})</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200">
          {error}
        </div>
      )}

      {/* Review Form */}
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 mb-8">
        {!user ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">You must be logged in to leave a review.</p>
            <button 
              onClick={login}
              className="bg-[#F27D26] hover:bg-[#d96a1a] text-black font-semibold py-2 px-6 rounded-full transition-colors"
            >
              Sign In to Review
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-4 mb-4">
              <img src={user.photoURL || ''} alt="User" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-semibold text-sm">{user.displayName}</p>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none"
                    >
                      <Star 
                        className={`h-5 w-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you think about this anime?"
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-lg p-3 text-sm focus:outline-none focus:border-[#F27D26] transition-colors resize-none mb-4 min-h-[100px]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="bg-[#F27D26] hover:bg-[#d96a1a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2 px-6 rounded-full transition-colors text-sm"
              >
                {submitting ? 'Posting...' : 'Post Review'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Review List */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1a1a1a] border-t-[#F27D26]" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No reviews yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-5 flex flex-col sm:flex-row gap-4 relative">
              {user && user.uid === review.userId && (
                <button 
                  onClick={() => handleDelete(review.id)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors"
                  title="Delete review"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <img src={review.userPhoto} alt={review.username} className="w-12 h-12 rounded-full hidden sm:block" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <img src={review.userPhoto} alt={review.username} className="w-8 h-8 rounded-full sm:hidden" />
                    <span className="font-semibold text-sm">{review.username}</span>
                  </div>
                  <div className="flex gap-1 bg-[#050505] px-2 py-1 rounded">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`h-3 w-3 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{review.text}</p>
                <div className="text-xs text-gray-500 mt-3 flex items-center justify-between">
                  <span>{review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
