import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Ensures both participants have a record of this chat thread in
// their own userChats/{uid}/threads subcollection — needed so the
// home page can list "chats you're part of" without scanning every
// chat in the database.
export async function ensureThread(chatId, uidA, nameA, uidB, nameB) {
  await Promise.all([
    setDoc(
      doc(db, "userChats", uidA, "threads", chatId),
      { chatId, otherUid: uidB, otherName: nameB },
      { merge: true }
    ),
    setDoc(
      doc(db, "userChats", uidB, "threads", chatId),
      { chatId, otherUid: uidA, otherName: nameA },
      { merge: true }
    ),
  ]);
}

// Called whenever a message is sent — updates both participants'
// thread docs with what the latest message was, so unread status can
// be computed without reading the messages subcollection itself.
export async function updateThreadOnMessage(chatId, senderUid) {
  const [uidA, uidB] = chatId.split("_");

  await Promise.all([
    setDoc(
      doc(db, "userChats", uidA, "threads", chatId),
      { lastMessageAt: serverTimestamp(), lastMessageSenderUid: senderUid },
      { merge: true }
    ),
    setDoc(
      doc(db, "userChats", uidB, "threads", chatId),
      { lastMessageAt: serverTimestamp(), lastMessageSenderUid: senderUid },
      { merge: true }
    ),
  ]);
}

// Call whenever the user is actively viewing a chat, so it stops
// counting as unread for them.
export async function markThreadRead(uid, chatId) {
  await setDoc(
    doc(db, "userChats", uid, "threads", chatId),
    { lastReadAt: serverTimestamp() },
    { merge: true }
  );
}

// Live list of everyone's own chat threads — used to compute the
// unread badge and the "you have new messages" reminder on login.
export function listenToMyThreads(uid, callback) {
  return onSnapshot(collection(db, "userChats", uid, "threads"), (snapshot) => {
    const threads = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(threads);
  });
}

export function isThreadUnread(thread, myUid) {
  if (!thread.lastMessageAt || thread.lastMessageSenderUid === myUid) {
    return false;
  }
  if (!thread.lastReadAt) return true;
  return thread.lastMessageAt.toMillis() > thread.lastReadAt.toMillis();
}