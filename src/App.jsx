import "./App.css";

import Questionnaire from "./Questionnaire";
import Matches from "./Matches";
import Login from "./Login";
import Credits from "./Credits";
import MyReviews from "./MyReviews";
import Feedback from "./Feedback";
import Chat from "./Chat";
import RoommateFound from "./RoommateFound";

import { getLockedPartnerUid } from "./confirmApi";
import { listenToMyThreads, isThreadUnread } from "./chatThreadsApi";

import { useState, useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";

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

const STUDENT_REVIEWS_ENABLED = false;

/* =========================================================
   IMPORTANT: every page below is a TOP-LEVEL component, not
   defined inside AppContent. Defining a component function
   inside another component's body gives it a new identity on
   every render, which makes React unmount + remount it any
   time the parent re-renders — for Chat specifically, that
   happens on every message sent/received (since that updates
   AppContent's myThreads state), wiping typed-but-unsent text
   and tearing down the message listener each time. Keeping
   these at module scope, receiving data via props instead of
   closures, avoids that entirely.
========================================================= */

function HomePage({
  user,
  myProfile,
  submitting,
  submitError,
  unreadThreads,
  viewMyMatches,
  handleLogout,
}) {
  const navigate = useNavigate();

  return (
    <div className="app aurora-bg">
      <nav className="navbar">
        <div
          className="logo"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          Room<span>Mate</span>
        </div>

        <div className="nav-links">
          <a href="#how">How it works</a>

          {STUDENT_REVIEWS_ENABLED && user && (
            <button className="link-button" onClick={() => navigate("/reviews")}>
              My Reviews
            </button>
          )}

          {user && (
            <button className="link-button" onClick={() => navigate("/feedback")}>
              Feedback
            </button>
          )}

          <button className="link-button" onClick={() => navigate("/credits")}>
            About
          </button>

          {user ? (
            <button onClick={handleLogout}>Log out</button>
          ) : (
            <button onClick={() => navigate("/login")}>Log in</button>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-text">
          <p className="tag">BIT SINDRI • ROOMMATE MATCHING</p>

          <h1>
            Find a roommate
            <br />
            <span>who fits your lifestyle.</span>
          </h1>

          <p className="description">
            Tell us about your habits and preferences. We'll help you find a
            roommate with a compatible lifestyle.
          </p>

          {user ? (
            myProfile === undefined ? (
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
                  onClick={() => navigate("/questionnaire")}
                >
                  Edit My Profile
                </button>
              </div>
            ) : (
              <button
                className="start-button"
                onClick={() => navigate("/questionnaire")}
              >
                Find My Roommate →
              </button>
            )
          ) : (
            <button className="start-button" onClick={() => navigate("/login")}>
              Find My Roommate →
            </button>
          )}

          {submitError && (
            <p style={{ color: "#ef4444", marginTop: "16px", fontSize: "14px" }}>
              {submitError}
            </p>
          )}

          {user && unreadThreads.length > 0 && (
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
                    onClick={() =>
                      navigate(`/chat/${thread.chatId}`, {
                        state: {
                          otherUser: { uid: thread.otherUid, name: thread.otherName },
                        },
                      })
                    }
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
            <p>Tell us your branch, year and lifestyle.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Set your preferences</h3>
            <p>Tell us what matters most in a roommate.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Get your matches</h3>
            <p>See your most compatible roommates.</p>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <p>
          Built by{" "}
          <a href="https://t.me/Transformer256" target="_blank" rel="noopener noreferrer">
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
          <button className="footer-link-button" onClick={() => navigate("/credits")}>
            About
          </button>
        </p>
      </footer>
    </div>
  );
}

function LockedRedirect({ lockedPartner, user, handleLogout }) {
  const navigate = useNavigate();

  return (
    <RoommateFound
      partner={lockedPartner}
      onOpenChat={() =>
        navigate(`/chat/${[user.uid, lockedPartner.uid].sort().join("_")}`, {
          state: { otherUser: { uid: lockedPartner.uid, name: lockedPartner.name } },
        })
      }
      onLogout={handleLogout}
      onFeedback={() => navigate("/feedback")}
    />
  );
}

function QuestionnairePage({
  user,
  myProfile,
  lockedPartner,
  submitting,
  submitError,
  handleQuestionnaireSubmit,
  handleLogout,
}) {
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (lockedPartner) {
    return <LockedRedirect lockedPartner={lockedPartner} user={user} handleLogout={handleLogout} />;
  }

  return (
    <>
      <Questionnaire
        onBack={() => navigate("/")}
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

function MatchesPage({ user, myProfile, lockedPartner, matches, handleLogout }) {
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (lockedPartner) {
    return <LockedRedirect lockedPartner={lockedPartner} user={user} handleLogout={handleLogout} />;
  }

  return (
    <Matches
      matches={matches}
      onBack={() => navigate("/questionnaire")}
      currentUser={{ uid: user.uid, name: myProfile?.name || user.email }}
      onOpenChat={(chatInfo) =>
        navigate(`/chat/${chatInfo.chatId}`, { state: { otherUser: chatInfo.otherUser } })
      }
    />
  );
}

// Chat needs to survive a page refresh — router `state` (passed via
// navigate) doesn't persist across a reload, only the URL does. So
// the chatId lives in the URL itself (/chat/:chatId), and if the
// otherUser info isn't in router state (e.g. after a refresh), it's
// fetched from the current user's own thread record instead.
function ChatPage({ user, myProfile, lockedPartner, setLockedPartner, handleLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams();

  const [otherUser, setOtherUser] = useState(location.state?.otherUser || null);
  const [resolving, setResolving] = useState(!location.state?.otherUser);

  useEffect(() => {
    if (otherUser || !user || !chatId) return;

    let cancelled = false;

    getDoc(doc(db, "userChats", user.uid, "threads", chatId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          setOtherUser({ uid: data.otherUid, name: data.otherName });
        }
      })
      .catch((err) => console.error("Failed to resolve chat thread:", err))
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [otherUser, user, chatId]);

  if (!user) return <Navigate to="/login" replace />;
  if (!chatId) return <Navigate to="/" replace />;

  if (resolving) {
    return (
      <div className="app">
        <p style={{ textAlign: "center", padding: "80px 24px", color: "#8a8a8a" }}>
          Loading chat...
        </p>
      </div>
    );
  }

  if (!otherUser) return <Navigate to="/" replace />;

  if (lockedPartner && otherUser.uid !== lockedPartner.uid) {
    return <LockedRedirect lockedPartner={lockedPartner} user={user} handleLogout={handleLogout} />;
  }

  return (
    <Chat
      chatId={chatId}
      otherUser={otherUser}
      currentUser={{ uid: user.uid, name: myProfile?.name || user.email }}
      onBack={() => navigate(lockedPartner ? "/" : "/matches")}
      onLocked={(partnerUid) =>
        setLockedPartner({ uid: partnerUid, name: otherUser.name })
      }
    />
  );
}

function ReviewsPage({ user }) {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;

  return <MyReviews currentUser={{ uid: user.uid }} onBack={() => navigate("/")} />;
}

function CreditsPage({ user }) {
  const navigate = useNavigate();

  return (
    <Credits
      onBack={() => navigate("/")}
      currentUserEmail={user?.email}
    />
  );
}

function FeedbackPage({ user, myProfile }) {
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Feedback
      currentUser={{ uid: user.uid, email: user.email, name: myProfile?.name }}
      onBack={() => navigate("/")}
    />
  );
}

function LoginPage({ user }) {
  return user ? <Navigate to="/" replace /> : <Login />;
}

/* =========================================================
   MAIN APP
========================================================= */

function AppContent() {
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(undefined);
  const [lockedPartner, setLockedPartner] = useState(undefined);
  const [myThreads, setMyThreads] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setMyProfile(undefined);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const snapshot = await getDoc(doc(db, "students", user.uid));
        if (!cancelled) setMyProfile(snapshot.exists() ? snapshot.data() : null);
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

  useEffect(() => {
    if (!user || !myProfile) return;

    async function heartbeat() {
      try {
        await updateDoc(doc(db, "students", user.uid), { lastActive: serverTimestamp() });
      } catch (err) {
        console.error("Presence heartbeat failed:", err);
      }
    }

    heartbeat();
    const interval = setInterval(heartbeat, 45000);
    return () => clearInterval(interval);
  }, [user, myProfile]);

  useEffect(() => {
    if (!user) {
      setMyThreads([]);
      return;
    }
    const unsubscribe = listenToMyThreads(user.uid, setMyThreads);
    return unsubscribe;
  }, [user]);

  const unreadThreads = user ? myThreads.filter((t) => isThreadUnread(t, user.uid)) : [];

  function handleLogout() {
    signOut(auth);
    setMatches([]);
    setMyProfile(undefined);
    setLockedPartner(undefined);
    navigate("/");
  }

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

      await setDoc(doc(db, "students", user.uid), profile);

      const snapshot = await getDocs(collection(db, "students"));

      const allStudents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((student) => student.uid !== user.uid && !student.isLocked);

      const currentUserProfile = { ...userForm, uid: user.uid };
      const results = findMatchesWithMutual(currentUserProfile, allStudents);

      setMyProfile(userForm);
      setMatches(results);
      navigate("/matches");

      return true;
    } catch (err) {
      console.error("Failed to save profile or fetch matches:", err);
      setSubmitError("Something went wrong saving your profile. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function viewMyMatches() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const snapshot = await getDocs(collection(db, "students"));

      const allStudents = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((student) => student.uid !== user.uid && !student.isLocked);

      const currentUserProfile = { ...myProfile, uid: user.uid };
      const results = findMatchesWithMutual(currentUserProfile, allStudents);

      setMatches(results);
      navigate("/matches");
      return true;
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      setSubmitError("Something went wrong loading your matches. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="app">
        <p style={{ textAlign: "center", padding: "80px 24px", color: "#8a8a8a" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            user={user}
            myProfile={myProfile}
            submitting={submitting}
            submitError={submitError}
            unreadThreads={unreadThreads}
            viewMyMatches={viewMyMatches}
            handleLogout={handleLogout}
          />
        }
      />

      <Route path="/credits" element={<CreditsPage user={user} />} />

      <Route path="/login" element={<LoginPage user={user} />} />

      <Route
        path="/questionnaire"
        element={
          <QuestionnairePage
            user={user}
            myProfile={myProfile}
            lockedPartner={lockedPartner}
            submitting={submitting}
            submitError={submitError}
            handleQuestionnaireSubmit={handleQuestionnaireSubmit}
            handleLogout={handleLogout}
          />
        }
      />

      <Route
        path="/matches"
        element={
          <MatchesPage
            user={user}
            myProfile={myProfile}
            lockedPartner={lockedPartner}
            matches={matches}
            handleLogout={handleLogout}
          />
        }
      />

      <Route
        path="/chat/:chatId"
        element={
          <ChatPage
            user={user}
            myProfile={myProfile}
            lockedPartner={lockedPartner}
            setLockedPartner={setLockedPartner}
            handleLogout={handleLogout}
          />
        }
      />

      <Route path="/reviews" element={<ReviewsPage user={user} />} />

      <Route
        path="/feedback"
        element={<FeedbackPage user={user} myProfile={myProfile} />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
