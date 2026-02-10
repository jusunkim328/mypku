"use client";

import dynamic from "next/dynamic";

const OnboardingClient = dynamic(
  () => import("@/components/pages/OnboardingClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 w-8 h-8" />
      </div>
    ),
  }
);

export default function OnboardingPage() {
  return <OnboardingClient />;
}
