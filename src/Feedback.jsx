import { useState } from "react";
import { submitFeedback } from "./feedbackApi";
import "./Feedback.css";

function Feedback({ currentUser, onBack }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please pick a star rating first.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await submitFeedback({
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        rating,
        comment,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      setError("Something went wrong submitting your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feedback">

      <header className="feedback-header">

        <button className="back-home" onClick={onBack}>
          ← Back
        </button>

        <p className="tag">FEEDBACK</p>

        <h1>
          Help us
          <br />
          <span>improve RoomMate.</span>
        </h1>

        <p>
          Found a bug, or have an idea for what would make this more useful?
          Let us know.
        </p>

      </header>

      <main className="feedback-body">

        {submitted ? (
          <div className="feedback-thanks">
            <p className="feedback-thanks-icon">✓</p>
            <h2>Thanks for the feedback!</h2>
            <p>It's been noted and will help make the app better.</p>
            <button className="submit-button" onClick={onBack}>
              Back to home
            </button>
          </div>
        ) : (
          <div className="feedback-card">
            <label>How would you rate your experience?</label>

            <div className="star-input">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={n <= rating ? "star filled" : "star"}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  ★
                </button>
              ))}
            </div>

            <label>Anything you'd like to share? (optional)</label>

            <textarea
              placeholder="Bugs, ideas, things that felt confusing..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />

            {error && <p className="feedback-error">{error}</p>}

            <button
              className="submit-button"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send Feedback →"}
            </button>
          </div>
        )}

      </main>

    </div>
  );
}

export default Feedback;