

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';



import { displayManager } from '../lib/DisplayManager';

/**
 * PresentationPanel
 *
 * Host-side control panel for:
 *
 * 1. Question presentation window
 * 2. Leaderboard presentation window
 *
 * Supports:
 * - connected display detection
 * - Window Management API when available
 * - fallback browser window mode
 * - monitor selection
 * - launch
 * - move / reassign
 * - fullscreen request
 * - close
 * - saved monitor preferences
 * - display connection / removal detection
 *
 * Usage:
 *
 * <PresentationPanel pin={pin} />
 */

const STATUS = {
    CLOSED: 'CLOSED',
    ACTIVE: 'ACTIVE',
    UNSUPPORTED: 'UNSUPPORTED',
    PERMISSION_REQUIRED: 'PERMISSION REQUIRED',
    DISCONNECTED: 'DISCONNECTED',
    POPUP_BLOCKED: 'POPUP BLOCKED'
};

function StatusBadge({ status }) {
    const stylesByStatus = {
        [STATUS.ACTIVE]: {
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            color: '#34d399'
        },

        [STATUS.CLOSED]: {
            background: 'rgba(148, 163, 184, 0.12)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            color: '#cbd5e1'
        },

        [STATUS.UNSUPPORTED]: {
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24'
        },

        [STATUS.PERMISSION_REQUIRED]: {
            background: 'rgba(245, 158, 11, 0.14)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24'
        },

        [STATUS.DISCONNECTED]: {
            background: 'rgba(239, 68, 68, 0.14)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171'
        },

        [STATUS.POPUP_BLOCKED]: {
            background: 'rgba(239, 68, 68, 0.14)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171'
        }
    };

    return (
        <span
            style={{
                ...styles.badge,
                ...(stylesByStatus[status] || stylesByStatus[STATUS.CLOSED])
            }}
        >
            {status}
        </span>
    );
}

function DisplayOptionLabel({ display }) {
    if (!display) {
        return null;
    }

    const resolution =
        display.width && display.height
            ? `${display.width}×${display.height}`
            : 'Unknown resolution';

    return (
        <>
            {display.label}
            {' — '}
            {resolution}
            {display.isPrimary ? ' — Primary' : ''}
        </>
    );
}

export function PresentationPanel({ pin }) {
    const [displays, setDisplays] = useState([]);

    const [
        questionDisplayId,
        setQuestionDisplayId
    ] = useState('');

    const [
        leaderboardDisplayId,
        setLeaderboardDisplayId
    ] = useState('');

    const [
        questionStatus,
        setQuestionStatus
    ] = useState(STATUS.CLOSED);

    const [
        leaderboardStatus,
        setLeaderboardStatus
    ] = useState(STATUS.CLOSED);

    const [
        permissionStatus,
        setPermissionStatus
    ] = useState('unknown');

    const [
        loadingDisplays,
        setLoadingDisplays
    ] = useState(false);

    const [error, setError] = useState('');

    const [
        infoMessage,
        setInfoMessage
    ] = useState('');

    /*
     * References to opened windows.
     *
     * We keep these locally because they are useful
     * for fullscreen requests and status checking.
     */
    const questionWindowRef = useRef(null);
    const leaderboardWindowRef = useRef(null);

    /*
     * Poll interval for detecting manually closed windows.
     */
    const windowStatusIntervalRef = useRef(null);

    const multiDisplaySupported =
        displayManager.isSupported();

    /**
     * Find selected display objects.
     */
    const selectedQuestionDisplay =
        useMemo(
            () =>
                displays.find(
                    display =>
                        display.id === questionDisplayId
                ) || null,
            [displays, questionDisplayId]
        );

    const selectedLeaderboardDisplay =
        useMemo(
            () =>
                displays.find(
                    display =>
                        display.id === leaderboardDisplayId
                ) || null,
            [displays, leaderboardDisplayId]
        );

    /**
     * Select sensible displays when the list changes.
     *
     * Preference:
     *
     * Question:
     * first external display
     *
     * Leaderboard:
     * second external display
     *
     * If unavailable:
     * fall back to the first display.
     */
    const assignDefaultDisplays =
        useCallback((availableDisplays) => {
            if (
                !Array.isArray(availableDisplays) ||
                availableDisplays.length === 0
            ) {
                return;
            }

            const externalDisplays =
                availableDisplays.filter(
                    display => !display.isPrimary
                );

            /*
             * Try saved preferences first.
             */
            const savedQuestion =
                displayManager.loadPreference(
                    'question',
                    availableDisplays
                );

            const savedLeaderboard =
                displayManager.loadPreference(
                    'leaderboard',
                    availableDisplays
                );

            setQuestionDisplayId(current => {
                const stillExists =
                    availableDisplays.some(
                        display =>
                            display.id === current
                    );

                if (stillExists) {
                    return current;
                }

                if (savedQuestion) {
                    return savedQuestion.id;
                }

                return (
                    externalDisplays[0]?.id ||
                    availableDisplays[0].id
                );
            });

            setLeaderboardDisplayId(current => {
                const stillExists =
                    availableDisplays.some(
                        display =>
                            display.id === current
                    );

                if (stillExists) {
                    return current;
                }

                if (savedLeaderboard) {
                    return savedLeaderboard.id;
                }

                return (
                    externalDisplays[1]?.id ||
                    externalDisplays[0]?.id ||
                    availableDisplays[0].id
                );
            });
        }, []);

    /**
     * Load currently available displays.
     */
    const refreshDisplays =
        useCallback(
            async (requestPermission = false) => {
                setLoadingDisplays(true);
                setError('');

                try {
                    const newPermissionStatus =
                        await displayManager.getPermissionStatus();

                    setPermissionStatus(
                        newPermissionStatus
                    );

                    const availableDisplays =
                        await displayManager.getDisplays(
                            requestPermission
                        );

                    setDisplays(availableDisplays);

                    assignDefaultDisplays(
                        availableDisplays
                    );

                    if (
                        requestPermission &&
                        displayManager.isSupported()
                    ) {
                        const afterRequest =
                            await displayManager.getPermissionStatus();

                        setPermissionStatus(
                            afterRequest
                        );
                    }

                    if (
                        !displayManager.isSupported()
                    ) {
                        setInfoMessage(
                            'Automatic monitor selection is not supported by this browser. ' +
                            'Presentation windows can still be opened and moved to the required display manually.'
                        );
                    } else if (
                        availableDisplays.length <= 1
                    ) {
                        setInfoMessage(
                            'No additional extended displays were detected. ' +
                            'In Windows Display Settings, configure your screens using "Extend these displays".'
                        );
                    } else {
                        setInfoMessage('');
                    }
                } catch (err) {
                    console.error(
                        '[PresentationPanel] Failed to load displays:',
                        err
                    );

                    setError(
                        err?.message ||
                        'Unable to detect connected displays.'
                    );
                } finally {
                    setLoadingDisplays(false);
                }
            },
            [assignDefaultDisplays]
        );

    /**
     * Initial display detection.
     */
    useEffect(() => {
        refreshDisplays(false);

        displayManager.onDisplaysChanged(
            async () => {
                try {
                    const updatedDisplays =
                        await displayManager.getDisplays(
                            false
                        );

                    setDisplays(updatedDisplays);

                    assignDefaultDisplays(
                        updatedDisplays
                    );

                    /*
                     * Detect whether selected outputs disappeared.
                     */
                    setQuestionDisplayId(current => {
                        if (!current) {
                            return current;
                        }

                        const exists =
                            updatedDisplays.some(
                                display =>
                                    display.id === current
                            );

                        if (!exists) {
                            setQuestionStatus(
                                STATUS.DISCONNECTED
                            );

                            return '';
                        }

                        return current;
                    });

                    setLeaderboardDisplayId(
                        current => {
                            if (!current) {
                                return current;
                            }

                            const exists =
                                updatedDisplays.some(
                                    display =>
                                        display.id === current
                                );

                            if (!exists) {
                                setLeaderboardStatus(
                                    STATUS.DISCONNECTED
                                );

                                return '';
                            }

                            return current;
                        }
                    );
                } catch (err) {
                    console.error(
                        '[PresentationPanel] Display refresh failed:',
                        err
                    );
                }
            }
        );

        return () => {
            displayManager.onDisplaysChanged(
                null
            );
        };
    }, [
        assignDefaultDisplays,
        refreshDisplays
    ]);

    /**
     * Detect if user manually closes popup windows.
     */
    useEffect(() => {
        windowStatusIntervalRef.current =
            window.setInterval(() => {
                if (
                    questionWindowRef.current &&
                    questionWindowRef.current.closed
                ) {
                    questionWindowRef.current =
                        null;

                    setQuestionStatus(
                        STATUS.CLOSED
                    );
                }

                if (
                    leaderboardWindowRef.current &&
                    leaderboardWindowRef.current.closed
                ) {
                    leaderboardWindowRef.current =
                        null;

                    setLeaderboardStatus(
                        STATUS.CLOSED
                    );
                }
            }, 1000);

        return () => {
            if (
                windowStatusIntervalRef.current
            ) {
                clearInterval(
                    windowStatusIntervalRef.current
                );
            }
        };
    }, []);

    /**
     * Request Window Management permission.
     *
     * Must happen from a user gesture.
     */
    const handleDetectDisplays =
        async () => {
            await refreshDisplays(true);
        };

    /**
     * Question Display
     */
    const handleLaunchQuestion =
        () => {
            setError('');

            if (!pin) {
                setError(
                    'No active game PIN is available.'
                );
                return;
            }

            const popup =
                displayManager.openQuestionDisplay(
                    pin,
                    selectedQuestionDisplay
                );

            if (!popup) {
                setQuestionStatus(
                    STATUS.POPUP_BLOCKED
                );

                setError(
                    'The Question Display window was blocked by the browser. Allow popups for this site and try again.'
                );

                return;
            }

            questionWindowRef.current =
                popup;

            setQuestionStatus(
                STATUS.ACTIVE
            );

            if (
                selectedQuestionDisplay
            ) {
                displayManager.savePreference(
                    'question',
                    selectedQuestionDisplay
                );
            }

            try {
                popup.focus();
            } catch {
                // Ignore focus failure.
            }
        };

    const handleMoveQuestion =
        () => {
            setError('');

            if (!pin) {
                return;
            }

            const popup =
                displayManager.moveQuestionDisplay(
                    pin,
                    selectedQuestionDisplay
                );

            if (!popup) {
                setQuestionStatus(
                    STATUS.POPUP_BLOCKED
                );

                setError(
                    'Unable to open the Question Display window. Check browser popup permissions.'
                );

                return;
            }

            questionWindowRef.current =
                popup;

            setQuestionStatus(
                STATUS.ACTIVE
            );

            if (
                selectedQuestionDisplay
            ) {
                displayManager.savePreference(
                    'question',
                    selectedQuestionDisplay
                );
            }
        };

    const handleCloseQuestion =
        () => {
            displayManager.closeQuestionDisplay();

            questionWindowRef.current =
                null;

            setQuestionStatus(
                STATUS.CLOSED
            );
        };

    /**
     * Leaderboard Display
     */
    const handleLaunchLeaderboard =
        () => {
            setError('');

            if (!pin) {
                setError(
                    'No active game PIN is available.'
                );
                return;
            }

            const popup =
                displayManager.openLeaderboardDisplay(
                    pin,
                    selectedLeaderboardDisplay
                );

            if (!popup) {
                setLeaderboardStatus(
                    STATUS.POPUP_BLOCKED
                );

                setError(
                    'The Leaderboard Display window was blocked by the browser. Allow popups for this site and try again.'
                );

                return;
            }

            leaderboardWindowRef.current =
                popup;

            setLeaderboardStatus(
                STATUS.ACTIVE
            );

            if (
                selectedLeaderboardDisplay
            ) {
                displayManager.savePreference(
                    'leaderboard',
                    selectedLeaderboardDisplay
                );
            }

            try {
                popup.focus();
            } catch {
                // Ignore.
            }
        };

    const handleMoveLeaderboard =
        () => {
            setError('');

            if (!pin) {
                return;
            }

            const popup =
                displayManager.moveLeaderboardDisplay(
                    pin,
                    selectedLeaderboardDisplay
                );

            if (!popup) {
                setLeaderboardStatus(
                    STATUS.POPUP_BLOCKED
                );

                setError(
                    'Unable to open the Leaderboard Display window. Check browser popup permissions.'
                );

                return;
            }

            leaderboardWindowRef.current =
                popup;

            setLeaderboardStatus(
                STATUS.ACTIVE
            );

            if (
                selectedLeaderboardDisplay
            ) {
                displayManager.savePreference(
                    'leaderboard',
                    selectedLeaderboardDisplay
                );
            }
        };

    const handleCloseLeaderboard =
        () => {
            displayManager.closeLeaderboardDisplay();

            leaderboardWindowRef.current =
                null;

            setLeaderboardStatus(
                STATUS.CLOSED
            );
        };

    /**
     * Fullscreen helper.
     *
     * Browser fullscreen restrictions vary.
     *
     * This attempts standards-based fullscreen
     * on the presentation window.
     *
     * If the browser refuses, the popup remains
     * positioned on the selected display and the
     * user can manually fullscreen it.
     */
    const requestFullscreen =
        async (
            popupWindow,
            selectedDisplay,
            outputName
        ) => {
            setError('');
            setInfoMessage('');

            if (
                !popupWindow ||
                popupWindow.closed
            ) {
                setError(
                    `${outputName} is not open. Launch it first.`
                );

                return;
            }

            try {
                const documentElement =
                    popupWindow.document
                        ?.documentElement;

                if (
                    !documentElement ||
                    typeof documentElement.requestFullscreen !==
                    'function'
                ) {
                    throw new Error(
                        'Fullscreen API is not available.'
                    );
                }

                /*
                 * If selected-screen fullscreen is supported,
                 * try it first.
                 */
                if (
                    selectedDisplay?.raw
                ) {
                    try {
                        await documentElement.requestFullscreen(
                            {
                                screen:
                                    selectedDisplay.raw
                            }
                        );

                        return;
                    } catch {
                        /*
                         * Fall through to standard fullscreen.
                         */
                    }
                }

                await documentElement.requestFullscreen();
            } catch (err) {
                console.warn(
                    `[PresentationPanel] ${outputName} fullscreen request failed:`,
                    err
                );

                setInfoMessage(
                    `${outputName} is open, but the browser did not allow automatic fullscreen. ` +
                    'Click inside the presentation window and use its fullscreen control or browser fullscreen.'
                );

                try {
                    popupWindow.focus();
                } catch {
                    // Ignore.
                }
            }
        };

    const handleQuestionFullscreen =
        () => {
            requestFullscreen(
                questionWindowRef.current,
                selectedQuestionDisplay,
                'Question Display'
            );
        };

    const handleLeaderboardFullscreen =
        () => {
            requestFullscreen(
                leaderboardWindowRef.current,
                selectedLeaderboardDisplay,
                'Leaderboard Display'
            );
        };

    /**
     * Warn if both outputs are assigned to the same
     * physical display while multiple displays exist.
     */
    const sameDisplaySelected =
        Boolean(
            questionDisplayId &&
            leaderboardDisplayId &&
            questionDisplayId ===
            leaderboardDisplayId &&
            displays.length > 1
        );

    /**
     * Determine top-level capability status.
     */
    const displayCapabilityText =
        !multiDisplaySupported
            ? 'Browser fallback mode'
            : permissionStatus === 'denied'
                ? 'Display permission denied'
                : displays.length > 1
                    ? `${displays.length} displays detected`
                    : `${displays.length} display detected`;

    return (
        <section style={styles.panel}>
            {/* HEADER */}
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>
                        🖥 Presentation Outputs
                    </h2>

                    <p style={styles.subtitle}>
                        Send Question and Leaderboard
                        views to separate extended displays.
                    </p>
                </div>

                <div style={styles.headerRight}>
                    <span style={styles.displayCount}>
                        {displayCapabilityText}
                    </span>

                    <button
                        type="button"
                        onClick={
                            handleDetectDisplays
                        }
                        disabled={loadingDisplays}
                        style={{
                            ...styles.secondaryButton,
                            opacity:
                                loadingDisplays
                                    ? 0.6
                                    : 1
                        }}
                    >
                        {loadingDisplays
                            ? 'Detecting…'
                            : multiDisplaySupported
                                ? 'Detect Displays'
                                : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* PERMISSION */}
            {multiDisplaySupported &&
                permissionStatus !==
                'granted' && (
                    <div
                        style={
                            styles.permissionBox
                        }
                    >
                        <div>
                            <strong>
                                Extended display access
                            </strong>

                            <p
                                style={
                                    styles.smallText
                                }
                            >
                                Your browser may ask for
                                permission to identify and
                                position windows on connected
                                monitors.
                            </p>
                        </div>

                        <StatusBadge
                            status={
                                permissionStatus ===
                                    'denied'
                                    ? STATUS.DISCONNECTED
                                    : STATUS.PERMISSION_REQUIRED
                            }
                        />
                    </div>
                )}

            {/* INFO */}
            {infoMessage && (
                <div
                    style={styles.infoBox}
                    role="status"
                >
                    ℹ️ {infoMessage}
                </div>
            )}

            {/* ERROR */}
            {error && (
                <div
                    style={styles.errorBox}
                    role="alert"
                >
                    ⚠️ {error}
                </div>
            )}

            {/* SAME DISPLAY WARNING */}
            {sameDisplaySelected && (
                <div
                    style={styles.warningBox}
                >
                    ⚠️ Question Output and
                    Leaderboard Output are assigned
                    to the same display.
                    <br />
                    This is allowed, but only one
                    output can be clearly visible
                    fullscreen at a time.
                </div>
            )}

            <div style={styles.outputsGrid}>
                {/* QUESTION OUTPUT */}
                <OutputCard
                    icon="❓"
                    title="Question Output"
                    description="Question, options, countdown timer and answer reveal."
                    status={questionStatus}
                >
                    <DisplaySelector
                        displays={displays}
                        selectedId={
                            questionDisplayId
                        }
                        onChange={
                            setQuestionDisplayId
                        }
                        disabled={
                            loadingDisplays
                        }
                    />

                    <div
                        style={
                            styles.controlsRow
                        }
                    >
                        <ActionButton
                            primary
                            onClick={
                                handleLaunchQuestion
                            }
                            disabled={
                                !pin ||
                                !questionDisplayId
                            }
                        >
                            ▶ Launch
                        </ActionButton>

                        <ActionButton
                            onClick={
                                handleMoveQuestion
                            }
                            disabled={
                                !questionDisplayId ||
                                questionStatus !==
                                STATUS.ACTIVE
                            }
                        >
                            ↔ Reassign
                        </ActionButton>

                        <ActionButton
                            onClick={
                                handleQuestionFullscreen
                            }
                            disabled={
                                questionStatus !==
                                STATUS.ACTIVE
                            }
                        >
                            ⛶ Fullscreen
                        </ActionButton>

                        <ActionButton
                            danger
                            onClick={
                                handleCloseQuestion
                            }
                            disabled={
                                questionStatus !==
                                STATUS.ACTIVE
                            }
                        >
                            ✕ Close
                        </ActionButton>
                    </div>
                </OutputCard>

                {/* LEADERBOARD OUTPUT */}
                <OutputCard
                    icon="🏆"
                    title="Leaderboard Output"
                    description="Top players, scores and animated rank changes."
                    status={leaderboardStatus}
                >
                    <DisplaySelector
                        displays={displays}
                        selectedId={
                            leaderboardDisplayId
                        }
                        onChange={
                            setLeaderboardDisplayId
                        }
                        disabled={
                            loadingDisplays
                        }
                    />

                    <div
                        style={
                            styles.controlsRow
                        }
                    >
                        <ActionButton
                            primary
                            onClick={
                                handleLaunchLeaderboard
                            }
                            disabled={
                                !pin ||
                                !leaderboardDisplayId
                            }
                        >
                            ▶ Launch
                        </ActionButton>

                        <ActionButton
                            onClick={
                                handleMoveLeaderboard
                            }
                            disabled={
                                !leaderboardDisplayId ||
                                leaderboardStatus !==
                                STATUS.ACTIVE
                            }
                        >
                            ↔ Reassign
                        </ActionButton>

                        <ActionButton
                            onClick={
                                handleLeaderboardFullscreen
                            }
                            disabled={
                                leaderboardStatus !==
                                STATUS.ACTIVE
                            }
                        >
                            ⛶ Fullscreen
                        </ActionButton>

                        <ActionButton
                            danger
                            onClick={
                                handleCloseLeaderboard
                            }
                            disabled={
                                leaderboardStatus !==
                                STATUS.ACTIVE
                            }
                        >
                            ✕ Close
                        </ActionButton>
                    </div>
                </OutputCard>
            </div>

            {/* DETECTED DISPLAYS */}
            <div
                style={
                    styles.detectedDisplaysSection
                }
            >
                <h3 style={styles.sectionTitle}>
                    Connected Displays
                </h3>

                {displays.length === 0 ? (
                    <p style={styles.mutedText}>
                        No displays detected yet.
                    </p>
                ) : (
                    <div
                        style={
                            styles.displayList
                        }
                    >
                        {displays.map(
                            (display, index) => (
                                <div
                                    key={display.id}
                                    style={
                                        styles.displayListItem
                                    }
                                >
                                    <div>
                                        <strong>
                                            {display.label ||
                                                `Display ${index + 1
                                                }`}
                                        </strong>

                                        <div
                                            style={
                                                styles.displayMetadata
                                            }
                                        >
                                            {display.width}×
                                            {display.height}

                                            {display.isPrimary &&
                                                ' • Primary'}

                                            {!display.isPrimary &&
                                                display.isExtended &&
                                                ' • Extended'}
                                        </div>
                                    </div>

                                    <span
                                        style={
                                            styles.displayNumber
                                        }
                                    >
                                        {index + 1}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

/**
 * Output card
 */
function OutputCard({
    icon,
    title,
    description,
    status,
    children
}) {
    return (
        <div style={styles.outputCard}>
            <div style={styles.outputHeader}>
                <div>
                    <h3
                        style={
                            styles.outputTitle
                        }
                    >
                        {icon} {title}
                    </h3>

                    <p
                        style={
                            styles.outputDescription
                        }
                    >
                        {description}
                    </p>
                </div>

                <StatusBadge
                    status={status}
                />
            </div>

            {children}
        </div>
    );
}

/**
 * Display dropdown
 */
function DisplaySelector({
    displays,
    selectedId,
    onChange,
    disabled
}) {
    return (
        <div
            style={
                styles.selectorWrapper
            }
        >
            <label
                style={styles.label}
            >
                Display
            </label>

            <select
                value={selectedId}
                disabled={
                    disabled ||
                    displays.length === 0
                }
                onChange={event =>
                    onChange(
                        event.target.value
                    )
                }
                style={styles.select}
            >
                {displays.length === 0 && (
                    <option value="">
                        No display available
                    </option>
                )}

                {displays.map(display => (
                    <option
                        key={display.id}
                        value={display.id}
                    >
                        {display.label}
                        {' — '}
                        {display.width}×
                        {display.height}
                        {display.isPrimary
                            ? ' — Primary'
                            : ''}
                    </option>
                ))}
            </select>

            {selectedId && (
                <div
                    style={
                        styles.selectedDisplayInfo
                    }
                >
                    <DisplayOptionLabel
                        display={displays.find(
                            display =>
                                display.id ===
                                selectedId
                        )}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Generic action button
 */
function ActionButton({
    children,
    onClick,
    disabled,
    primary = false,
    danger = false
}) {
    let buttonStyle = {
        ...styles.actionButton
    };

    if (primary) {
        buttonStyle = {
            ...buttonStyle,
            ...styles.primaryButton
        };
    }

    if (danger) {
        buttonStyle = {
            ...buttonStyle,
            ...styles.dangerButton
        };
    }

    if (disabled) {
        buttonStyle = {
            ...buttonStyle,
            opacity: 0.4,
            cursor: 'not-allowed'
        };
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={buttonStyle}
        >
            {children}
        </button>
    );
}

/**
 * Inline styles
 *
 * This keeps the component self-contained for now.
 * You can later move these into your normal CSS files.
 */
const styles = {
    panel: {
        width: '100%',
        maxWidth: '1100px',
        margin: '2rem auto',
        padding: '1.5rem',
        borderRadius: '18px',
        background:
            'rgba(30, 41, 59, 0.92)',
        border:
            '1px solid rgba(148, 163, 184, 0.18)',
        boxSizing: 'border-box'
    },

    header: {
        display: 'flex',
        justifyContent:
            'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.5rem'
    },

    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap'
    },

    title: {
        margin: 0,
        fontSize: '1.6rem',
        fontWeight: 900,
        color: '#f8fafc'
    },

    subtitle: {
        margin:
            '0.4rem 0 0 0',
        fontSize: '0.95rem',
        color: '#94a3b8'
    },

    displayCount: {
        color: '#cbd5e1',
        fontSize: '0.9rem'
    },

    outputsGrid: {
        display: 'grid',
        gridTemplateColumns:
            'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem'
    },

    outputCard: {
        padding: '1.25rem',
        borderRadius: '14px',
        background:
            'rgba(15, 23, 42, 0.7)',
        border:
            '1px solid rgba(148, 163, 184, 0.16)'
    },

    outputHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent:
            'space-between',
        gap: '1rem',
        marginBottom: '1rem'
    },

    outputTitle: {
        margin: 0,
        fontSize: '1.2rem',
        fontWeight: 800,
        color: '#f8fafc'
    },

    outputDescription: {
        margin:
            '0.35rem 0 0 0',
        fontSize: '0.85rem',
        lineHeight: 1.45,
        color: '#94a3b8'
    },

    selectorWrapper: {
        marginBottom: '1rem'
    },

    label: {
        display: 'block',
        marginBottom: '0.4rem',
        fontWeight: 700,
        fontSize: '0.85rem',
        color: '#cbd5e1'
    },

    select: {
        width: '100%',
        boxSizing: 'border-box',
        padding:
            '0.75rem 0.9rem',
        borderRadius: '9px',
        border:
            '1px solid rgba(148, 163, 184, 0.3)',
        background: '#0f172a',
        color: '#f8fafc',
        outline: 'none',
        fontSize: '0.9rem'
    },

    selectedDisplayInfo: {
        marginTop: '0.5rem',
        color: '#94a3b8',
        fontSize: '0.78rem'
    },

    controlsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.55rem'
    },

    actionButton: {
        border: 'none',
        padding:
            '0.65rem 0.9rem',
        borderRadius: '8px',
        background: '#334155',
        color: '#f8fafc',
        fontWeight: 700,
        cursor: 'pointer'
    },

    primaryButton: {
        background: '#2563eb'
    },

    dangerButton: {
        background: '#7f1d1d'
    },

    secondaryButton: {
        border:
            '1px solid rgba(148, 163, 184, 0.3)',
        borderRadius: '8px',
        padding:
            '0.65rem 0.9rem',
        background: '#334155',
        color: '#f8fafc',
        fontWeight: 700,
        cursor: 'pointer'
    },

    badge: {
        display: 'inline-flex',
        alignItems: 'center',
        padding:
            '0.3rem 0.55rem',
        borderRadius: '999px',
        fontSize: '0.7rem',
        fontWeight: 900,
        whiteSpace: 'nowrap'
    },

    permissionBox: {
        display: 'flex',
        justifyContent:
            'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '0.9rem',
        borderRadius: '10px',
        background:
            'rgba(245, 158, 11, 0.07)',
        border:
            '1px solid rgba(245, 158, 11, 0.2)',
        color: '#f8fafc'
    },

    smallText: {
        margin:
            '0.25rem 0 0 0',
        color: '#94a3b8',
        fontSize: '0.8rem'
    },

    infoBox: {
        marginBottom: '1rem',
        padding: '0.8rem',
        borderRadius: '8px',
        background:
            'rgba(59, 130, 246, 0.09)',
        border:
            '1px solid rgba(59, 130, 246, 0.25)',
        color: '#bfdbfe',
        fontSize: '0.85rem',
        lineHeight: 1.5
    },

    warningBox: {
        marginBottom: '1rem',
        padding: '0.8rem',
        borderRadius: '8px',
        background:
            'rgba(245, 158, 11, 0.09)',
        border:
            '1px solid rgba(245, 158, 11, 0.25)',
        color: '#fde68a',
        fontSize: '0.85rem',
        lineHeight: 1.5
    },

    errorBox: {
        marginBottom: '1rem',
        padding: '0.8rem',
        borderRadius: '8px',
        background:
            'rgba(239, 68, 68, 0.09)',
        border:
            '1px solid rgba(239, 68, 68, 0.25)',
        color: '#fecaca',
        fontSize: '0.85rem'
    },

    detectedDisplaysSection: {
        marginTop: '1.5rem'
    },

    sectionTitle: {
        margin:
            '0 0 0.75rem 0',
        color: '#f8fafc',
        fontSize: '1rem'
    },

    displayList: {
        display: 'grid',
        gridTemplateColumns:
            'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.7rem'
    },

    displayListItem: {
        display: 'flex',
        justifyContent:
            'space-between',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem',
        borderRadius: '9px',
        background:
            'rgba(15, 23, 42, 0.65)',
        border:
            '1px solid rgba(148, 163, 184, 0.15)',
        color: '#f8fafc'
    },

    displayMetadata: {
        marginTop: '0.2rem',
        color: '#94a3b8',
        fontSize: '0.75rem'
    },

    displayNumber: {
        display: 'flex',
        alignItems: 'center',
        justifyContent:
            'center',
        width: '30px',
        height: '30px',
        flexShrink: 0,
        borderRadius: '50%',
        background: '#2563eb',
        color: '#fff',
        fontWeight: 900
    },

    mutedText: {
        color: '#94a3b8',
        fontSize: '0.9rem'
    }
};

export default PresentationPanel;