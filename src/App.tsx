import { Component, useState } from "react";
import { AccountPanel } from "./account/AccountPanel";
import { SaveRun } from "./account/SaveRun";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { RACE_DISTANCE } from "./game/route";
import { Game } from "./game/Game";
import { RouteMap } from "./game/RouteMap";
import { TouchControls } from "./game/TouchControls";
import { EngineAudio } from "./game/EngineAudio";
import { useGame } from "./game/store";
const districts = [
  "DOWNTOWN",
  "MARKET STREET",
  "CITY BOULEVARD",
  "RIVER BRIDGE",
  "DOWNTOWN",
  "GARDEN AVENUE",
  "UNDERPASS",
  "WAREHOUSE",
];
import "./App.css";

class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="graphics-error">
        3D graphics could not start. Enable hardware acceleration and reload in
        a WebGL-capable browser.
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  const game = useGame();
  const [profileOpen, setProfileOpen] = useState(false);
  function openAccount() {
    if (useGame.getState().status === 'playing') useGame.getState().pause();
    setProfileOpen(true);
  }
  const crossedFinish = game.distance >= RACE_DISTANCE;
  const district = districts[Math.floor(game.distance / 80) % districts.length];
  return (
    <main className={`game-${game.status}`}>
      <SceneBoundary>
        <Canvas
          camera={{ position: [0, 5, 12], fov: 60 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          fallback={
            <p className="graphics-error">
              This game requires WebGL. Try a browser with hardware acceleration
              enabled.
            </p>
          }
        >
          <Game key={game.run} />
        </Canvas>
      </SceneBoundary>
      <div className="vignette" />
      {game.impacts > 0 && (
        <div
          key={`impact-${game.run}-${game.impacts}`}
          className="impact-flash"
          aria-hidden="true"
        />
      )}
      <header>
        <div className="brand">
          <span>JLB24</span> STREET
          <small>THE CITY IS YOUR CIRCUIT</small>
        </div>
        <div className="district">
          <i /> {district}
          <small>5 KM NIGHT RACE / 01</small>
        </div>
        <div className="header-actions"><EngineAudio /><button
          className="quiet"
          onClick={game.pause}
          disabled={game.status !== "playing" && game.status !== "paused"}
        >
          {game.status === "paused" ? "RESUME" : "PAUSE"} <kbd>ESC</kbd>
        </button></div></header>
      <button className="quiet account-launch" onClick={openAccount}>PROFILE & RANKINGS</button>
      {profileOpen && <AccountPanel close={() => setProfileOpen(false)} />}
      <aside className="stats">
        <div>
          <small>DISTANCE / {RACE_DISTANCE / 1000} KM</small>
          <strong>
            {(game.distance / 1000).toFixed(2)} <em>KM</em>
          </strong>
        </div>
        <div>
          <small>SCORE</small>
          <strong>{game.score.toLocaleString().padStart(5, "0")}</strong>
        </div>
        <div>
          <small>PERSONAL BEST</small>
          <strong>{game.best.toLocaleString()}</strong>
        </div>
      </aside>
      {game.status !== "playing" && (
        <section className="menu" aria-label="Game menu">
          <span className="eyebrow">
            {game.status === "paused"
              ? "TAKE A BREATHER"
              : game.status === "finished" ? (crossedFinish ? "FINISH LINE REACHED" : "RUN ENDED EARLY") : "AFTER HOURS. FULL THROTTLE."}
          </span>
          <h1>
            {game.status === "paused" ? (
              <>
                RUN
                <br />
                <span>PAUSED.</span>
              </>
            ) : (
              <>
                {game.status === "finished" ? "NICE" : "OWN THE"}
                <br />
                <span>{game.status === "finished" ? "RUN." : "NIGHT."}</span>
              </>
            )}
          </h1>
          <p>
            {game.status === "paused"
              ? "Your run is right where you left it."
              : game.status === "finished" ? (crossedFinish ? "You completed the 5 km race! Save your result before racing again." : "You ended this run before the finish line. You can still save your result.") : "Three lanes. Five kilometres. Dodge the traffic and reach the chequered finish line."}
          </p>
          <button
            className="start"
            onClick={game.status === "paused" ? game.pause : game.start}
          >
            {game.status === "paused" ? "RESUME RUN" : "START YOUR ENGINE"}{" "}
            <span>&#8599;</span>
          </button>
          {game.status === "paused" && <button className="quiet finish-run" onClick={game.finish}>END RUN EARLY</button>}
          {game.status === "finished" && <SaveRun key={game.run} openAccount={openAccount} />}
          <small className="hint keyboard-hint">
            W / UP TO ACCELERATE · A D / LEFT RIGHT TO STEER
          </small>
          <small className="hint touch-hint">HOLD GAS + AN ARROW TO DRIVE. LANDSCAPE RECOMMENDED.</small>
          <a className="audio-credit" href={`${import.meta.env.BASE_URL}audio/credits.txt`} target="_blank" rel="noreferrer">Engine recording: qubodup · CC BY 3.0</a>
        </section>
      )}
      <RouteMap />
      <TouchControls />
      <footer>
        <div className="controls">
          <span>
            <kbd>W</kbd> ACCELERATE
          </span>
          <span>
            <kbd>S</kbd> BRAKE
          </span>
          <span>
            <kbd>A</kbd>
            <kbd>D</kbd> STEER
          </span>
          <span>
            <kbd>SPACE</kbd> NITRO
          </span>
        </div>
        <div className="dashboard">
          <div className="nitro">
            <small>
              NITRO <span>{Math.round(game.boost)}%</span>
            </small>
            <progress
              max="100"
              value={game.boost}
              aria-label="Nitro remaining"
            />
          </div>
          <div className="speed">
            <strong>
              {Math.round(game.speed).toString().padStart(3, "0")}
            </strong>
            <span>KM/H</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
