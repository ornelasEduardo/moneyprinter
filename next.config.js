const { PHASE_PRODUCTION_BUILD } = require('next/constants');

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => ({
  transpilePackages: ['doom-design-system'],
  compiler: {
    // Strip data-testid only from the production build; the dev server (where
    // the Playwright e2e suite runs) keeps them.
    reactRemoveProperties: phase === PHASE_PRODUCTION_BUILD,
  },
});
