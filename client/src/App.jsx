import React from 'react';


import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';


import {
  useAuth
} from '@clerk/react';


import { GameProvider } from './context/GameContext';


// General
import { Home } from './pages/Home';


// Authentication / Portal
import { HostLogin } from './pages/HostLogin';
import { HostPortal } from './pages/HostPortal';


// Host
import { HostSetup } from './pages/HostSetup';
import { HostLobby } from './pages/HostLobby';
import { HostGame } from './pages/HostGame';


// Player
import { PlayerJoin } from './pages/PlayerJoin';
import { PlayerLobby } from './pages/PlayerLobby';
import PlayerGame from './pages/PlayerGame';


// Results
import { FinalResults } from './pages/FinalResults';


// Projector / Presentation
import { QuestionPresentation } from './pages/QuestionPresentation';
import { LeaderboardPresentation } from './pages/LeaderboardPresentation';


const APP_MODE =
  import.meta.env.VITE_APP_MODE;


/* =========================================================
   PROTECTED HOST ROUTE
   ========================================================= */

function ProtectedHostRoute({
  children
}) {
  const {
    isLoaded,
    isSignedIn
  } = useAuth();


  if (!isLoaded) {
    return (
      <div
        className="app-container"
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '400px',
            width: '100%'
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              marginBottom: '1rem'
            }}
          >
            ⏳
          </div>

          <h2
            style={{
              color:
                'var(--accent-gold)'
            }}
          >
            Checking Access
          </h2>

          <p
            style={{
              color:
                'var(--text-muted)'
            }}
          >
            Verifying Host session...
          </p>
        </div>
      </div>
    );
  }


  if (!isSignedIn) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  return children;
}


export default function App() {
  return (
    <Router>
      <GameProvider>

        <Routes>

          {/* =====================================================
              HOST APPLICATION
              Normally running on localhost:5173
             ===================================================== */}

          {APP_MODE === 'host' && (
            <>

              {/* LOGIN */}

              <Route
                path="/login/*"
                element={
                  <HostLogin />
                }
              />


              {/* AUTHENTICATED PORTAL */}

              <Route
                path="/"
                element={
                  <ProtectedHostRoute>
                    <HostPortal />
                  </ProtectedHostRoute>
                }
              />


              {/* Host setup */}

              <Route
                path="/host"
                element={
                  <ProtectedHostRoute>
                    <HostSetup />
                  </ProtectedHostRoute>
                }
              />


              <Route
                path="/host/setup"
                element={
                  <ProtectedHostRoute>
                    <HostSetup />
                  </ProtectedHostRoute>
                }
              />


              {/* Host lobby */}

              <Route
                path="/host/:pin/lobby"
                element={
                  <ProtectedHostRoute>
                    <HostLobby />
                  </ProtectedHostRoute>
                }
              />


              <Route
                path="/host/lobby/:pin"
                element={
                  <ProtectedHostRoute>
                    <HostLobby />
                  </ProtectedHostRoute>
                }
              />


              {/* Host game */}

              <Route
                path="/host/:pin/game"
                element={
                  <ProtectedHostRoute>
                    <HostGame />
                  </ProtectedHostRoute>
                }
              />


              <Route
                path="/host/game/:pin"
                element={
                  <ProtectedHostRoute>
                    <HostGame />
                  </ProtectedHostRoute>
                }
              />


              {/* Host results */}

              <Route
                path="/host/:pin/results"
                element={
                  <ProtectedHostRoute>
                    <FinalResults />
                  </ProtectedHostRoute>
                }
              />


              <Route
                path="/host/results"
                element={
                  <ProtectedHostRoute>
                    <FinalResults />
                  </ProtectedHostRoute>
                }
              />


              <Route
                path="/results"
                element={
                  <ProtectedHostRoute>
                    <FinalResults />
                  </ProtectedHostRoute>
                }
              />


              {/* -----------------------------------------------
                  PROJECTOR / PRESENTATION OUTPUTS

                  These are protected too.
                  Projector windows opened from the authenticated
                  Host browser share the same Clerk session.
                 ----------------------------------------------- */}

              <Route
                path="/display/question/:pin"
                element={
                  <ProtectedHostRoute>
                    <QuestionPresentation />
                  </ProtectedHostRoute>
                }
              />


              <Route
                path="/display/leaderboard/:pin"
                element={
                  <ProtectedHostRoute>
                    <LeaderboardPresentation />
                  </ProtectedHostRoute>
                }
              />


              {/* Unknown Host route */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

            </>
          )}


          {/* =====================================================
              PLAYER APPLICATION
              Normally running on localhost:5174

              IMPORTANT:
              NO Clerk authentication is required here.
             ===================================================== */}

          {APP_MODE === 'player' && (
            <>

              <Route
                path="/"
                element={
                  <Navigate
                    to="/join"
                    replace
                  />
                }
              />


              {/* Player join */}

              <Route
                path="/join"
                element={
                  <PlayerJoin />
                }
              />


              <Route
                path="/player/join"
                element={
                  <PlayerJoin />
                }
              />


              {/* Player lobby */}

              <Route
                path="/play/:pin/lobby"
                element={
                  <PlayerLobby />
                }
              />


              <Route
                path="/player/lobby"
                element={
                  <PlayerLobby />
                }
              />


              {/* Player active game */}

              <Route
                path="/play/:pin/game"
                element={
                  <PlayerGame />
                }
              />


              <Route
                path="/player/game"
                element={
                  <PlayerGame />
                }
              />


              {/* Player results */}

              <Route
                path="/play/:pin/results"
                element={
                  <FinalResults />
                }
              />


              <Route
                path="/player/results"
                element={
                  <FinalResults />
                }
              />


              <Route
                path="/results"
                element={
                  <FinalResults />
                }
              />


              {/* Unknown Player route */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/join"
                    replace
                  />
                }
              />

            </>
          )}


          {/* =====================================================
              COMBINED / FALLBACK MODE
             ===================================================== */}

          {APP_MODE !== 'host' &&
            APP_MODE !== 'player' && (
              <>

                {/* Login */}

                <Route
                  path="/login/*"
                  element={
                    <HostLogin />
                  }
                />


                {/* Home remains available */}

                <Route
                  path="/"
                  element={
                    <Home />
                  }
                />


                {/* HOST — protected */}

                <Route
                  path="/host"
                  element={
                    <ProtectedHostRoute>
                      <HostSetup />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/setup"
                  element={
                    <ProtectedHostRoute>
                      <HostSetup />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/:pin/lobby"
                  element={
                    <ProtectedHostRoute>
                      <HostLobby />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/lobby/:pin"
                  element={
                    <ProtectedHostRoute>
                      <HostLobby />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/:pin/game"
                  element={
                    <ProtectedHostRoute>
                      <HostGame />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/game/:pin"
                  element={
                    <ProtectedHostRoute>
                      <HostGame />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/:pin/results"
                  element={
                    <ProtectedHostRoute>
                      <FinalResults />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/host/results"
                  element={
                    <ProtectedHostRoute>
                      <FinalResults />
                    </ProtectedHostRoute>
                  }
                />


                {/* PLAYER — public */}

                <Route
                  path="/join"
                  element={
                    <PlayerJoin />
                  }
                />


                <Route
                  path="/player/join"
                  element={
                    <PlayerJoin />
                  }
                />


                <Route
                  path="/play/:pin/lobby"
                  element={
                    <PlayerLobby />
                  }
                />


                <Route
                  path="/player/lobby"
                  element={
                    <PlayerLobby />
                  }
                />


                <Route
                  path="/play/:pin/game"
                  element={
                    <PlayerGame />
                  }
                />


                <Route
                  path="/player/game"
                  element={
                    <PlayerGame />
                  }
                />


                <Route
                  path="/play/:pin/results"
                  element={
                    <FinalResults />
                  }
                />


                <Route
                  path="/player/results"
                  element={
                    <FinalResults />
                  }
                />


                <Route
                  path="/results"
                  element={
                    <FinalResults />
                  }
                />


                {/* PRESENTATION — protected */}

                <Route
                  path="/display/question/:pin"
                  element={
                    <ProtectedHostRoute>
                      <QuestionPresentation />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="/display/leaderboard/:pin"
                  element={
                    <ProtectedHostRoute>
                      <LeaderboardPresentation />
                    </ProtectedHostRoute>
                  }
                />


                <Route
                  path="*"
                  element={
                    <Navigate
                      to="/"
                      replace
                    />
                  }
                />

              </>
            )}

        </Routes>

      </GameProvider>
    </Router>
  );
}