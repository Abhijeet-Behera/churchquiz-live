import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';

import { useAuth } from '@clerk/react';
import { socket } from '../socket';

const GameContext = createContext(null);

const STORAGE_KEYS = {
  PIN: 'churchquiz_pin',
  PLAYER_ID: 'churchquiz_player_id',
  PLAYER_NAME: 'churchquiz_player_name'
};

function savePlayerSession(pin, player) {
  if (!pin || !player?.id) return;

  localStorage.setItem(STORAGE_KEYS.PIN, pin);
  localStorage.setItem(STORAGE_KEYS.PLAYER_ID, player.id);

  if (player.name) {
    localStorage.setItem(
      STORAGE_KEYS.PLAYER_NAME,
      player.name
    );
  }
}

function clearPlayerSession() {
  localStorage.removeItem(STORAGE_KEYS.PIN);
  localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
  localStorage.removeItem(STORAGE_KEYS.PLAYER_NAME);

  // Clean old sessionStorage values from previous version.
  sessionStorage.removeItem('churchquiz_pin');
  sessionStorage.removeItem('churchquiz_player_id');
}

export const GameProvider = ({ children }) => {
  const { getToken, isSignedIn } = useAuth();

  const [pin, setPin] = useState('');

  const [role, setRole] = useState(null);

  const [player, setPlayer] = useState(null);

  const [players, setPlayers] = useState([]);

  const [gameStatus, setGameStatus] =
    useState('LOBBY');

  const [
    currentQuestion,
    setCurrentQuestion
  ] = useState(null);

  const [
    selectedOption,
    setSelectedOption
  ] = useState(null);

  const [
    answerResult,
    setAnswerResult
  ] = useState(null);

  const [
    submittedCount,
    setSubmittedCount
  ] = useState(0);

  const [
    leaderboard,
    setLeaderboard
  ] = useState([]);

  const [error, setError] = useState(null);

  const [loading, setLoading] =
    useState(false);

  /**
   * True while a saved player is being restored
   * after refresh/reload.
   */
  const [
    sessionRestoring,
    setSessionRestoring
  ] = useState(true);

  const playerRef = useRef(null);

  const restoreInProgressRef =
    useRef(false);

  /**
   * Returns a fresh Clerk session token for Host-only Socket.IO actions.
   * Player actions remain public and do not use this token.
   */
  const getHostAuthToken =
    useCallback(async () => {
      if (!isSignedIn) {
        return null;
      }

      try {
        return await getToken();
      } catch (err) {
        console.error(
          '[GameContext] Unable to get Clerk session token:',
          err
        );

        return null;
      }
    }, [getToken, isSignedIn]);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  /**
   * Apply state returned by game:request-state.
   */
  const applyRestoredGameState =
    useCallback((data) => {
      if (!data) return;

      if (data.pin) {
        setPin(data.pin);
      }

      setRole('player');

      if (data.status) {
        setGameStatus(data.status);
      }

      if (data.player) {
        setPlayer(data.player);
        playerRef.current =
          data.player;

        savePlayerSession(
          data.pin,
          data.player
        );
      }

      if (Array.isArray(data.players)) {
        setPlayers(data.players);
      }

      if (
        Array.isArray(data.leaderboard)
      ) {
        setLeaderboard(
          data.leaderboard
        );
      }

      if (data.currentQuestion) {
        setCurrentQuestion(
          data.currentQuestion
        );
      } else {
        setCurrentQuestion(null);
      }

      /**
       * If the player already answered before
       * refreshing, lock the answer buttons.
       *
       * -1 means "answered, but exact selected
       * option was not restored".
       */
      if (
        data.status ===
        'QUESTION_ACTIVE'
      ) {
        setSelectedOption(
          data.hasAnswered
            ? -1
            : null
        );

        setAnswerResult(null);
      }

      /**
       * Restore result information if server
       * supplies it.
       */
      if (
        data.status ===
        'QUESTION_RESULT'
      ) {
        setSelectedOption(
          data.hasAnswered
            ? -1
            : null
        );

        if (data.result) {
          setAnswerResult({
            correctOption:
              data.result.correctOption,

            explanation:
              data.result.explanation,

            isCorrect:
              data.result.myAnswer
                ?.isCorrect ?? false,

            pointsAwarded:
              data.result.myAnswer
                ?.pointsAwarded ?? 0
          });
        }
      }
    }, []);

  /**
   * Restore a player session.
   *
   * This runs:
   * - on initial page load
   * - after Socket.IO reconnects
   */
  const restorePlayerSession =
    useCallback(() => {
      const savedPin =
        localStorage.getItem(
          STORAGE_KEYS.PIN
        ) ||
        sessionStorage.getItem(
          'churchquiz_pin'
        );

      const savedPlayerId =
        localStorage.getItem(
          STORAGE_KEYS.PLAYER_ID
        ) ||
        sessionStorage.getItem(
          'churchquiz_player_id'
        );

      if (
        !savedPin ||
        !savedPlayerId
      ) {
        setSessionRestoring(false);
        return;
      }

      if (!socket.connected) {
        return;
      }

      if (
        restoreInProgressRef.current
      ) {
        return;
      }

      restoreInProgressRef.current =
        true;

      setSessionRestoring(true);
      setError(null);

      /**
       * Step 1:
       * Rebind the saved player record
       * to the new Socket.IO connection.
       */
      socket.emit(
        'player:join-game',
        {
          pin: savedPin,
          playerId: savedPlayerId
        },
        joinResponse => {
          if (
            !joinResponse?.success
          ) {
            restoreInProgressRef.current =
              false;

            clearPlayerSession();

            setPlayer(null);
            setPin('');
            setRole(null);
            setSessionRestoring(false);

            return;
          }

          const restoredPlayer =
            joinResponse.data.player;

          setPin(
            joinResponse.data.pin
          );

          setPlayer(
            restoredPlayer
          );

          playerRef.current =
            restoredPlayer;

          setRole('player');

          setGameStatus(
            joinResponse.data.status ||
            'LOBBY'
          );

          savePlayerSession(
            joinResponse.data.pin,
            restoredPlayer
          );

          /**
           * Step 2:
           * Ask the server which phase/question
           * the game is currently on.
           */
          socket.emit(
            'game:request-state',
            {
              pin: savedPin,
              playerId:
                savedPlayerId
            },
            stateResponse => {
              restoreInProgressRef.current =
                false;

              if (
                !stateResponse?.success
              ) {
                clearPlayerSession();

                setPlayer(null);
                setPin('');
                setRole(null);
                setSessionRestoring(false);

                return;
              }

              applyRestoredGameState(
                stateResponse.data
              );

              setSessionRestoring(false);
            }
          );
        }
      );
    }, [applyRestoredGameState]);

  /**
   * SOCKET LISTENERS
   *
   * Set up only once.
   */
  useEffect(() => {
    function onGameCreated(data) {
      setPin(data.pin);
      setRole('host');

      setGameStatus(
        data.status || 'LOBBY'
      );

      setPlayers(
        data.players || []
      );

      setLoading(false);
    }

    function onLobbyUpdated(data) {
      setPlayers(
        data.players || []
      );

      /**
       * Also update current player's
       * latest record if present.
       */
      const currentPlayerId =
        playerRef.current?.id;

      if (
        currentPlayerId &&
        Array.isArray(data.players)
      ) {
        const updatedSelf =
          data.players.find(
            p =>
              p.id ===
              currentPlayerId
          );

        if (updatedSelf) {
          setPlayer(updatedSelf);
          playerRef.current =
            updatedSelf;
        }
      }
    }

    function onPlayerJoined(data) {
      if (!data?.player) {
        return;
      }

      setPlayer(data.player);
      playerRef.current =
        data.player;

      setPin(data.pin);
      setRole('player');

      setGameStatus(
        data.status || 'LOBBY'
      );

      setLoading(false);

      savePlayerSession(
        data.pin,
        data.player
      );
    }

    function onGameStarted() {
      setGameStatus(
        'QUESTION_ACTIVE'
      );
    }

    function onQuestionStarted(data) {
      setCurrentQuestion(data);

      setGameStatus(
        'QUESTION_ACTIVE'
      );

      setSelectedOption(null);

      setAnswerResult(null);

      setSubmittedCount(0);
    }

    function onAnswerAccepted(data) {
      setAnswerResult(prev => ({
        ...(prev || {}),
        ...data
      }));
    }

    function onAnswerRejected(err) {
      setError(err);

      setSelectedOption(null);
    }

    function onAnswerCountUpdated(data) {
      setSubmittedCount(
        data?.submittedCount || 0
      );
    }

    function onQuestionEnded(data) {
      setGameStatus(
        'QUESTION_RESULT'
      );

      setLeaderboard(
        data.leaderboard || []
      );

      const currentPlayer =
        playerRef.current;

      const myAnswer =
        currentPlayer &&
          data.answers
          ? data.answers[
          currentPlayer.id
          ]
          : null;

      setAnswerResult({
        correctOption:
          data.correctOption,

        explanation:
          data.explanation,

        isCorrect:
          myAnswer
            ? myAnswer.isCorrect
            : false,

        pointsAwarded:
          myAnswer
            ? myAnswer.pointsAwarded
            : 0
      });

      /**
       * Update personal score/rank.
       */
      if (
        currentPlayer &&
        Array.isArray(
          data.leaderboard
        )
      ) {
        const updatedSelf =
          data.leaderboard.find(
            p =>
              p.id ===
              currentPlayer.id
          );

        if (updatedSelf) {
          setPlayer(updatedSelf);

          playerRef.current =
            updatedSelf;

          savePlayerSession(
            pin ||
            localStorage.getItem(
              STORAGE_KEYS.PIN
            ),
            updatedSelf
          );
        }
      }
    }

    function onLeaderboardUpdated(
      data
    ) {
      const nextLeaderboard =
        Array.isArray(data)
          ? data
          : data?.leaderboard;

      if (
        !Array.isArray(
          nextLeaderboard
        )
      ) {
        return;
      }

      setLeaderboard(
        nextLeaderboard
      );

      const currentPlayer =
        playerRef.current;

      if (currentPlayer) {
        const updatedSelf =
          nextLeaderboard.find(
            p =>
              p.id ===
              currentPlayer.id
          );

        if (updatedSelf) {
          setPlayer(updatedSelf);

          playerRef.current =
            updatedSelf;
        }
      }
    }

    function onGameEnded(data) {
      setGameStatus('FINISHED');

      setLeaderboard(
        data?.leaderboard || []
      );

      /**
       * Do not immediately erase the saved
       * identity here.
       *
       * Keeping it allows results/navigation
       * to remain stable after a refresh.
       *
       * resetGame() will clear it.
       */
    }

    function onError(err) {
      setError(err);
      setLoading(false);
    }

    socket.on(
      'game:created',
      onGameCreated
    );

    socket.on(
      'lobby:updated',
      onLobbyUpdated
    );

    socket.on(
      'player:joined',
      onPlayerJoined
    );

    socket.on(
      'game:started',
      onGameStarted
    );

    socket.on(
      'question:started',
      onQuestionStarted
    );

    socket.on(
      'answer:accepted',
      onAnswerAccepted
    );

    socket.on(
      'answer:rejected',
      onAnswerRejected
    );

    socket.on(
      'answer:count-updated',
      onAnswerCountUpdated
    );

    socket.on(
      'question:ended',
      onQuestionEnded
    );

    socket.on(
      'leaderboard:updated',
      onLeaderboardUpdated
    );

    socket.on(
      'game:ended',
      onGameEnded
    );

    socket.on(
      'game:error',
      onError
    );

    return () => {
      socket.off(
        'game:created',
        onGameCreated
      );

      socket.off(
        'lobby:updated',
        onLobbyUpdated
      );

      socket.off(
        'player:joined',
        onPlayerJoined
      );

      socket.off(
        'game:started',
        onGameStarted
      );

      socket.off(
        'question:started',
        onQuestionStarted
      );

      socket.off(
        'answer:accepted',
        onAnswerAccepted
      );

      socket.off(
        'answer:rejected',
        onAnswerRejected
      );

      socket.off(
        'answer:count-updated',
        onAnswerCountUpdated
      );

      socket.off(
        'question:ended',
        onQuestionEnded
      );

      socket.off(
        'leaderboard:updated',
        onLeaderboardUpdated
      );

      socket.off(
        'game:ended',
        onGameEnded
      );

      socket.off(
        'game:error',
        onError
      );
    };
  }, [pin]);

  /**
   * RESTORE AFTER REFRESH / RECONNECT
   */
  useEffect(() => {
    const handleConnect = () => {
      restorePlayerSession();
    };

    socket.on(
      'connect',
      handleConnect
    );

    /**
     * Socket may already have connected
     * before this effect runs.
     */
    if (socket.connected) {
      restorePlayerSession();
    } else {
      const savedPlayerId =
        localStorage.getItem(
          STORAGE_KEYS.PLAYER_ID
        ) ||
        sessionStorage.getItem(
          'churchquiz_player_id'
        );

      if (!savedPlayerId) {
        setSessionRestoring(false);
      }
    }

    return () => {
      socket.off(
        'connect',
        handleConnect
      );
    };
  }, [restorePlayerSession]);

  /**
   * HOST: CREATE GAME
   *
   * Every Host action carries a fresh Clerk session token.
   * Built-in profile -> server/questions.json
   * Custom profile  -> selected profile questions
   */
  const createGame =
    useCallback(
      async (questions = null) => {
        setLoading(true);
        setError(null);

        const authToken =
          await getHostAuthToken();

        if (!authToken) {
          setLoading(false);

          setError({
            code: 'HOST_AUTH_REQUIRED',
            message:
              'Your Host login could not be verified. Please sign in again.'
          });

          return;
        }

        const payload = {
          authToken,
          ...(Array.isArray(questions)
            ? { questions }
            : {})
        };

        socket.emit(
          'host:create-game',
          payload,
          res => {
            setLoading(false);

            if (!res?.success) {
              setError(
                res?.error ||
                {
                  code:
                    'CREATE_GAME_FAILED',
                  message:
                    'Unable to create game.'
                }
              );
            }
          }
        );
      },
      [getHostAuthToken]
    );

  /**
   * PLAYER: JOIN GAME
   */
  const joinGame =
    useCallback(
      (pinInput, nameInput) => {
        setLoading(true);
        setError(null);

        socket.emit(
          'player:join-game',
          {
            pin: pinInput,
            name: nameInput
          },
          res => {
            setLoading(false);

            if (!res?.success) {
              setError(
                res?.error ||
                {
                  message:
                    'Unable to join game.'
                }
              );
            }
          }
        );
      },
      []
    );

  /**
   * HOST: START GAME
   */
  const startGame =
    useCallback(async () => {
      setError(null);

      const authToken =
        await getHostAuthToken();

      if (!authToken) {
        setError({
          code: 'HOST_AUTH_REQUIRED',
          message:
            'Your Host login could not be verified. Please sign in again.'
        });

        return;
      }

      socket.emit(
        'host:start-game',
        {
          pin,
          authToken
        }
      );
    }, [pin, getHostAuthToken]);

  /**
   * PLAYER: SUBMIT ANSWER
   */
  const submitAnswer =
    useCallback(
      optionIndex => {
        if (
          selectedOption !== null ||
          !player
        ) {
          return;
        }

        setSelectedOption(
          optionIndex
        );

        socket.emit(
          'player:submit-answer',
          {
            pin,
            playerId:
              player.id,
            selectedOption:
              optionIndex
          },
          res => {
            if (
              !res?.success
            ) {
              setError(
                res?.error ||
                {
                  message:
                    'Unable to submit answer.'
                }
              );

              setSelectedOption(
                null
              );
            }
          }
        );
      },
      [
        pin,
        player,
        selectedOption
      ]
    );

  /**
   * HOST: NEXT QUESTION
   */
  const nextQuestion =
    useCallback(async () => {
      setError(null);

      const authToken =
        await getHostAuthToken();

      if (!authToken) {
        setError({
          code: 'HOST_AUTH_REQUIRED',
          message:
            'Your Host login could not be verified. Please sign in again.'
        });

        return;
      }

      socket.emit(
        'host:next-question',
        {
          pin,
          authToken
        }
      );
    }, [pin, getHostAuthToken]);

  /**
   * HOST: END GAME
   */
  const endGame =
    useCallback(async () => {
      const authToken =
        await getHostAuthToken();

      if (!authToken) {
        setError({
          code: 'HOST_AUTH_REQUIRED',
          message:
            'Your Host login could not be verified. Please sign in again.'
        });

        return;
      }

      socket.emit(
        'host:end-game',
        {
          pin,
          authToken
        }
      );
    }, [pin, getHostAuthToken]);

  const clearError =
    useCallback(() => {
      setError(null);
    }, []);

  const resetGame =
    useCallback(() => {
      setPin('');
      setRole(null);
      setPlayer(null);
      playerRef.current = null;

      setPlayers([]);

      setGameStatus('LOBBY');

      setCurrentQuestion(
        null
      );

      setSelectedOption(null);

      setAnswerResult(null);

      setSubmittedCount(0);

      setLeaderboard([]);

      setError(null);
      setLoading(false);

      setSessionRestoring(false);

      clearPlayerSession();
    }, []);

  return (
    <GameContext.Provider
      value={{
        pin,
        role,
        player,
        players,
        gameStatus,
        currentQuestion,
        selectedOption,
        answerResult,
        submittedCount,
        leaderboard,
        error,
        loading,
        sessionRestoring,

        createGame,
        joinGame,
        startGame,
        submitAnswer,
        nextQuestion,
        endGame,
        clearError,
        resetGame
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context =
    useContext(GameContext);

  if (!context) {
    throw new Error(
      'useGame must be used within a GameProvider'
    );
  }

  return context;
};