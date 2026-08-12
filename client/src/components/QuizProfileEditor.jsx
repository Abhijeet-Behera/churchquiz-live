import React, {
    useEffect,
    useState
} from 'react';

import {
    createEmptyQuestion,
    validateProfileDraft
} from '../lib/quizProfiles';

const OPTION_LABELS = [
    'A',
    'B',
    'C',
    'D'
];

function createBlankProfile() {
    return {
        name: '',
        description: '',
        questions: [
            createEmptyQuestion()
        ]
    };
}

export function QuizProfileEditor({
    isOpen,
    initialProfile = null,
    onSave,
    onCancel
}) {
    const [draft, setDraft] =
        useState(
            createBlankProfile()
        );

    const [errors, setErrors] =
        useState([]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (
            initialProfile &&
            Array.isArray(
                initialProfile.questions
            )
        ) {
            setDraft({
                ...initialProfile,

                questions:
                    initialProfile.questions.map(
                        question => ({
                            ...question,

                            options: [
                                ...question.options
                            ]
                        })
                    )
            });
        } else {
            setDraft(
                createBlankProfile()
            );
        }

        setErrors([]);
    }, [
        isOpen,
        initialProfile
    ]);

    if (!isOpen) {
        return null;
    }

    function updateQuestion(
        questionIndex,
        updates
    ) {
        setDraft(previous => ({
            ...previous,

            questions:
                previous.questions.map(
                    (question, index) =>
                        index ===
                            questionIndex
                            ? {
                                ...question,
                                ...updates
                            }
                            : question
                )
        }));
    }

    function updateOption(
        questionIndex,
        optionIndex,
        value
    ) {
        setDraft(previous => ({
            ...previous,

            questions:
                previous.questions.map(
                    (question, index) => {
                        if (
                            index !==
                            questionIndex
                        ) {
                            return question;
                        }

                        const options = [
                            ...question.options
                        ];

                        options[
                            optionIndex
                        ] = value;

                        return {
                            ...question,
                            options
                        };
                    }
                )
        }));
    }

    function addQuestion() {
        setDraft(previous => ({
            ...previous,

            questions: [
                ...previous.questions,
                createEmptyQuestion()
            ]
        }));
    }

    function deleteQuestion(
        questionIndex
    ) {
        setDraft(previous => {
            if (
                previous.questions
                    .length <= 1
            ) {
                return previous;
            }

            return {
                ...previous,

                questions:
                    previous.questions.filter(
                        (_, index) =>
                            index !==
                            questionIndex
                    )
            };
        });
    }

    function duplicateQuestion(
        questionIndex
    ) {
        setDraft(previous => {
            const source =
                previous.questions[
                questionIndex
                ];

            const duplicate = {
                ...source,

                id:
                    createEmptyQuestion()
                        .id,

                question:
                    `${source.question}`,

                options: [
                    ...source.options
                ]
            };

            const questions = [
                ...previous.questions
            ];

            questions.splice(
                questionIndex + 1,
                0,
                duplicate
            );

            return {
                ...previous,
                questions
            };
        });
    }

    function moveQuestion(
        questionIndex,
        direction
    ) {
        setDraft(previous => {
            const targetIndex =
                questionIndex +
                direction;

            if (
                targetIndex < 0 ||
                targetIndex >=
                previous.questions
                    .length
            ) {
                return previous;
            }

            const questions = [
                ...previous.questions
            ];

            [
                questions[
                questionIndex
                ],
                questions[
                targetIndex
                ]
            ] = [
                    questions[
                    targetIndex
                    ],
                    questions[
                    questionIndex
                    ]
                ];

            return {
                ...previous,
                questions
            };
        });
    }

    function handleSave() {
        const validationErrors =
            validateProfileDraft(
                draft
            );

        if (
            validationErrors.length >
            0
        ) {
            setErrors(
                validationErrors
            );

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

            return;
        }

        setErrors([]);

        onSave({
            ...draft,

            name:
                draft.name.trim(),

            description:
                draft.description.trim(),

            questions:
                draft.questions.map(
                    question => ({
                        ...question,

                        question:
                            question.question.trim(),

                        options:
                            question.options.map(
                                option =>
                                    option.trim()
                            ),

                        correctOption:
                            Number(
                                question.correctOption
                            ),

                        explanation:
                            (
                                question.explanation ||
                                ''
                            ).trim(),

                        duration:
                            Number(
                                question.duration
                            )
                    })
                )
        });
    }

    return (
        <div
            style={styles.overlay}
        >
            <div
                style={styles.modal}
            >
                <div
                    style={styles.header}
                >
                    <div>
                        <h2
                            style={
                                styles.title
                            }
                        >
                            {initialProfile
                                ? '✏️ Edit Quiz Profile'
                                : '➕ Create Quiz Profile'}
                        </h2>

                        <p
                            style={
                                styles.subtitle
                            }
                        >
                            Build the question
                            set that will be
                            used for this quiz.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        style={
                            styles.closeButton
                        }
                    >
                        ✕
                    </button>
                </div>

                {errors.length > 0 && (
                    <div
                        style={
                            styles.errorBox
                        }
                    >
                        <strong>
                            Please fix the
                            following:
                        </strong>

                        <ul>
                            {errors.map(
                                (
                                    error,
                                    index
                                ) => (
                                    <li key={index}>
                                        {error}
                                    </li>
                                )
                            )}
                        </ul>
                    </div>
                )}

                <div
                    style={
                        styles.profileSection
                    }
                >
                    <label
                        style={styles.label}
                    >
                        Profile Name
                    </label>

                    <input
                        type="text"
                        value={draft.name}
                        onChange={event =>
                            setDraft(
                                previous => ({
                                    ...previous,
                                    name:
                                        event.target
                                            .value
                                })
                            )
                        }
                        placeholder="Example: Genesis Quiz"
                        style={styles.input}
                    />

                    <label
                        style={{
                            ...styles.label,
                            marginTop:
                                '1rem'
                        }}
                    >
                        Description
                    </label>

                    <textarea
                        value={
                            draft.description
                        }
                        onChange={event =>
                            setDraft(
                                previous => ({
                                    ...previous,
                                    description:
                                        event.target
                                            .value
                                })
                            )
                        }
                        placeholder="Optional description"
                        rows={2}
                        style={
                            styles.textarea
                        }
                    />
                </div>

                <div
                    style={
                        styles.questionHeader
                    }
                >
                    <h3>
                        Questions
                    </h3>

                    <span
                        style={
                            styles.questionCount
                        }
                    >
                        {
                            draft.questions
                                .length
                        }{' '}
                        / 100
                    </span>
                </div>

                {draft.questions.map(
                    (
                        question,
                        questionIndex
                    ) => (
                        <div
                            key={
                                question.id ||
                                questionIndex
                            }
                            style={
                                styles.questionCard
                            }
                        >
                            <div
                                style={
                                    styles.questionTop
                                }
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        color:
                                            'var(--accent-gold)'
                                    }}
                                >
                                    Question{' '}
                                    {questionIndex +
                                        1}
                                </h3>

                                <div
                                    style={
                                        styles.smallButtons
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            moveQuestion(
                                                questionIndex,
                                                -1
                                            )
                                        }
                                        disabled={
                                            questionIndex ===
                                            0
                                        }
                                        style={
                                            styles.smallButton
                                        }
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            moveQuestion(
                                                questionIndex,
                                                1
                                            )
                                        }
                                        disabled={
                                            questionIndex ===
                                            draft
                                                .questions
                                                .length -
                                            1
                                        }
                                        style={
                                            styles.smallButton
                                        }
                                    >
                                        ↓
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            duplicateQuestion(
                                                questionIndex
                                            )
                                        }
                                        style={
                                            styles.smallButton
                                        }
                                    >
                                        Duplicate
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            deleteQuestion(
                                                questionIndex
                                            )
                                        }
                                        disabled={
                                            draft.questions
                                                .length === 1
                                        }
                                        style={{
                                            ...styles.smallButton,
                                            ...styles.deleteButton
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <label
                                style={styles.label}
                            >
                                Question
                            </label>

                            <textarea
                                value={
                                    question.question
                                }
                                onChange={event =>
                                    updateQuestion(
                                        questionIndex,
                                        {
                                            question:
                                                event.target
                                                    .value
                                        }
                                    )
                                }
                                placeholder="Enter the question"
                                rows={3}
                                style={
                                    styles.textarea
                                }
                            />

                            <div
                                style={
                                    styles.optionsGrid
                                }
                            >
                                {question.options.map(
                                    (
                                        option,
                                        optionIndex
                                    ) => (
                                        <div
                                            key={
                                                optionIndex
                                            }
                                        >
                                            <label
                                                style={
                                                    styles.label
                                                }
                                            >
                                                Option{' '}
                                                {
                                                    OPTION_LABELS[
                                                    optionIndex
                                                    ]
                                                }
                                            </label>

                                            <input
                                                value={
                                                    option
                                                }
                                                onChange={event =>
                                                    updateOption(
                                                        questionIndex,
                                                        optionIndex,
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder={`Answer ${OPTION_LABELS[
                                                    optionIndex
                                                    ]
                                                    }`}
                                                style={
                                                    styles.input
                                                }
                                            />
                                        </div>
                                    )
                                )}
                            </div>

                            <div
                                style={
                                    styles.settingsGrid
                                }
                            >
                                <div>
                                    <label
                                        style={
                                            styles.label
                                        }
                                    >
                                        Correct Answer
                                    </label>

                                    <select
                                        value={
                                            question.correctOption
                                        }
                                        onChange={event =>
                                            updateQuestion(
                                                questionIndex,
                                                {
                                                    correctOption:
                                                        Number(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                }
                                            )
                                        }
                                        style={
                                            styles.input
                                        }
                                    >
                                        {OPTION_LABELS.map(
                                            (
                                                label,
                                                index
                                            ) => (
                                                <option
                                                    key={
                                                        label
                                                    }
                                                    value={
                                                        index
                                                    }
                                                >
                                                    {label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        style={
                                            styles.label
                                        }
                                    >
                                        Timer
                                    </label>

                                    <input
                                        type="number"
                                        min="5"
                                        max="120"
                                        value={
                                            question.duration
                                        }
                                        onChange={event =>
                                            updateQuestion(
                                                questionIndex,
                                                {
                                                    duration:
                                                        event
                                                            .target
                                                            .value
                                                }
                                            )
                                        }
                                        style={
                                            styles.input
                                        }
                                    />
                                </div>
                            </div>

                            <label
                                style={{
                                    ...styles.label,
                                    marginTop:
                                        '1rem'
                                }}
                            >
                                Explanation
                            </label>

                            <textarea
                                value={
                                    question.explanation ||
                                    ''
                                }
                                onChange={event =>
                                    updateQuestion(
                                        questionIndex,
                                        {
                                            explanation:
                                                event.target
                                                    .value
                                        }
                                    )
                                }
                                placeholder="Shown after the question ends"
                                rows={2}
                                style={
                                    styles.textarea
                                }
                            />
                        </div>
                    )
                )}

                <button
                    type="button"
                    onClick={addQuestion}
                    disabled={
                        draft.questions
                            .length >= 100
                    }
                    style={
                        styles.addQuestionButton
                    }
                >
                    + Add Question
                </button>

                <div
                    style={
                        styles.footer
                    }
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        className="btn btn-primary"
                    >
                        💾 Save Profile
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,

        background:
            'rgba(2, 6, 23, 0.88)',

        overflowY: 'auto',

        padding: '2rem'
    },

    modal: {
        width: '100%',
        maxWidth: '950px',

        margin: '0 auto',

        padding: '1.5rem',

        boxSizing: 'border-box',

        borderRadius: '18px',

        background: '#172033',

        border:
            '1px solid rgba(148,163,184,0.2)'
    },

    header: {
        display: 'flex',
        justifyContent:
            'space-between',
        gap: '1rem',

        marginBottom: '1.5rem'
    },

    title: {
        margin: 0,

        color:
            'var(--accent-gold)'
    },

    subtitle: {
        margin:
            '0.4rem 0 0',

        color:
            'var(--text-muted)'
    },

    closeButton: {
        width: '40px',
        height: '40px',

        borderRadius: '50%',
        border: 'none',

        cursor: 'pointer',

        background: '#334155',
        color: '#fff'
    },

    profileSection: {
        padding: '1rem',

        borderRadius: '12px',

        background:
            'rgba(15,23,42,0.65)',

        marginBottom: '1.5rem'
    },

    label: {
        display: 'block',

        marginBottom:
            '0.4rem',

        fontSize: '0.85rem',
        fontWeight: 700,

        color: '#cbd5e1'
    },

    input: {
        width: '100%',

        boxSizing:
            'border-box',

        padding:
            '0.75rem',

        borderRadius: '8px',

        border:
            '1px solid rgba(148,163,184,0.3)',

        background: '#0f172a',

        color: '#fff',

        fontSize: '1rem'
    },

    textarea: {
        width: '100%',

        boxSizing:
            'border-box',

        resize: 'vertical',

        padding:
            '0.75rem',

        borderRadius: '8px',

        border:
            '1px solid rgba(148,163,184,0.3)',

        background: '#0f172a',

        color: '#fff',

        fontFamily: 'inherit',

        fontSize: '1rem'
    },

    questionHeader: {
        display: 'flex',

        justifyContent:
            'space-between',

        alignItems: 'center'
    },

    questionCount: {
        color:
            'var(--text-muted)'
    },

    questionCard: {
        marginBottom: '1rem',

        padding: '1.25rem',

        borderRadius: '14px',

        background:
            'rgba(15,23,42,0.75)',

        border:
            '1px solid rgba(148,163,184,0.15)'
    },

    questionTop: {
        display: 'flex',

        justifyContent:
            'space-between',

        alignItems: 'center',

        gap: '1rem',

        marginBottom: '1rem',

        flexWrap: 'wrap'
    },

    smallButtons: {
        display: 'flex',
        gap: '0.4rem',
        flexWrap: 'wrap'
    },

    smallButton: {
        padding:
            '0.45rem 0.7rem',

        border: 0,

        borderRadius: '6px',

        cursor: 'pointer',

        background: '#334155',
        color: '#fff'
    },

    deleteButton: {
        background: '#7f1d1d'
    },

    optionsGrid: {
        display: 'grid',

        gridTemplateColumns:
            'repeat(2,minmax(0,1fr))',

        gap: '0.8rem',

        marginTop: '1rem'
    },

    settingsGrid: {
        display: 'grid',

        gridTemplateColumns:
            '2fr 1fr',

        gap: '0.8rem',

        marginTop: '1rem'
    },

    addQuestionButton: {
        width: '100%',

        padding: '1rem',

        borderRadius: '10px',

        border:
            '1px dashed rgba(251,191,36,0.6)',

        background:
            'rgba(251,191,36,0.08)',

        color:
            'var(--accent-gold)',

        fontWeight: 800,

        cursor: 'pointer'
    },

    footer: {
        display: 'flex',

        justifyContent:
            'flex-end',

        gap: '1rem',

        marginTop: '1.5rem'
    },

    errorBox: {
        marginBottom: '1rem',

        padding: '1rem',

        borderRadius: '10px',

        background:
            'rgba(239,68,68,0.12)',

        border:
            '1px solid rgba(239,68,68,0.35)',

        color: '#fecaca'
    }
};

export default QuizProfileEditor;