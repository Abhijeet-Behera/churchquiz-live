import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const { registerSocketHandlers } = require('../server/socketHandlers');
const { SOCKET_EVENTS } = require('../server/constants');

describe('Socket.IO Game Flow Integration', () => {
  let server, ioServer, port;
  let hostSocket, player1Socket, player2Socket;
  let gamePin;
  let player1Id, player2Id;

  beforeAll(async () => {
    const app = express();
    server = http.createServer(app);
    ioServer = new Server(server);

    ioServer.on('connection', (socket) => {
      registerSocketHandlers(ioServer, socket);
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (hostSocket) hostSocket.close();
    if (player1Socket) player1Socket.close();
    if (player2Socket) player2Socket.close();
    if (ioServer) ioServer.close();
    if (server) server.close();
  });

  it('completes host game creation and player joining flow', async () => {
    // 1. Host creates game
    hostSocket = ioClient(`http://localhost:${port}`);

    await new Promise((resolve) => {
      hostSocket.emit(SOCKET_EVENTS.HOST_CREATE_GAME, {}, (res) => {
        expect(res.success).toBe(true);
        gamePin = res.data.pin;
        expect(gamePin).toMatch(/^\d{6}$/);
        resolve();
      });
    });

    // 2. Player 1 (Rahul) joins
    player1Socket = ioClient(`http://localhost:${port}`);
    await new Promise((resolve) => {
      player1Socket.emit(SOCKET_EVENTS.PLAYER_JOIN_GAME, { pin: gamePin, name: 'Rahul' }, (res) => {
        expect(res.success).toBe(true);
        player1Id = res.data.player.id;
        expect(res.data.player.name).toBe('Rahul');
        resolve();
      });
    });

    // 3. Player 2 (Priya) joins
    player2Socket = ioClient(`http://localhost:${port}`);
    await new Promise((resolve) => {
      player2Socket.emit(SOCKET_EVENTS.PLAYER_JOIN_GAME, { pin: gamePin, name: 'Priya' }, (res) => {
        expect(res.success).toBe(true);
        player2Id = res.data.player.id;
        expect(res.data.player.name).toBe('Priya');
        resolve();
      });
    });
  });

  it('runs question cycle with answers, timer result, and leaderboard', async () => {
    // Host starts game
    let questionPayload;
    await new Promise((resolve) => {
      hostSocket.emit(SOCKET_EVENTS.HOST_START_GAME, { pin: gamePin }, (res) => {
        expect(res.success).toBe(true);
        questionPayload = res.data;
        expect(questionPayload.questionIndex).toBe(0);
        resolve();
      });
    });

    // 1. Rahul submits correct answer (1)
    await new Promise((resolve) => {
      player1Socket.emit(SOCKET_EVENTS.PLAYER_SUBMIT_ANSWER, {
        pin: gamePin,
        playerId: player1Id,
        selectedOption: 1
      }, (res) => {
        expect(res.success).toBe(true);
        expect(res.data.selectedOption).toBe(1);
        expect(res.data.isCorrect).toBeUndefined(); // Must NOT leak early!
        resolve();
      });
    });

    // 2. Duplicate answer from Rahul (before all players submit) should be rejected as ALREADY_ANSWERED
    await new Promise((resolve) => {
      player1Socket.emit(SOCKET_EVENTS.PLAYER_SUBMIT_ANSWER, {
        pin: gamePin,
        playerId: player1Id,
        selectedOption: 1
      }, (res) => {
        expect(res.success).toBe(false);
        expect(res.error.code).toBe('ALREADY_ANSWERED');
        resolve();
      });
    });

    // 3. Priya submits wrong answer (0) - triggers question end and delivers results payload
    await new Promise((resolve) => {
      player1Socket.on(SOCKET_EVENTS.QUESTION_ENDED, (resultData) => {
        expect(resultData.correctOption).toBe(1);
        expect(resultData.answers[player1Id].isCorrect).toBe(true);
        expect(resultData.answers[player1Id].pointsAwarded).toBeGreaterThanOrEqual(500);
        expect(resultData.answers[player2Id].isCorrect).toBe(false);
        expect(resultData.answers[player2Id].pointsAwarded).toBe(0);
        resolve();
      });

      player2Socket.emit(SOCKET_EVENTS.PLAYER_SUBMIT_ANSWER, {
        pin: gamePin,
        playerId: player2Id,
        selectedOption: 0
      }, (res) => {
        expect(res.success).toBe(true);
        expect(res.data.selectedOption).toBe(0);
      });
    });
  });
});
