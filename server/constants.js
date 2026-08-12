const GAME_STATUS = {
  LOBBY: 'LOBBY',
  QUESTION_ACTIVE: 'QUESTION_ACTIVE',
  QUESTION_RESULT: 'QUESTION_RESULT',
  LEADERBOARD: 'LEADERBOARD',
  FINISHED: 'FINISHED'
};

const SOCKET_EVENTS = {
  // Client -> Server
  HOST_CREATE_GAME: 'host:create-game',
  HOST_START_GAME: 'host:start-game',
  HOST_NEXT_QUESTION: 'host:next-question',
  HOST_END_GAME: 'host:end-game',
  PLAYER_JOIN_GAME: 'player:join-game',
  PLAYER_SUBMIT_ANSWER: 'player:submit-answer',
  GAME_REQUEST_STATE: 'game:request-state',
  PRESENTATION_JOIN: 'presentation:join',

  // Server -> Client
  GAME_CREATED: 'game:created',
  LOBBY_UPDATED: 'lobby:updated',
  PLAYER_JOINED: 'player:joined',
  GAME_STARTED: 'game:started',
  QUESTION_STARTED: 'question:started',
  ANSWER_ACCEPTED: 'answer:accepted',
  ANSWER_REJECTED: 'answer:rejected',
  QUESTION_ENDED: 'question:ended',
  LEADERBOARD_UPDATED: 'leaderboard:updated',
  GAME_ENDED: 'game:ended',
  GAME_ERROR: 'game:error',
  PRESENTATION_STATE: 'presentation:state'
};

const SCORING = {
  MIN_CORRECT_SCORE: 500,
  MAX_CORRECT_SCORE: 1000,
  WRONG_SCORE: 0
};

const LIMITS = {
  MAX_PLAYERS: 300,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 20
};

module.exports = {
  GAME_STATUS,
  SOCKET_EVENTS,
  SCORING,
  LIMITS
};
