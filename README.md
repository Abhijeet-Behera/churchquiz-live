
# ChurchQuiz Live ⛪ live multiplayer quiz platform

ChurchQuiz Live is an original, browser-based, real-time multiplayer quiz game designed specifically for church events, youth group gatherings, and projector presentations.

---

## 1. Project Overview
ChurchQuiz Live enables a **Host** (using a laptop connected to a projector) to create a room with a 6-digit PIN and stream questions in real time, while **Players** join using mobile web browsers to lock in answers, earn speed-based points, and track live rankings.

---

## 2. Key Features
- **Projector Host View**: High-contrast, large typography, real-time live player lobby counter, question display, server-controlled countdown timer, answer distribution, and leaderboard.
- **Mobile Player Interface**: High touch-target color-coded A/B/C/D buttons, answer lock confirmation, real-time correctness reveal, personal points earned, and overall rank tracking.
- **Server-Authoritative Game Engine**: Answers, scoring, and game progression state strictly calculated on the backend to prevent cheating.
- **Speed-Ratio Scoring**: Pure deterministic formula rewarding correct answers based on response speed (500–1000 points).
- **Session Persistence**: Session Storage integration allowing instant seamless reconnection upon page refresh.

---

## 3. Technology Stack
- **Frontend**: React 18, Vite, React Router v6, Socket.IO Client, CSS Custom Properties.
- **Backend**: Node.js, Express, Socket.IO.
- **Testing**: Vitest unit & Socket integration test suite.
- **Package Manager**: `npm`.

---

## 4. Architecture Explanation
The application employs a **Server-Authoritative Event-Driven Architecture**.
- **In-Memory Store**: `server/gameManager.js` maintains volatile state mapping 6-digit PINs to game objects.
- **Data Privacy**: Sensitive fields (`correctOption` and `explanation`) are stripped from `question:started` socket payloads emitted to players. They are only sent in `question:ended` events after the server timer expires.
- **State Machine Transitions**: `LOBBY` ➔ `QUESTION_ACTIVE` ➔ `QUESTION_RESULT` ➔ `LEADERBOARD` ➔ `FINISHED`.

---

## 5. Installation & Setup

```bash
# Install all dependencies (root and client subfolder)
npm install
```

---

## 6. Development Commands

```bash
# Start both client (Vite on port 5173) and server (Express on port 3001) simultaneously
npm run dev

# Start backend server only
npm run dev:server

# Start frontend client only
npm run dev:client
```

---

## 7. Testing Commands

```bash
# Run unit and integration tests using Vitest
npm test
```

---

## 8. How to Host a Game
1. Connect laptop to a projector screen and open `http://localhost:5173`.
2. Click **Host a Game (Projector Mode)**.
3. Click **Create Game Session**.
4. Display the generated 6-digit Game PIN on the screen.
5. As players join, observe their display names in real time.
6. Click **Start Quiz Now**.
7. Click **Next Question** after reviewing answer reveals and leaderboard rankings.

---

## 9. How Players Join
1. Open mobile browser to `http://localhost:5173` (or network host address).
2. Tap **Join a Game as Player**.
3. Enter the 6-digit PIN shown on the projector.
4. Enter a display name (2–20 characters).
5. Tap **Enter Lobby**.
6. When the question appears, tap one of the four colored option buttons (A, B, C, D).

---

## 10. Scoring Explanation

The backend uses a pure function `calculateScore(isCorrect, responseTimeMs, durationMs)`:
- **Wrong Answer**: `0 points`
- **Correct Answer**: Between `500` and `1000` points based on speed ratio.
- **Formula**:

  $$\text{speedRatio} = \max\left(0, 1 - \frac{\text{responseTimeMs}}{\text{durationMs}}\right)$$

  $$\text{score} = \text{round}(500 + 500 \times \text{speedRatio})$$

### Tie-Breaking Rules
1. Higher total score (descending)
2. Lower cumulative response time (ascending)
3. Earlier join timestamp (ascending)

---

## 11. Socket Event Documentation

### Client ➔ Server
- `host:create-game`: Request new game creation.
- `host:start-game`: Advance game from lobby to first question.
- `host:next-question`: Advance to next question or complete game.
- `host:end-game`: End session early.
- `player:join-game`: Join room with `{ pin, name, playerId }`.
- `player:submit-answer`: Submit answer payload `{ pin, playerId, selectedOption }`.
- `game:request-state`: Sync state on page refresh.

### Server ➔ Client
- `game:created`: Emits PIN and game initial configuration.
- `lobby:updated`: Emits list of joined players.
- `player:joined`: Confirms player entry.
- `game:started`: Signals quiz commencement.
- `question:started`: Emits public question data (options stripped of answers).
- `answer:accepted`: Confirms answer locked.
- `answer:rejected`: Rejection error callback.
- `question:ended`: Reveals correct option, explanation, and results.
- `leaderboard:updated`: Emits sorted player rankings.
- `game:ended`: Emits final game completion standings.
- `game:error`: Emits error code and message.

---

## 12. Project Folder Structure

```text
church-quiz-live/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── socket.js
│       ├── components/
│       │   ├── AnswerOption.jsx
│       │   ├── ErrorMessage.jsx
│       │   ├── Leaderboard.jsx
│       │   ├── LoadingState.jsx
│       │   ├── PlayerList.jsx
│       │   ├── QuestionDisplay.jsx
│       │   └── Timer.jsx
│       ├── context/
│       │   └── GameContext.jsx
│       ├── hooks/
│       │   └── useSocket.js
│       ├── pages/
│       │   ├── FinalResults.jsx
│       │   ├── Home.jsx
│       │   ├── HostGame.jsx
│       │   ├── HostLobby.jsx
│       │   ├── HostSetup.jsx
│       │   ├── PlayerGame.jsx
│       │   ├── PlayerJoin.jsx
│       │   └── PlayerLobby.jsx
│       └── styles/
│           └── main.css
├── server/
│   ├── constants.js
│   ├── gameManager.js
│   ├── index.js
│   ├── questions.json
│   ├── scoreManager.js
│   ├── socketHandlers.js
│   └── validation.js
├── tests/
│   ├── gameManager.test.js
│   ├── scoreManager.test.js
│   └── socketFlow.test.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── THIRD_PARTY_NOTICES.md
```

---

## 13. Known MVP Limitations
- In-memory storage: Game sessions cleared on backend server restart.
- No user authentication or persistent account database.
- Tested with 280 participants in a real-world session.
- Designed to scale up to 300 participants per game session.

---

## 14. Future Development Roadmap
- Custom quiz creator UI for church leaders.
- Persistent database for saved quizzes and high scores (PostgreSQL/MongoDB).
- QR code scanning on projector screen for faster mobile joining.
- Audio sound effects for countdown timers and podium reveals.

---

## 15. License & Third-Party Guidance
See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for full licensing details of third-party dependencies.
