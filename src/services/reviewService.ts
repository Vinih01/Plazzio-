import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Review, Store } from '../types';
import { removeUndefinedFields } from '../lib/utils';

const REVIEWS_COLLECTION = 'reviews';

/**
 * Fetch approved reviews for a given store, sorted newest first.
 * Client-side sorting avoids needing composite indexes in Firestore.
 */
export async function getReviewsByStore(storeId: string): Promise<Review[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('storeId', '==', storeId),
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    const reviews: Review[] = [];
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Review;
      reviews.push({
        ...data,
        id: docSnap.id,
        status: 'approved',
      });
    });

    // Sort descending by createdAt
    reviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return reviews;
  } catch (error) {
    console.warn('Error fetching approved reviews by store:', error);
    return [];
  }
}

/**
 * Fetch a customer's specific review for a store
 * to allow editing and status feedback without creating duplicates.
 */
export async function getUserReviewForStore(storeId: string, customerUid: string): Promise<Review | null> {
  if (!storeId || !customerUid) return null;
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('storeId', '==', storeId),
      where('customerUid', '==', customerUid)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Review;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching user review for store:', error);
    return null;
  }
}

/**
 * Submit a new review or update an existing review.
 * Saves to Firestore and automatically recalculates store average score & count.
 */
export async function submitOrUpdateReview(params: {
  id?: string;
  storeId: string;
  customerUid: string;
  customerName: string;
  rating: number;
  comment: string;
  photoUrls?: string[];
  orderId?: string;
  status?: 'approved' | 'pending' | 'rejected';
}): Promise<Review> {
  const now = new Date().toISOString();
  
  // Check if user already has a review document for this store if no ID provided
  let reviewId = params.id;
  let originalCreatedAt = now;
  try {
    const existing = await getUserReviewForStore(params.storeId, params.customerUid);
    if (existing) {
      reviewId = reviewId || existing.id;
      if (existing.createdAt) {
        originalCreatedAt = existing.createdAt;
      }
    }
  } catch (err) {
    console.warn('Could not query existing user review:', err);
  }

  const reviewPayload: Review = removeUndefinedFields<Review>({
    id: reviewId || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    storeId: params.storeId,
    customerUid: params.customerUid,
    customerName: params.customerName.trim() || 'Cliente Plazzio',
    rating: Math.max(1, Math.min(5, Math.round(params.rating))),
    comment: params.comment.trim(),
    photoUrls: params.photoUrls && params.photoUrls.length > 0 ? params.photoUrls : undefined,
    orderId: params.orderId || undefined,
    status: 'pending', // Reviews are published only after admin moderation
    createdAt: originalCreatedAt,
    updatedAt: now,
  });

  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewPayload.id);
    await setDoc(docRef, reviewPayload, { merge: true });

    // Attempt to update the store's rating and reviewCount in Firestore if permitted
    try {
      await recalculateStoreRating(params.storeId);
    } catch (recalcErr) {
      console.warn('Nota recalculada em memória, atualização no doc da loja ignorada:', recalcErr);
    }

    return reviewPayload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${REVIEWS_COLLECTION}/${reviewPayload.id}`);
    throw error;
  }
}

/**
 * Delete a review and recalculate store rating.
 */
export async function deleteReview(reviewId: string, storeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, REVIEWS_COLLECTION, reviewId));
    await recalculateStoreRating(storeId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${REVIEWS_COLLECTION}/${reviewId}`);
    throw error;
  }
}

/**
 * Fetch all reviews across all stores for the administrative dashboard.
 */
export async function getAllReviewsAdmin(): Promise<Review[]> {
  try {
    const snapshot = await getDocs(collection(db, REVIEWS_COLLECTION));
    const reviews: Review[] = [];
    snapshot.forEach(docSnap => {
      reviews.push({ id: docSnap.id, ...docSnap.data() } as Review);
    });

    reviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return reviews;
  } catch (error) {
    console.warn('Error fetching admin reviews:', error);
    return [];
  }
}

/**
 * Update review status (approve or reject) by administrator.
 * When approved or rejected, automatically recalculates the store's average rating.
 */
export async function updateReviewStatus(
  reviewId: string, 
  status: 'approved' | 'rejected' | 'pending',
  storeId?: string
): Promise<void> {
  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString()
    });

    if (storeId) {
      await recalculateStoreRating(storeId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${REVIEWS_COLLECTION}/${reviewId}`);
    throw error;
  }
}

/**
 * Recalculate average rating and review count from approved reviews and save to store doc.
 */
export async function getApprovedReviews(): Promise<Review[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    const reviews: Review[] = [];
    
    snapshot.forEach(docSnap => {
      reviews.push({
        id: docSnap.id,
        ...docSnap.data()
      } as Review);
    });

    return reviews;
  } catch (error) {
    console.warn('Error fetching approved reviews:', error);
    return [];
  }
}

/**
 * Recalculate average rating and review count from approved reviews and save to store doc.
 */
export async function recalculateStoreRating(storeId: string): Promise<{ rating: number; reviewCount: number }> {
  const calculateLocalFallback = async () => {
    const approvedReviews = await getReviewsByStore(storeId);
    const reviewCount = approvedReviews.length;
    const rating = reviewCount
      ? Math.round((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
      : 0;
    return { rating, reviewCount };
  };

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // A local calculation is useful to render the current page, but it is not persisted.
      return await calculateLocalFallback();
    }

    const token = await currentUser.getIdToken();
    const response = await fetch('/api/reviews/recalculate-rating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ storeId }),
    });
    const result = await response.json().catch(() => ({})) as {
      rating?: number;
      reviewCount?: number;
      error?: string;
    };

    if (!response.ok || typeof result.rating !== 'number' || typeof result.reviewCount !== 'number') {
      console.warn('Server-side review rating recalculation was not persisted:', result.error || response.status);
      return await calculateLocalFallback();
    }

    return { rating: result.rating, reviewCount: result.reviewCount };
  } catch (error) {
    console.warn('Could not recalculate store rating through the secure endpoint:', error);
    return calculateLocalFallback();
  }
}
