import { useTranslations } from "next-intl";

export default function OfflinePage() {
  const t = useTranslations("Offline");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        {/* Offline Icon */}
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M6.343 6.343a8 8 0 000 11.314m3.536-3.536a4 4 0 010-5.656M12 12h.01"
            />
            <line
              x1="4"
              y1="4"
              x2="20"
              y2="20"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {t("title")}
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t("message")}
        </p>

        {/* Features available offline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
            {t("availableOffline")}
          </h2>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• {t("feature1")}</li>
            <li>• {t("feature2")}</li>
            <li>• {t("feature3")}</li>
          </ul>
        </div>

        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {t("retry")}
        </button>
      </div>
    </div>
  );
}
