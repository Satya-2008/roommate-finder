import { useEffect, useState } from "react";
import "./Matches.css";
import { submitReview, getReviewsForUser, averageRating } from "./reviews";
import { expressInterest, withdrawInterest, getInterestStatus, getChatId } from "./interestApi";

// Student peer-review system — built, working, but hidden for now.
// Flip to true to bring it back without rewriting anything.
const STUDENT_REVIEWS_ENABLED = false;

async function copyEmail(email) {
  try {
    await navigator.clipboard.writeText(email);
    alert(`Copied: ${email}`);
  } catch (err) {
    // Clipboard API can fail on old browsers / non-HTTPS contexts —
    // fall back to just showing the address so it can be selected manually.
    window.prompt("Copy this email address:", email);
  }
}

function Matches({ matches, onBack, currentUser, onOpenChat }) {
  return (
    <div className="matches aurora-bg">

      <header className="matches-header">

        <p className="tag">
          YOUR RESULTS
        </p>

        <h1>
          Your roommate
          <br />
          <span>matches.</span>
        </h1>

        <p>
          Ranked according to compatibility with your lifestyle.
        </p>

      </header>


      <main className="results">

        {matches.length === 0 && (
          <p className="empty-state">
            No matches yet — check back once more students have filled out
            their profiles.
          </p>
        )}

        {matches.map((student) => (

          <div className="student-card" key={student.id}>

            {student.isMutualMatch && (
              <div className="mutual-badge">
                ★ You're a top match for each other
              </div>
            )}

            <div className="student-details">

              <div className="avatar">
                {student.name.charAt(0)}
              </div>

              <div>
                <h2>{student.name}</h2>

                <p>{student.branch}</p>

                <small>{student.district}</small>
              </div>

            </div>


            <div className="score">

              <strong>
                {student.compatibility}%
              </strong>

              <span>
                compatible
              </span>

            </div>


            <div className="reasons">

              {student.reasons.good.length > 0 && (
                <div>
                  <h4>Good match</h4>

                  {student.reasons.good.map((trait) => (
                    <span key={trait}>
                      ✓ {trait}
                    </span>
                  ))}
                </div>
              )}


              {student.reasons.differences.length > 0 && (
                <div>
                  <h4>Potential differences</h4>

                  {student.reasons.differences.map((trait) => (
                    <span key={trait}>
                      △ {trait}
                    </span>
                  ))}
                </div>
              )}

            </div>

            {student.specificPreference && (
              <div className="specific-ask">
                <span className="specific-ask-label">💬 Looking for</span>
                <p>{student.specificPreference}</p>
                <span className="specific-ask-note">
                  If you can meet this, reach out!
                </span>
              </div>
            )}

            <InterestSection
              student={student}
              currentUser={currentUser}
              onOpenChat={onOpenChat}
            />

            {STUDENT_REVIEWS_ENABLED && (
              <ReviewSection student={student} currentUser={currentUser} />
            )}

          </div>

        ))}


        <button
          className="back-button"
          onClick={onBack}
        >
          ← Change preferences
        </button>

      </main>

    </div>
  );
}

// Handles the opt-in flow: tap "I'm interested", and once the other
// person has also expressed interest in you, a chat unlocks between
// just the two of you. Replaces exposing contact info to everyone.
function InterestSection({ student, currentUser, onOpenChat }) {
  const [status, setStatus] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    getInterestStatus(currentUser.uid, student.uid)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch((err) => {
        console.error("Failed to load interest status:", err);
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.uid, student.uid]);

  async function handleExpressInterest() {
    setWorking(true);
    setBlockedMessage("");
    try {
      await expressInterest(currentUser.uid, student.uid);
      const updated = await getInterestStatus(currentUser.uid, student.uid);
      setStatus(updated);
    } catch (err) {
      console.error("Failed to express interest:", err);
      if (err.code === "permission-denied") {
        setBlockedMessage(
          `${student.name} may have already found a roommate — try refreshing your matches.`
        );
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleWithdraw() {
    setWorking(true);
    try {
      await withdrawInterest(currentUser.uid, student.uid);
      const updated = await getInterestStatus(currentUser.uid, student.uid);
      setStatus(updated);
    } catch (err) {
      console.error("Failed to withdraw interest:", err);
    } finally {
      setWorking(false);
    }
  }

  function handleChat() {
    const chatId = getChatId(currentUser.uid, student.uid);
    onOpenChat({ chatId, otherUser: { uid: student.uid, name: student.name } });
  }

  if (loadError) {
    return (
      <div className="interest-section">
        <span className="interest-error">
          Couldn't load interest status. Try refreshing.
        </span>
      </div>
    );
  }

  if (status === null) {
    return (
      <div className="interest-section">
        <span className="interest-loading">Loading...</span>
      </div>
    );
  }

  if (status.isMutual) {
    return (
      <div className="interest-section">
        <span className="interest-mutual-note">
          You're both interested!
        </span>
        <button type="button" className="chat-unlock-button" onClick={handleChat}>
          💬 Open Chat
        </button>
      </div>
    );
  }

  if (status.iAmInterested) {
    return (
      <div className="interest-section">
        <span className="interest-waiting-note">
          Waiting for {student.name} to also show interest
        </span>
        <button
          type="button"
          className="interest-withdraw-button"
          onClick={handleWithdraw}
          disabled={working}
        >
          Withdraw
        </button>
      </div>
    );
  }

  return (
    <div className="interest-section">
      <button
        type="button"
        className="interest-button"
        onClick={handleExpressInterest}
        disabled={working}
      >
        {working ? "..." : "💬 I'm interested"}
      </button>
      {status.theyAreInterested && (
        <span className="interest-note">
          {student.name} is interested in you — tap to match!
        </span>
      )}
      {blockedMessage && (
        <span className="interest-error">{blockedMessage}</span>
      )}
    </div>
  );
}

// Handles fetching + showing the public average rating for a student,
// and lets the current user submit their own rating + comment for them.
function ReviewSection({ student, currentUser }) {
  const [reviews, setReviews] = useState(null); // null = loading
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getReviewsForUser(student.uid).then((result) => {
      if (!cancelled) setReviews(result);
    });

    return () => {
      cancelled = true;
    };
  }, [student.uid]);

  const avg = averageRating(reviews);

  // Has the current user already reviewed this student before?
  const existingReview =
    reviews?.find((r) => r.reviewerUid === currentUser.uid) || null;

  async function handleSubmit() {
    if (rating === 0) return;

    setSubmitting(true);

    try {
      await submitReview({
        revieweeUid: student.uid,
        reviewerUid: currentUser.uid,
        reviewerName: currentUser.name,
        rating,
        comment,
      });

      const updated = await getReviewsForUser(student.uid);
      setReviews(updated);
      setShowForm(false);
      setJustSubmitted(true);
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-section">

      <div className="review-summary">
        {avg !== null ? (
          <span className="review-average">
            ★ {avg} <span className="review-count">({reviews.length} review{reviews.length === 1 ? "" : "s"})</span>
          </span>
        ) : reviews !== null ? (
          <span className="review-average review-none">No reviews yet</span>
        ) : (
          <span className="review-average review-none">Loading reviews...</span>
        )}

        {!showForm && (
          <button
            type="button"
            className="review-toggle"
            onClick={() => {
              setShowForm(true);
              if (existingReview) {
                setRating(existingReview.rating);
                setComment(existingReview.comment || "");
              }
            }}
          >
            {existingReview || justSubmitted ? "Edit your review" : "Rate & review"}
          </button>
        )}
      </div>

      {showForm && (
        <div className="review-form">
          <StarInput value={rating} onChange={setRating} />

          <textarea
            placeholder={`What was it like matching/rooming with ${student.name}?`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <div className="review-form-actions">
            <button
              type="button"
              className="review-cancel"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="review-submit"
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
            >
              {submitting ? "Saving..." : "Submit review"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={n <= value ? "star filled" : "star"}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default Matches;