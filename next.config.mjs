/*
 * There is deliberately no `basePath` here.
 *
 * It used to read `NEXT_PUBLIC_BASE_PATH`, from when the project was going to github.io.
 * ADR 0004 moved it to a subdomain served from the root, which removed the need — and
 * ADR 0006 turned the leftover variable into a hazard: a service worker's scope is its own
 * path, so a non-empty base path would quietly narrow it and disable offline on part of the
 * site. Nothing set the variable (CI passes only `SITE_ORIGIN`), so removing it changes no
 * behaviour and closes the trap.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * `next dev` runs a server; `next build` produces a static export with no server at all
 * (ADR 0001). That difference is real, so the config splits on it rather than pretending:
 *
 *   dev   — a redirect sends `/` to the default locale.
 *   build — `output: 'export'`, and `public/index.html` carries a meta refresh instead.
 *
 * Declaring both at once makes Next warn that redirects "will not work with output: export"
 * — on every dev start, about a redirect that demonstrably does work there. The cost of
 * splitting is that dev no longer rejects features the export cannot do; `npm run build`
 * is the authority on that, and CI runs it on every push.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(isDev
    ? {
        async redirects() {
          return [{ source: '/', destination: '/en/', permanent: false }];
        },
      }
    : { output: 'export' }),
};

export default nextConfig;
