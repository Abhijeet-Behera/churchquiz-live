/**
 * DisplayManager — abstraction layer for multi-display management.
 *
 * Browser implementation using Window Management API (progressive enhancement)
 * with window.open() fallback.
 *
 * Designed to be replaceable: a future Electron implementation can swap this
 * module out without touching React components.
 */

const STORAGE_KEY_PREFIX = 'churchquiz_display_pref_';

class DisplayManager {
  constructor() {
    this._questionWindow = null;
    this._leaderboardWindow = null;
    this._screensChangeHandler = null;
    this._onDisplaysChangedCallback = null;
    this._screenDetails = null;
  }

  /**
   * Returns true if the Window Management API is supported.
   */
  isSupported() {
    return typeof window !== 'undefined' && 'getScreenDetails' in window;
  }

  /**
   * Returns the current permission status for window-management.
   * @returns {Promise<'granted'|'prompt'|'denied'|'unknown'>}
   */
  async getPermissionStatus() {
    if (!this.isSupported()) return 'unknown';
    try {
      if (typeof navigator.permissions !== 'undefined') {
        const result = await navigator.permissions.query({ name: 'window-management' });
        return result.state; // 'granted' | 'prompt' | 'denied'
      }
    } catch {
      // Permission name may differ by browser
    }
    return 'unknown';
  }

  /**
   * Fetches available displays.
   * Uses Window Management API when available; falls back to single-screen stub.
   *
   * @param {boolean} requestPermission — if true, will call getScreenDetails (requires user gesture)
   * @returns {Promise<Array<DisplayInfo>>}
   */
  async getDisplays(requestPermission = false) {
    if (this.isSupported() && requestPermission) {
      try {
        this._screenDetails = await window.getScreenDetails();

        // Listen for display changes
        if (this._screensChangeHandler) {
          this._screenDetails.removeEventListener('screenschange', this._screensChangeHandler);
        }
        this._screensChangeHandler = () => {
          if (this._onDisplaysChangedCallback) {
            this._onDisplaysChangedCallback();
          }
        };
        this._screenDetails.addEventListener('screenschange', this._screensChangeHandler);

        return this._mapScreenDetails(this._screenDetails.screens);
      } catch (err) {
        // User denied permission or API error
        console.warn('[DisplayManager] getScreenDetails failed:', err.message);
        return this._fallbackDisplays();
      }
    }

    // Use cached screen details if available without re-requesting
    if (this._screenDetails) {
      return this._mapScreenDetails(this._screenDetails.screens);
    }

    return this._fallbackDisplays();
  }

  /**
   * Maps ScreenDetailed objects to normalized DisplayInfo objects.
   */
  _mapScreenDetails(screens) {
    return screens.map((s, i) => ({
      id: `screen-${i}`,
      label: s.label || `Display ${i + 1}`,
      width: s.width,
      height: s.height,
      availLeft: s.availLeft,
      availTop: s.availTop,
      availWidth: s.availWidth,
      availHeight: s.availHeight,
      isPrimary: s.isPrimary || false,
      isExtended: s.isExtended !== false,
      raw: s
    }));
  }

  /**
   * Fallback: returns a single display stub when API is unavailable.
   */
  _fallbackDisplays() {
    return [{
      id: 'default',
      label: 'Default Display',
      width: typeof screen !== 'undefined' ? screen.width : 1920,
      height: typeof screen !== 'undefined' ? screen.height : 1080,
      availLeft: 0,
      availTop: 0,
      availWidth: typeof screen !== 'undefined' ? screen.availWidth : 1920,
      availHeight: typeof screen !== 'undefined' ? screen.availHeight : 1080,
      isPrimary: true,
      isExtended: false,
      raw: null
    }];
  }

  /**
   * Registers a callback that fires when connected displays change.
   */
  onDisplaysChanged(callback) {
    this._onDisplaysChangedCallback = callback;
  }

  /**
   * Opens the question presentation window on the specified display.
   *
   * @param {string} pin
   * @param {DisplayInfo|null} displayInfo — null uses default positioning
   * @returns {Window|null}
   */
  openQuestionDisplay(pin, displayInfo = null) {
    // Prevent duplicate windows
    if (this._questionWindow && !this._questionWindow.closed) {
      this._questionWindow.focus();
      return this._questionWindow;
    }

    const url = `/display/question/${pin}`;
    const features = displayInfo
      ? `left=${displayInfo.availLeft},top=${displayInfo.availTop},width=${displayInfo.availWidth},height=${displayInfo.availHeight},resizable=yes,scrollbars=no`
      : `width=1280,height=720,resizable=yes,scrollbars=no`;

    this._questionWindow = window.open(url, 'churchquiz-question-display', features);
    return this._questionWindow;
  }

  /**
   * Opens the leaderboard presentation window on the specified display.
   */
  openLeaderboardDisplay(pin, displayInfo = null) {
    if (this._leaderboardWindow && !this._leaderboardWindow.closed) {
      this._leaderboardWindow.focus();
      return this._leaderboardWindow;
    }

    const url = `/display/leaderboard/${pin}`;
    const features = displayInfo
      ? `left=${displayInfo.availLeft},top=${displayInfo.availTop},width=${displayInfo.availWidth},height=${displayInfo.availHeight},resizable=yes,scrollbars=no`
      : `width=1280,height=720,resizable=yes,scrollbars=no`;

    this._leaderboardWindow = window.open(url, 'churchquiz-leaderboard-display', features);
    return this._leaderboardWindow;
  }

  /**
   * Closes the question display window.
   */
  closeQuestionDisplay() {
    if (this._questionWindow && !this._questionWindow.closed) {
      this._questionWindow.close();
    }
    this._questionWindow = null;
  }

  /**
   * Closes the leaderboard display window.
   */
  closeLeaderboardDisplay() {
    if (this._leaderboardWindow && !this._leaderboardWindow.closed) {
      this._leaderboardWindow.close();
    }
    this._leaderboardWindow = null;
  }

  /**
   * Returns whether the question display window is currently open.
   */
  isQuestionDisplayOpen() {
    return Boolean(this._questionWindow && !this._questionWindow.closed);
  }

  /**
   * Returns whether the leaderboard display window is currently open.
   */
  isLeaderboardDisplayOpen() {
    return Boolean(this._leaderboardWindow && !this._leaderboardWindow.closed);
  }

  /**
   * Moves/reopens question display on a different screen.
   */
  moveQuestionDisplay(pin, newDisplayInfo) {
    this.closeQuestionDisplay();
    return this.openQuestionDisplay(pin, newDisplayInfo);
  }

  /**
   * Moves/reopens leaderboard display on a different screen.
   */
  moveLeaderboardDisplay(pin, newDisplayInfo) {
    this.closeLeaderboardDisplay();
    return this.openLeaderboardDisplay(pin, newDisplayInfo);
  }

  /**
   * Saves display assignment preference to localStorage.
   * @param {'question'|'leaderboard'} outputType
   * @param {DisplayInfo} displayInfo
   */
  savePreference(outputType, displayInfo) {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${outputType}`,
        JSON.stringify({ label: displayInfo.label, id: displayInfo.id })
      );
    } catch { /* ignore */ }
  }

  /**
   * Loads a saved display preference and matches against available displays.
   * Returns the matched DisplayInfo or null if not found.
   * @param {'question'|'leaderboard'} outputType
   * @param {Array<DisplayInfo>} availableDisplays
   */
  loadPreference(outputType, availableDisplays) {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${outputType}`);
      if (!saved) return null;
      const { label, id } = JSON.parse(saved);
      return availableDisplays.find(d => d.id === id || d.label === label) || null;
    } catch {
      return null;
    }
  }
}

// Export a singleton instance
export const displayManager = new DisplayManager();
export default DisplayManager;
