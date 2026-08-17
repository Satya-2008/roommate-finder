import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { sendMessage, listenToMessages } from "./chatApi";
import {
  confirmRoommate,
  listenToConfirmStatus,
  ensureRoommatePair,
} from "./confirmApi";
import { ensureThread, markThreadRead } from "./chatThreadsApi";
import "./Chat.css";

const ONLINE_THRESHOLD_MS = 90 * 1000;

function getPresenceLabel(lastActive) {
  if (!lastActive) return "Offline";

  const ms = Date.now() - lastActive.toDate().getTime();
  if (ms < ONLINE_THRESHOLD_MS) return "Online";

  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `Last seen ${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `Last seen ${days}d ago`;
}

function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  return timestamp.toDate().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function Chat({ chatId, currentUser, otherUser, onBack, onLocked }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const [confirmStatus, setConfirmStatus] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [otherLastActive, setOtherLastActive] = useState(null);
  const [, setTick] = useState(0); // forces a re-render every 30s to keep "Xm ago" fresh

  // Messages — live.
  useEffect(() => {
    const unsubscribe = listenToMessages(chatId, setMessages);
    return unsubscribe;
  }, [chatId]);

  // Confirm status — live on both sides, no refresh needed.
  useEffect(() => {
    const unsubscribe = listenToConfirmStatus(
      currentUser.uid,
      otherUser.uid,
      setConfirmStatus
    );
    return unsubscribe;
  }, [currentUser.uid, otherUser.uid]);

  // The moment BOTH sides are confirmed (observed live by whichever
  // side's listener fires last), ensure the pair doc exists and tell
  // the parent — this fires independently on each person's own screen.
  useEffect(() => {
    if (confirmStatus?.isLocked) {
      ensureRoommatePair(currentUser.uid, otherUser.uid).then(() => {
        onLocked?.(otherUser.uid);
      });
    }
  }, [confirmStatus?.isLocked, currentUser.uid, otherUser.uid, onLocked]);

  // Presence — live lastActive from the other person's profile.
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "students", otherUser.uid), (snap) => {
      setOtherLastActive(snap.exists() ? snap.data().lastActive : null);
    });
    return unsubscribe;
  }, [otherUser.uid]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Register this thread for both participants (so it shows up in
  // "your chats" for the unread reminder), and mark it read for the
  // current user since they're actively viewing it right now.
  useEffect(() => {
    ensureThread(
      chatId,
      currentUser.uid,
      currentUser.name || "Someone",
      otherUser.uid,
      otherUser.name || "Someone"
    ).catch((err) => console.error("Failed to register chat thread:", err));
  }, [chatId, currentUser.uid, currentUser.name, otherUser.uid, otherUser.name]);

  useEffect(() => {
    markThreadRead(currentUser.uid, chatId).catch((err) =>
      console.error("Failed to mark thread read:", err)
    );
  }, [currentUser.uid, chatId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleConfirm() {
    setShowConfirmDialog(false);
    setConfirming(true);
    try {
      await confirmRoommate(currentUser.uid, otherUser.uid);
      // No need to manually refetch or set state here — the live
      // listener above picks this up automatically on both screens.
    } catch (err) {
      console.error("Failed to confirm roommate:", err);
    } finally {
      setConfirming(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return;

    setSending(true);
    const toSend = text;
    setText("");

    try {
      await sendMessage(chatId, currentUser.uid, toSend);
    } catch (err) {
      console.error("Failed to send message:", err);
      setText(toSend);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const presenceLabel = getPresenceLabel(otherLastActive);
  const isOnline = presenceLabel === "Online";

  return (
    <div className="chat-page">

      <header className="chat-header">
        <div className="chat-header-inner">
          <button className="back-home" onClick={onBack}>
            ← Back
          </button>

          <div className="chat-header-info">
            <div className="chat-avatar-wrap">
              <div className="chat-avatar">
                {otherUser.name?.charAt(0) || "?"}
              </div>
              <span className={isOnline ? "presence-dot online" : "presence-dot"} />
            </div>
            <div>
              <h2>{otherUser.name}</h2>
              <span className="presence-label">{presenceLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {confirmStatus && !confirmStatus.isLocked && (
        <div
          className={
            confirmStatus.theyConfirmed
              ? "confirm-banner highlight"
              : "confirm-banner"
          }
        >
          {confirmStatus.iConfirmed ? (
            <span>
              Waiting for {otherUser.name} to confirm you as their roommate too
            </span>
          ) : confirmStatus.theyConfirmed ? (
            <>
              <span>🎉 {otherUser.name} wants to be your roommate!</span>
              <button
                className="confirm-button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={confirming}
              >
                {confirming ? "..." : "🔒 Confirm back"}
              </button>
            </>
          ) : (
            <>
              <span>Ready to lock this in?</span>
              <button
                className="confirm-button"
                onClick={() => setShowConfirmDialog(true)}
                disabled={confirming}
              >
                {confirming ? "..." : "🔒 Confirm as my roommate"}
              </button>
            </>
          )}
        </div>
      )}

      {showConfirmDialog && (
        <div className="confirm-dialog-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Become roommates with {otherUser.name}?</h3>
            <p>
              Once both of you confirm, you'll be locked in together and
              removed from further matching. Make sure you're both sure
              before continuing.
            </p>
            <div className="confirm-dialog-actions">
              <button
                className="confirm-dialog-cancel"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-dialog-agree"
                onClick={handleConfirm}
              >
                Yes, we're roommates
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmStatus?.isLocked && (
        <div className="confirm-banner locked">
          <span>🎉 You're confirmed roommates!</span>
        </div>
      )}

      <main className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">
            You matched and you're both interested — say hi!
          </p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.senderUid === currentUser.uid
                ? "chat-bubble-row mine"
                : "chat-bubble-row theirs"
            }
          >
            <div
              className={
                msg.senderUid === currentUser.uid
                  ? "chat-bubble mine"
                  : "chat-bubble theirs"
              }
            >
              {msg.text}
            </div>
            <span className="chat-timestamp">
              {formatMessageTime(msg.createdAt)}
            </span>
          </div>
        ))}

        <div ref={bottomRef} />
      </main>

      <div className="chat-input-bar">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          Send
        </button>
      </div>

    </div>
  );
}

export default Chat;