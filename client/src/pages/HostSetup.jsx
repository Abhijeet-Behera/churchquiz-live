
import HostQuickSignOut from '../components/HostQuickSignOut';
import React, {
  useEffect,
  useState
} from 'react';

import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

import { useGame } from '../context/GameContext';

import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/LoadingState';
import QuizProfileEditor from '../components/QuizProfileEditor';

import {
  DEFAULT_PROFILE,
  getProfiles,
  getProfileById,
  getSelectedProfileId,
  setSelectedProfileId,
  createProfile,
  updateProfile,
  duplicateProfile,
  deleteProfile,
  cloneProfileForEditing
} from '../lib/quizProfiles';


/* =========================================================
   PLAYER JOIN URL
   ========================================================= */

const PLAYER_URL =
  import.meta.env.VITE_PLAYER_URL ||
  'http://localhost:5174';

const NORMALIZED_PLAYER_URL =
  PLAYER_URL.replace(/\/+$/, '');

const JOIN_URL =
  `${NORMALIZED_PLAYER_URL}/join`;


/* =========================================================
   HOST SETUP
   ========================================================= */

export function HostSetup() {
  const navigate = useNavigate();

  const {
    createGame,
    pin,
    loading,
    error,
    clearError
  } = useGame();


  /* =======================================================
     PROFILE STATE
     ======================================================= */

  const [profiles, setProfiles] =
    useState([]);

  const [
    selectedProfileId,
    setSelectedProfileIdState
  ] = useState(
    DEFAULT_PROFILE.id
  );

  const [
    editorOpen,
    setEditorOpen
  ] = useState(false);

  const [
    editingProfile,
    setEditingProfile
  ] = useState(null);

  const [
    profileError,
    setProfileError
  ] = useState('');

  const [
    profileNotice,
    setProfileNotice
  ] = useState('');


  /* =======================================================
     LOAD PROFILES
     ======================================================= */

  const refreshProfiles = () => {
    const savedProfiles =
      getProfiles();

    const savedSelectedId =
      getSelectedProfileId();

    setProfiles(
      savedProfiles
    );

    setSelectedProfileIdState(
      savedSelectedId
    );
  };


  useEffect(() => {
    refreshProfiles();
  }, []);


  /* =======================================================
     EXISTING HOST NAVIGATION
     ======================================================= */

  useEffect(() => {
    if (pin) {
      navigate(
        `/host/${pin}/lobby`
      );
    }
  }, [
    pin,
    navigate
  ]);


  /* =======================================================
     SELECTED PROFILE
     ======================================================= */

  const selectedProfile =
    getProfileById(
      selectedProfileId
    );


  /* =======================================================
     SELECT PROFILE
     ======================================================= */

  const handleSelectProfile = (
    event
  ) => {
    const id =
      event.target.value;

    const savedId =
      setSelectedProfileId(
        id
      );

    setSelectedProfileIdState(
      savedId
    );

    setProfileError('');
    setProfileNotice('');
  };


  /* =======================================================
     CREATE PROFILE
     ======================================================= */

  const handleCreateProfile = () => {
    setProfileError('');
    setProfileNotice('');

    setEditingProfile(null);

    setEditorOpen(true);
  };


  /* =======================================================
     EDIT PROFILE
     ======================================================= */

  const handleEditProfile = () => {
    setProfileError('');
    setProfileNotice('');

    if (
      selectedProfile.builtIn
    ) {
      setProfileError(
        'The built-in Default Bible Quiz cannot be edited. Create a new profile for custom questions.'
      );

      return;
    }

    setEditingProfile(
      cloneProfileForEditing(
        selectedProfile
      )
    );

    setEditorOpen(true);
  };


  /* =======================================================
     SAVE PROFILE FROM EDITOR
     ======================================================= */

  const handleSaveProfile = (
    draft
  ) => {
    try {
      let savedProfile;

      /*
       * EDIT EXISTING PROFILE
       */
      if (editingProfile) {
        savedProfile =
          updateProfile(
            editingProfile.id,
            {
              name:
                draft.name,

              description:
                draft.description,

              questions:
                draft.questions
            }
          );

        setProfileNotice(
          `"${savedProfile.name}" was updated successfully.`
        );
      }

      /*
       * CREATE NEW PROFILE
       */
      else {
        savedProfile =
          createProfile({
            name:
              draft.name,

            description:
              draft.description,

            questions:
              draft.questions
          });

        setProfileNotice(
          `"${savedProfile.name}" was created successfully.`
        );
      }


      /*
       * Automatically select the
       * profile that was just saved.
       */
      setSelectedProfileId(
        savedProfile.id
      );

      setSelectedProfileIdState(
        savedProfile.id
      );

      setEditorOpen(false);

      setEditingProfile(null);

      setProfileError('');

      refreshProfiles();
    } catch (err) {
      console.error(
        '[HostSetup] Profile save error:',
        err
      );

      setProfileError(
        err?.message ||
        'Unable to save the quiz profile.'
      );
    }
  };


  /* =======================================================
     DUPLICATE PROFILE
     ======================================================= */

  const handleDuplicateProfile =
    () => {
      setProfileError('');
      setProfileNotice('');

      if (
        selectedProfile.builtIn
      ) {
        setProfileError(
          'The built-in Default Bible Quiz cannot be duplicated because its questions are stored on the server. Create a new custom profile instead.'
        );

        return;
      }

      try {
        const copy =
          duplicateProfile(
            selectedProfile.id
          );

        setSelectedProfileId(
          copy.id
        );

        setSelectedProfileIdState(
          copy.id
        );

        refreshProfiles();

        setProfileNotice(
          `"${copy.name}" was created.`
        );
      } catch (err) {
        console.error(
          '[HostSetup] Duplicate error:',
          err
        );

        setProfileError(
          err?.message ||
          'Unable to duplicate this profile.'
        );
      }
    };


  /* =======================================================
     DELETE PROFILE
     ======================================================= */

  const handleDeleteProfile =
    () => {
      setProfileError('');
      setProfileNotice('');

      if (
        selectedProfile.builtIn
      ) {
        setProfileError(
          'The Default Bible Quiz cannot be deleted.'
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${selectedProfile.name}"?\n\nThis action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        const deletedName =
          selectedProfile.name;

        deleteProfile(
          selectedProfile.id
        );

        setSelectedProfileId(
          DEFAULT_PROFILE.id
        );

        setSelectedProfileIdState(
          DEFAULT_PROFILE.id
        );

        refreshProfiles();

        setProfileNotice(
          `"${deletedName}" was deleted.`
        );
      } catch (err) {
        console.error(
          '[HostSetup] Delete error:',
          err
        );

        setProfileError(
          err?.message ||
          'Unable to delete this profile.'
        );
      }
    };


  /* =======================================================
     EXISTING CREATE GAME SESSION BUTTON

     IMPORTANT:
     For this step we keep its existing
     behavior unchanged.

     In the NEXT step we will send
     selectedProfile.questions into createGame().
     ======================================================= */

  const handleCreate = () => {
    setProfileError('');
    setProfileNotice('');

    /**
     * Built-in profile:
     * keep the existing server/questions.json behavior.
     */
    if (selectedProfile.builtIn) {
      createGame();
      return;
    }

    /**
     * Custom profiles must contain questions.
     */
    if (
      !Array.isArray(selectedProfile.questions) ||
      selectedProfile.questions.length === 0
    ) {
      setProfileError(
        'The selected quiz profile does not contain any questions.'
      );

      return;
    }

    /**
     * Send the selected profile's questions
     * to GameContext → Socket.IO → server.
     */
    createGame(selectedProfile.questions);
  };

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div
        className="app-container"
        style={{
          justifyContent:
            'center',

          alignItems:
            'center'
        }}
      >
        <LoadingState
          message="Generating Game PIN..."
        />
      </div>
    );
  }


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <>

      <HostQuickSignOut />
      <div
        className="app-container"
        style={{
          justifyContent:
            'center',

          alignItems:
            'center',

          paddingTop:
            '2rem',

          paddingBottom:
            '2rem'
        }}
      >
        <div
          className="card"
          style={{
            maxWidth:
              '620px',

            width:
              '100%',

            textAlign:
              'center'
          }}
        >
          {/* =====================================
              TITLE
             ===================================== */}

          <h2
            style={{
              fontSize:
                '2.25rem',

              marginBottom:
                '0.75rem',

              color:
                'var(--accent-gold)'
            }}
          >
            Host New Quiz
          </h2>

          <p
            style={{
              color:
                'var(--text-muted)',

              marginBottom:
                '1.75rem',

              fontSize:
                '1.05rem',

              lineHeight:
                '1.5'
            }}
          >
            Select a quiz profile,
            connect your projector
            and start a live Bible
            quiz session.
          </p>


          {/* =====================================
              QUIZ PROFILE SECTION
             ===================================== */}

          <div
            style={{
              padding:
                '1.25rem',

              marginBottom:
                '1.5rem',

              borderRadius:
                '16px',

              background:
                'rgba(15, 23, 42, 0.55)',

              border:
                '1px solid rgba(148, 163, 184, 0.2)',

              textAlign:
                'left'
            }}
          >
            <div
              style={{
                display:
                  'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                marginBottom:
                  '1rem',

                gap:
                  '1rem'
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,

                    color:
                      'var(--accent-gold)',

                    fontSize:
                      '1.2rem'
                  }}
                >
                  📝 Quiz Profile
                </h3>

                <p
                  style={{
                    margin:
                      '0.3rem 0 0',

                    color:
                      'var(--text-muted)',

                    fontSize:
                      '0.82rem'
                  }}
                >
                  Choose the question
                  set for this game.
                </p>
              </div>

              <span
                style={{
                  padding:
                    '0.35rem 0.65rem',

                  borderRadius:
                    '999px',

                  background:
                    'rgba(251, 191, 36, 0.12)',

                  color:
                    'var(--accent-gold)',

                  fontSize:
                    '0.75rem',

                  fontWeight:
                    '800'
                }}
              >
                {profiles.length}{' '}
                {profiles.length === 1
                  ? 'PROFILE'
                  : 'PROFILES'}
              </span>
            </div>


            {/* PROFILE DROPDOWN */}

            <label
              style={{
                display:
                  'block',

                marginBottom:
                  '0.4rem',

                color:
                  'var(--text-muted)',

                fontSize:
                  '0.8rem',

                fontWeight:
                  '700'
              }}
            >
              Selected Profile
            </label>

            <select
              value={
                selectedProfileId
              }

              onChange={
                handleSelectProfile
              }

              style={{
                width:
                  '100%',

                boxSizing:
                  'border-box',

                padding:
                  '0.9rem 1rem',

                borderRadius:
                  '9px',

                border:
                  '1px solid rgba(148, 163, 184, 0.3)',

                background:
                  '#0f172a',

                color:
                  '#f8fafc',

                fontSize:
                  '1rem',

                fontWeight:
                  '700',

                outline:
                  'none'
              }}
            >
              {profiles.map(
                profile => (
                  <option
                    key={
                      profile.id
                    }

                    value={
                      profile.id
                    }
                  >
                    {profile.name}
                  </option>
                )
              )}
            </select>


            {/* SELECTED PROFILE INFORMATION */}

            <div
              style={{
                marginTop:
                  '1rem',

                padding:
                  '0.9rem',

                borderRadius:
                  '10px',

                background:
                  'rgba(30, 41, 59, 0.75)'
              }}
            >
              <div
                style={{
                  display:
                    'flex',

                  justifyContent:
                    'space-between',

                  alignItems:
                    'center',

                  gap:
                    '1rem'
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        '#f8fafc',

                      fontWeight:
                        '800',

                      fontSize:
                        '1rem'
                    }}
                  >
                    {
                      selectedProfile.name
                    }
                  </div>

                  {selectedProfile.description && (
                    <div
                      style={{
                        marginTop:
                          '0.25rem',

                        color:
                          'var(--text-muted)',

                        fontSize:
                          '0.8rem'
                      }}
                    >
                      {
                        selectedProfile.description
                      }
                    </div>
                  )}
                </div>

                <div
                  style={{
                    flexShrink:
                      0,

                    color:
                      'var(--accent-gold)',

                    fontWeight:
                      '800',

                    fontSize:
                      '0.85rem'
                  }}
                >
                  {selectedProfile.builtIn
                    ? 'Built-in'
                    : `${selectedProfile.questions.length} ${selectedProfile.questions.length ===
                      1
                      ? 'Question'
                      : 'Questions'
                    }`}
                </div>
              </div>
            </div>


            {/* PROFILE ACTION BUTTONS */}

            <div
              style={{
                display:
                  'grid',

                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',

                gap:
                  '0.6rem',

                marginTop:
                  '1rem'
              }}
            >
              <button
                type="button"

                className="btn btn-secondary"

                onClick={
                  handleCreateProfile
                }

                style={{
                  padding:
                    '0.75rem'
                }}
              >
                ➕ Create Profile
              </button>


              <button
                type="button"

                className="btn btn-secondary"

                onClick={
                  handleEditProfile
                }

                disabled={
                  selectedProfile.builtIn
                }

                style={{
                  padding:
                    '0.75rem',

                  opacity:
                    selectedProfile.builtIn
                      ? 0.45
                      : 1,

                  cursor:
                    selectedProfile.builtIn
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                ✏️ Edit Profile
              </button>


              <button
                type="button"

                className="btn btn-secondary"

                onClick={
                  handleDuplicateProfile
                }

                disabled={
                  selectedProfile.builtIn
                }

                style={{
                  padding:
                    '0.75rem',

                  opacity:
                    selectedProfile.builtIn
                      ? 0.45
                      : 1,

                  cursor:
                    selectedProfile.builtIn
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                📄 Duplicate
              </button>


              <button
                type="button"

                className="btn btn-secondary"

                onClick={
                  handleDeleteProfile
                }

                disabled={
                  selectedProfile.builtIn
                }

                style={{
                  padding:
                    '0.75rem',

                  background:
                    selectedProfile.builtIn
                      ? undefined
                      : 'rgba(127, 29, 29, 0.8)',

                  opacity:
                    selectedProfile.builtIn
                      ? 0.45
                      : 1,

                  cursor:
                    selectedProfile.builtIn
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                🗑 Delete
              </button>
            </div>
          </div>


          {/* =====================================
              PROFILE SUCCESS MESSAGE
             ===================================== */}

          {profileNotice && (
            <div
              style={{
                marginBottom:
                  '1rem',

                padding:
                  '0.8rem 1rem',

                borderRadius:
                  '9px',

                background:
                  'rgba(16, 185, 129, 0.12)',

                border:
                  '1px solid rgba(16, 185, 129, 0.35)',

                color:
                  '#86efac',

                fontSize:
                  '0.9rem'
              }}
            >
              ✅ {profileNotice}
            </div>
          )}


          {/* =====================================
              PROFILE ERROR
             ===================================== */}

          {profileError && (
            <div
              style={{
                marginBottom:
                  '1rem',

                padding:
                  '0.8rem 1rem',

                borderRadius:
                  '9px',

                background:
                  'rgba(239, 68, 68, 0.12)',

                border:
                  '1px solid rgba(239, 68, 68, 0.35)',

                color:
                  '#fecaca',

                fontSize:
                  '0.9rem'
              }}
            >
              ⚠️ {profileError}
            </div>
          )}


          {/* =====================================
              EXISTING QR CODE
             ===================================== */}

          <div
            style={{
              width:
                '100%',

              maxWidth:
                '340px',

              margin:
                '0 auto 1.75rem',

              padding:
                '1.25rem',

              borderRadius:
                '16px',

              background:
                'rgba(15, 23, 42, 0.55)',

              border:
                '1px solid rgba(148, 163, 184, 0.2)',

              boxSizing:
                'border-box'
            }}
          >
            <h3
              style={{
                margin:
                  '0 0 0.35rem',

                color:
                  'var(--accent-gold)',

                fontSize:
                  '1.15rem'
              }}
            >
              📱 Scan to Join
            </h3>

            <p
              style={{
                margin:
                  '0 0 1rem',

                color:
                  'var(--text-muted)',

                fontSize:
                  '0.9rem',

                lineHeight:
                  '1.4'
              }}
            >
              Players can scan this QR
              code to open the Join Game
              screen.
            </p>

            <div
              style={{
                display:
                  'inline-flex',

                justifyContent:
                  'center',

                alignItems:
                  'center',

                padding:
                  '12px',

                background:
                  '#ffffff',

                borderRadius:
                  '14px',

                boxShadow:
                  '0 8px 25px rgba(0, 0, 0, 0.25)'
              }}
            >
              <QRCodeSVG
                value={
                  JOIN_URL
                }

                size={
                  190
                }

                level="H"

                bgColor="#ffffff"

                fgColor="#000000"

                title="Scan to join ChurchQuiz Live"
              />
            </div>

            <p
              style={{
                margin:
                  '1rem 0 0',

                color:
                  '#f8fafc',

                fontWeight:
                  '700',

                fontSize:
                  '0.95rem'
              }}
            >
              Scan with your phone camera
            </p>

            <p
              style={{
                margin:
                  '0.4rem 0 0',

                color:
                  'var(--text-muted)',

                fontSize:
                  '0.72rem',

                wordBreak:
                  'break-all',

                lineHeight:
                  '1.4'
              }}
            >
              {JOIN_URL}
            </p>
          </div>


          {/* EXISTING GAME ERROR */}

          {error && (
            <ErrorMessage
              message={
                error?.message ||
                error
              }

              onClose={
                clearError
              }
            />
          )}


          {/* =====================================
              EXISTING CREATE GAME BUTTON
             ===================================== */}

          <button
            type="button"

            className="btn btn-primary"

            onClick={
              handleCreate
            }

            style={{
              width:
                '100%',

              fontSize:
                '1.35rem',

              padding:
                '1.25rem'
            }}
          >
            ✨ Create Game Session
          </button>
        </div>
      </div>


      {/* =========================================
          PROFILE EDITOR
         ========================================= */}

      <QuizProfileEditor
        isOpen={
          editorOpen
        }

        initialProfile={
          editingProfile
        }

        onSave={
          handleSaveProfile
        }

        onCancel={() => {
          setEditorOpen(false);

          setEditingProfile(null);

          setProfileError('');
        }}
      />
    </>
  );
}

export default HostSetup;