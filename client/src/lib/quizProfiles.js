const PROFILES_STORAGE_KEY = 'churchquiz_quiz_profiles_v1';
const SELECTED_PROFILE_KEY = 'churchquiz_selected_profile_v1';

/**
 * Special built-in profile.
 *
 * questions: null means:
 * "Use server/questions.json"
 *
 * This prevents us from duplicating your existing
 * default questions inside the frontend.
 */
export const DEFAULT_PROFILE = {
    id: 'default-bible-quiz',
    name: 'Default Bible Quiz',
    description: 'Built-in ChurchQuiz question set.',
    builtIn: true,
    questions: null
};

function generateId(prefix = 'item') {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

function safeReadProfiles() {
    try {
        const raw = localStorage.getItem(PROFILES_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            profile =>
                profile &&
                typeof profile === 'object' &&
                typeof profile.id === 'string' &&
                typeof profile.name === 'string' &&
                Array.isArray(profile.questions)
        );
    } catch (error) {
        console.error(
            '[quizProfiles] Could not read profiles:',
            error
        );

        return [];
    }
}

function writeProfiles(profiles) {
    try {
        localStorage.setItem(
            PROFILES_STORAGE_KEY,
            JSON.stringify(profiles)
        );

        return true;
    } catch (error) {
        console.error(
            '[quizProfiles] Could not save profiles:',
            error
        );

        return false;
    }
}

/**
 * Returns:
 *
 * Default Bible Quiz
 * +
 * all custom profiles
 */
export function getProfiles() {
    return [
        DEFAULT_PROFILE,
        ...safeReadProfiles()
    ];
}

export function getCustomProfiles() {
    return safeReadProfiles();
}

export function getProfileById(profileId) {
    if (!profileId) {
        return DEFAULT_PROFILE;
    }

    if (profileId === DEFAULT_PROFILE.id) {
        return DEFAULT_PROFILE;
    }

    return (
        safeReadProfiles().find(
            profile => profile.id === profileId
        ) || DEFAULT_PROFILE
    );
}

export function getSelectedProfileId() {
    try {
        const selectedId =
            localStorage.getItem(
                SELECTED_PROFILE_KEY
            );

        if (!selectedId) {
            return DEFAULT_PROFILE.id;
        }

        const exists = getProfiles().some(
            profile => profile.id === selectedId
        );

        return exists
            ? selectedId
            : DEFAULT_PROFILE.id;
    } catch {
        return DEFAULT_PROFILE.id;
    }
}

export function setSelectedProfileId(profileId) {
    try {
        const profile =
            getProfileById(profileId);

        localStorage.setItem(
            SELECTED_PROFILE_KEY,
            profile.id
        );

        return profile.id;
    } catch (error) {
        console.error(
            '[quizProfiles] Could not save selected profile:',
            error
        );

        return DEFAULT_PROFILE.id;
    }
}

export function createEmptyQuestion() {
    return {
        id: generateId('question'),

        question: '',

        options: [
            '',
            '',
            '',
            ''
        ],

        correctOption: 0,

        explanation: '',

        duration: 15
    };
}

export function createProfile({
    name,
    description = '',
    questions = []
}) {
    const profiles =
        safeReadProfiles();

    const now = Date.now();

    const profile = {
        id: generateId('profile'),

        name: name.trim(),

        description:
            description.trim(),

        builtIn: false,

        createdAt: now,
        updatedAt: now,

        questions: questions.map(
            question => ({
                ...question,

                id:
                    question.id ||
                    generateId('question'),

                options: [
                    ...(question.options || [])
                ]
            })
        )
    };

    profiles.push(profile);

    if (!writeProfiles(profiles)) {
        throw new Error(
            'Unable to save quiz profile.'
        );
    }

    return profile;
}

export function updateProfile(
    profileId,
    updates
) {
    if (
        profileId ===
        DEFAULT_PROFILE.id
    ) {
        throw new Error(
            'The built-in Default Bible Quiz cannot be edited.'
        );
    }

    const profiles =
        safeReadProfiles();

    const index =
        profiles.findIndex(
            profile =>
                profile.id === profileId
        );

    if (index === -1) {
        throw new Error(
            'Quiz profile was not found.'
        );
    }

    profiles[index] = {
        ...profiles[index],
        ...updates,

        id: profiles[index].id,

        builtIn: false,

        updatedAt: Date.now(),

        questions:
            updates.questions
                ? updates.questions.map(
                    question => ({
                        ...question,

                        id:
                            question.id ||
                            generateId(
                                'question'
                            ),

                        options: [
                            ...(question.options ||
                                [])
                        ]
                    })
                )
                : profiles[index]
                    .questions
    };

    if (!writeProfiles(profiles)) {
        throw new Error(
            'Unable to update quiz profile.'
        );
    }

    return profiles[index];
}

export function duplicateProfile(
    profileId
) {
    const source =
        getProfileById(profileId);

    /**
     * We cannot duplicate the server-side
     * built-in questions because they do not
     * exist in the browser.
     */
    if (
        source.id ===
        DEFAULT_PROFILE.id
    ) {
        throw new Error(
            'Create a new profile to customize questions from the built-in quiz.'
        );
    }

    const questions =
        source.questions.map(
            question => ({
                ...question,

                id: generateId(
                    'question'
                ),

                options: [
                    ...question.options
                ]
            })
        );

    return createProfile({
        name: `${source.name} Copy`,
        description:
            source.description || '',
        questions
    });
}

export function deleteProfile(
    profileId
) {
    if (
        profileId ===
        DEFAULT_PROFILE.id
    ) {
        throw new Error(
            'The Default Bible Quiz cannot be deleted.'
        );
    }

    const profiles =
        safeReadProfiles();

    const remaining =
        profiles.filter(
            profile =>
                profile.id !== profileId
        );

    if (!writeProfiles(remaining)) {
        throw new Error(
            'Unable to delete quiz profile.'
        );
    }

    const selected =
        getSelectedProfileId();

    if (selected === profileId) {
        setSelectedProfileId(
            DEFAULT_PROFILE.id
        );
    }

    return remaining;
}

export function validateProfileDraft(
    draft
) {
    const errors = [];

    if (
        !draft?.name ||
        !draft.name.trim()
    ) {
        errors.push(
            'Profile name is required.'
        );
    }

    if (
        !Array.isArray(
            draft?.questions
        ) ||
        draft.questions.length === 0
    ) {
        errors.push(
            'Add at least one question.'
        );

        return errors;
    }

    if (
        draft.questions.length > 100
    ) {
        errors.push(
            'A profile can contain a maximum of 100 questions.'
        );
    }

    draft.questions.forEach(
        (question, index) => {
            const number =
                index + 1;

            if (
                !question.question ||
                !question.question.trim()
            ) {
                errors.push(
                    `Question ${number}: question text is required.`
                );
            }

            if (
                !Array.isArray(
                    question.options
                ) ||
                question.options.length !==
                4
            ) {
                errors.push(
                    `Question ${number}: exactly 4 answer options are required.`
                );
            } else {
                question.options.forEach(
                    (option, optionIndex) => {
                        if (
                            !option ||
                            !option.trim()
                        ) {
                            errors.push(
                                `Question ${number}: Option ${String.fromCharCode(
                                    65 +
                                    optionIndex
                                )} is required.`
                            );
                        }
                    }
                );
            }

            if (
                !Number.isInteger(
                    Number(
                        question.correctOption
                    )
                ) ||
                Number(
                    question.correctOption
                ) < 0 ||
                Number(
                    question.correctOption
                ) > 3
            ) {
                errors.push(
                    `Question ${number}: select a valid correct answer.`
                );
            }

            const duration =
                Number(
                    question.duration
                );

            if (
                !Number.isFinite(
                    duration
                ) ||
                duration < 5 ||
                duration > 120
            ) {
                errors.push(
                    `Question ${number}: timer must be between 5 and 120 seconds.`
                );
            }
        }
    );

    return errors;
}

export function cloneProfileForEditing(
    profile
) {
    if (!profile) {
        return null;
    }

    return {
        ...profile,

        questions:
            Array.isArray(
                profile.questions
            )
                ? profile.questions.map(
                    question => ({
                        ...question,

                        options: [
                            ...question.options
                        ]
                    })
                )
                : []
    };
}