/** @type {import('next').NextConfig} */

// Build remotePatterns dynamically so that `next/image` accepts whatever
// public base URL is configured for R2 (custom domain or the rate-limited
// pub-*.r2.dev URL). We also blanket-allow *.r2.dev to make first-run
// development against the default R2 public URL frictionless.
const remotePatterns = [
  { protocol: "https", hostname: "*.r2.dev" }
];

if (process.env.R2_PUBLIC_URL) {
  try {
    const url = new URL(process.env.R2_PUBLIC_URL);
    const protocol = url.protocol.replace(":", "");
    if (protocol === "http" || protocol === "https") {
      remotePatterns.push({ protocol, hostname: url.hostname });
    }
  } catch {
    // R2_PUBLIC_URL is malformed; ignore here — `lib/storage.ts` will
    // surface a clearer error at upload time.
  }
}

const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns
  },
  experimental: {
    optimizePackageImports: ["framer-motion"]
  },
  // The GramJS sync worker imports `telegram` (which pulls in big native
  // crypto deps). It should never be bundled into the Next.js client or
  // even most server components.
  serverExternalPackages: ["telegram"]
};

export default nextConfig;
