import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

function confirmDocId(fromUid, toUid) {
  return `${fromUid}_${toUid}`;
}

function pairId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export async function confirmRoommate(fromUid, toUid) {
  await setDoc(doc(db, "confirmations", confirmDocId(fromUid, toUid)), {
    fromUid,
    toUid,
    createdAt: serverTimestamp(),
  });
  // Pair creation happens reactively via ensureRoommatePair, called
  // from whichever side's live listener first observes both
  // confirmation docs existing — this avoids a race where two
  // near-simultaneous confirms could each read a stale snapshot.
}

// Idempotent — safe to call from both sides. Checks existence first
// because Firestore rules treat setDoc-on-an-existing-doc as an
// "update" (denied), not a "create".
export async function ensureRoommatePair(uidA, uidB) {
  const ref = doc(db, "roommatePairs", pairId(uidA, uidB));
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { uidA, uidB, confirmedAt: serverTimestamp() });
  }

  // Also stamp isLocked directly onto each person's own students/ doc.
  // This is what actually lets Firestore RULES block further
  // "I'm interested" writes for a locked-in user — filtering the
  // match list client-side isn't enough, since a stale already-open
  // list would still let the write through without this.
  try {
    await updateDoc(doc(db, "students", uidA), {
      isLocked: true,
      roommateUid: uidB,
    });
  } catch (err) {
    console.error("Failed to stamp isLocked on", uidA, err);
  }

  try {
    await updateDoc(doc(db, "students", uidB), {
      isLocked: true,
      roommateUid: uidA,
    });
  } catch (err) {
    console.error("Failed to stamp isLocked on", uidB, err);
  }
}

export async function getConfirmStatus(currentUid, otherUid) {
  const [mineSnap, theirsSnap] = await Promise.all([
    getDoc(doc(db, "confirmations", confirmDocId(currentUid, otherUid))),
    getDoc(doc(db, "confirmations", confirmDocId(otherUid, currentUid))),
  ]);

  const iConfirmed = mineSnap.exists();
  const theyConfirmed = theirsSnap.exists();

  return {
    iConfirmed,
    theyConfirmed,
    isLocked: iConfirmed && theyConfirmed,
  };
}

// Live version — updates instantly on BOTH sides the moment either
// person confirms, no refresh/reopen needed. Returns an unsubscribe
// function; call it on cleanup.
export function listenToConfirmStatus(currentUid, otherUid, callback) {
  let mine = false;
  let theirs = false;

  function emit() {
    callback({
      iConfirmed: mine,
      theyConfirmed: theirs,
      isLocked: mine && theirs,
    });
  }

  const unsubMine = onSnapshot(
    doc(db, "confirmations", confirmDocId(currentUid, otherUid)),
    (snap) => {
      mine = snap.exists();
      emit();
    }
  );

  const unsubTheirs = onSnapshot(
    doc(db, "confirmations", confirmDocId(otherUid, currentUid)),
    (snap) => {
      theirs = snap.exists();
      emit();
    }
  );

  return () => {
    unsubMine();
    unsubTheirs();
  };
}

// Is this specific user already locked into a confirmed roommate pair?
// Returns the partner's uid, or null if not locked.
export async function getLockedPartnerUid(uid) {
  const [asA, asB] = await Promise.all([
    getDocs(query(collection(db, "roommatePairs"), where("uidA", "==", uid))),
    getDocs(query(collection(db, "roommatePairs"), where("uidB", "==", uid))),
  ]);

  if (!asA.empty) return asA.docs[0].data().uidB;
  if (!asB.empty) return asB.docs[0].data().uidA;
  return null;
}

// Every uid currently locked into a roommate pair, across everyone —
// used to filter locked-in students out of everyone else's match pool.
export async function getAllLockedUids() {
  const snapshot = await getDocs(collection(db, "roommatePairs"));
  const locked = new Set();

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    locked.add(data.uidA);
    locked.add(data.uidB);
  });

  return locked;
}