const { LIMITS } = require('./constants');

/**
 * Validates player name.
 * Rules:
 *  - Required & trimmed
 *  - 2 to 20 characters
 *  - No control characters
 *  - Case-insensitive uniqueness within game
 */
function validatePlayerName(name, existingPlayers = []) {
  if (typeof name !== 'string') {
    return { isValid: false, message: 'Name must be a string.' };
  }

  const trimmed = name.trim();
  if (trimmed.length < LIMITS.MIN_NAME_LENGTH || trimmed.length > LIMITS.MAX_NAME_LENGTH) {
    return { 
      isValid: false, 
      message: `Name must be between ${LIMITS.MIN_NAME_LENGTH} and ${LIMITS.MAX_NAME_LENGTH} characters.` 
    };
  }

  // Reject control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { isValid: false, message: 'Name contains invalid characters.' };
  }

  // Check case-insensitive uniqueness
  const lowerNewName = trimmed.toLowerCase();
  const isDuplicate = existingPlayers.some(
    p => p.name && p.name.trim().toLowerCase() === lowerNewName
  );

  if (isDuplicate) {
    return { isValid: false, message: 'That display name is already taken in this game.' };
  }

  return { isValid: true, sanitizedName: trimmed };
}

/**
 * Validates 6-digit game PIN format.
 */
function validatePin(pin) {
  if (typeof pin !== 'string') return false;
  return /^\d{6}$/.test(pin.trim());
}

/**
 * Validates selected option index (0..3).
 */
function validateOption(option) {
  return typeof option === 'number' && Number.isInteger(option) && option >= 0 && option <= 3;
}

module.exports = {
  validatePlayerName,
  validatePin,
  validateOption
};
