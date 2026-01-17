import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모든 페이지를 동적으로 렌더링
  output: "standalone",

  // TypeScript 빌드 에러 체크
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
