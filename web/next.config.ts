import type { NextConfig } from "next"
import packageJson from "./package.json"

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: packageJson.version,
  },
  experimental: {
    middlewareClientMaxBodySize: "100mb",
  },
  typedRoutes: true,
}

export default nextConfig
