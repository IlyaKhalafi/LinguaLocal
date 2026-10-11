# Contributing to LinguaLocal

LinguaLocal should make learning at a local language school feel simple and welcoming. Contributions that improve classroom workflows, accessibility, language content, and deployment are welcome.

## Get started

```sh
git clone https://github.com/IlyaKhalafi/LinguaLocal.git
cd LinguaLocal
npm ci
npm run dev
```

Use Node.js 22.13 or newer. Open `http://localhost:3000`. Fonts, artwork, and sample media are included in the repository.

## Before submitting a change

```sh
npm run format
npm run check
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Describe the classroom problem, the resulting behaviour, and how you verified it. Keep changes focused. Include screenshots for visible changes and test important state transitions or failure cases.

## Project conventions

- Keep server filesystem code in `src/lib` and route handlers in `src/app/api`.
- Validate incoming data with the shared Zod schemas.
- Keep learning logic independent of React so it can be tested directly.
- Reuse shared components and style tokens. Use semantic HTML and visible keyboard focus.
- Keep the app usable without runtime internet requests. Do not add account systems, external fonts, trackers, or required cloud services.
- Store institution files in the configured data directory. Keep them out of source control.
- Include only content and media you have permission to redistribute.

## Reporting a problem

Include the page, the steps to reproduce the problem, your browser, the deployment method, and any useful server output. Remove personal classroom content from shared logs and examples.
