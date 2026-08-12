import React from 'react';

import {
    useNavigate
} from 'react-router-dom';

import {
    SignOutButton,
    UserButton,
    useUser
} from '@clerk/react';


const PLAYER_URL =
    import.meta.env.VITE_PLAYER_URL ||
    'http://localhost:5174';

const NORMALIZED_PLAYER_URL =
    PLAYER_URL.replace(/\/+$/, '');

const JOIN_URL =
    `${NORMALIZED_PLAYER_URL}/join`;


export function HostPortal() {
    const navigate = useNavigate();

    const {
        isLoaded,
        user
    } = useUser();


    if (!isLoaded) {
        return (
            <div
                className="app-container"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
            >
                <div
                    className="card"
                    style={{
                        textAlign: 'center'
                    }}
                >
                    <h2
                        style={{
                            color: 'var(--accent-gold)'
                        }}
                    >
                        Loading...
                    </h2>
                </div>
            </div>
        );
    }


    const displayName =
        user?.firstName ||
        user?.username ||
        user?.primaryEmailAddress?.emailAddress ||
        'Host';


    const handlePlayGame = () => {
        window.location.href =
            JOIN_URL;
    };


    return (
        <div
            className="app-container"
            style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem'
            }}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: '650px',
                    padding: '2rem'
                }}
            >
                {/* Header */}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}
                >
                    <div>
                        <div
                            style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.85rem',
                                marginBottom: '0.25rem'
                            }}
                        >
                            Signed in as
                        </div>

                        <div
                            style={{
                                color: '#ffffff',
                                fontWeight: '800',
                                fontSize: '1.1rem'
                            }}
                        >
                            {displayName}
                        </div>
                    </div>

                    <UserButton
                        showName={false}
                    />
                </div>


                {/* Main title */}

                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '2rem'
                    }}
                >
                    <div
                        style={{
                            fontSize: '3.5rem',
                            marginBottom: '0.6rem'
                        }}
                    >
                        ✝️
                    </div>

                    <h1
                        style={{
                            color: 'var(--accent-gold)',
                            margin: 0,
                            fontSize: '2.3rem'
                        }}
                    >
                        ChurchQuiz Live
                    </h1>

                    <p
                        style={{
                            color: 'var(--text-muted)',
                            marginTop: '0.75rem',
                            fontSize: '1rem'
                        }}
                    >
                        Choose where you want to go.
                    </p>
                </div>


                {/* Actions */}

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns:
                            'repeat(2, minmax(0, 1fr))',
                        gap: '1rem'
                    }}
                >
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                            navigate('/host')
                        }
                        style={{
                            minHeight: '150px',
                            fontSize: '1.2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span
                            style={{
                                fontSize: '2.5rem'
                            }}
                        >
                            🎛️
                        </span>

                        <span>
                            Go to Host Dashboard
                        </span>

                        <span
                            style={{
                                fontSize: '0.75rem',
                                opacity: 0.75,
                                fontWeight: '500'
                            }}
                        >
                            Create and manage a quiz
                        </span>
                    </button>


                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handlePlayGame}
                        style={{
                            minHeight: '150px',
                            fontSize: '1.2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span
                            style={{
                                fontSize: '2.5rem'
                            }}
                        >
                            🎮
                        </span>

                        <span>
                            Play Game
                        </span>

                        <span
                            style={{
                                fontSize: '0.75rem',
                                opacity: 0.75,
                                fontWeight: '500'
                            }}
                        >
                            Open the public Join page
                        </span>
                    </button>
                </div>


                {/* Player URL */}

                <div
                    style={{
                        marginTop: '1.25rem',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background:
                            'rgba(15, 23, 42, 0.5)',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        wordBreak: 'break-all'
                    }}
                >
                    Player:
                    {' '}
                    {JOIN_URL}
                </div>


                {/* Sign out */}

                <div
                    style={{
                        marginTop: '2rem',
                        paddingTop: '1.5rem',
                        borderTop:
                            '1px solid rgba(148, 163, 184, 0.15)',
                        textAlign: 'center'
                    }}
                >
                    <SignOutButton
                        redirectUrl="/login"
                    >
                        <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                                padding:
                                    '0.75rem 1.75rem'
                            }}
                        >
                            🚪 Sign Out
                        </button>
                    </SignOutButton>
                </div>
            </div>
        </div>
    );
}


export default HostPortal;