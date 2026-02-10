"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui";
import {
  Shield,
  Brain,
  Bone,
  Heart,
  Droplets,
  FlaskConical,
  Activity,
} from "lucide-react";
import AccordionItem from "@/components/learn/AccordionItem";

function PositiveNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
      <p className="text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function ActionTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2.5">
      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex-shrink-0">
        {label}
      </span>
      <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

const HEALTH_TOPICS = [
  { key: "brain", icon: Brain, iconColor: "text-purple-500" },
  { key: "bone", icon: Bone, iconColor: "text-amber-500" },
  { key: "heart", icon: Heart, iconColor: "text-rose-500" },
  { key: "kidney", icon: Droplets, iconColor: "text-blue-500" },
  { key: "nutrition", icon: FlaskConical, iconColor: "text-emerald-500" },
  { key: "metabolic", icon: Activity, iconColor: "text-orange-500" },
] as const;

export default function LongTermHealth() {
  const t = useTranslations("Learn");

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-teal-500" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {t("healthTitle")}
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {t("healthSubtitle")}
      </p>

      {HEALTH_TOPICS.map(({ key, icon: Icon, iconColor }) => (
        <AccordionItem
          key={key}
          title={t(`health_${key}`)}
          icon={<Icon className={`w-4 h-4 ${iconColor}`} />}
        >
          <p>{t(`health_${key}_fact`)}</p>
          <PositiveNote>{t(`health_${key}_positive`)}</PositiveNote>
          <ActionTip label={t("health_tip_label")}>
            {t(`health_${key}_tip`)}
          </ActionTip>
        </AccordionItem>
      ))}

      {/* Encouragement banner */}
      <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg">
        <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">
          {t("health_encouragement")}
        </p>
      </div>

      {/* Medical disclaimer */}
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic">
          {t("health_disclaimer")}
        </p>
      </div>
    </Card>
  );
}
