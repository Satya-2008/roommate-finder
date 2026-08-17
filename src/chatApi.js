import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateThreadOnMessage } from "./chatThreadsApi";

export async function sendMessage(chatId, senderUid, text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderUid,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  // Update both participants' thread metadata so the recipient's
  // unread badge/reminder picks this up next time they open the app.
  try {
    await updateThreadOnMessage(chatId, senderUid);
  } catch (err) {
    console.error("Failed to update thread metadata:", err);
  }
}

// Subscribes to a chat's messages in real time. Calls `callback` with
// the full, ordered message list every time something changes.
// Returns an unsubscribe function — call it on cleanup (e.g. in a
// useEffect return) to stop listening.
export function listenToMessages(chatId, callback) {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(messages);
  });
}