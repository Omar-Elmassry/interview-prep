# Interview Prep

Practice apps for interview preparation, served with GitHub Pages:

- **[Frontend Question Bank](frontend/)**: JavaScript, React, Next.js, testing, TypeScript, CSS & HTML, the browser, and frontend system design.
- **[Backend Question Bank](backend/)**: Node.js, NestJS, databases, APIs, security, Docker, Redis, messaging, cloud and system design.
- **[Code Drill](code-drill/)**: coding problems with in-page tests, hints, spaced review, pattern drills, beginner DSA lessons and an interview mode.

Each app is one self-contained HTML file. Progress is saved in your browser's localStorage; use Settings → Export / Import backup to move it between browsers.

## Updating

The apps are built in a separate private repo. After rebuilding them there, run:

```bash
./publish.sh
```

It copies the three built pages into `frontend/`, `backend/` and `code-drill/`, commits and pushes.
