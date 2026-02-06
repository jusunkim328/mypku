"use client";

import dynamic from "next/dynamic";

const BloodLevelsClient = dynamic(
  () => import("@/components/pages/BloodLevelsClient"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 w-8 h-8" />
      </div>
    ),
  }
);

export default function BloodLevelsPage() {
  return <BloodLevelsClient />;
}
