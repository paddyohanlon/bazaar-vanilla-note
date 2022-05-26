/**
 * A note
 * @typedef {Object} Note
 * @property {string} note.id
 * @property {string} note.date An ISO formatted date string
 * @property {string} note.text The text content of the note
 */

document.addEventListener("DOMContentLoaded", async () => {
  const baseUrl = window.location.origin;
  const body = document.body;

  /**
   * Configure the RethinkID SDK
   * The SDK is imported via a script tag in index.html
   */
  const rid = new RethinkID({
    appId: "ec0887ca-a970-43af-bc75-0aa0164d97e3",
    logInRedirectUri: baseUrl,
    dataAPIConnectErrorCallback: function () {
      this.logOut();
    },
  });

  const loggedIn = rid.isLoggedIn();

  const NOTES_TABLE_NAME = "notes";
  const notesTable = rid.table(NOTES_TABLE_NAME, {});

  /**
   * Delete note
   * @param {string} noteId
   */
  const removeNoteFromDOM = (noteId) => {
    // Do not try to delete the note if it doesn't exists
    if (document.getElementById(noteId)) return;

    const deleteButton = document.getElementById(noteId);
    const noteElement = deleteButton.closest(".note");
    noteElement.remove();
  };

  /**
   * Add an event listener to delete a note from the database and DOM
   * @param {string} noteId
   */
  const addEventListenerToDeleteNote = (noteId) => {
    const deleteButton = document.getElementById(noteId);
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm("Delete note forever?")) {
        return;
      }

      // Delete note from database
      await notesTable.delete({
        rowId: noteId,
      });

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
      <div class="note card">
        <div class="note-date">${dateFormatted}</div>
        <div class="note-text">${escapeHtml(note.text)}</div>
        <button id="${
          note.id
        }" class="delete-note-button" aria-label="Delete note">&times;</button>
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
     * Setup dropdown nav items
     */
    const signOutButton = document.querySelector("#sign-out-button");
    signOutButton.addEventListener("click", rid.logOut);

    const user = rid.userInfo();
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
      const response = await notesTable.read();
      const notes = response.data;

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
      await notesTable.subscribe({}, (changes) => {
        // Note added
        if (changes.new_val && changes.old_val === null) {
          const note = changes.new_val;
          console.log("Received new note. Add:", note);
          insertNoteInDOM(changes.new_val);
        }
        // Note deleted
        if (changes.new_val === null && changes.old_val) {
          const note = changes.old_val;
          console.log("Received deleted note. Delete:", note);
          removeNoteFromDOM(note.id);
        }
        // If we wanted to handle updating notes, this is how we would listen for updates
        // Note updated
        // if (changes.new_val && changes.old_val) {
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

      const noteInput = document.querySelector("#note-textarea");

      const newNote = {
        date: new Date().toISOString(),
        text: noteInput.value,
      };

      try {
        const result = await rid.tableInsert(NOTES_TABLE_NAME, newNote);

        /**
         * @type {Note}
         */
        const createdNote = {
          id: result.data,
          ...newNote,
        };

        insertNoteInDOM(createdNote);

        // Clear the input
        noteInput.value = "";
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
   * Logging in
   */
  const params = new URLSearchParams(window.location.search);

  // This app has a single page (single route), which is used as the RethinkID log
  // in redirect_uri.
  // To know when a log in request is in progress (when an auth code has been received)
  // check the following URL parameters are present:
  const loggingIn =
    params.get("code") && params.get("scope") && params.get("state");

  if (loggingIn) {
    await rid.completeLogIn();
    window.location.replace(baseUrl);
  }

  /**
   * Logged out setup
   */
  if (!loggedIn) {
    // Make sure to call `rid.logInUri()` after `rid.completeLogIn()` when logging
    // in because otherwise it will set new PKCE values in local storage and
    // invalidate the login request.
    const logInUri = await rid.logInUri();

    const authorizeLink = document.querySelector("#authorize-link");
    authorizeLink.setAttribute("href", logInUri);
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
