import { describe, it, expect, beforeEach } from 'vitest';
const gameManager = require('../server/gameManager');
const { GAME_STATUS } = require('../server/constants');

describe('gameManager', () => {
  let hostSocketId;

  beforeEach(() => {
    hostSocketId = 'host-socket-123';
  });

  it('generates a 6-digit PIN and creates game', () => {
    const game = gameManager.createGame(hostSocketId);
    expect(game.pin).toMatch(/^\d{6}$/);
    expect(game.status).toBe(GAME_STATUS.LOBBY);
    expect(game.hostSocketId).toBe(hostSocketId);
  });

  it('allows players to join successfully', () => {
    const game = gameManager.createGame(hostSocketId);
    const joinResult = gameManager.addPlayer(game.pin, 'Rahul', 'player-socket-1');

    expect(joinResult.success).toBe(true);
    expect(joinResult.player.name).toBe('Rahul');
    expect(game.players.length).toBe(1);
  });

  it('rejects duplicate player names (case-insensitive)', () => {
    const game = gameManager.createGame(hostSocketId);
    gameManager.addPlayer(game.pin, 'Rahul', 'socket-1');

    const duplicateResult = gameManager.addPlayer(game.pin, 'rahul', 'socket-2');
    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error.code).toBe('INVALID_NAME');
  });

  it('enforces host permissions for starting game', () => {
    const game = gameManager.createGame(hostSocketId);
    const unauthorizedResult = gameManager.startGame(game.pin, 'imposter-socket');

    expect(unauthorizedResult.success).toBe(false);
    expect(unauthorizedResult.error.code).toBe('UNAUTHORIZED');

    const authorizedResult = gameManager.startGame(game.pin, hostSocketId);
    expect(authorizedResult.success).toBe(true);
  });

  it('rejects invalid state transitions', () => {
    const game = gameManager.createGame(hostSocketId);
    // Submit answer in lobby
    const answerResult = gameManager.submitAnswer(game.pin, 'p1', 0);
    expect(answerResult.success).toBe(false);
    expect(answerResult.error.code).toBe('QUESTION_NOT_ACTIVE');
  });

  it('prevents a player from answering twice', () => {
    const game = gameManager.createGame(hostSocketId);
    const joinRes = gameManager.addPlayer(game.pin, 'Rahul', 'socket-1');
    const player = joinRes.player;

    gameManager.startGame(game.pin, hostSocketId);

    const firstAnswer = gameManager.submitAnswer(game.pin, player.id, 1, game.questionStartedAt + 1000);
    expect(firstAnswer.success).toBe(true);

    const secondAnswer = gameManager.submitAnswer(game.pin, player.id, 2, game.questionStartedAt + 2000);
    expect(secondAnswer.success).toBe(false);
    expect(secondAnswer.error.code).toBe('ALREADY_ANSWERED');
  });

  it('rejects late answers submitted after server questionEndsAt timestamp', () => {
    const game = gameManager.createGame(hostSocketId);
    const joinRes = gameManager.addPlayer(game.pin, 'Rahul', 'socket-1');
    const player = joinRes.player;

    gameManager.startGame(game.pin, hostSocketId);

    const lateTime = game.questionEndsAt + 500;
    const lateAnswer = gameManager.submitAnswer(game.pin, player.id, 1, lateTime);

    expect(lateAnswer.success).toBe(false);
    expect(lateAnswer.error.code).toBe('TIMER_EXPIRED');
  });

  it('advances through questions to final game state', () => {
    const game = gameManager.createGame(hostSocketId);
    gameManager.addPlayer(game.pin, 'Rahul', 'socket-1');

    gameManager.startGame(game.pin, hostSocketId);
    gameManager.endQuestion(game.pin);

    // Fast-forward through rest of questions
    for (let i = 1; i < game.questions.length; i++) {
      gameManager.nextQuestion(game.pin, hostSocketId);
      gameManager.endQuestion(game.pin);
    }

    const finalRes = gameManager.nextQuestion(game.pin, hostSocketId);
    expect(finalRes.success).toBe(true);
    expect(finalRes.isFinished).toBe(true);
    expect(game.status).toBe(GAME_STATUS.FINISHED);
  });
});
