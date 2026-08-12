import React from 'react';

import Lightfall from './Lightfall';


export function LightfallBackground() {
    return (
        <div
            className="lightfall-global-background"
            aria-hidden="true"
        >
            <Lightfall
                /*
                 * Keep DPR at 1 for better performance,
                 * especially on player phones.
                 */
                dpr={1}

                /*
                 * ChurchQuiz red + white palette
                 */
                colors={[
                    '#FFFFFF',
                    '#FFD6D6',
                    '#FF4D5F',
                    '#D41432',
                    '#8F001B'
                ]}

                /*
                 * Deep burgundy background
                 */
                backgroundColor="#160307"

                /*
                 * Motion
                 */
                speed={0.45}

                streakCount={4}

                streakWidth={0.9}

                streakLength={1.2}

                /*
                 * Lighting
                 */
                glow={0.9}

                density={0.7}

                twinkle={0.8}

                zoom={3}

                backgroundGlow={0.4}

                opacity={1}

                /*
                 * Interactive cursor glow
                 */
                mouseInteraction={true}

                mouseStrength={0.35}

                mouseRadius={0.8}

                mouseDampening={0.18}
            />

            {/* Dark readability layer */}
            <div
                className="lightfall-readability-overlay"
            />
        </div>
    );
}


export default LightfallBackground;