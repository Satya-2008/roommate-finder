import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "./firebase";
import "./Login.css";

const googleProvider = new GoogleAuthProvider();

function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter both an email and a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // No need to redirect manually — App.jsx listens for auth
      // state changes and will switch screens automatically.
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged in App.jsx picks this up automatically.
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(friendlyError(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <p className="tag">
          {mode === "signup" ? "CREATE ACCOUNT" : "WELCOME BACK"}
        </p>

        <h1>
          {mode === "signup" ? "Join RoomMate" : "Log in to RoomMate"}
        </h1>

        <p className="subtitle">
          {mode === "signup"
            ? "Create an account to find your roommate matches."
            : "Log in to see your matches."}
        </p>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? "Please wait..." : "Continue with Google"}
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Sign up"
              : "Log in"}
          </button>
        </form>

        <p className="switch-mode">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button type="button" onClick={switchMode}>
                Log in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button type="button" onClick={switchMode}>
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default Login;