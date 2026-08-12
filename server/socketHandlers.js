const { SOCKET_EVENTS } = require('./constants');
const gameManager = require('./gameManager');

let clerkBackendPromise = null;

function getClerkBackend() {
  if (!clerkBackendPromise) {
    clerkBackendPromise = import('@clerk/backend');
  }

  return clerkBackendPromise;
}

function getClerkAuthorizedParties() {
  const raw =
    process.env.CLERK_AUTHORIZED_PARTIES || '';

  const parties = raw
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  return parties.length > 0
    ? parties
    : undefined;
}

async function verifyHostAuthToken(authToken) {
  if (!authToken) {
    return {
      success: false,
      error: {
        code: 'HOST_AUTH_REQUIRED',
        message:
          'A valid Host login is required.'
      }
    };
  }

  if (!process.env.CLERK_SECRET_KEY) {
    console.error(
      '[AUTH] CLERK_SECRET_KEY is not configured.'
    );

    return {
      success: false,
      error: {
        code: 'AUTH_CONFIG_ERROR',
        message:
          'Host authentication is not configured on the server.'
      }
    };
  }

  try {
    const { verifyToken } =
      await getClerkBackend();

    const options = {
      secretKey:
        process.env.CLERK_SECRET_KEY
    };

    const authorizedParties =
      getClerkAuthorizedParties();

    if (authorizedParties) {
      options.authorizedParties =
        authorizedParties;
    }

    const verifiedToken =
      await verifyToken(
        authToken,
        options
      );

    return {
      success: true,
      userId:
        verifiedToken.sub,
      sessionId:
        verifiedToken.sid || null
    };
  } catch (err) {
    console.warn(
      '[AUTH] Clerk Host token verification failed:',
      err?.message || err
    );

    return {
      success: false,
      error: {
        code: 'INVALID_HOST_AUTH',
        message:
          'Your Host session is invalid or expired. Please sign in again.'
      }
    };
  }
}


const MAX_CUSTOM_QUESTIONS = 100;

function validateCustomQuestions(questions) {
  if (!Array.isArray(questions)) {
    return {
      success: false,
      error: {
        code: 'INVALID_QUESTIONS',
        message: 'Questions must be an array.'
      }
    };
  }

  if (questions.length < 1) {
    return {
      success: false,
      error: {
        code: 'INVALID_QUESTIONS',
        message: 'A quiz must contain at least one question.'
      }
    };
  }

  if (questions.length > MAX_CUSTOM_QUESTIONS) {
    return {
      success: false,
      error: {
        code: 'TOO_MANY_QUESTIONS',
        message: `A quiz can contain a maximum of ${MAX_CUSTOM_QUESTIONS} questions.`
      }
    };
  }

  const normalizedQuestions = [];

  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i] || {};

    const questionText =
      typeof q.question === 'string'
        ? q.question.trim()
        : '';

    if (!questionText) {
      return {
        success: false,
        error: {
          code: 'INVALID_QUESTION',
          message: `Question ${i + 1} has no question text.`
        }
      };
    }

    if (
      !Array.isArray(q.options) ||
      q.options.length !== 4
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPTIONS',
          message: `Question ${i + 1} must contain exactly 4 answer options.`
        }
      };
    }

    const options = q.options.map(option =>
      typeof option === 'string'
        ? option.trim()
        : ''
    );

    if (options.some(option => !option)) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPTIONS',
          message: `Question ${i + 1} contains an empty answer option.`
        }
      };
    }

    const correctOption =
      Number(q.correctOption);

    if (
      !Number.isInteger(correctOption) ||
      correctOption < 0 ||
      correctOption > 3
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_CORRECT_OPTION',
          message: `Question ${i + 1} has an invalid correct answer.`
        }
      };
    }

    const duration =
      Number(q.duration);

    if (
      !Number.isFinite(duration) ||
      duration < 5 ||
      duration > 120
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_DURATION',
          message: `Question ${i + 1} must have a timer between 5 and 120 seconds.`
        }
      };
    }

    const explanation =
      typeof q.explanation === 'string'
        ? q.explanation.trim()
        : '';

    normalizedQuestions.push({
      id:
        typeof q.id === 'string' && q.id.trim()
          ? q.id.trim()
          : `custom-question-${i + 1}-${Date.now()}`,

      question: questionText,

      options,

      correctOption,

      explanation,

      duration
    });
  }

  return {
    success: true,
    questions: normalizedQuestions
  };
}

/**
 * Registers all Socket.IO event handlers.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerSocketHandlers(io, socket) {

  // Track if this socket is a presentation-only client
  let isPresentationClient = false;

  /**
   * Verify Clerk authentication for every Host command.
   * This keeps Player events public while protecting host:* events.
   */
  async function requireAuthenticatedHost(
    payload,
    callback
  ) {
    const auth =
      await verifyHostAuthToken(
        payload?.authToken
      );

    if (!auth.success) {
      const response = {
        success: false,
        error: auth.error
      };

      if (
        typeof callback ===
        'function'
      ) {
        callback(response);
      }

      socket.emit(
        SOCKET_EVENTS.GAME_ERROR,
        auth.error
      );

      return null;
    }

    socket.data.clerkUserId =
      auth.userId;

    socket.data.clerkSessionId =
      auth.sessionId;

    return auth;
  }

  // Helper: reject host actions from presentation clients
  function guardHostAction(pin, callback) {
    if (isPresentationClient) {
      const err = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message:
            'Presentation clients cannot perform host actions.'
        }
      };

      if (typeof callback === 'function') {
        callback(err);
      }

      return true;
    }

    const game =
      gameManager.getGame(pin);

    if (
      !game ||
      game.hostSocketId !== socket.id
    ) {
      const err = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message:
            'Only the host can perform this action.'
        }
      };

      if (typeof callback === 'function') {
        callback(err);
      }

      socket.emit(
        SOCKET_EVENTS.GAME_ERROR,
        err.error
      );

      return true;
    }

    return false;
  }

  // Callback helper for ending question on timer expiration
  const handleQuestionTimerExpired = (
    game,
    resultPayload
  ) => {
    io.to(game.pin).emit(
      SOCKET_EVENTS.QUESTION_ENDED,
      resultPayload
    );

    io.to(game.pin).emit(
      SOCKET_EVENTS.LEADERBOARD_UPDATED,
      {
        leaderboard:
          resultPayload.leaderboard
      }
    );
  };


  /* =========================================================
     HOST: CREATE GAME
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.HOST_CREATE_GAME,
    async (payload, callback) => {

      if (isPresentationClient) {
        const err = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message:
              'Presentation clients cannot create games.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(err);
        }

        return;
      }

      const auth =
        await requireAuthenticatedHost(
          payload,
          callback
        );

      if (!auth) {
        return;
      }

      try {
        const incomingQuestions =
          payload?.questions;

        let game;

        /*
         * No custom questions supplied.
         * Use server/questions.json.
         */
        if (
          typeof incomingQuestions ===
          'undefined'
        ) {
          game =
            gameManager.createGame(
              socket.id
            );
        } else {

          /*
           * Custom Quiz Profile
           */
          const validation =
            validateCustomQuestions(
              incomingQuestions
            );

          if (!validation.success) {
            if (
              typeof callback ===
              'function'
            ) {
              callback(validation);
            }

            socket.emit(
              SOCKET_EVENTS.GAME_ERROR,
              validation.error
            );

            return;
          }

          game =
            gameManager.createGame(
              socket.id,
              validation.questions
            );
        }

        socket.join(game.pin);

        const responseData = {
          pin: game.pin,
          status: game.status,
          players: game.players,
          totalQuestions:
            game.questions.length
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback({
            success: true,
            data: responseData
          });
        }

        socket.emit(
          SOCKET_EVENTS.GAME_CREATED,
          responseData
        );

      } catch (err) {
        console.error(
          'Error creating game:',
          err
        );

        const response = {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message:
              'Failed to create game.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(response);
        }

        socket.emit(
          SOCKET_EVENTS.GAME_ERROR,
          response.error
        );
      }
    }
  );


  /* =========================================================
     HOST: START GAME
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.HOST_START_GAME,
    async (payload, callback) => {

      const auth =
        await requireAuthenticatedHost(
          payload,
          callback
        );

      if (!auth) {
        return;
      }

      const { pin } =
        payload || {};

      if (
        guardHostAction(
          pin,
          callback
        )
      ) {
        return;
      }

      const result =
        gameManager.startGame(
          pin,
          socket.id,
          handleQuestionTimerExpired
        );

      if (!result.success) {
        if (
          typeof callback ===
          'function'
        ) {
          callback(result);
        }

        return socket.emit(
          SOCKET_EVENTS.GAME_ERROR,
          result.error
        );
      }

      if (
        typeof callback ===
        'function'
      ) {
        callback({
          success: true,
          data:
            result.questionPayload
        });
      }

      io.to(pin).emit(
        SOCKET_EVENTS.GAME_STARTED,
        { pin }
      );

      io.to(pin).emit(
        SOCKET_EVENTS.QUESTION_STARTED,
        result.questionPayload
      );
    }
  );


  /* =========================================================
     HOST: NEXT QUESTION
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.HOST_NEXT_QUESTION,
    async (payload, callback) => {

      const auth =
        await requireAuthenticatedHost(
          payload,
          callback
        );

      if (!auth) {
        return;
      }

      const { pin } =
        payload || {};

      if (
        guardHostAction(
          pin,
          callback
        )
      ) {
        return;
      }

      const result =
        gameManager.nextQuestion(
          pin,
          socket.id,
          handleQuestionTimerExpired
        );

      if (!result.success) {
        if (
          typeof callback ===
          'function'
        ) {
          callback(result);
        }

        return socket.emit(
          SOCKET_EVENTS.GAME_ERROR,
          result.error
        );
      }

      if (result.isFinished) {

        if (
          typeof callback ===
          'function'
        ) {
          callback({
            success: true,
            data: {
              isFinished: true
            }
          });
        }

        io.to(pin).emit(
          SOCKET_EVENTS.GAME_ENDED,
          {
            leaderboard:
              result.leaderboard
          }
        );

      } else {

        if (
          typeof callback ===
          'function'
        ) {
          callback({
            success: true,
            data:
              result.questionPayload
          });
        }

        io.to(pin).emit(
          SOCKET_EVENTS.QUESTION_STARTED,
          result.questionPayload
        );
      }
    }
  );


  /* =========================================================
     HOST: END GAME
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.HOST_END_GAME,
    async (payload, callback) => {

      const auth =
        await requireAuthenticatedHost(
          payload,
          callback
        );

      if (!auth) {
        return;
      }

      const { pin } =
        payload || {};

      if (
        guardHostAction(
          pin,
          callback
        )
      ) {
        return;
      }

      const game =
        gameManager.getGame(pin);

      if (
        typeof callback ===
        'function'
      ) {
        callback({
          success: true,
          data: {
            isFinished: true
          }
        });
      }

      io.to(pin).emit(
        SOCKET_EVENTS.GAME_ENDED,
        {
          leaderboard:
            game.players
        }
      );

      gameManager.removeGame(pin);
    }
  );


  /* =========================================================
     PLAYER: JOIN GAME
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.PLAYER_JOIN_GAME,
    (payload, callback) => {

      if (isPresentationClient) {
        const err = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message:
              'Presentation clients cannot join as players.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(err);
        }

        return;
      }

      const {
        pin,
        name,
        playerId
      } = payload || {};

      const result =
        gameManager.addPlayer(
          pin,
          name,
          socket.id,
          playerId
        );

      if (!result.success) {
        if (
          typeof callback ===
          'function'
        ) {
          callback(result);
        }

        return socket.emit(
          SOCKET_EVENTS.GAME_ERROR,
          result.error
        );
      }

      socket.join(pin);

      const game =
        gameManager.getGame(pin);

      const player =
        result.player;

      const ackResponse = {
        success: true,
        data: {
          pin: game.pin,
          player,
          status:
            game.status,
          isReconnect:
            result.isReconnect,
          currentQuestionIndex:
            game.currentQuestionIndex
        }
      };

      if (
        typeof callback ===
        'function'
      ) {
        callback(ackResponse);
      }

      socket.emit(
        SOCKET_EVENTS.PLAYER_JOINED,
        ackResponse.data
      );

      io.to(pin).emit(
        SOCKET_EVENTS.LOBBY_UPDATED,
        {
          players:
            game.players,

          playerCount:
            game.players.length
        }
      );
    }
  );


  /* =========================================================
     PLAYER: SUBMIT ANSWER
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.PLAYER_SUBMIT_ANSWER,
    (payload, callback) => {

      if (isPresentationClient) {
        const err = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message:
              'Presentation clients cannot submit answers.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(err);
        }

        return;
      }

      const {
        pin,
        playerId,
        selectedOption
      } = payload || {};

      const result =
        gameManager.submitAnswer(
          pin,
          playerId,
          selectedOption,
          Date.now()
        );

      if (!result.success) {
        if (
          typeof callback ===
          'function'
        ) {
          callback(result);
        }

        return socket.emit(
          SOCKET_EVENTS.ANSWER_REJECTED,
          result.error
        );
      }

      const {
        answer,
        submittedCount,
        totalPlayers,
        allAnswered
      } = result.data;

      const ackData = {
        success: true,
        data: {
          selectedOption:
            answer.selectedOption,

          submittedAt:
            answer.submittedAt
        }
      };

      if (
        typeof callback ===
        'function'
      ) {
        callback(ackData);
      }

      socket.emit(
        SOCKET_EVENTS.ANSWER_ACCEPTED,
        ackData.data
      );

      io.to(pin).emit(
        'answer:count-updated',
        {
          submittedCount,
          totalPlayers
        }
      );

      /*
       * Automatically end early when all
       * active players answered.
       */
      if (allAnswered) {
        gameManager.endQuestion(
          pin,
          handleQuestionTimerExpired
        );
      }
    }
  );


  /* =========================================================
     PRESENTATION: JOIN
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.PRESENTATION_JOIN,
    (payload, callback) => {

      const {
        pin,
        role
      } = payload || {};

      const validRoles = [
        'question-display',
        'leaderboard-display'
      ];

      if (
        !validRoles.includes(role)
      ) {
        const err = {
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message:
              'Invalid presentation role.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(err);
        }

        return;
      }

      const game =
        gameManager.getGame(pin);

      if (!game) {
        const err = {
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message:
              'Game not found.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(err);
        }

        return;
      }

      isPresentationClient = true;

      socket.join(pin);

      const isQuestionActive =
        game.status ===
        'QUESTION_ACTIVE';

      let currentQuestion =
        null;

      if (
        game.currentQuestionIndex >= 0 &&
        game.questions[
        game.currentQuestionIndex
        ]
      ) {
        const q =
          game.questions[
          game.currentQuestionIndex
          ];

        currentQuestion = {
          id: q.id,
          question:
            q.question,
          options:
            q.options,
          duration:
            q.duration,

          questionIndex:
            game.currentQuestionIndex,

          totalQuestions:
            game.questions.length,

          questionStartedAt:
            game.questionStartedAt,

          questionEndsAt:
            game.questionEndsAt,

          ...(
            isQuestionActive
              ? {}
              : {
                correctOption:
                  q.correctOption,

                explanation:
                  q.explanation
              }
          )
        };
      }

      const stateData = {
        pin: game.pin,
        status:
          game.status,
        role,
        players:
          game.players,
        currentQuestion,
        leaderboard:
          game.players
      };

      if (
        typeof callback ===
        'function'
      ) {
        callback({
          success: true,
          data:
            stateData
        });
      }

      socket.emit(
        SOCKET_EVENTS.PRESENTATION_STATE,
        stateData
      );
    }
  );


  /* =========================================================
     GAME: REQUEST STATE
     Refresh / reconnect sync
     ========================================================= */

  socket.on(
    SOCKET_EVENTS.GAME_REQUEST_STATE,
    (payload, callback) => {

      const {
        pin,
        playerId
      } = payload || {};

      const game =
        gameManager.getGame(pin);

      if (!game) {
        const res = {
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message:
              'Game not found.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(res);
        }

        return;
      }

      const player =
        game.players.find(
          p =>
            p.id === playerId
        );

      const isHost =
        game.hostSocketId ===
        socket.id;

      /*
       * A player requesting restored private
       * state must use the socket currently
       * assigned to that player.
       */
      if (
        playerId &&
        (
          !player ||
          player.socketId !==
          socket.id
        ) &&
        !isHost
      ) {
        const res = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message:
              'Unable to restore player session.'
          }
        };

        if (
          typeof callback ===
          'function'
        ) {
          callback(res);
        }

        return;
      }

      const qIndex =
        game.currentQuestionIndex;

      const question =
        qIndex >= 0
          ? game.questions[
          qIndex
          ]
          : null;

      const questionIsActive =
        game.status ===
        'QUESTION_ACTIVE';

      let currentQuestionPayload =
        null;

      if (question) {
        currentQuestionPayload = {
          id:
            question.id,

          question:
            question.question,

          options:
            question.options,

          duration:
            question.duration,

          questionIndex:
            qIndex,

          totalQuestions:
            game.questions.length,

          questionStartedAt:
            game.questionStartedAt,

          questionEndsAt:
            game.questionEndsAt
        };

        /*
         * Correct answer only after
         * the question has ended.
         */
        if (!questionIsActive) {
          currentQuestionPayload.correctOption =
            question.correctOption;

          currentQuestionPayload.explanation =
            question.explanation;
        }
      }

      const answers =
        game.answers[qIndex] ||
        {};

      const myAnswer =
        player
          ? answers[player.id] ||
          null
          : null;

      const hasAnswered =
        Boolean(myAnswer);

      const result =
        question &&
          !questionIsActive
          ? {
            correctOption:
              question.correctOption,

            explanation:
              question.explanation,

            myAnswer:
              myAnswer
                ? {
                  selectedOption:
                    myAnswer.selectedOption,

                  isCorrect:
                    myAnswer.isCorrect,

                  pointsAwarded:
                    myAnswer.pointsAwarded,

                  responseTimeMs:
                    myAnswer.responseTimeMs
                }
                : null
          }
          : null;

      const stateData = {
        pin:
          game.pin,

        status:
          game.status,

        isHost,

        player,

        players:
          game.players,

        currentQuestionIndex:
          qIndex,

        currentQuestion:
          currentQuestionPayload,

        hasAnswered,

        leaderboard:
          questionIsActive
            ? []
            : game.players,

        result
      };

      const res = {
        success: true,
        data:
          stateData
      };

      if (
        typeof callback ===
        'function'
      ) {
        callback(res);
      }
    }
  );


  /* =========================================================
     DISCONNECT
     ========================================================= */

  socket.on(
    'disconnect',
    () => {

      const info =
        gameManager.handleDisconnect(
          socket.id
        );

      if (
        info &&
        info.pin
      ) {
        io.to(info.pin).emit(
          SOCKET_EVENTS.LOBBY_UPDATED,
          {
            players:
              info.game.players,

            playerCount:
              info.game.players.length
          }
        );
      }
    }
  );
}


module.exports = {
  registerSocketHandlers
};