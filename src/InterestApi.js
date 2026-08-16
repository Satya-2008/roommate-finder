import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

function interestDocId(fromUid, toUid) {
  return `${fromUid}_${toUid}`;
}

export async function expressInterest(fromUid, toUid) {
  await setDoc(doc(db, "interests", interestDocId(fromUid, toUid)), {
    fromUid,
    toUid,
    createdAt: serverTimestamp(),
  });
}

export async function withdrawInterest(fromUid, toUid) {
  await deleteDoc(doc(db, "interests", interestDocId(fromUid, toUid)));
}

// Checks both directions between two people:
// - iAmInterested: did `currentUid` tap interested on `otherUid`?
// - theyAreInterested: did `otherUid` tap interested on `currentUid`?
// - isMutual: both true — this is what unlocks chat.
export async function getInterestStatus(currentUid, otherUid) {
  const [mineSnap, theirsSnap] = await Promise.all([
    getDoc(doc(db, "interests", interestDocId(currentUid, otherUid))),
    getDoc(doc(db, "interests", interestDocId(otherUid, currentUid))),
  ]);

  const iAmInterested = mineSnap.exists();
  const theyAreInterested = theirsSnap.exists();

  return {
    iAmInterested,
    theyAreInterested,
    isMutual: iAmInterested && theyAreInterested,
  };
}

// Deterministic chat ID for a pair of users — always the same
// regardless of who opens the chat first.
export function getChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}