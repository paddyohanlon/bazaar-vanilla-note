document.addEventListener("DOMContentLoaded", async () => {
  const baseUrl = window.location.origin;
  const body = document.body;

  const insertNoteInDOM = (noteElement, noteData) => {
    const dateObj = new Date(noteData.time);

    const dateFormatted = dateObj.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    });

    noteElement.insertAdjacentHTML(
      "afterbegin",
      `
      <div class="note card">
        <div class="note-date">${dateFormatted}</div>
        <div class="note-text">${noteData.text}</div>
        <button class="delete-note-button" data-note-id="${noteData.id}" aria-label="Delete note">&times;</button>
      </div>
      `
    );
  };

  /**
   * Configure the RethinkID SDK
   * The SDK is imported via a script tag in index.html
   */
  const rid = new RethinkID({
    appId: "949f6f3f-864f-44ab-b2ef-f8b3e9c79b57",
    logInRedirectUri: baseUrl,
    dataAPIConnectErrorCallback: function () {
      this.logOut();
    },
  });

  const loggedIn = rid.isLoggedIn();

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

    // Data API
    const NOTES_TABLE_NAME = "notes";

    const notesTable = rid.table(NOTES_TABLE_NAME, {});

    const notesElement = document.querySelector("#notes");

    let notesData = [];

    /**
     * Get notes
     */
    try {
      const response = await notesTable.read();
      notesData = response.data;

      // Newest at top
      notesData.reverse();

      for (const note of notesData) {
        insertNoteInDOM(notesElement, note);
      }

      const deleteNoteButtons = document.querySelectorAll(
        ".delete-note-button"
      );

      /**
       * Delete note
       */
      for (const button of deleteNoteButtons) {
        // Once we've added notes to the DOM, add event listeners to delete buttons
        button.addEventListener("click", async () => {
          if (!window.confirm("Delete note forever?")) {
            return;
          }

          // Delete note from database
          await notesTable.delete({
            rowId: button.dataset.noteId,
          });

          // Remove note from DOM
          const noteElement = button.closest(".note");
          noteElement.remove();
        });
      }
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

      const note = {
        time: new Date().toISOString(),
        text: noteInput.value,
      };

      try {
        const result = await rid.tableInsert(NOTES_TABLE_NAME, note);
        console.log("result", result);
        // TODO need to add ID or delete won't work! RethinkID does not yet return it.
        notesData.push(note);
        insertNoteInDOM(notesElement, note);

        // clear the input
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
