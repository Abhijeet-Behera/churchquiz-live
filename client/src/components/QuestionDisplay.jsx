import React from 'react';
import { AnswerOption } from './AnswerOption';
import { Timer } from './Timer';

export function QuestionDisplay({ questionPayload, isRevealed, correctOption, submittedCount, totalPlayers }) {
  if (!questionPayload) return null;

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-muted)' }}>
          Question {questionPayload.questionIndex + 1} of {questionPayload.totalQuestions}
        </div>
        <Timer questionEndsAt={questionPayload.questionEndsAt} duration={questionPayload.duration} />
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-gold)' }}>
          Answers: {submittedCount || 0}
        </div>
      </div>

      <h1 style={{
        fontSize: '2.5rem',
        lineHeight: '1.3',
        marginBottom: '2.5rem',
        background: 'var(--bg-card)',
        padding: '2rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {questionPayload.question}
      </h1>

      <div className="options-grid">
        {questionPayload.options.map((optText, idx) => (
          <AnswerOption
            key={idx}
            index={idx}
            text={optText}
            isRevealed={isRevealed}
            isCorrect={idx === correctOption}
            disabled={true}
          />
        ))}
      </div>
    </div>
  );
}
