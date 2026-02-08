"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Page, Navbar, Block, Button, Preloader } from "@/components/ui";
import { Printer } from "lucide-react";
import { useMealRecords } from "@/hooks/useMealRecords";
import { useFormulaRecords } from "@/hooks/useFormulaRecords";
import { useBloodLevels } from "@/hooks/useBloodLevels";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/contexts/AuthContext";
import { buildReportData } from "@/lib/reportData";
import type { ExportData } from "@/lib/exportUtils";
import ReportHeader from "@/components/report/ReportHeader";
import PheSummary from "@/components/report/PheSummary";
import BloodLevelTable from "@/components/report/BloodLevelTable";
import FormulaSummary from "@/components/report/FormulaSummary";
import Disclaimer from "@/components/common/Disclaimer";

type ReportPeriod = 7 | 30 | 90;

export default function ReportClient() {
  const t = useTranslations("Report");
  const tCommon = useTranslations("Common");
  const tExport = useTranslations("Export");
  const { user } = useAuth();
  const { mealRecords } = useMealRecords();
  const { fetchFormulaSummary } = useFormulaRecords();
  const { records: bloodRecords } = useBloodLevels();
  const { dailyGoals, phePerExchange } = useUserSettings();

  const [period, setPeriod] = useState<ReportPeriod>(30);
  const [data, setData] = useState<ExportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref for fetchFormulaSummary to avoid dependency loop (function ref changes each render)
  const fetchFormulaSummaryRef = useRef(fetchFormulaSummary);
  fetchFormulaSummaryRef.current = fetchFormulaSummary;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!data) setIsLoading(true);
      try {
        const result = await buildReportData({
          days: period,
          mealRecords,
          fetchFormulaSummary: fetchFormulaSummaryRef.current,
          bloodRecords,
          dailyGoals,
          phePerExchange,
        });
        if (!cancelled) setData(result);
      } catch (error) {
        console.error("[Report] Failed to load data:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period, mealRecords, bloodRecords, dailyGoals, phePerExchange]);

  const handlePrint = () => window.print();

  return (
    <Page noBottomNav>
      <Navbar
        title={t("title")}
        left={
          <Link href="/settings">
            <Button clear small>
              {tCommon("back")}
            </Button>
          </Link>
        }
        right={
          <Button clear small onClick={handlePrint}>
            <Printer className="w-5 h-5" />
          </Button>
        }
      />

      {/* Period selector - not printed */}
      <Block className="no-print">
        <div className="flex gap-2">
          {([7, 30, 90] as ReportPeriod[]).map((days) => (
            <Button
              key={days}
              small
              outline={period !== days}
              onClick={() => setPeriod(days)}
            >
              {tExport(
                days === 7
                  ? "period7d"
                  : days === 30
                    ? "period1m"
                    : "period3m"
              )}
            </Button>
          ))}
        </div>
      </Block>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Preloader />
        </div>
      ) : data ? (
        <Block className="space-y-6 print:space-y-4">
          <ReportHeader
            userName={
              user?.user_metadata?.full_name || user?.email || ""
            }
            periodStart={data.periodStart}
            periodEnd={data.periodEnd}
          />
          <PheSummary
            dailySummaries={data.dailySummaries}
            dailyGoals={data.dailyGoals}
            phePerExchange={data.phePerExchange}
          />
          {data.bloodRecords.length > 0 && (
            <BloodLevelTable records={data.bloodRecords} />
          )}
          {data.formulaDays.length > 0 && (
            <FormulaSummary formulaDays={data.formulaDays} />
          )}
          <Disclaimer />
        </Block>
      ) : (
        <Block>
          <p className="text-center text-gray-500 py-10">{t("noData")}</p>
        </Block>
      )}
    </Page>
  );
}
