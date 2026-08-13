import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Unlike reviews.js, feedback isn't deduplicated per-user — someone
// might reasonably leave feedback more than once (e.g. after a bug
// fix, or a new complaint), so this uses addDoc (auto ID) instead of
// a deterministic setDoc key.
export async function submitFeedback({ uid, email, name, rating, comment }) {
  await addDoc(collection(db, "feedback"), {
    uid,
    email,
    name,
    rating,
    comment,
    createdAt: serverTimestamp(),
  });
}