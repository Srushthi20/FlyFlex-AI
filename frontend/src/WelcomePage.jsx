
import React from "react";

export default function WelcomePage({ onChooseRole }) {
  return (
    <div className="welcome-screen">
      <header className="welcome-header">
        <img src="/flyflex-ai-logo.png" alt="FlyFlex AI" />
        <span>FlyFlex-AI</span>
      </header>

      <main className="welcome-main">
        <span className="eyebrow">WELCOME TO FLYFLEX-AI</span>

        <h1>
          Smarter flights.
          <br />
          <span>Simpler rescheduling.</span>
        </h1>

        <p>
          An intelligent flight rescheduling platform that helps
          travellers find suitable alternative flights.
        </p>

        <div className="role-cards">
          <button
            className="role-card"
            onClick={() => onChooseRole("USER")}
          >
            <div className="role-icon">✈</div>
            <h2>User</h2>
            <p>
              Register or sign in to manage your bookings,
              explore flights and request rescheduling.
            </p>
            <span>Continue as User →</span>
          </button>

          <button
            className="role-card"
            onClick={() => onChooseRole("ADMIN")}
          >
            <div className="role-icon">⚙</div>
            <h2>Admin</h2>
            <p>
              Restricted administrator access to manage
              users and monitor rescheduling requests.
            </p>
            <span>Continue as Admin →</span>
          </button>
        </div>
      </main>

      <footer className="welcome-footer">
        FlyFlex-AI · Intelligent Flight Rescheduling
      </footer>
    </div>
  );
}
