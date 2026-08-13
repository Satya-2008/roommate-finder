import { useEffect, useState } from "react";
import { getReviewsForUser, averageRating } from "./reviews";
import "./MyReviews.css";

function MyReviews({ currentUser, onBack }) {
  const [reviews, setReviews] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getReviewsForUser(currentUser.uid).then((result) => {
      if (!cancelled) {
        // Newest first.
        const sorted = [...result].sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        setReviews(sorted);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser.uid]);

  const avg = averageRating(reviews);

  return (
    <div className="my-reviews">

      <header className="my-reviews-header">

        <button className="back-home" onClick={onBack}>
          ← Back
        </button>

        <p className="tag">MY REVIEWS</p>

        <h1>
          What others
          <br />
          <span>are saying.</span>
        </h1>

        <p>
          These reviews are private — only you can see the full comments.
          Other students only see your average rating.
        </p>

        {reviews !== null && (
          <div className="my-reviews-average">
            {avg !== null ? (
              <>
                <strong>★ {avg}</strong>
                <span>
                  from {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="no-reviews-yet">No reviews yet</span>
            )}
          </div>
        )}

      </header>

      <main className="my-reviews-list">

        {reviews === null && (
          <p className="loading-text">Loading your reviews...</p>
        )}

        {reviews !== null && reviews.length === 0 && (
          <p className="empty-state">
            No one has reviewed you yet. Reviews will show up here once
            students you've matched with leave feedback.
          </p>
        )}

        {reviews?.map((review) => (
          <div className="review-card" key={review.id}>
            <div className="review-card-top">
              <div className="review-stars">
                {"★".repeat(review.rating)}
                <span className="review-stars-empty">
                  {"★".repeat(5 - review.rating)}
                </span>
              </div>
              <span className="review-from">
                — {review.reviewerName || "Anonymous"}
              </span>
            </div>

            {review.comment && (
              <p className="review-comment">{review.comment}</p>
            )}
          </div>
        ))}

      </main>

    </div>
  );
}

export default MyReviews;