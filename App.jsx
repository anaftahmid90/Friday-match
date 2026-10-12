
import React, { useState, useEffect, useMemo } from "react";
import "./styles.css";

/* ==========================================
   FOOTBALL ARENA
   Core application and data models
   ========================================== */

const STORAGE_KEY = "football_arena_admin_data_v1";

const createId = (prefix = "item") =>
  `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const emptyDatabase = {
  settings: {
    appName: "Football Arena",
    adminName: "Administrator",
    currency: "BDT",
    season: "2026",
  },
  tournaments: [],
  teams: [],
  players: [],
  matches: [],
  events: [],
  awards: [],
};

function loadDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyDatabase;

    const parsed = JSON.parse(saved);

    return {
      ...emptyDatabase,
      ...parsed,
      settings: {
        ...emptyDatabase.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch (error) {
    console.error("Could not load saved data:", error);
    return emptyDatabase;
  }
}

function saveDatabase(database) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(database)
    );
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    return false;
  }
}

const formatDate = (value) => {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString();
};

function calculatePlayerStats(playerId, events) {
  const playerEvents = events.filter(
    (event) =>
      event.playerId === playerId ||
      event.assistPlayerId === playerId
  );

  return {
    goals: playerEvents.filter(
      (event) =>
        event.playerId === playerId &&
        event.type === "goal"
    ).length,

    assists: playerEvents.filter(
      (event) =>
        event.assistPlayerId === playerId &&
        event.type === "goal"
    ).length,

    hatTricks: (() => {
      const goalMatches = {};

      playerEvents
        .filter(
          (event) =>
            event.playerId === playerId &&
            event.type === "goal"
        )
        .forEach((event) => {
          goalMatches[event.matchId] =
            (goalMatches[event.matchId] || 0) + 1;
        });

      return Object.values(goalMatches).filter(
        (count) => count >= 3
      ).length;
    })(),
  };
}

function calculateMatchScore(match, events) {
  const matchEvents = events.filter(
    (event) => event.matchId === match.id
  );

  return {
    home: matchEvents.filter(
      (event) =>
        event.type === "goal" &&
        event.teamId === match.homeTeamId
    ).length,

    away: matchEvents.filter(
      (event) =>
        event.type === "goal" &&
        event.teamId === match.awayTeamId
    ).length,
  };
}

function getTopScorers(players, events) {
  return players
    .map((player) => ({
      ...player,
      ...calculatePlayerStats(player.id, events),
    }))
    .sort((a, b) => b.goals - a.goals);
}

function getTopAssists(players, events) {
  return players
    .map((player) => ({
      ...player,
      ...calculatePlayerStats(player.id, events),
    }))
    .sort((a, b) => b.assists - a.assists);
}

function getTeamName(teams, teamId) {
  return (
    teams.find((team) => team.id === teamId)?.name ||
    "Unknown team"
  );
}

function getPlayerName(players, playerId) {
  return (
    players.find((player) => player.id === playerId)?.name ||
    "Unknown player"
  );
}

export default function App() {
  const [database, setDatabase] = useState(loadDatabase);
  const [page, setPage] = useState("home");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    saveDatabase(database);
  }, [database]);

  const updateCollection = (collection, updater) => {
    setDatabase((current) => ({
      ...current,
      [collection]: updater(current[collection]),
    }));
  };

  const addRecord = (collection, record) => {
    const newRecord = {
      ...record,
      id: createId(collection),
      createdAt: new Date().toISOString(),
    };

    updateCollection(collection, (items) => [
      ...items,
      newRecord,
    ]);

    setNotice("Successfully added.");
    return newRecord;
  };

  const removeRecord = (collection, recordId) => {
    updateCollection(collection, (items) =>
      items.filter((item) => item.id !== recordId)
    );

    setNotice("Record deleted.");
  };

  const statistics = useMemo(
    () => ({
      tournaments: database.tournaments.length,
      teams: database.teams.length,
      players: database.players.length,
      matches: database.matches.length,
      goals: database.events.filter(
        (event) => event.type === "goal"
      ).length,
    }),
    [database]
  );

  const topScorers = useMemo(
    () => getTopScorers(database.players, database.events),
    [database.players, database.events]
  );

  const topAssists = useMemo(
    () => getTopAssists(database.players, database.events),
    [database.players, database.events]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚽ {database.settings.appName}</h1>
        <p>Manage your football universe</p>
      </header>

      <nav className="main-nav">
        {[
          ["home", "Home"],
          ["tournaments", "Tournaments"],
          ["teams", "Teams"],
          ["players", "Players"],
          ["matches", "Matches"],
          ["statistics", "Statistics"],
          ["admin", "Admin"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={page === key ? "active" : ""}
            onClick={() => setPage(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="page-content">
        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        {page === "home" && (
          <section>
            <h2>Football Dashboard</h2>

            <div className="stat-grid">
              {Object.entries(statistics).map(
                ([label, value]) => (
                  <article className="stat-card" key={label}>
                    <h3>{label}</h3>
                    <strong>{value}</strong>
                  </article>
                )
              )}
            </div>

            <h2>Quick actions</h2>
            <div className="quick-actions">
              <button onClick={() => setPage("tournaments")}>
                Create tournament
              </button>
              <button onClick={() => setPage("teams")}>
                Add team
              </button>
              <button onClick={() => setPage("players")}>
                Add player
              </button>
              <button onClick={() => setPage("matches")}>
                Manage matches
              </button>
            </div>
          </section>
        )}

        {page === "statistics" && (
          <section>
            <h2>Top Scorers</h2>
            {topScorers.map((player) => (
              <p key={player.id}>
                {player.name}: {player.goals} goals
              </p>
            ))}

            <h2>Top Assists</h2>
            {topAssists.map((player) => (
              <p key={player.id}>
                {player.name}: {player.assists} assists
              </p>
            ))}
          </section>
        )}

        {page === "admin" && (
          <section>
            <h2>Admin panel</h2>
            <p>
              Manage tournaments, teams, players, matches,
              goals, assists and awards.
            </p>
            <p>
              Data is currently saved in this browser.
            </p>
          </section>
        )}

        {page !== "home" &&
          page !== "statistics" &&
          page !== "admin" && (
            <section>
              <h2>
                {page.charAt(0).toUpperCase() + page.slice(1)}
              </h2>
              <p>
                This section will be expanded in the next
                code parts.
              </p>
            </section>
          )}
      </main>

      <footer>
        <p>Football Arena • Admin workspace</p>
      </footer>
    </div>
  );
}
