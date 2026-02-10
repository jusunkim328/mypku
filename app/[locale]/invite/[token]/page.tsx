import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import InviteAcceptClient from "@/components/pages/InviteAcceptClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Family" });

  return {
    title: `${t("inviteReceived")} - MyPKU`,
    description: t("inviteDescription"),
    robots: { index: false, follow: false },
  };
}

export default function InviteAcceptPage() {
  return <InviteAcceptClient />;
}
