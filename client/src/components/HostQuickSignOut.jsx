import React from 'react';
import { SignOutButton } from '@clerk/react';

export function HostQuickSignOut() {
    return (
        <div
            style={{
                position: 'fixed',
                top: '18px',
                right: '18px',
                zIndex: 9999
            }}
        >
            <SignOutButton redirectUrl="/login">
                <button
                    type="button"
                    title="Sign out of ChurchQuiz Host"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',

                        padding: '0.7rem 1rem',

                        border: '1px solid rgba(248, 113, 113, 0.45)',
                        borderRadius: '10px',

                        background: 'rgba(127, 29, 29, 0.92)',
                        color: '#ffffff',

                        fontSize: '0.9rem',
                        fontWeight: '800',

                        cursor: 'pointer',

                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',

                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <span>🚪</span>
                    <span>Sign Out</span>
                </button>
            </SignOutButton>
        </div>
    );
}

export default HostQuickSignOut;