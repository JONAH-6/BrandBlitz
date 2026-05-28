# CDN and Image Optimizer Hosts

BrandBlitz image assets are loaded from a single bucket path in each environment:

- Development: `http://localhost:9000/brandblitz/**`
- Development loopback: `http://127.0.0.1:9000/brandblitz/**`
- Production: `https://assets.brandblitz.app/brandblitz/**`

`apps/web/next.config.ts` keeps `images.remotePatterns` pinned to these hosts, ports, and path prefixes so the Next.js optimizer cannot be used as a general proxy for arbitrary local services or unrelated CDN paths. Google OAuth avatars remain allowed through `https://lh3.googleusercontent.com`.
