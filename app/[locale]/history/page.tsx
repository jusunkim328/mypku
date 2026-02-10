"use client";

import dynamic from "next/dynamic";

const HistoryClient = dynamic(() => import("@/components/pages/HistoryClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 w-8 h-8" />
    </div>
  ),
});

export default function HistoryPage() {
  return <HistoryClient />;
}
