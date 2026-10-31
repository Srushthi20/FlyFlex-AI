
import React, { useState } from "react";
import api from "./api.js";

export default function AuthPage({
  role,
  onAuthenticated,
  onBack
}) {
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const endpoint = isSignup
        ? "/auth/register"
        : "/auth/login";

      const payload = isSignup
        ? { fullName, email, password }
        : { email, password };

      const response = await api.post(endpoint, payload);
      const account = response.data;

      if (!account.token) {
        throw new Error("Login response did not contain a token.");
      }

      if (account.role !== role) {
        throw new Error(
          role === "ADMIN"
            ? "This account does not have administrator access."
            : "Please use the correct account type."
        );
      }

      localStorage.setItem("flyflex_token", account.token);
      localStorage.setItem(
        "flyflex_user",
        JSON.stringify(account)
      );

      onAuthenticated(account);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Authentication failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <form className="auth-card" onSubmit={handleSubmit}>
        <img
          src="/flyflex-ai-logo.png"
          alt="FlyFlex AI"
          className="auth-logo"
        />

        <span className="eyebrow">
          {role === "ADMIN" ? "ADMIN PORTAL" : "USER PORTAL"}
        </span>

        <h1>
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>

        <p>
          {role === "ADMIN"
            ? "Sign in with your authorized administrator account."
            : "Sign in to manage your flight bookings."}
        </p>

        {isSignup && role === "USER" && (
          <label>
            Full name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
              placeholder="Enter your full name"
            />
          </label>
        )}

        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Enter your password"
          />
        </label>

        {error && (
          <div className="alert error">{error}</div>
        )}

        <button
          type="submit"
          className="primary auth-submit"
          disabled={busy}
        >
          {busy
            ? "Please wait..."
            : isSignup
              ? "Create account"
              : "Sign in"}
        </button>

        {role === "USER" && (
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup
              ? "Already registered? Sign in"
              : "New user? Create an account"}
          </button>
        )}
      </form>
    </div>
  );
}
