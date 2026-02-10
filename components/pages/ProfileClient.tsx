"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button } from "@/components/ui";
import BadgeCollection from "@/components/profile/BadgeCollection";
import StreakBadge from "@/components/dashboard/StreakBadge";

export default function ProfileClient() {
  const t = useTranslations("ProfilePage");
  const tCommon = useTranslations("Common");

  return (
    <Page>
      <Navbar
        title={t("title")}
        left={
          <Link href="/">
            <Button clear small>
              {tCommon("back")}
            </Button>
          </Link>
        }
      />

      <Block className="space-y-6">
        {/* 스트릭 배지 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{t("streakSection")}</h2>
          <StreakBadge compact={false} />
        </section>

        {/* 배지 컬렉션 */}
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{t("achievementsSection")}</h2>
          <BadgeCollection />
        </section>
      </Block>
    </Page>
  );
}
