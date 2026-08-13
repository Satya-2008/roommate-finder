import { useEffect, useState } from "react";
import "./Matches.css";
import { submitReview, getReviewsForUser, averageRating } from "./reviews";

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

function Matches({ matches, onBack, currentUser }) {
  return (
    <div className="matches">

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

            {student.email && (
              <div className="contact">
                <button
                  type="button"
                  className="contact-button"
                  onClick={() => copyEmail(student.email)}
                >
                  ⧉ Copy email
                </button>

                <a
                  className="contact-button"
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                    student.email
                  )}&su=${encodeURIComponent(
                    "Roommate match on RoomMate"
                  )}&body=${encodeURIComponent(
                    `Hi ${student.name},\n\nWe matched at ${student.compatibility}% compatibility on RoomMate. Want to connect and see if we'd be a good fit as roommates?\n\n`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ✉ Open in Gmail
                </a>
              </div>
            )}

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