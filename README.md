# Interview Prep

Practice apps for interview preparation, served with GitHub Pages:

- **[Frontend Question Bank](frontend/)**: JavaScript, React, Next.js, testing, TypeScript, CSS & HTML, the browser, and frontend system design.
- **[Backend Question Bank](backend/)**: Node.js, NestJS, databases, APIs, security, Docker, Redis, messaging, cloud and system design.
- **[Code Drill](code-drill/)**: coding problems with in-page tests, hints, spaced review, pattern drills, beginner DSA lessons and an interview mode.

Each app is one self-contained HTML file. Progress is saved in your browser's localStorage; use Settings → Export / Import backup to move it between browsers.

## Install it as an app

The site is a PWA: install it once and it opens offline, full screen, with its own icon.

- **Android / Chrome / Edge:** open the site, then use **Install app** (or menu → Add to Home screen).
- **iPhone / iPad:** open it in Safari, then **Share → Add to Home Screen**.

Open each app once while online so everything is stored. After that, the apps, fonts and the code editor work with no connection. When you're online, updates download in the background and appear the next time you open the app. The optional VS Code editor in Code Drill still needs a connection.

On iOS the installed app keeps its own storage, separate from Safari, so move your progress across with a backup.

## Updating

The apps are built in a separate private repo. After rebuilding them there, run:

```bash
./publish.sh
```

It copies the three built pages into `frontend/`, `backend/` and `code-drill/`, adds the install and offline hooks to each page, gives the service worker (`sw.js`) a new version so installed copies update, then commits and pushes.

If Code Drill's CodeMirror version changes, update `CM_BASE` / `CM_FILES` in `sw.js` to match.
