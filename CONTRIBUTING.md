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

## Contributing classroom content

Start with an [original example pack](examples/packs/README.md). Keep definitions clear, examples natural, and lesson questions unambiguous. Give every entry a stable ID and check all lesson vocabulary references. Include only original or redistributable material and describe its license.

Validate the pack with `npm run content:validate -- your-pack.json`. Run `npm run content:diagnose -- your-pack.json` when including media. Add a short description of the intended CEFR level and classroom use in your pull request.

Capture the published GitHub README with `npm run readme:preview` after pushing documentation changes. This command needs internet access and an installed Playwright Chromium browser. It checks that every README image decodes and excludes floating GitHub controls from the capture.

Use `npm run screenshots:language` against the running production server when changing language controls. It captures full pages and enlarged controls in Chromium and WebKit for every language, appearance, and viewport. The command selects the app appearance through its preferences cookie and checks spacing, mobile target size, input font size, and page overflow. Previews and measured dimensions are saved in `artifacts/language-previews`. Set `SCREENSHOT_BASE_URL` and `SCREENSHOT_REVIEW_DIR` to use another server or output folder.

## Preparing a distribution

Run the checks above before using `npm run release:package -- releases/lingualocal.tar.gz`. See the [deployment guide](docs/DEPLOYMENT.md) for platform requirements. Record user-visible changes in [CHANGELOG.md](CHANGELOG.md).
