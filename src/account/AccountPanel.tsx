import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { api, setSession, useAccount } from "./api";
import type {
  AccountUser,
  Board,
  CarOption,
  DailyChallenge,
  Page,
  PlayerStats,
  SavedRun,
} from "./api";
import { useGame } from "../game/store";
import "./account.css";

export function AccountPanel({ close }: { close: () => void }) {
  const { token, user } = useAccount();
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  const [history, setHistory] = useState<Page<SavedRun> | null>(null);
  const [page, setPage] = useState(1);
  const [board, setBoard] = useState<Board | null>(null);
  const [metric, setMetric] = useState("score");
  const dialog = useRef<HTMLDialogElement>(null);
  const selected = useGame((state) => state.selectedCar);
  const status = useGame((state) => state.status);
  const canChangeCar = status === "ready" || status === "finished";

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      try {
        const result = await api<Board>(
          `/leaderboard?metric=${metric}&limit=10`,
        );
        if (active) setBoard(result);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load rankings.");
      }
    }

    void loadLeaderboard();
    return () => { active = false; };
  }, [metric]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function loadProfile() {
      try {
        const profile = await api<AccountUser>("/users/me");
        if (!active) return;
        useAccount.setState({ user: profile });

        const records = await api<PlayerStats>("/users/me/stats");
        if (!active) return;
        setStats(records);

        const availableCars = await api<CarOption[]>("/cars");
        if (!active) return;
        setCars(availableCars);

        const challenge = await api<DailyChallenge>("/challenges/daily");
        if (!active) return;
        setDaily(challenge);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load your profile.");
      }
    }

    void loadProfile();
    // Ignore responses if the panel closes or the account changes.
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    async function loadHistory() {
      try {
        const runs = await api<Page<SavedRun>>(`/runs/me?page=${page}&limit=5`);
        if (active) setHistory(runs);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load your runs.");
      }
    }

    void loadHistory();
    return () => { active = false; };
  }, [token, page]);

  async function authenticate(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await api<{ user: AccountUser; accessToken: string }>(
        register ? "/auth/register" : "/auth/login",
        {
          email: form.get("email"),
          password: form.get("password"),
          ...(register ? { username: form.get("username") } : {}),
        },
      );
      setPage(1);
      setSession(response.accessToken, response.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="account-panel"
      onCancel={close}
      aria-labelledby="account-title"
    >
      <div className="account-heading">
        <h2 id="account-title">
          {user && token ? user.username : "Player profile"}
        </h2>
        <button type="button" onClick={close} aria-label="Close profile">
          Close
        </button>
      </div>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      {!token ? (
        <form onSubmit={authenticate}>
          <p>
            Sign in to save runs and carry your progress across devices. Guest
            driving is always available.
          </p>
          {register && (
            <label>
              Username
              <input
                name="username"
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]{3,24}"
                autoComplete="username"
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={64}
              autoComplete={register ? "new-password" : "current-password"}
            />
          </label>
          <button className="account-primary" disabled={busy}>
            {busy ? "Please wait..." : register ? "Create account" : "Log in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "I already have an account" : "Create an account"}
          </button>
        </form>
      ) : (
        <>
          <button
            onClick={() => {
              setSession("", null);
              useGame.getState().selectCar(null);
              setStats(null);
              setCars([]);
              setHistory(null);
              setDaily(null);
            }}
          >
            Log out
          </button>
          {stats && (
            <section>
              <h3>Your records</h3>
              <div className="account-records">
                <span>{stats.totalRuns} saved runs</span>
                <span>{(stats.totalDistance / 1000).toFixed(2)} km total</span>
                <span>{stats.bestScore.toLocaleString()} best score</span>
                <span>{Math.round(stats.highestSpeed)} km/h fastest</span>
                <span>
                  {stats.rewardPoints.toLocaleString()} challenge points
                </span>
              </div>
            </section>
          )}
          {daily && (
            <section>
              <h3>Daily challenge · UTC</h3>
              <strong>{daily.title}</strong>
              <p>{daily.description}</p>
              <small>
                {daily.completed
                  ? "Completed"
                  : `${daily.reward} reward points`}
              </small>
            </section>
          )}
          <section>
            <h3>Garage</h3>
            <p>
              {canChangeCar
                ? "Choose a car for your next run."
                : "Finish this run to change cars."}
            </p>
            <label>
              Car
              <select
                disabled={!canChangeCar || !cars.length}
                value={
                  selected?.id ??
                  cars.find((car) => car.key === "starter")?.id ??
                  ""
                }
                onChange={(event) =>
                  useGame
                    .getState()
                    .selectCar(
                      cars.find((car) => car.id === event.target.value) ?? null,
                    )
                }
              >
                {cars.map((car) => (
                  <option key={car.id} value={car.id} disabled={!car.owned}>
                    {car.name}
                    {car.owned
                      ? ""
                      : ` — locked (${car.unlockRequirement} ${car.unlockType})`}
                  </option>
                ))}
              </select>
            </label>
          </section>
          {history && (
            <section>
              <h3>Run history</h3>
              {!history.data.length && (
                <p>No saved runs yet. Finish a race and save your result.</p>
              )}
              <ul>
                {history.data.map((run) => (
                  <li key={run.id}>
                    {run.score.toLocaleString()} points ·{" "}
                    {(run.distance / 1000).toFixed(2)} km{" "}
                    <small>
                      {run.isValid
                        ? new Date(run.createdAt).toLocaleDateString()
                        : `Not ranked: ${run.validationReason}`}
                    </small>
                  </li>
                ))}
              </ul>
              <div className="account-pages">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span>
                  Page {page} / {Math.max(1, history.pagination.pages)}
                </span>
                <button
                  disabled={page >= history.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </>
      )}
      <section>
        <h3>Global leaderboard</h3>
        <label>
          Rank by
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
          >
            <option value="score">Best score</option>
            <option value="distance">Longest distance</option>
            <option value="speed">Highest speed</option>
          </select>
        </label>
        {board && (
          <ol className="leaderboard">
            {board.entries.map((entry) => (
              <li key={entry.username}>
                <span>
                  {entry.rank}. {entry.username}
                </span>
                <strong>
                  {metric === "distance"
                    ? `${(entry.value / 1000).toFixed(2)} km`
                    : metric === "speed"
                      ? `${Math.round(entry.value)} km/h`
                      : entry.value.toLocaleString()}
                </strong>
              </li>
            ))}
          </ol>
        )}
        {board?.entries.length === 0 && <p>No ranked runs yet.</p>}
      </section>
    </dialog>
  );
}
