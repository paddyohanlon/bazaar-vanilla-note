/**
 * A note
 * @typedef {Object} Note
 * @property {string} note.id
 * @property {string} note.date An ISO formatted date string
 * @property {string} note.text The text content of the note
 */

document.addEventListener("DOMContentLoaded", async () => {
  const baseUrl = window.location.href;
  const body = document.body;

  /**
   * Configure the Bazaar SDK
   * The SDK is imported via a script tag in index.html
   */
  const bzr = new Bazaar({
    appId: "test",
    loginRedirectUri: baseUrl,
    bazaarUri: "http://localhost:3377",
    onApiConnectError: async function (bzr) {
      bzr.logOut();
    },
  });

  const loggedIn = bzr.isLoggedIn();

  const INITIAL_NOTE_SUBMIT_BUTTON_TEXT = "Create note";
  const NOTES_COLLECTION_NAME = "notes";

  const notesCollection = bzr.collection(NOTES_COLLECTION_NAME);

  /**
   * Delete note
   * @param {string} noteId
   */
  const removeNoteFromDOM = (noteId) => {
    const noteElement = document.getElementById(noteId);

    // Do not try to delete the note if it doesn't exist
    if (!noteElement) return;

    noteElement.remove();
  };

  /**
   * Add an event listener to delete a note from the database and DOM
   * @param {string} noteId
   */
  const addEventListenerToDeleteNote = (noteId) => {
    const noteElement = document.getElementById(noteId);
    const deleteButton = noteElement.querySelector(".delete-note-button");
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm("Delete note forever?")) {
        return;
      }

      // Delete note from database
      await notesCollection.deleteOne(noteId);

      removeNoteFromDOM(noteId);
    });
  };

  /**
   * Insert a note into the DOM
   * @param {Note} note
   */
  const insertNoteInDOM = (note) => {
    // Do not add the note if it already exists
    if (document.getElementById(note.id)) return;

    const notesElement = document.querySelector("#notes");

    const dateObj = new Date(note.date);
    const dateFormatted = dateObj.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    });

    notesElement.insertAdjacentHTML(
      "afterbegin",
      `
      <div id="${note.id}" class="note card">
        <div class="note-date">${dateFormatted}</div>
        <div class="note-text">${escapeHtml(note.text)}</div>
        <button class="delete-note-button" aria-label="Delete note">&times;</button>
      </div>
      `
    );

    addEventListenerToDeleteNote(note.id);
  };

  /**
   * Logged in setup
   */
  if (loggedIn) {
    body.classList.replace("logged-out", "logged-in");

    /**
     * Add create note submit button text
     */
    const noteSubmitButton = document.querySelector("#note-submit-button");
    noteSubmitButton.innerHTML = INITIAL_NOTE_SUBMIT_BUTTON_TEXT;

    /**
     * Setup dropdown nav items
     */
    const signOutButton = document.querySelector("#sign-out-button");
    signOutButton.addEventListener("click", bzr.logOut);

    const user = await bzr.social.getUser();
    if (user) {
      const userId = document.querySelector("#user-id");
      userId.innerText = user.id;

      const email = document.querySelector("#email");
      email.innerText = user.email;
    }

    /**
     * Dropdown nav toggle
     */
    const navToggle = document.querySelector("#navbar-burger");
    const navDropdown = document.querySelector("#nav-list-dropdown");

    navToggle.addEventListener("click", () => {
      if (navToggle.ariaExpanded === "false") {
        navToggle.ariaExpanded = "true";
      } else {
        navToggle.ariaExpanded = "false";
      }

      navToggle.classList.toggle("is-active");
      navDropdown.classList.toggle("visually-hidden");
    });

    /**
     * Get notes
     */
    try {
      const response = await notesCollection.getAll();
      const notes = response;

      // Sort by date DESC, newest at top
      notes.sort((a, b) => {
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      });

      for (const note of notes) {
        insertNoteInDOM(note);
      }
    } catch (error) {
      console.error("error.message", error.message);
    }

    /**
     * Subscribe to notes changes
     * To know when notes have been added or deleted elsewhere, e.g. on another one of your devices
     */
    try {
      await notesCollection.subscribeAll({}, ({ newDoc, oldDoc }) => {
        // Note added
        if (newDoc && oldDoc === null) {
          const note = newDoc;
          console.log("Received new note. Add:", note);
          insertNoteInDOM(newDoc);
        }
        // Note deleted
        if (newDoc === null && oldDoc) {
          const note = oldDoc;
          console.log("Received deleted note. Delete:", note);
          removeNoteFromDOM(note.id);
        }
        // If we wanted to handle updating notes, this is how we would listen for updates
        // Note updated
        // if (newDoc && oldDoc) {
        //   ...
        // }
      });
    } catch (error) {
      console.error("error.message", error.message);
    }

    /**
     * Create note
     */
    const noteForm = document.querySelector("#note-form");
    noteForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const noteSubmitButton = document.querySelector("#note-submit-button");
      noteSubmitButton.innerHTML = "Creating...";

      const noteInput = document.querySelector("#note-textarea");

      const newNote = {
        date: new Date().toISOString(),
        text: noteInput.value,
      };

      try {
        const id = await notesCollection.insertOne(newNote);

        /**
         * @type {Note}
         */
        const createdNote = {
          id,
          ...newNote,
        };

        insertNoteInDOM(createdNote);

        // Clear the input
        noteInput.value = "";

        noteSubmitButton.innerHTML = "Created!";

        setTimeout(() => {
          noteSubmitButton.innerHTML = INITIAL_NOTE_SUBMIT_BUTTON_TEXT;
        }, 1000);
      } catch (error) {
        console.error("error.message", error.message);
      }
    });

    /**
     * Remove logged out items when logged in
     */
    const loggedOutNav = document.querySelector("#logged-out-nav-list");
    loggedOutNav.remove();

    const getStarted = document.querySelector("#get-started");
    getStarted.remove();
  }

  /**
   * Login button
   */
  const authorizeButton = document.querySelector("#authorize-button");
  if (authorizeButton) {
    authorizeButton.addEventListener("click", () => {
      console.log("click!");
      bzr.login();
    });
  }

  /**
   * Setup complete. Loaded!
   */
  body.classList.replace("loading", "loaded");

  // remove the loading indicator
  const loader = document.querySelector("#loader");
  loader.remove();
});

/**
 * Utility functions
 */

// http://shebang.mintern.net/foolproof-html-escaping-in-javascript/
const escapeHtml = (str) => {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};
