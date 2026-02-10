"use client";

import dynamic from "next/dynamic";

// SSR 비활성화 - Supabase 클라이언트는 클라이언트 사이드에서만 생성
const LoginContent = dynamic(() => import("./LoginContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 w-8 h-8" />
    </div>
  ),
});

export default function LoginPage() {
  return <LoginContent />;
}
