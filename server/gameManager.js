const { GAME_STATUS, LIMITS } = require('./constants');
const { calculateScore, sortLeaderboard } = require('./scoreManager');
const { validatePlayerName, validateOption } = require('./validation');
const defaultQuestions = require('./questions.json');

// In-memory games store: PIN -> Game object
const games = new Map();

/**
 * Generates a unique 6-digit PIN not currently in use.
 */
function generatePin() {
  let pin;

  do {
    pin = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
  } while (games.has(pin));

  return pin;
}

/**
 * Captures each player's leaderboard position at the START of a round.
 *
 * IMPORTANT:
 * This should be called once before a question begins.
 *
 * Do NOT call this:
 * - every time a player answers
 * - immediately before endQuestion() sorts the leaderboard
 *
 * Example:
 *
 * Before question:
 * Rahul = rank 1
 * Priya = rank 2
 *
 * snapshotRanks() stores:
 * Rahul.previousRank = 1
 * Priya.previousRank = 2
 *
 * After the question:
 * Priya becomes rank 1
 * Rahul becomes rank 2
 *
 * sortLeaderboard() can then calculate:
 * Priya.rankDelta = +1
 * Rahul.rankDelta = -1
 *
 * @param {Array<Object>} players
 */
function snapshotRanks(players) {
  for (const player of players) {
    player.previousRank =
      typeof player.rank === 'number'
        ? player.rank
        : null;

    // Clear movement from the previous round.
    player.rankDelta = 0;
  }
}

/**
 * Creates a new game hosted by the given socket ID.
 */
function createGame(
  hostSocketId,
  questionsList = defaultQuestions
) {
  const pin = generatePin();

  const game = {
    pin,
    hostSocketId,
    status: GAME_STATUS.LOBBY,

    currentQuestionIndex: -1,
    questionStartedAt: null,
    questionEndsAt: null,

    players: [],

    // {
    //   [questionIndex]: {
    //      [playerId]: answerObject
    //   }
    // }
    answers: {},

    questions: questionsList,

    timerId: null,
    createdAt: Date.now()
  };

  games.set(pin, game);

  return game;
}

/**
 * Retrieves a game by PIN.
 */
function getGame(pin) {
  if (!pin) {
    return null;
  }

  return (
    games.get(
      pin.toString().trim()
    ) || null
  );
}

/**
 * Adds a player to a game or reconnects an existing player.
 */
function addPlayer(
  pin,
  name,
  socketId,
  existingPlayerId = null
) {
  const game = getGame(pin);

  if (!game) {
    return {
      success: false,
      error: {
        code: 'GAME_NOT_FOUND',
        message:
          'The entered game PIN does not exist.'
      }
    };
  }

  // -------------------------------------------
  // PLAYER RECONNECTION
  // -------------------------------------------

  if (existingPlayerId) {
    const existingPlayer =
      game.players.find(
        player =>
          player.id === existingPlayerId
      );

    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      existingPlayer.connected = true;

      return {
        success: true,
        player: existingPlayer,
        isReconnect: true
      };
    }
  }

  // -------------------------------------------
  // NEW PLAYER CAN ONLY JOIN FROM LOBBY
  // -------------------------------------------

  if (game.status !== GAME_STATUS.LOBBY) {
    return {
      success: false,
      error: {
        code: 'GAME_ALREADY_STARTED',
        message:
          'Game has already started.'
      }
    };
  }

  // -------------------------------------------
  // 300 PLAYER LIMIT
  // -------------------------------------------

  if (
    game.players.length >=
    LIMITS.MAX_PLAYERS
  ) {
    return {
      success: false,
      error: {
        code: 'GAME_FULL',
        message:
          `This game has reached the maximum capacity of ${LIMITS.MAX_PLAYERS} players.`
      }
    };
  }

  // -------------------------------------------
  // VALIDATE PLAYER NAME
  // -------------------------------------------

  const validation =
    validatePlayerName(
      name,
      game.players
    );

  if (!validation.isValid) {
    return {
      success: false,
      error: {
        code: 'INVALID_NAME',
        message: validation.message
      }
    };
  }

  // -------------------------------------------
  // CREATE PLAYER
  // -------------------------------------------

  const newPlayer = {
    id:
      `player-${Date.now()}-` +
      Math.random()
        .toString(36)
        .substring(2, 8),

    socketId,

    name:
      validation.sanitizedName,

    score: 0,

    rank:
      game.players.length + 1,

    previousRank: null,

    rankDelta: 0,

    connected: true,

    joinedAt: Date.now(),

    totalResponseTimeMs: 0
  };

  game.players.push(newPlayer);

  /*
   * During the lobby all players have score 0.
   *
   * Keeping the leaderboard sorted here ensures
   * deterministic initial ranking using the
   * scoreManager tie-breaking rules.
   */
  snapshotRanks(game.players);

  game.players =
    sortLeaderboard(game.players);

  return {
    success: true,
    player: newPlayer,
    isReconnect: false
  };
}

/**
 * Starts a question at the supplied question index.
 */
function startQuestionAtIndex(
  game,
  index,
  onTimerExpire
) {
  if (
    !game ||
    index < 0 ||
    index >= game.questions.length
  ) {
    return null;
  }

  // -------------------------------------------
  // CLEAR PREVIOUS TIMER
  // -------------------------------------------

  if (game.timerId) {
    clearTimeout(game.timerId);
    game.timerId = null;
  }

  const currentQ =
    game.questions[index];

  const durationMs =
    currentQ.duration * 1000;

  const now = Date.now();

  // -------------------------------------------
  // UPDATE GAME STATE
  // -------------------------------------------

  game.status =
    GAME_STATUS.QUESTION_ACTIVE;

  game.currentQuestionIndex =
    index;

  game.questionStartedAt =
    now;

  game.questionEndsAt =
    now + durationMs;

  // -------------------------------------------
  // INITIALIZE ANSWERS FOR QUESTION
  // -------------------------------------------

  if (!game.answers[index]) {
    game.answers[index] = {};
  }

  // -------------------------------------------
  // SERVER-AUTHORITATIVE TIMER
  // -------------------------------------------

  game.timerId = setTimeout(
    () => {
      endQuestion(
        game.pin,
        onTimerExpire
      );
    },
    durationMs
  );

  // -------------------------------------------
  // SAFE PUBLIC QUESTION PAYLOAD
  //
  // correctOption and explanation are NOT sent
  // while the question is active.
  // -------------------------------------------

  const publicQuestionPayload = {
    id: currentQ.id,

    question:
      currentQ.question,

    options:
      currentQ.options,

    duration:
      currentQ.duration,

    questionIndex:
      index,

    totalQuestions:
      game.questions.length,

    questionStartedAt:
      game.questionStartedAt,

    questionEndsAt:
      game.questionEndsAt
  };

  return publicQuestionPayload;
}

/**
 * Starts the quiz from the lobby.
 */
function startGame(
  pin,
  hostSocketId,
  onTimerExpire
) {
  const game = getGame(pin);

  if (!game) {
    return {
      success: false,
      error: {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found.'
      }
    };
  }

  // -------------------------------------------
  // HOST AUTHORIZATION
  // -------------------------------------------

  if (
    game.hostSocketId !==
    hostSocketId
  ) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message:
          'Only the host can start the game.'
      }
    };
  }

  // -------------------------------------------
  // VALID STATE
  // -------------------------------------------

  if (
    game.status !==
    GAME_STATUS.LOBBY
  ) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE',
        message:
          'Game can only be started from the lobby.'
      }
    };
  }

  /*
   * CRITICAL:
   *
   * Capture leaderboard positions ONCE
   * before Question 1 begins.
   *
   * These positions remain unchanged while
   * answers are submitted.
   */
  snapshotRanks(game.players);

  const questionPayload =
    startQuestionAtIndex(
      game,
      0,
      onTimerExpire
    );

  return {
    success: true,
    questionPayload
  };
}

/**
 * Submits an answer for the current question.
 */
function submitAnswer(
  pin,
  playerId,
  selectedOption,
  serverTime = Date.now()
) {
  const game = getGame(pin);

  if (!game) {
    return {
      success: false,
      error: {
        code: 'GAME_NOT_FOUND',
        message: 'Game not found.'
      }
    };
  }

  // -------------------------------------------
  // QUESTION MUST BE ACTIVE
  // -------------------------------------------

  if (
    game.status !==
    GAME_STATUS.QUESTION_ACTIVE
  ) {
    return {
      success: false,
      error: {
        code: 'QUESTION_NOT_ACTIVE',
        message:
          'Question is not active for answers.'
      }
    };
  }

  // -------------------------------------------
  // SERVER TIMER VALIDATION
  // -------------------------------------------

  if (
    serverTime >
    game.questionEndsAt
  ) {
    return {
      success: false,
      error: {
        code: 'TIMER_EXPIRED',
        message:
          'Time has expired for this question.'
      }
    };
  }

  // -------------------------------------------
  // OPTION VALIDATION
  // -------------------------------------------

  if (
    !validateOption(
      selectedOption
    )
  ) {
    return {
      success: false,
      error: {
        code: 'INVALID_OPTION',
        message:
          'Selected option must be 0, 1, 2, or 3.'
      }
    };
  }

  // -------------------------------------------
  // PLAYER LOOKUP
  // -------------------------------------------

  const player =
    game.players.find(
      p => p.id === playerId
    );

  if (!player) {
    return {
      success: false,
      error: {
        code: 'PLAYER_NOT_FOUND',
        message:
          'Player record not found.'
      }
    };
  }

  const qIndex =
    game.currentQuestionIndex;

  // -------------------------------------------
  // DUPLICATE ANSWER PROTECTION
  // -------------------------------------------

  if (
    game.answers[qIndex] &&
    game.answers[qIndex][playerId]
  ) {
    return {
      success: false,
      error: {
        code: 'ALREADY_ANSWERED',
        message:
          'You have already submitted an answer for this question.'
      }
    };
  }

  const question =
    game.questions[qIndex];

  const responseTimeMs =
    Math.max(
      0,
      serverTime -
      game.questionStartedAt
    );

  const durationMs =
    question.duration * 1000;

  const isCorrect =
    selectedOption ===
    question.correctOption;

  const pointsAwarded =
    calculateScore(
      isCorrect,
      responseTimeMs,
      durationMs
    );

  // -------------------------------------------
  // CREATE ANSWER RECORD
  // -------------------------------------------

  const answerObj = {
    playerId,

    questionId:
      question.id,

    selectedOption,

    submittedAt:
      serverTime,

    responseTimeMs,

    isCorrect,

    pointsAwarded
  };

  game.answers[qIndex][playerId] =
    answerObj;

  // -------------------------------------------
  // UPDATE PLAYER SCORE
  // -------------------------------------------

  player.score +=
    pointsAwarded;

  player.totalResponseTimeMs +=
    responseTimeMs;

  /*
   * IMPORTANT:
   *
   * DO NOT:
   *
   * snapshotRanks(game.players)
   *
   * DO NOT:
   *
   * sortLeaderboard(game.players)
   *
   * here.
   *
   * We want previousRank to remain the player's
   * position from BEFORE the question began.
   *
   * Ranking is finalized only once when the
   * question ends.
   *
   * This is also substantially better for
   * 300-player performance because we avoid
   * sorting the complete leaderboard after
   * every individual answer.
   */

  // -------------------------------------------
  // ANSWER COUNTERS
  // -------------------------------------------

  const activeAnswersCount =
    Object.keys(
      game.answers[qIndex]
    ).length;

  const connectedPlayersCount =
    game.players.filter(
      p => p.connected
    ).length;

  return {
    success: true,

    data: {
      answer:
        answerObj,

      submittedCount:
        activeAnswersCount,

      totalPlayers:
        connectedPlayersCount,

      allAnswered:
        activeAnswersCount >=
        connectedPlayersCount &&
        connectedPlayersCount > 0
    }
  };
}

/**
 * Ends the active question.
 *
 * Reveals the correct answer and calculates
 * the FINAL leaderboard for this round.
 *
 * Idempotent:
 * Safe to call multiple times.
 */
function endQuestion(
  pin,
  callback
) {
  const game = getGame(pin);

  if (!game) {
    return null;
  }

  // -------------------------------------------
  // IDEMPOTENCY PROTECTION
  // -------------------------------------------

  if (
    game.status !==
    GAME_STATUS.QUESTION_ACTIVE
  ) {
    return null;
  }

  // -------------------------------------------
  // CLEAR TIMER
  // -------------------------------------------

  if (game.timerId) {
    clearTimeout(game.timerId);
    game.timerId = null;
  }

  game.status =
    GAME_STATUS.QUESTION_RESULT;

  const qIndex =
    game.currentQuestionIndex;

  const question =
    game.questions[qIndex];

  /*
   * CRITICAL:
   *
   * DO NOT snapshot ranks here.
   *
   * previousRank already represents the
   * player's position BEFORE the question.
   *
   * Now sort once using the new scores.
   *
   * scoreManager.sortLeaderboard() will set:
   *
   * rank
   * previousRank
   * rankDelta
   *
   * Example:
   *
   * previousRank = 4
   * rank = 2
   *
   * rankDelta = +2
   */
  game.players =
    sortLeaderboard(
      game.players
    );

  // -------------------------------------------
  // QUESTION RESULT PAYLOAD
  // -------------------------------------------

  const resultPayload = {
    questionIndex:
      qIndex,

    totalQuestions:
      game.questions.length,

    correctOption:
      question.correctOption,

    explanation:
      question.explanation,

    answersCount:
      Object.keys(
        game.answers[qIndex] || {}
      ).length,

    leaderboard:
      game.players,

    answers:
      game.answers[qIndex] || {}
  };

  // -------------------------------------------
  // TIMER / SOCKET CALLBACK
  // -------------------------------------------

  if (
    typeof callback ===
    'function'
  ) {
    callback(
      game,
      resultPayload
    );
  }

  return resultPayload;
}

/**
 * Advances to the next question
 * or finishes the game.
 */
function nextQuestion(
  pin,
  hostSocketId,
  onTimerExpire
) {
  const game = getGame(pin);

  if (!game) {
    return {
      success: false,
      error: {
        code: 'GAME_NOT_FOUND',
        message:
          'Game not found.'
      }
    };
  }

  // -------------------------------------------
  // HOST AUTHORIZATION
  // -------------------------------------------

  if (
    game.hostSocketId !==
    hostSocketId
  ) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message:
          'Only the host can advance the game.'
      }
    };
  }

  // -------------------------------------------
  // VALID STATE
  // -------------------------------------------

  if (
    game.status !==
    GAME_STATUS.QUESTION_RESULT &&
    game.status !==
    GAME_STATUS.LEADERBOARD
  ) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATE',
        message:
          'Cannot advance until current question results are displayed.'
      }
    };
  }

  const nextIndex =
    game.currentQuestionIndex + 1;

  // -------------------------------------------
  // FINISH GAME
  // -------------------------------------------

  if (
    nextIndex >=
    game.questions.length
  ) {
    game.status =
      GAME_STATUS.FINISHED;

    return {
      success: true,
      isFinished: true,
      leaderboard:
        game.players
    };
  }

  /*
   * CRITICAL:
   *
   * Snapshot the FINAL leaderboard from the
   * previous round BEFORE the next question.
   *
   * This becomes the baseline against which
   * the next question's rank movement is
   * calculated.
   */
  snapshotRanks(
    game.players
  );

  const questionPayload =
    startQuestionAtIndex(
      game,
      nextIndex,
      onTimerExpire
    );

  return {
    success: true,
    isFinished: false,
    questionPayload
  };
}

/**
 * Handles socket disconnection.
 */
function handleDisconnect(
  socketId
) {
  for (
    const [pin, game]
    of games.entries()
  ) {
    // -----------------------------------------
    // HOST DISCONNECTED
    // -----------------------------------------

    if (
      game.hostSocketId ===
      socketId
    ) {
      /*
       * Game remains active.
       * Host reconnection/grace period can
       * continue to be handled elsewhere.
       */
      return {
        type:
          'HOST_DISCONNECTED',

        pin,

        game
      };
    }

    // -----------------------------------------
    // PLAYER DISCONNECTED
    // -----------------------------------------

    const player =
      game.players.find(
        p =>
          p.socketId ===
          socketId
      );

    if (player) {
      player.connected = false;

      return {
        type:
          'PLAYER_DISCONNECTED',

        pin,

        player,

        game
      };
    }
  }

  return null;
}

/**
 * Cleans up / deletes a game.
 */
function removeGame(pin) {
  const game =
    games.get(pin);

  if (
    game &&
    game.timerId
  ) {
    clearTimeout(
      game.timerId
    );
  }

  games.delete(pin);
}

// ---------------------------------------------
// EXPORTS
// ---------------------------------------------

module.exports = {
  games,

  generatePin,

  createGame,

  getGame,

  addPlayer,

  startGame,

  submitAnswer,

  endQuestion,

  nextQuestion,

  handleDisconnect,

  removeGame,

  snapshotRanks
};