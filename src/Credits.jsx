import "./Credits.css";

function Credits({ onBack }) {
  return (
    <div className="credits aurora-bg">

      <header className="credits-header">

        <button className="back-home" onClick={onBack}>
          ← Back
        </button>

        <p className="tag">ABOUT</p>

        <h1>
          Built for
          <br />
          <span>BIT Sindri students.</span>
        </h1>

        <p>
          A small project to make finding a compatible hostel roommate
          less of a guessing game.
        </p>

      </header>

      <main className="credits-body">

        <section className="credits-section">
          <h2>Made by</h2>
          <p>
            RoomMate was designed and built as a student project for BIT
            Sindri, to help students find roommates based on real lifestyle
            compatibility instead of random hostel allotment.
          </p>

          <div className="creator-links">
            <a
              href="https://www.reddit.com/user/CompetitiveLog1671"
              target="_blank"
              rel="noopener noreferrer"
              className="creator-link"
            >
              Reddit — u/CompetitiveLog1671
            </a>
            <a
              href="https://t.me/Transformer256"
              target="_blank"
              rel="noopener noreferrer"
              className="creator-link"
            >
              Telegram — @Transformer256
            </a>
          </div>
        </section>

        <section className="credits-section">
          <h2>Built with</h2>
          <ul className="tech-list">
            <li>React + Vite</li>
            <li>Firebase Authentication (email/password &amp; Google)</li>
            <li>Cloud Firestore</li>
            <li>A custom weighted compatibility algorithm</li>
          </ul>
        </section>

        <section className="credits-section">
          <h2>How matching works</h2>
          <p>
            Every answer you give is compared against other students using
            weighted similarity scoring — traits like sleep schedule and
            cleanliness count more heavily than smaller preferences. Matches
            where both people would pick each other are flagged as mutual.
          </p>
        </section>

      </main>

    </div>
  );
}

export default Credits;