import React, { useEffect, useRef, useState } from "react";

export function StartScreen({ onLaunch, onEnter }) {
  const [launching, setLaunching] = useState(false);
  const launchTimeoutRef = useRef(null);
  const finishTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(launchTimeoutRef.current);
      clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  function startLaunch() {
    if (launching) {
      return;
    }
    setLaunching(true);
    launchTimeoutRef.current = setTimeout(() => onLaunch?.(), 1600);
    finishTimeoutRef.current = setTimeout(() => onEnter?.(), 3800);
  }

  return (
    <main className={`start-screen ${launching ? "is-launching" : ""}`}>
      <div className="start-orbit" />
      <div className="launch-track" aria-hidden="true">
        <div className="rocket">
          <div className="rocket-window" />
          <div className="rocket-fin left" />
          <div className="rocket-fin right" />
          <div className="rocket-flame" />
          <div className="rocket-plume" />
        </div>
      </div>
      <section className="start-content">
        <span className="brand-kicker">SOYUZ</span>
        <h1>Obspace</h1>
        <button type="button" className="primary start-button" onClick={startLaunch} disabled={launching}>
          {launching ? "Lancando" : "Iniciar"}
        </button>
      </section>
    </main>
  );
}
