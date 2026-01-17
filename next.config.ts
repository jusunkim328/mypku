import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모든 페이지를 동적으로 렌더링
  output: "standalone",

  // 정적 생성 비활성화
  experimental: {
    // SSG 빌드 시 오류 무시
  },

  // 개발 환경에서 경고 표시
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
