import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Deterministic doc ID per (reviewer, reviewee) pair — resubmitting a
// review overwrites the reviewer's own previous review instead of
// creating duplicates, same pattern as the students collection.
function reviewDocId(revieweeUid, reviewerUid) {
  return `${revieweeUid}_${reviewerUid}`;
}

export async function submitReview({
  revieweeUid,
  reviewerUid,
  reviewerName,
  rating,
  comment,
}) {
  const id = reviewDocId(revieweeUid, reviewerUid);

  await setDoc(doc(db, "reviews", id), {
    revieweeUid,
    reviewerUid,
    reviewerName,
    rating,
    comment,
    createdAt: serverTimestamp(),
  });
}

// All reviews written ABOUT a given user — used both for the public
// average (rating only) and the private detail view (full comments,
// shown only to the person being reviewed).
export async function getReviewsForUser(revieweeUid) {
  const q = query(
    collection(db, "reviews"),
    where("revieweeUid", "==", revieweeUid)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export function averageRating(reviews) {
  if (!reviews || reviews.length === 0) return null;

  const sum = reviews.reduce((total, r) => total + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}