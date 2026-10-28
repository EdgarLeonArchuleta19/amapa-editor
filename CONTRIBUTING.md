# Contributing to AMAPA

Thank you for contributing to **AMAPA**! Our goal is to make video editing accessible, local-first, watermark-free, and genuinely useful in any modern browser.

## Core Principles

1. **No Watermarks or Artificial Paywalls:** Never add watermarks, export duration caps, resolution gates, or mandatory sign-ups.
2. **Honest Controls:** Never add a button, codec option, or effect control in the UI unless the underlying preview and export pipelines genuinely implement it.
3. **Local-First & Privacy-Focused:** Media files must stay on the user's device by default. Do not add analytics, telemetry, or unapproved network calls.
4. **Pure, Testable Core Engine:** Keep timeline math, serialization, and export validation in pure TypeScript modules under `src/engine/` with unit and integration tests.

## Development Workflow

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run unit and integration tests
npm test

# Type-check and build production bundle
npm run build
```

## Pull Request Checklist

- [ ] `npm test` passes with all existing and new tests.
- [ ] `npm run build` succeeds with strict TypeScript checking.
- [ ] New UI strings are added to both English (`en`) and Spanish (`es`) dictionaries in `src/i18n/translations.ts`.
- [ ] Accessibility attributes (`aria-label`, keyboard navigation, focus states) are maintained.
