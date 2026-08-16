import { useEffect, useState } from "react";
import Confetti from "./Confetti";
import "./RoommateFound.css";

function RoommateFound({ partner, onOpenChat, onLogout, onFeedback }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="roommate-found">
      {showConfetti && <Confetti />}
      <div className="roommate-found-card">

        <p className="roommate-found-emoji">🎉</p>

        <p className="tag">ROOMMATE CONFIRMED</p>

        <h1>
          You found your
          <br />
          <span>roommate!</span>
        </h1>

        <div className="partner-preview">
          <div className="partner-avatar">
            {partner?.name?.charAt(0) || "?"}
          </div>
          <div>
            <h2>{partner?.name || "Your roommate"}</h2>
            <p>{partner?.branch}</p>
            <small>{partner?.district}</small>
          </div>
        </div>

        <p className="roommate-found-note">
          You and {partner?.name || "your roommate"} confirmed each other.
          Keep chatting to sort out the details.
        </p>

        <button className="submit-button" onClick={onOpenChat}>
          💬 Go to Chat
        </button>

        <div className="roommate-found-admin">
          <p>Confirmed this by mistake, or something not right?</p>
          <div className="roommate-found-admin-links">
            <a
              href="https://t.me/Transformer256"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact admin on Telegram
            </a>
            {onFeedback && (
              <>
                {" · "}
                <button className="roommate-found-link-button" onClick={onFeedback}>
                  Send feedback
                </button>
              </>
            )}
          </div>
        </div>

        {onLogout && (
          <button className="roommate-found-logout" onClick={onLogout}>
            Log out
          </button>
        )}

      </div>
    </div>
  );
}

export default RoommateFound;