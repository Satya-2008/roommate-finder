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

import { useState, useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
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
   MAIN APP
========================================================= */

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [matches, setMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [myProfile, setMyProfile] = useState(undefined);

  const [lockedPartner, setLockedPartner] = useState(undefined);

  const [myThreads, setMyThreads] = useState([]);


  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);


  /* =========================================================
     LOAD USER PROFILE
  ========================================================= */

  useEffect(() => {
    if (!user) {
      setMyProfile(undefined);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const snapshot = await getDoc(
          doc(db, "students", user.uid)
        );

        if (!cancelled) {
          setMyProfile(
            snapshot.exists()
              ? snapshot.data()
              : null
          );
        }
      } catch (err) {
        console.error(
          "Failed to load existing profile:",
          err
        );

        if (!cancelled) {
          setMyProfile(null);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);


  /* =========================================================
     CHECK LOCKED ROOMMATE
  ========================================================= */

  useEffect(() => {
    if (!user) {
      setLockedPartner(undefined);
      return;
    }

    let cancelled = false;

    async function checkLocked() {
      try {
        const partnerUid =
          await getLockedPartnerUid(user.uid);

        if (!partnerUid) {
          if (!cancelled) {
            setLockedPartner(null);
          }

          return;
        }

        const partnerSnap = await getDoc(
          doc(db, "students", partnerUid)
        );

        if (!cancelled) {
          setLockedPartner(
            partnerSnap.exists()
              ? {
                  uid: partnerUid,
                  ...partnerSnap.data(),
                }
              : {
                  uid: partnerUid,
                  name: "Your roommate",
                }
          );
        }
      } catch (err) {
        console.error(
          "Failed to check locked roommate status:",
          err
        );

        if (!cancelled) {
          setLockedPartner(null);
        }
      }
    }

    checkLocked();

    return () => {
      cancelled = true;
    };
  }, [user]);


  /* =========================================================
     PRESENCE HEARTBEAT
  ========================================================= */

  useEffect(() => {
    if (!user || !myProfile) return;

    async function heartbeat() {
      try {
        await updateDoc(
          doc(db, "students", user.uid),
          {
            lastActive: serverTimestamp(),
          }
        );
      } catch (err) {
        console.error(
          "Presence heartbeat failed:",
          err
        );
      }
    }

    heartbeat();

    const interval = setInterval(
      heartbeat,
      45000
    );

    return () => clearInterval(interval);
  }, [user, myProfile]);


  /* =========================================================
     CHAT THREADS
  ========================================================= */

  useEffect(() => {
    if (!user) {
      setMyThreads([]);
      return;
    }

    const unsubscribe = listenToMyThreads(
      user.uid,
      setMyThreads
    );

    return unsubscribe;
  }, [user]);


  const unreadThreads = user
    ? myThreads.filter((t) =>
        isThreadUnread(t, user.uid)
      )
    : [];


  /* =========================================================
     LOGOUT
  ========================================================= */

  function handleLogout() {
    signOut(auth);

    setMatches([]);
    setMyProfile(undefined);
    setLockedPartner(undefined);

    navigate("/");
  }


  /* =========================================================
     QUESTIONNAIRE SUBMIT
  ========================================================= */

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

      await setDoc(
        doc(db, "students", user.uid),
        profile
      );

      const snapshot = await getDocs(
        collection(db, "students")
      );

      const lockedUids =
        await getAllLockedUids();

      const allStudents = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter(
          (student) =>
            student.uid !== user.uid &&
            !lockedUids.has(student.uid)
        );

      const currentUserProfile = {
        ...userForm,
        uid: user.uid,
      };

      const results =
        findMatchesWithMutual(
          currentUserProfile,
          allStudents
        );

      setMyProfile(userForm);
      setMatches(results);

      navigate("/matches");
    } catch (err) {
      console.error(
        "Failed to save profile or fetch matches:",
        err
      );

      setSubmitError(
        "Something went wrong saving your profile. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }


  /* =========================================================
     VIEW EXISTING MATCHES
  ========================================================= */

  async function viewMyMatches() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const snapshot = await getDocs(
        collection(db, "students")
      );

      const lockedUids =
        await getAllLockedUids();

      const allStudents = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter(
          (student) =>
            student.uid !== user.uid &&
            !lockedUids.has(student.uid)
        );

      const currentUserProfile = {
        ...myProfile,
        uid: user.uid,
      };

      const results =
        findMatchesWithMutual(
          currentUserProfile,
          allStudents
        );

      setMatches(results);

      navigate("/matches");
    } catch (err) {
      console.error(
        "Failed to fetch matches:",
        err
      );

      setSubmitError(
        "Something went wrong loading your matches. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }


  /* =========================================================
     LOCKED ROOMMATE PAGE
  ========================================================= */

  function renderLocked() {
    if (!lockedPartner) {
      return null;
    }

    return (
      <RoommateFound
        partner={lockedPartner}

        onOpenChat={() => {
          navigate("/chat", {
            state: {
              chatId: [
                user.uid,
                lockedPartner.uid,
              ]
                .sort()
                .join("_"),

              otherUser: {
                uid: lockedPartner.uid,
                name: lockedPartner.name,
              },
            },
          });
        }}

        onLogout={handleLogout}

        onFeedback={() =>
          navigate("/feedback")
        }
      />
    );
  }


  /* =========================================================
     HOME PAGE
     PUBLIC — DOES NOT REQUIRE LOGIN
  ========================================================= */

  function Home() {
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

            <a href="#how">
              How it works
            </a>

            {STUDENT_REVIEWS_ENABLED &&
              user && (
                <button
                  className="link-button"
                  onClick={() =>
                    navigate("/reviews")
                  }
                >
                  My Reviews
                </button>
            )}

            {user && (
              <button
                className="link-button"
                onClick={() =>
                  navigate("/feedback")
                }
              >
                Feedback
              </button>
            )}

            <button
              className="link-button"
              onClick={() =>
                navigate("/credits")
              }
            >
              About
            </button>

            {user ? (
              <button
                onClick={handleLogout}
              >
                Log out
              </button>
            ) : (
              <button
                onClick={() =>
                  navigate("/login")
                }
              >
                Log in
              </button>
            )}

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
              <span>
                who fits your lifestyle.
              </span>
            </h1>

            <p className="description">
              Tell us about your habits and
              preferences. We'll help you find a
              roommate with a compatible lifestyle.
            </p>


            {user ? (

              myProfile === undefined ? (

                <div
                  style={{
                    height: "52px",
                  }}
                />

              ) : myProfile ? (

                <div className="hero-actions">

                  <button
                    className="start-button"
                    onClick={viewMyMatches}
                    disabled={submitting}
                  >
                    {submitting
                      ? "Loading..."
                      : "View My Matches →"}
                  </button>

                  <button
                    className="edit-profile-button"
                    onClick={() =>
                      navigate(
                        "/questionnaire"
                      )
                    }
                  >
                    Edit My Profile
                  </button>

                </div>

              ) : (

                <button
                  className="start-button"
                  onClick={() =>
                    navigate(
                      "/questionnaire"
                    )
                  }
                >
                  Find My Roommate →
                </button>

              )

            ) : (

              <button
                className="start-button"
                onClick={() =>
                  navigate("/login")
                }
              >
                Find My Roommate →
              </button>

            )}


            {submitError && (
              <p
                style={{
                  color: "#ef4444",
                  marginTop: "16px",
                  fontSize: "14px",
                }}
              >
                {submitError}
              </p>
            )}


            {user &&
              unreadThreads.length > 0 && (
                <div className="unread-reminder">

                  <p className="unread-reminder-title">
                    💬 You have{" "}
                    {unreadThreads.length} new message
                    {unreadThreads.length === 1
                      ? ""
                      : "s"}
                  </p>

                  <div className="unread-reminder-list">

                    {unreadThreads.map(
                      (thread) => (
                        <button
                          key={thread.id}
                          className="unread-thread-button"

                          onClick={() => {
                            navigate(
                              "/chat",
                              {
                                state: {
                                  chatId:
                                    thread.chatId,

                                  otherUser: {
                                    uid:
                                      thread.otherUid,

                                    name:
                                      thread.otherName,
                                  },
                                },
                              }
                            );
                          }}
                        >
                          {thread.otherName}
                        </button>
                      )
                    )}

                  </div>
                </div>
            )}

          </div>


          <div className="match-card">

            <div className="match-title">
              <span>
                Example match
              </span>

              <strong>
                92%
              </strong>
            </div>

            <div className="trait">
              <span>
                Sleep schedule
              </span>
              <b>✓</b>
            </div>

            <div className="trait">
              <span>
                Cleanliness
              </span>
              <b>✓</b>
            </div>

            <div className="trait">
              <span>
                Study habits
              </span>
              <b>✓</b>
            </div>

            <div className="trait">
              <span>
                Noise preference
              </span>
              <b>✓</b>
            </div>

            <div className="trait">
              <span>
                Social preference
              </span>
              <b>~</b>
            </div>

          </div>

        </section>


        <section
          className="how"
          id="how"
        >

          <p className="tag">
            HOW IT WORKS
          </p>

          <h2>
            Three steps to find your match.
          </h2>

          <div className="steps">

            <div>
              <span>01</span>

              <h3>
                Create your profile
              </h3>

              <p>
                Tell us your branch,
                year and lifestyle.
              </p>
            </div>

            <div>
              <span>02</span>

              <h3>
                Set your preferences
              </h3>

              <p>
                Tell us what matters most
                in a roommate.
              </p>
            </div>

            <div>
              <span>03</span>

              <h3>
                Get your matches
              </h3>

              <p>
                See your most compatible
                roommates.
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
              onClick={() =>
                navigate("/credits")
              }
            >
              About
            </button>

          </p>

        </footer>

      </div>
    );
  }


  /* =========================================================
     QUESTIONNAIRE
     PROTECTED
  ========================================================= */

  function QuestionnairePage() {

    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    if (lockedPartner) {
      return renderLocked();
    }

    return (
      <>
        <Questionnaire
          onBack={() =>
            navigate("/")
          }

          onSubmit={
            handleQuestionnaireSubmit
          }

          initialData={
            myProfile || undefined
          }
        />

        {submitting && (
          <p
            style={{
              textAlign: "center",
              color: "#8a8a8a",
              padding: "16px",
            }}
          >
            Saving your profile and
            finding matches...
          </p>
        )}

        {submitError && (
          <p
            style={{
              textAlign: "center",
              color: "#ef4444",
              padding: "16px",
            }}
          >
            {submitError}
          </p>
        )}
      </>
    );
  }


  /* =========================================================
     MATCHES
     PROTECTED
  ========================================================= */

  function MatchesPage() {

    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    if (lockedPartner) {
      return renderLocked();
    }

    return (
      <Matches
        matches={matches}

        onBack={() =>
          navigate("/questionnaire")
        }

        currentUser={{
          uid: user.uid,
          name:
            myProfile?.name ||
            user.email,
        }}

        onOpenChat={(chatInfo) => {
          navigate("/chat", {
            state: chatInfo,
          });
        }}
      />
    );
  }


  /* =========================================================
     CHAT
     PROTECTED
  ========================================================= */

  function ChatPage() {

    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    const chatInfo =
      location.state;

    if (!chatInfo) {
      return (
        <Navigate
          to="/matches"
          replace
        />
      );
    }

    const {
      chatId,
      otherUser,
    } = chatInfo;


    if (
      lockedPartner &&
      otherUser.uid !==
        lockedPartner.uid
    ) {
      return renderLocked();
    }


    return (
      <Chat
        chatId={chatId}

        otherUser={otherUser}

        currentUser={{
          uid: user.uid,
          name:
            myProfile?.name ||
            user.email,
        }}

        onBack={() =>
          navigate(
            lockedPartner
              ? "/"
              : "/matches"
          )
        }

        onLocked={(partnerUid) => {
          setLockedPartner({
            uid: partnerUid,
            name: otherUser.name,
          });
        }}
      />
    );
  }


  /* =========================================================
     REVIEWS
     PROTECTED
  ========================================================= */

  function ReviewsPage() {

    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    return (
      <MyReviews
        currentUser={{
          uid: user.uid,
        }}

        onBack={() =>
          navigate("/")
        }
      />
    );
  }


  /* =========================================================
     CREDITS
     PUBLIC
  ========================================================= */

  function CreditsPage() {
    return (
      <Credits
        onBack={() =>
          navigate("/")
        }
      />
    );
  }


  /* =========================================================
     FEEDBACK
     PROTECTED
  ========================================================= */

  function FeedbackPage() {

    if (!user) {
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }

    return (
      <Feedback
        currentUser={{
          uid: user.uid,
          email: user.email,
          name: myProfile?.name,
        }}

        onBack={() =>
          navigate("/")
        }
      />
    );
  }


  /* =========================================================
     AUTH LOADING
  ========================================================= */

  if (authLoading) {
    return (
      <div className="app">
        <p
          style={{
            textAlign: "center",
            padding: "80px 24px",
            color: "#8a8a8a",
          }}
        >
          Loading...
        </p>
      </div>
    );
  }


  /* =========================================================
     ROUTES
  ========================================================= */

  return (
    <Routes>

      {/* PUBLIC */}
      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/credits"
        element={<CreditsPage />}
      />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to="/"
              replace
            />
          ) : (
            <Login />
          )
        }
      />


      {/* PROTECTED */}
      <Route
        path="/questionnaire"
        element={
          <QuestionnairePage />
        }
      />

      <Route
        path="/matches"
        element={
          <MatchesPage />
        }
      />

      <Route
        path="/chat"
        element={
          <ChatPage />
        }
      />

      <Route
        path="/reviews"
        element={
          <ReviewsPage />
        }
      />

      <Route
        path="/feedback"
        element={
          <FeedbackPage />
        }
      />


      {/* UNKNOWN URL */}
      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}


/* =========================================================
   BROWSER ROUTER
========================================================= */

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
