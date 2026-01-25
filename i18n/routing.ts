import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko"],
  defaultLocale: "en",
  localePrefix: "as-needed", // /about → en, /ko/about → ko
});

export type Locale = (typeof routing.locales)[number];
