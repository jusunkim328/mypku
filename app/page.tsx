"use client";

import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("@/components/pages/HomeClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 w-8 h-8" />
    </div>
  ),
});

export default function Home() {
  return <HomeClient />;
}
