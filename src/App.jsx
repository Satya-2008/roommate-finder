import "./App.css";
import Questionnaire from "./Questionnaire";
import Matches from "./Matches";
import Login from "./Login";
import Credits from "./Credits";
import MyReviews from "./MyReviews";
import Feedback from "./Feedback";

// Same flag as in Matches.jsx — keep these two in sync. Hides the
// student peer-review nav entry without deleting any of the feature.
const STUDENT_REVIEWS_ENABLED = false;
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { findMatchesWithMutual } from "./matching";

function App() {
  const [page, setPage] = useState("home");
  const [matches, setMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // The current user's own saved profile, if they've submitted one before.
  // null = confirmed no profile yet. undefined = still checking.
  const [myProfile, setMyProfile] = useState(undefined);

  // Whenever the logged-in user changes, check Firestore for a profile
  // they've already submitted, so the home page can offer "View My
  // Matches" / "Edit My Profile" instead of the first-time CTA.
  useEffect(() => {
    if (!user) {
      setMyProfile(undefined);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const snapshot = await getDoc(doc(db, "students", user.uid));
        if (!cancelled) {
          setMyProfile(snapshot.exists() ? snapshot.data() : null);
        }
      } catch (err) {
        console.error("Failed to load existing profile:", err);
        if (!cancelled) setMyProfile(null);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Listen for login/logout — runs once on mount, keeps `user`
  // in sync with Firebase automatically.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  function handleLogout() {
    signOut(auth);
    setPage("home");
    setMatches([]);
  }

  // Saves the submitted profile to Firestore (one document per user,
  // keyed by their uid so re-submitting just overwrites their own
  // profile instead of creating duplicates), then fetches every other
  // stored profile and runs matching against those real submissions.
  async function handleQuestionnaireSubmit(userForm) {
    setSubmitting(true);
    setSubmitError("");

    try {
      const profile = {
        ...userForm,
        uid: user.uid,
        email: user.email,
        updatedAt: serverTimestamp(),
      };

      // Save/overwrite this user's own profile.
      await setDoc(doc(db, "students", user.uid), profile);

      // Fetch everyone's profiles, excluding the current user, to match against.
      const snapshot = await getDocs(collection(db, "students"));

      const allStudents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((student) => student.uid !== user.uid);

      // uid is needed on the current user's own profile so mutual-match
      // checking can find them inside a candidate's own ranked list.
      const currentUserProfile = { ...userForm, uid: user.uid };

      const results = findMatchesWithMutual(currentUserProfile, allStudents);

      setMyProfile(userForm);
      setMatches(results);
      setPage("matches");
    } catch (err) {
      console.error("Failed to save profile or fetch matches:", err);
      setSubmitError(
        "Something went wrong saving your profile. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // For a returning user who already has a saved profile — re-run
  // matching against the current pool without making them refill the form.
  async function viewMyMatches() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const snapshot = await getDocs(collection(db, "students"));

      const allStudents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((student) => student.uid !== user.uid);

      const currentUserProfile = { ...myProfile, uid: user.uid };

      const results = findMatchesWithMutual(currentUserProfile, allStudents);

      setMatches(results);
      setPage("matches");
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setSubmitError("Something went wrong loading your matches. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Wait to know whether someone's logged in before rendering
  // anything, so we don't flash the login page for a split second.
  if (authLoading) {
    return (
      <div className="app">
        <p style={{ textAlign: "center", padding: "80px 24px", color: "#8a8a8a" }}>
          Loading...
        </p>
      </div>
    );
  }

  // Not logged in — show the login/signup page and nothing else.
  if (!user) {
    return <Login />;
  }

  if (page === "questionnaire") {
    return (
      <>
        <Questionnaire
          onBack={() => setPage("home")}
          onSubmit={handleQuestionnaireSubmit}
          initialData={myProfile || undefined}
        />
        {submitting && (
          <p style={{ textAlign: "center", color: "#8a8a8a", padding: "16px" }}>
            Saving your profile and finding matches...
          </p>
        )}
        {submitError && (
          <p style={{ textAlign: "center", color: "#ef4444", padding: "16px" }}>
            {submitError}
          </p>
        )}
      </>
    );
  }

  if (page === "matches") {
    return (
      <Matches
        matches={matches}
        onBack={() => setPage("questionnaire")}
        currentUser={{ uid: user.uid, name: myProfile?.name || user.email }}
      />
    );
  }

  if (page === "myReviews") {
    return (
      <MyReviews
        currentUser={{ uid: user.uid }}
        onBack={() => setPage("home")}
      />
    );
  }

  if (page === "credits") {
    return <Credits onBack={() => setPage("home")} />;
  }

  if (page === "Feedback") {
    return (
      <feedback
        currentUser={{ uid: user.uid, email: user.email, name: myProfile?.name }}
        onBack={() => setPage("home")}
      />
    );
  }

  return (
    <div className="app">

      <nav className="navbar">
        <div className="logo">
          Room<span>Mate</span>
        </div>

        <div className="nav-links">
          <a href="#how">How it works</a>
          {STUDENT_REVIEWS_ENABLED && (
            <button
              className="link-button"
              onClick={() => setPage("myReviews")}
            >
              My Reviews
            </button>
          )}
          <button
            className="link-button"
            onClick={() => setPage("feedback")}
          >
            Feedback
          </button>
          <button
            className="link-button"
            onClick={() => setPage("credits")}
          >
            About
          </button>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </nav>


      <section className="hero">

        <div className="hero-text">

          <p className="tag">
            BIT SINDRI • ROOMMATE MATCHING
          </p>

          <h1>
            Find a roommate
            <br />
            <span>who fits your lifestyle.</span>
          </h1>

          <p className="description">
            Tell us about your habits and preferences.
            We'll help you find a roommate with a compatible lifestyle.
          </p>

          {myProfile === undefined ? (
            // Still checking Firestore for an existing profile — render
            // nothing yet rather than flashing the wrong CTA.
            <div style={{ height: "52px" }} />
          ) : myProfile ? (
            <div className="hero-actions">
              <button
                className="start-button"
                onClick={viewMyMatches}
                disabled={submitting}
              >
                {submitting ? "Loading..." : "View My Matches →"}
              </button>
              <button
                className="edit-profile-button"
                onClick={() => setPage("questionnaire")}
              >
                Edit My Profile
              </button>
            </div>
          ) : (
            <button
              className="start-button"
              onClick={() => setPage("questionnaire")}
            >
              Find My Roommate →
            </button>
          )}

          {submitError && (
            <p style={{ color: "#ef4444", marginTop: "16px", fontSize: "14px" }}>
              {submitError}
            </p>
          )}

        </div>


        <div className="match-card">

          <div className="match-title">
            <span>Example match</span>
            <strong>92%</strong>
          </div>

          <div className="trait">
            <span>Sleep schedule</span>
            <b>✓</b>
          </div>

          <div className="trait">
            <span>Cleanliness</span>
            <b>✓</b>
          </div>

          <div className="trait">
            <span>Study habits</span>
            <b>✓</b>
          </div>

          <div className="trait">
            <span>Noise preference</span>
            <b>✓</b>
          </div>

          <div className="trait">
            <span>Social preference</span>
            <b>~</b>
          </div>

        </div>

      </section>


      <section className="how" id="how">

        <p className="tag">HOW IT WORKS</p>

        <h2>Three steps to find your match.</h2>

        <div className="steps">

          <div>
            <span>01</span>
            <h3>Create your profile</h3>
            <p>
              Tell us your branch, year and lifestyle.
            </p>
          </div>

          <div>
            <span>02</span>
            <h3>Set your preferences</h3>
            <p>
              Tell us what matters most in a roommate.
            </p>
          </div>

          <div>
            <span>03</span>
            <h3>Get your matches</h3>
            <p>
              See your most compatible roommates.
            </p>
          </div>

        </div>

      </section>


      <footer className="app-footer">
        <p>
          Built by{" "}
          <a
            href="https://t.me/Transformer256"
            target="_blank"
            rel="noopener noreferrer"
          >
            @Transformer256
          </a>
          {" · "}
          <button
            className="footer-link-button"
            onClick={() => setPage("credits")}
          >
            About
          </button>
        </p>
      </footer>

    </div>
  );
}

export default App;
