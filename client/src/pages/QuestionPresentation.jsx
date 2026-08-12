import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import { useParams } from 'react-router-dom';
import { socket } from '../socket';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const GAME_STATUS = {
    LOBBY: 'LOBBY',
    QUESTION_ACTIVE: 'QUESTION_ACTIVE',
    QUESTION_RESULT: 'QUESTION_RESULT',
    LEADERBOARD: 'LEADERBOARD',
    FINISHED: 'FINISHED'
};

/**
 * QuestionPresentation
 *
 * Read-only projector / extended-display page.
 *
 * Route:
 * /display/question/:pin
 *
 * This page:
 * - joins the game as a presentation-only client
 * - displays the current question
 * - shows a synchronized countdown
 * - shows answer count
 * - reveals the correct answer only after question completion
 * - contains NO host controls
 */
export function QuestionPresentation() {
    const { pin } = useParams();

    const [gameStatus, setGameStatus] =
        useState(null);

    const [question, setQuestion] =
        useState(null);

    const [correctOption, setCorrectOption] =
        useState(null);

    const [explanation, setExplanation] =
        useState('');

    const [submittedCount, setSubmittedCount] =
        useState(0);

    const [totalPlayers, setTotalPlayers] =
        useState(0);

    const [remainingMs, setRemainingMs] =
        useState(0);

    const [error, setError] =
        useState('');

    const [connected, setConnected] =
        useState(socket.connected);

    /**
     * Whether the answer should currently
     * be shown on screen.
     */
    const isRevealed =
        gameStatus ===
        GAME_STATUS.QUESTION_RESULT ||
        (
            typeof correctOption === 'number' &&
            correctOption >= 0
        );

    /**
     * Timer calculation.
     *
     * The browser only renders the countdown.
     * The backend remains authoritative.
     */
    useEffect(() => {
        if (
            !question?.questionEndsAt ||
            gameStatus !==
            GAME_STATUS.QUESTION_ACTIVE
        ) {
            setRemainingMs(0);
            return undefined;
        }

        const updateTimer = () => {
            const remaining =
                Math.max(
                    0,
                    question.questionEndsAt -
                    Date.now()
                );

            setRemainingMs(remaining);
        };

        updateTimer();

        const intervalId =
            window.setInterval(
                updateTimer,
                100
            );

        return () => {
            window.clearInterval(
                intervalId
            );
        };
    }, [
        question?.questionEndsAt,
        gameStatus
    ]);

    /**
     * Join as a presentation-only client
     * and listen for real-time updates.
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

        const handleConnect = () => {
            setConnected(true);

            socket.emit(
                'presentation:join',
                {
                    pin,
                    role: 'question-display'
                },
                response => {
                    if (!response?.success) {
                        setError(
                            response?.error?.message ||
                            'Unable to join the presentation.'
                        );

                        return;
                    }

                    applyPresentationState(
                        response.data
                    );
                }
            );
        };

        const handleDisconnect = () => {
            setConnected(false);
        };

        const applyPresentationState = data => {
            if (!data) {
                return;
            }

            setGameStatus(
                data.status || null
            );

            if (
                typeof data.players?.length ===
                'number'
            ) {
                setTotalPlayers(
                    data.players.length
                );
            }

            if (data.currentQuestion) {
                setQuestion(
                    data.currentQuestion
                );

                if (
                    typeof
                    data.currentQuestion
                        .correctOption ===
                    'number'
                ) {
                    setCorrectOption(
                        data.currentQuestion
                            .correctOption
                    );
                } else {
                    setCorrectOption(null);
                }

                setExplanation(
                    data.currentQuestion
                        .explanation || ''
                );
            }
        };

        const handlePresentationState =
            data => {
                applyPresentationState(data);
            };

        const handleGameStarted = () => {
            setGameStatus(
                GAME_STATUS.QUESTION_ACTIVE
            );
        };

        const handleQuestionStarted =
            payload => {
                setQuestion(payload);

                setGameStatus(
                    GAME_STATUS.QUESTION_ACTIVE
                );

                setCorrectOption(null);
                setExplanation('');
                setSubmittedCount(0);
            };

        const handleAnswerCount = payload => {
            if (!payload) {
                return;
            }

            if (
                typeof payload.submittedCount ===
                'number'
            ) {
                setSubmittedCount(
                    payload.submittedCount
                );
            }

            if (
                typeof payload.totalPlayers ===
                'number'
            ) {
                setTotalPlayers(
                    payload.totalPlayers
                );
            }
        };

        const handleQuestionEnded =
            payload => {
                if (!payload) {
                    return;
                }

                setGameStatus(
                    GAME_STATUS.QUESTION_RESULT
                );

                if (
                    typeof payload.correctOption ===
                    'number'
                ) {
                    setCorrectOption(
                        payload.correctOption
                    );
                }

                setExplanation(
                    payload.explanation || ''
                );

                if (
                    typeof payload.answersCount ===
                    'number'
                ) {
                    setSubmittedCount(
                        payload.answersCount
                    );
                }

                setRemainingMs(0);
            };

        const handleGameEnded = () => {
            setGameStatus(
                GAME_STATUS.FINISHED
            );

            setRemainingMs(0);
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
            'game:started',
            handleGameStarted
        );

        socket.on(
            'question:started',
            handleQuestionStarted
        );

        socket.on(
            'answer:count-updated',
            handleAnswerCount
        );

        socket.on(
            'question:ended',
            handleQuestionEnded
        );

        socket.on(
            'game:ended',
            handleGameEnded
        );

        socket.on(
            'game:error',
            handleGameError
        );

        /**
         * If socket was already connected when
         * this page mounted, "connect" won't fire
         * again, so join immediately.
         */
        if (socket.connected) {
            handleConnect();
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
                'game:started',
                handleGameStarted
            );

            socket.off(
                'question:started',
                handleQuestionStarted
            );

            socket.off(
                'answer:count-updated',
                handleAnswerCount
            );

            socket.off(
                'question:ended',
                handleQuestionEnded
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
     * Countdown shown as whole seconds.
     */
    const secondsRemaining =
        useMemo(
            () =>
                Math.max(
                    0,
                    Math.ceil(
                        remainingMs / 1000
                    )
                ),
            [remainingMs]
        );

    /**
     * GAME FINISHED
     */
    if (
        gameStatus ===
        GAME_STATUS.FINISHED
    ) {
        return (
            <PresentationShell>
                <div style={styles.centerState}>
                    <div
                        style={{
                            fontSize: '5rem'
                        }}
                    >
                        🎉
                    </div>

                    <h1 style={styles.finishedTitle}>
                        Quiz Complete
                    </h1>

                    <p style={styles.finishedText}>
                        Please look at the leaderboard
                        display for the final results.
                    </p>
                </div>
            </PresentationShell>
        );
    }

    /**
     * ERROR
     */
    if (error) {
        return (
            <PresentationShell>
                <div style={styles.centerState}>
                    <div
                        style={{
                            fontSize: '4rem'
                        }}
                    >
                        ⚠️
                    </div>

                    <h1>
                        Presentation unavailable
                    </h1>

                    <p style={styles.errorText}>
                        {error}
                    </p>
                </div>
            </PresentationShell>
        );
    }

    /**
     * Waiting for first question.
     */
    if (!question) {
        return (
            <PresentationShell>
                <div style={styles.centerState}>
                    <div style={styles.logo}>
                        ChurchQuiz Live
                    </div>

                    <h1 style={styles.waitingTitle}>
                        Waiting for the quiz…
                    </h1>

                    <p style={styles.waitingPin}>
                        Game PIN: {pin}
                    </p>

                    <ConnectionStatus
                        connected={connected}
                    />
                </div>
            </PresentationShell>
        );
    }

    const questionNumber =
        typeof question.questionIndex ===
            'number'
            ? question.questionIndex + 1
            : 1;

    const totalQuestions =
        question.totalQuestions || '?';

    return (
        <PresentationShell>
            {/* TOP BAR */}

            <header style={styles.topBar}>
                <div style={styles.brand}>
                    ChurchQuiz Live
                </div>

                <div style={styles.questionNumber}>
                    QUESTION {questionNumber}
                    {' / '}
                    {totalQuestions}
                </div>

                <div style={styles.pin}>
                    PIN {pin}
                </div>
            </header>

            {/* TIMER */}

            <div style={styles.timerArea}>
                <div
                    style={{
                        ...styles.timerCircle,

                        ...(secondsRemaining <= 5 &&
                            gameStatus ===
                            GAME_STATUS.QUESTION_ACTIVE
                            ? styles.timerUrgent
                            : {})
                    }}
                >
                    {gameStatus ===
                        GAME_STATUS.QUESTION_ACTIVE
                        ? secondsRemaining
                        : '✓'}
                </div>
            </div>

            {/* QUESTION */}

            <main style={styles.content}>
                <h1 style={styles.questionText}>
                    {question.question}
                </h1>

                {/* OPTIONS */}

                <div style={styles.optionsGrid}>
                    {question.options?.map(
                        (option, index) => {
                            const isCorrect =
                                isRevealed &&
                                index ===
                                correctOption;

                            return (
                                <div
                                    key={`${index}-${option}`}
                                    style={{
                                        ...styles.optionCard,

                                        ...(isCorrect
                                            ? styles.correctOption
                                            : {})
                                    }}
                                >
                                    <div
                                        style={{
                                            ...styles.optionLabel,

                                            ...(isCorrect
                                                ? styles.correctLabel
                                                : {})
                                        }}
                                    >
                                        {
                                            OPTION_LABELS[
                                            index
                                            ]
                                        }
                                    </div>

                                    <div
                                        style={
                                            styles.optionText
                                        }
                                    >
                                        {option}
                                    </div>

                                    {isCorrect && (
                                        <div
                                            style={
                                                styles.correctBadge
                                            }
                                        >
                                            ✓ CORRECT
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    )}
                </div>

                {/* RESULT EXPLANATION */}

                {isRevealed &&
                    explanation && (
                        <div
                            style={
                                styles.explanation
                            }
                        >
                            <strong>
                                💡 Explanation
                            </strong>

                            <span>
                                {explanation}
                            </span>
                        </div>
                    )}
            </main>

            {/* FOOTER */}

            <footer style={styles.footer}>
                <div>
                    {gameStatus ===
                        GAME_STATUS.QUESTION_ACTIVE
                        ? 'Answers received'
                        : 'Round complete'}
                </div>

                <div style={styles.answerCount}>
                    {submittedCount}
                    {totalPlayers > 0
                        ? ` / ${totalPlayers}`
                        : ''}
                </div>

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

function ConnectionStatus({
    connected
}) {
    return (
        <span
            style={{
                ...styles.connection,

                color: connected
                    ? '#86efac'
                    : '#fca5a5'
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
        background:
            'radial-gradient(circle at top, #1e3a5f 0%, #111827 42%, #070b14 100%)',
        color: '#f8fafc',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        boxSizing: 'border-box'
    },

    topBar: {
        display: 'grid',
        gridTemplateColumns:
            '1fr auto 1fr',
        alignItems: 'center',
        padding: '1.2rem 2.5rem',
        borderBottom:
            '1px solid rgba(255,255,255,0.12)'
    },

    brand: {
        fontWeight: 900,
        fontSize: '1.35rem',
        color: '#fbbf24'
    },

    questionNumber: {
        fontSize: '1.1rem',
        fontWeight: 800,
        letterSpacing: '0.08em'
    },

    pin: {
        textAlign: 'right',
        color: '#cbd5e1',
        fontWeight: 800,
        fontSize: '1.05rem'
    },

    timerArea: {
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '1.25rem'
    },

    timerCircle: {
        width: '82px',
        height: '82px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.4rem',
        fontWeight: 950,
        background:
            'rgba(37,99,235,0.22)',
        border:
            '4px solid #60a5fa',
        boxShadow:
            '0 0 35px rgba(96,165,250,0.22)'
    },

    timerUrgent: {
        borderColor: '#fb7185',
        color: '#fecdd3',
        background:
            'rgba(225,29,72,0.18)'
    },

    content: {
        flex: 1,
        width: '100%',
        maxWidth: '1500px',
        margin: '0 auto',
        padding: '1.2rem 3rem 2rem',
        boxSizing: 'border-box'
    },

    questionText: {
        textAlign: 'center',
        fontSize:
            'clamp(2rem, 3.1vw, 4rem)',
        lineHeight: 1.18,
        margin:
            '0.5rem auto 2rem',
        maxWidth: '1300px',
        fontWeight: 900
    },

    optionsGrid: {
        display: 'grid',
        gridTemplateColumns:
            'repeat(2, minmax(0, 1fr))',
        gap: '1.25rem'
    },

    optionCard: {
        position: 'relative',
        minHeight: '150px',
        borderRadius: '18px',
        display: 'flex',
        alignItems: 'center',
        padding: '1.4rem 1.6rem',
        gap: '1.25rem',
        background:
            'rgba(30,41,59,0.9)',
        border:
            '2px solid rgba(148,163,184,0.28)',
        boxShadow:
            '0 12px 35px rgba(0,0,0,0.22)',
        boxSizing: 'border-box'
    },

    correctOption: {
        border:
            '3px solid #22c55e',
        background:
            'rgba(22,101,52,0.28)',
        boxShadow:
            '0 0 40px rgba(34,197,94,0.2)'
    },

    optionLabel: {
        width: '64px',
        height: '64px',
        minWidth: '64px',
        borderRadius: '14px',
        background: '#334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        fontWeight: 950
    },

    correctLabel: {
        background: '#16a34a',
        color: '#fff'
    },

    optionText: {
        fontSize:
            'clamp(1.4rem, 2vw, 2.4rem)',
        fontWeight: 800,
        lineHeight: 1.25
    },

    correctBadge: {
        position: 'absolute',
        right: '1rem',
        top: '0.8rem',
        fontWeight: 950,
        color: '#86efac',
        fontSize: '0.9rem'
    },

    explanation: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        maxWidth: '1100px',
        margin: '1.5rem auto 0',
        padding: '1rem 1.3rem',
        borderRadius: '12px',
        background:
            'rgba(251,191,36,0.09)',
        border:
            '1px solid rgba(251,191,36,0.35)',
        color: '#fde68a',
        textAlign: 'center',
        fontSize: '1.05rem'
    },

    footer: {
        display: 'grid',
        gridTemplateColumns:
            '1fr auto 1fr',
        alignItems: 'center',
        padding: '1rem 2.5rem',
        borderTop:
            '1px solid rgba(255,255,255,0.12)',
        background:
            'rgba(0,0,0,0.16)',
        color: '#cbd5e1',
        fontWeight: 700
    },

    answerCount: {
        fontSize: '1.25rem',
        fontWeight: 900,
        color: '#f8fafc'
    },

    connection: {
        textAlign: 'right',
        fontWeight: 900,
        fontSize: '0.78rem',
        letterSpacing: '0.08em'
    },

    centerState: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
    },

    logo: {
        color: '#fbbf24',
        fontWeight: 950,
        fontSize: '1.6rem',
        marginBottom: '2rem'
    },

    waitingTitle: {
        fontSize:
            'clamp(2rem, 4vw, 4rem)',
        marginBottom: '0.8rem'
    },

    waitingPin: {
        fontSize: '1.8rem',
        color: '#cbd5e1'
    },

    finishedTitle: {
        fontSize:
            'clamp(3rem, 6vw, 6rem)',
        color: '#fbbf24',
        margin: '1rem'
    },

    finishedText: {
        color: '#cbd5e1',
        fontSize: '1.5rem'
    },

    errorText: {
        color: '#fecaca',
        fontSize: '1.2rem'
    }
};

export default QuestionPresentation;