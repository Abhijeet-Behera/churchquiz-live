import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { useParams } from 'react-router-dom';

import { socket } from '../socket';
import { Leaderboard } from '../components/Leaderboard';

const GAME_STATUS = {
    LOBBY: 'LOBBY',
    QUESTION_ACTIVE: 'QUESTION_ACTIVE',
    QUESTION_RESULT: 'QUESTION_RESULT',
    LEADERBOARD: 'LEADERBOARD',
    FINISHED: 'FINISHED'
};

/**
 * LeaderboardPresentation
 *
 * Read-only leaderboard projector.
 *
 * Route:
 * /display/leaderboard/:pin
 *
 * Displays:
 * - Top 10
 * - animated rank movement
 * - animated score changes
 * - current round
 * - connection status
 *
 * NO host controls.
 */
export function LeaderboardPresentation() {
    const { pin } = useParams();

    const [
        leaderboard,
        setLeaderboard
    ] = useState([]);

    const [
        gameStatus,
        setGameStatus
    ] = useState(null);

    const [
        currentQuestionIndex,
        setCurrentQuestionIndex
    ] = useState(-1);

    const [
        totalQuestions,
        setTotalQuestions
    ] = useState(null);

    const [connected, setConnected] =
        useState(socket.connected);

    const [error, setError] =
        useState('');

    /**
     * Current displayed round number.
     */
    const roundNumber =
        currentQuestionIndex >= 0
            ? currentQuestionIndex + 1
            : 0;

    /**
     * Top three can be separately shown
     * if desired later.
     */
    const topPlayer =
        useMemo(
            () =>
                leaderboard.length > 0
                    ? leaderboard[0]
                    : null,
            [leaderboard]
        );

    /**
     * Presentation socket lifecycle.
     */
    useEffect(() => {
        if (!pin) {
            setError(
                'No game PIN was provided.'
            );

            return undefined;
        }

        if (!socket.connected) {
            socket.connect();
        }

        const applyPresentationState =
            data => {
                if (!data) {
                    return;
                }

                setGameStatus(
                    data.status || null
                );

                if (
                    Array.isArray(
                        data.leaderboard
                    )
                ) {
                    setLeaderboard(
                        data.leaderboard
                    );
                }

                if (
                    data.currentQuestion &&
                    typeof
                    data.currentQuestion
                        .questionIndex ===
                    'number'
                ) {
                    setCurrentQuestionIndex(
                        data.currentQuestion
                            .questionIndex
                    );
                }

                if (
                    data.currentQuestion &&
                    typeof
                    data.currentQuestion
                        .totalQuestions ===
                    'number'
                ) {
                    setTotalQuestions(
                        data.currentQuestion
                            .totalQuestions
                    );
                }
            };

        const joinPresentation = () => {
            socket.emit(
                'presentation:join',
                {
                    pin,
                    role:
                        'leaderboard-display'
                },
                response => {
                    if (!response?.success) {
                        setError(
                            response?.error?.message ||
                            'Unable to join the leaderboard presentation.'
                        );

                        return;
                    }

                    applyPresentationState(
                        response.data
                    );
                }
            );
        };

        const handleConnect = () => {
            setConnected(true);
            setError('');

            joinPresentation();
        };

        const handleDisconnect = () => {
            setConnected(false);
        };

        const handlePresentationState =
            data => {
                applyPresentationState(data);
            };

        const handleQuestionStarted =
            payload => {
                setGameStatus(
                    GAME_STATUS.QUESTION_ACTIVE
                );

                if (
                    typeof payload?.questionIndex ===
                    'number'
                ) {
                    setCurrentQuestionIndex(
                        payload.questionIndex
                    );
                }

                if (
                    typeof payload?.totalQuestions ===
                    'number'
                ) {
                    setTotalQuestions(
                        payload.totalQuestions
                    );
                }

                /*
                 * Do NOT clear the leaderboard.
                 *
                 * We keep the previous round ranking
                 * visible until the next round result
                 * arrives.
                 *
                 * This is important for FLIP animation,
                 * because AnimatedLeaderboard needs
                 * previous DOM positions.
                 */
            };

        const handleQuestionEnded =
            payload => {
                setGameStatus(
                    GAME_STATUS.QUESTION_RESULT
                );

                if (
                    Array.isArray(
                        payload?.leaderboard
                    )
                ) {
                    setLeaderboard(
                        payload.leaderboard
                    );
                }

                if (
                    typeof payload?.questionIndex ===
                    'number'
                ) {
                    setCurrentQuestionIndex(
                        payload.questionIndex
                    );
                }

                if (
                    typeof payload?.totalQuestions ===
                    'number'
                ) {
                    setTotalQuestions(
                        payload.totalQuestions
                    );
                }
            };

        const handleLeaderboardUpdated =
            payload => {
                const nextLeaderboard =
                    Array.isArray(payload)
                        ? payload
                        : payload?.leaderboard;

                if (
                    Array.isArray(
                        nextLeaderboard
                    )
                ) {
                    setLeaderboard(
                        nextLeaderboard
                    );
                }
            };

        const handleGameEnded =
            payload => {
                setGameStatus(
                    GAME_STATUS.FINISHED
                );

                if (
                    Array.isArray(
                        payload?.leaderboard
                    )
                ) {
                    setLeaderboard(
                        payload.leaderboard
                    );
                }
            };

        const handleGameError = err => {
            if (err?.message) {
                setError(err.message);
            }
        };

        socket.on(
            'connect',
            handleConnect
        );

        socket.on(
            'disconnect',
            handleDisconnect
        );

        socket.on(
            'presentation:state',
            handlePresentationState
        );

        socket.on(
            'question:started',
            handleQuestionStarted
        );

        socket.on(
            'question:ended',
            handleQuestionEnded
        );

        socket.on(
            'leaderboard:updated',
            handleLeaderboardUpdated
        );

        socket.on(
            'game:ended',
            handleGameEnded
        );

        socket.on(
            'game:error',
            handleGameError
        );

        if (socket.connected) {
            joinPresentation();
        }

        return () => {
            socket.off(
                'connect',
                handleConnect
            );

            socket.off(
                'disconnect',
                handleDisconnect
            );

            socket.off(
                'presentation:state',
                handlePresentationState
            );

            socket.off(
                'question:started',
                handleQuestionStarted
            );

            socket.off(
                'question:ended',
                handleQuestionEnded
            );

            socket.off(
                'leaderboard:updated',
                handleLeaderboardUpdated
            );

            socket.off(
                'game:ended',
                handleGameEnded
            );

            socket.off(
                'game:error',
                handleGameError
            );
        };
    }, [pin]);

    /**
     * ERROR
     */
    if (error) {
        return (
            <PresentationShell>
                <CenteredMessage>
                    <div
                        style={{
                            fontSize: '4rem'
                        }}
                    >
                        ⚠️
                    </div>

                    <h1>
                        Leaderboard unavailable
                    </h1>

                    <p
                        style={{
                            color: '#fecaca',
                            fontSize: '1.2rem'
                        }}
                    >
                        {error}
                    </p>
                </CenteredMessage>
            </PresentationShell>
        );
    }

    /**
     * Waiting for players.
     */
    if (
        leaderboard.length === 0
    ) {
        return (
            <PresentationShell>
                <CenteredMessage>
                    <div
                        style={styles.brandLarge}
                    >
                        ChurchQuiz Live
                    </div>

                    <h1 style={styles.waitingTitle}>
                        Waiting for players…
                    </h1>

                    <p style={styles.pinLarge}>
                        Game PIN: {pin}
                    </p>

                    <ConnectionStatus
                        connected={connected}
                    />
                </CenteredMessage>
            </PresentationShell>
        );
    }

    const isFinished =
        gameStatus ===
        GAME_STATUS.FINISHED;

    return (
        <PresentationShell>
            {/* HEADER */}

            <header style={styles.header}>
                <div>
                    <div style={styles.brand}>
                        ChurchQuiz Live
                    </div>

                    <div
                        style={
                            styles.headerSubtitle
                        }
                    >
                        {isFinished
                            ? 'FINAL RESULTS'
                            : 'LIVE LEADERBOARD'}
                    </div>
                </div>

                <div style={styles.roundInfo}>
                    {isFinished
                        ? '🏆 FINAL'
                        : roundNumber > 0
                            ? `ROUND ${roundNumber}${totalQuestions
                                ? ` / ${totalQuestions}`
                                : ''
                            }`
                            : 'LOBBY'}
                </div>

                <div
                    style={
                        styles.connectionArea
                    }
                >
                    <div style={styles.pin}>
                        PIN {pin}
                    </div>

                    <ConnectionStatus
                        connected={connected}
                    />
                </div>
            </header>

            {/* WINNER BANNER */}

            {isFinished &&
                topPlayer && (
                    <div
                        style={
                            styles.winnerBanner
                        }
                    >
                        <div
                            style={
                                styles.winnerCrown
                            }
                        >
                            👑
                        </div>

                        <div>
                            <div
                                style={
                                    styles.winnerLabel
                                }
                            >
                                WINNER
                            </div>

                            <div
                                style={
                                    styles.winnerName
                                }
                            >
                                {topPlayer.name}
                            </div>
                        </div>

                        <div
                            style={
                                styles.winnerScore
                            }
                        >
                            {topPlayer.score || 0}{' '}
                            pts
                        </div>
                    </div>
                )}

            {/* LEADERBOARD */}

            <main
                style={{
                    ...styles.main,

                    ...(isFinished
                        ? {
                            paddingTop:
                                '1rem'
                        }
                        : {})
                }}
            >
                <Leaderboard
                    players={leaderboard}
                    maxDisplay={10}
                    animated={true}
                    title={
                        isFinished
                            ? '🏆 Final Leaderboard'
                            : '🏆 Leaderboard'
                    }
                />
            </main>

            {/* FOOTER */}

            <footer style={styles.footer}>
                <span>
                    Showing Top{' '}
                    {Math.min(
                        10,
                        leaderboard.length
                    )}
                </span>

                <span>
                    {isFinished
                        ? 'Quiz Complete'
                        : gameStatus ===
                            GAME_STATUS.QUESTION_ACTIVE
                            ? 'Question in progress…'
                            : 'Rankings updated'}
                </span>

                <ConnectionStatus
                    connected={connected}
                />
            </footer>
        </PresentationShell>
    );
}

function PresentationShell({
    children
}) {
    return (
        <div style={styles.page}>
            {children}
        </div>
    );
}

function CenteredMessage({
    children
}) {
    return (
        <div style={styles.centered}>
            {children}
        </div>
    );
}

function ConnectionStatus({
    connected
}) {
    return (
        <span
            style={{
                color: connected
                    ? '#86efac'
                    : '#fca5a5',

                fontWeight: 900,
                fontSize: '0.76rem',
                letterSpacing: '0.08em'
            }}
        >
            {connected
                ? '● LIVE'
                : '● RECONNECTING'}
        </span>
    );
}

const styles = {
    page: {
        width: '100vw',
        minHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background:
            'radial-gradient(circle at top, #312e81 0%, #111827 42%, #050816 100%)',
        color: '#f8fafc',
        fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    },

    header: {
        display: 'grid',
        gridTemplateColumns:
            '1fr auto 1fr',
        alignItems: 'center',
        padding: '1.15rem 2.5rem',
        borderBottom:
            '1px solid rgba(255,255,255,0.12)',
        background:
            'rgba(0,0,0,0.14)'
    },

    brand: {
        color: '#fbbf24',
        fontWeight: 950,
        fontSize: '1.35rem'
    },

    brandLarge: {
        color: '#fbbf24',
        fontWeight: 950,
        fontSize: '2rem',
        marginBottom: '1.4rem'
    },

    headerSubtitle: {
        marginTop: '0.2rem',
        fontSize: '0.72rem',
        fontWeight: 900,
        letterSpacing: '0.15em',
        color: '#94a3b8'
    },

    roundInfo: {
        padding:
            '0.55rem 1.1rem',
        borderRadius: '999px',
        background:
            'rgba(99,102,241,0.18)',
        border:
            '1px solid rgba(129,140,248,0.38)',
        color: '#c7d2fe',
        fontWeight: 900,
        letterSpacing: '0.08em'
    },

    connectionArea: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.25rem'
    },

    pin: {
        color: '#cbd5e1',
        fontWeight: 800
    },

    main: {
        flex: 1,
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem 3rem',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center'
    },

    winnerBanner: {
        width:
            'min(850px, calc(100% - 4rem))',
        margin: '1.3rem auto 0',
        padding:
            '1rem 1.5rem',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns:
            'auto 1fr auto',
        gap: '1.3rem',
        alignItems: 'center',
        borderRadius: '18px',
        background:
            'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.08))',
        border:
            '2px solid rgba(251,191,36,0.48)',
        boxShadow:
            '0 15px 45px rgba(0,0,0,0.2)'
    },

    winnerCrown: {
        fontSize: '3.5rem'
    },

    winnerLabel: {
        color: '#fbbf24',
        fontWeight: 950,
        fontSize: '0.75rem',
        letterSpacing: '0.16em'
    },

    winnerName: {
        fontWeight: 950,
        fontSize: '2rem',
        marginTop: '0.15rem'
    },

    winnerScore: {
        fontSize: '1.7rem',
        fontWeight: 950,
        color: '#fde68a'
    },

    footer: {
        display: 'grid',
        gridTemplateColumns:
            '1fr auto 1fr',
        alignItems: 'center',
        gap: '1rem',
        padding:
            '0.9rem 2.5rem',
        borderTop:
            '1px solid rgba(255,255,255,0.1)',
        background:
            'rgba(0,0,0,0.14)',
        color: '#94a3b8',
        fontSize: '0.85rem'
    },

    centered: {
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        boxSizing: 'border-box'
    },

    waitingTitle: {
        fontSize:
            'clamp(2.5rem, 5vw, 5rem)',
        margin: '0 0 1rem'
    },

    pinLarge: {
        fontSize: '2rem',
        color: '#cbd5e1'
    }
};

export default LeaderboardPresentation;