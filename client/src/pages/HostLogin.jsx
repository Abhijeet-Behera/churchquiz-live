import React from 'react';

import {
    SignIn,
    useAuth
} from '@clerk/react';

import {
    Navigate
} from 'react-router-dom';


export function HostLogin() {
    const {
        isLoaded,
        isSignedIn
    } = useAuth();


    if (!isLoaded) {
        return (
            <div
                className="app-container"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                }}
            >
                <div
                    className="card"
                    style={{
                        maxWidth: '420px',
                        width: '100%'
                    }}
                >
                    <div
                        style={{
                            fontSize: '2.5rem',
                            marginBottom: '1rem'
                        }}
                    >
                        ⏳
                    </div>

                    <h2
                        style={{
                            color: 'var(--accent-gold)'
                        }}
                    >
                        Loading ChurchQuiz
                    </h2>

                    <p
                        style={{
                            color: 'var(--text-muted)'
                        }}
                    >
                        Checking authentication...
                    </p>
                </div>
            </div>
        );
    }


    /*
     * Already signed in?
     * Go directly to the Host Portal.
     */
    if (isSignedIn) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }


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
                style={{
                    width: '100%',
                    maxWidth: '480px'
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        marginBottom: '1.5rem'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: '0.9rem'
                        }}
                    >
                        <svg
                            width="86"
                            height="110"
                            viewBox="0 0 86 110"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-label="Cross"
                        >
                            {/* Main vertical lines */}
                            <line x1="39" y1="5" x2="39" y2="105" stroke="white" strokeWidth="2" />
                            <line x1="44" y1="0" x2="44" y2="110" stroke="white" strokeWidth="1.4" />
                            <line x1="34" y1="18" x2="34" y2="94" stroke="white" strokeWidth="1.2" />

                            {/* Vertical broken details */}
                            <line x1="29" y1="20" x2="29" y2="35" stroke="white" strokeWidth="1.2" />
                            <line x1="29" y1="74" x2="29" y2="88" stroke="white" strokeWidth="1.2" />

                            <line x1="49" y1="10" x2="49" y2="29" stroke="white" strokeWidth="1.1" />
                            <line x1="49" y1="82" x2="49" y2="99" stroke="white" strokeWidth="1.1" />

                            {/* Horizontal cross section */}
                            <line x1="7" y1="48" x2="79" y2="48" stroke="white" strokeWidth="2" />
                            <line x1="0" y1="53" x2="86" y2="53" stroke="white" strokeWidth="1.2" />
                            <line x1="14" y1="58" x2="72" y2="58" stroke="white" strokeWidth="1.2" />

                            {/* Broken horizontal details */}
                            <line x1="4" y1="43" x2="23" y2="43" stroke="white" strokeWidth="1.1" />
                            <line x1="57" y1="43" x2="82" y2="43" stroke="white" strokeWidth="1.1" />

                            <line x1="10" y1="62" x2="28" y2="62" stroke="white" strokeWidth="1" />
                            <line x1="55" y1="62" x2="77" y2="62" stroke="white" strokeWidth="1" />
                        </svg>
                    </div>

                    <h1
                        style={{
                            margin: 0,
                            color: 'var(--accent-gold)',
                            fontSize: '2.2rem'
                        }}
                    >
                        ChurchQuiz Live
                    </h1>

                    <p
                        style={{
                            marginTop: '0.6rem',
                            color: 'var(--text-muted)',
                            fontSize: '1rem'
                        }}
                    >
                        Authorized Host Access
                    </p>
                </div>


                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center'
                    }}
                >
                    <SignIn
                        routing="path"
                        path="/login"
                        forceRedirectUrl="/"
                    />
                </div>


                <p
                    style={{
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        marginTop: '1.25rem'
                    }}
                >
                    Only approved ChurchQuiz hosts can sign in.
                </p>
            </div>
        </div>
    );
}


export default HostLogin;