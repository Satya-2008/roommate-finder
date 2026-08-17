import "./App.css";
import Questionnaire from "./Questionnaire";
import Matches from "./Matches";
import Login from "./Login";
import Credits from "./Credits";
import MyReviews from "./MyReviews";
import Feedback from "./Feedback";
import Chat from "./Chat";
import RoommateFound from "./RoommateFound";
import { getLockedPartnerUid, getAllLockedUids } from "./confirmApi";
import { listenToMyThreads, isThreadUnread } from "./chatThreadsApi";

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
  updateDoc,
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
  const [activeChat, setActiveChat] = useState(null); // { chatId, otherUser }

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

  // undefined = still checking, null = not locked, object = locked-in
  // partner's profile (fetched from their students/ doc for display).
  const [lockedPartner, setLockedPartner] = useState(undefined);

  useEffect(() => {
    if (!user) {
      setLockedPartner(undefined);
      return;
    }

    let cancelled = false;

    async function checkLocked() {
      try {
        const partnerUid = await getLockedPartnerUid(user.uid);

        if (!partnerUid) {
          if (!cancelled) setLockedPartner(null);
          return;
        }

        const partnerSnap = await getDoc(doc(db, "students", partnerUid));

        if (!cancelled) {
          setLockedPartner(
            partnerSnap.exists()
              ? { uid: partnerUid, ...partnerSnap.data() }
              : { uid: partnerUid, name: "Your roommate" }
          );
        }
      } catch (err) {
        console.error("Failed to check locked roommate status:", err);
        if (!cancelled) setLockedPartner(null);
      }
    }

    checkLocked();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Presence heartbeat — lets other people see "Online" / "Last seen
  // Xm ago" in chat. Only runs once the user has an actual profile
  // doc to update (updateDoc fails on a doc that doesn't exist yet).
  useEffect(() => {
    if (!user || !myProfile) return;

    async function heartbeat() {
      try {
        await updateDoc(doc(db, "students", user.uid), {
          lastActive: serverTimestamp(),
        });
      } catch (err) {
        console.error("Presence heartbeat failed:", err);
      }
    }

    heartbeat();
    const interval = setInterval(heartbeat, 45000);
    return () => clearInterval(interval);
  }, [user, myProfile]);

  // Live list of this user's chat threads, used to show a "new
  // messages" reminder on the home page without them needing to
  // reopen each chat individually to find out.
  const [myThreads, setMyThreads] = useState([]);

  useEffect(() => {
    if (!user) {
      setMyThreads([]);
      return;
    }

    const unsubscribe = listenToMyThreads(user.uid, setMyThreads);
    return unsubscribe;
  }, [user]);

  const unreadThreads = user
    ? myThreads.filter((t) => isThreadUnread(t, user.uid))
    : [];

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
      const lockedUids = await getAllLockedUids();

      const allStudents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(
          (student) =>
            student.uid !== user.uid && !lockedUids.has(student.uid)
        );

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
      const lockedUids = await getAllLockedUids();

      const allStudents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter(
          (student) =>
            student.uid !== user.uid && !lockedUids.has(student.uid)
        );

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

  // Renders the celebration/locked-in screen. Called from multiple
  // guard points below, not just the default home fallback, so a
  // locked user can never land on matches/questionnaire/someone-else's
  // chat via back-navigation or stale state.
  function renderLocked() {
    return (
      <RoommateFound
        partner={lockedPartner}
        onOpenChat={() => {
          setActiveChat({
            chatId: [user.uid, lockedPartner.uid].sort().join("_"),
            otherUser: { uid: lockedPartner.uid, name: lockedPartner.name },
          });
          setPage("chat");
        }}
        onLogout={handleLogout}
        onFeedback={() => setPage("feedback")}
      />
    );
  }

  if (page === "questionnaire") {
    // Once locked, editing/resubmitting a profile doesn't make sense —
    // redirect instead of letting them re-enter the matching pool.
    if (lockedPartner) {
      return renderLocked();
    }

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
    // Same reasoning — a stale matches list from before locking in
    // shouldn't stay browsable/interactable after the fact.
    if (lockedPartner) {
      return renderLocked();
    }

    return (
      <Matches
        matches={matches}
        onBack={() => setPage("questionnaire")}
        currentUser={{ uid: user.uid, name: myProfile?.name || user.email }}
        onOpenChat={(chatInfo) => {
          setActiveChat(chatInfo);
          setPage("chat");
        }}
      />
    );
  }

  if (page === "chat" && activeChat) {
    // Once locked, the ONLY chat that should stay reachable is the
    // one with the confirmed partner — block chats with anyone else.
    if (lockedPartner && activeChat.otherUser.uid !== lockedPartner.uid) {
      return renderLocked();
    }

    return (
      <Chat
        chatId={activeChat.chatId}
        otherUser={activeChat.otherUser}
        currentUser={{ uid: user.uid, name: myProfile?.name || user.email }}
        onBack={() => setPage(lockedPartner ? "home" : "matches")}
        onLocked={(partnerUid) => {
          setLockedPartner({ uid: partnerUid, name: activeChat.otherUser.name });
        }}
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

  if (page === "feedback") {
    return (
      <Feedback
        currentUser={{ uid: user.uid, email: user.email, name: myProfile?.name }}
        onBack={() => setPage("home")}
      />
    );
  }

  // Locked into a confirmed roommate — replaces just the default home
  // screen, since further matching doesn't make sense once both people
  // have committed.
  if (lockedPartner) {
    return renderLocked();
  }

  return (
    <div className="app aurora-bg">

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

          {unreadThreads.length > 0 && (
            <div className="unread-reminder">
              <p className="unread-reminder-title">
                💬 You have {unreadThreads.length} new message
                {unreadThreads.length === 1 ? "" : "s"}
              </p>
              <div className="unread-reminder-list">
                {unreadThreads.map((thread) => (
                  <button
                    key={thread.id}
                    className="unread-thread-button"
                    onClick={() => {
                      setActiveChat({
                        chatId: thread.chatId,
                        otherUser: { uid: thread.otherUid, name: thread.otherName },
                      });
                      setPage("chat");
                    }}
                  >
                    {thread.otherName}
                  </button>
                ))}
              </div>
            </div>
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
          {" on Telegram · "}
          <a
            href="https://www.reddit.com/user/CompetitiveLog1671"
            target="_blank"
            rel="noopener noreferrer"
          >
            u/CompetitiveLog1671
          </a>
          {" on Reddit · "}
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