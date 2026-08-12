import React from 'react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function AnswerOption({ index, text, isSelected, isCorrect, isRevealed, disabled, onClick }) {
  let extraClass = `opt-${index}`;

  if (isSelected) {
    extraClass += ' selected';
  }

  if (isRevealed) {
    if (isCorrect) {
      extraClass += ' correct';
    } else {
      extraClass += ' incorrect';
    }
  }

  return (
    <button
      type="button"
      className={`option-btn ${extraClass}`}
      disabled={disabled}
      onClick={onClick}
      style={{
        opacity: isRevealed && !isCorrect ? 0.45 : 1,
        border: isRevealed && isCorrect ? '4px solid #ffffff' : undefined
      }}
    >
      <div className="option-badge">{OPTION_LABELS[index]}</div>
      <div style={{ flex: 1 }}>{text}</div>
    </button>
  );
}
