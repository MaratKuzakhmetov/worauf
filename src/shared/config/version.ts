/**
 * Stamped into an exported progress file so a file that will not import can be traced to the
 * build that wrote it (ADR 0005). Kept in step with `package.json` by hand: reading it at
 * build time would mean a bundler plugin, and this string changes about once a release.
 */
export const APP_VERSION = '0.0.0';
