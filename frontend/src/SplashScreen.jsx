
import React, { useEffect } from "react";

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img
          src="/flyflex-ai-logo.png"
          alt="FlyFlex AI"
          className="splash-logo"
        />
        <h1>FlyFlex-AI</h1>
        <p>Intelligent Flight Rescheduling System</p>
        <div className="splash-loader"></div>
      </div>
    </div>
  );
}
