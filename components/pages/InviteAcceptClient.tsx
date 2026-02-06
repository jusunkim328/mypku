"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Page, Block, Card, Button, Preloader } from "@/components/ui";
import { Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyShare } from "@/hooks/useFamilyShare";
import { createClient } from "@/lib/supabase/client";

type InviteStatus = "loading" | "ready" | "accepting" | "accepted" | "error" | "needsLogin";

interface InviteInfo {
  inviteId: string;
  inviteEmail: string;
  invitedAt: string;
}

const KNOWN_ERROR_KEYS = [
  "invalidToken", "alreadyUsed", "cannotAcceptOwn",
  "acceptFailed", "fetchFailed", "alreadyLinked", "expired", "emailMismatch",
];

export default function InviteAcceptClient() {
  const t = useTranslations("Family");
  const tAuth = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const params = useParams();
  const token = params.token as string;

  const { isAuthenticated, isLoading: authLoading, signInWithGoogle } = useAuth();
  const { acceptInvite } = useFamilyShare();
  const supabaseRef = useRef(createClient());

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorKey, setErrorKey] = useState<string>("");

  // 에러 메시지 (알려진 키만 번역, 나머지는 기본 메시지)
  const getErrorMessage = (key: string) => {
    if (KNOWN_ERROR_KEYS.includes(key)) {
      return t(`error_${key}`);
    }
    return t("inviteErrorDesc");
  };

  // 초대 정보 조회 (RPC - 마스킹된 이메일 반환)
  useEffect(() => {
    if (authLoading) return;

    async function fetchInvite() {
      try {
        const supabase = supabaseRef.current;

        const { data, error } = await supabase.rpc(
          "lookup_invite_by_token",
          { invite_token_param: token }
        );

        if (error) throw error;

        const result = data as unknown as {
          success: boolean;
          error?: string;
          inviteId?: string;
          inviteEmail?: string;
          invitedAt?: string;
        } | null;

        if (!result || !result.success) {
          setErrorKey(result?.error || "invalidToken");
          setStatus("error");
          return;
        }

        setInviteInfo({
          inviteId: result.inviteId!,
          inviteEmail: result.inviteEmail || "",
          invitedAt: result.invitedAt || "",
        });

        if (!isAuthenticated) {
          setStatus("needsLogin");
        } else {
          setStatus("ready");
        }
      } catch {
        setErrorKey("fetchFailed");
        setStatus("error");
      }
    }

    fetchInvite();
  }, [token, authLoading, isAuthenticated]);

  // 초대 수락 (useFamilyShare 훅의 acceptInvite 사용 — 로직 단일화)
  const handleAccept = async () => {
    setStatus("accepting");

    const result = await acceptInvite(token);

    if (result.success) {
      setStatus("accepted");
    } else {
      setErrorKey(result.error || "acceptFailed");
      setStatus("error");
    }
  };

  // 로그인 후 자동 전환
  useEffect(() => {
    if (status === "needsLogin" && isAuthenticated) {
      setStatus("ready");
    }
  }, [status, isAuthenticated]);

  const renderContent = () => {
    if (status === "loading" || authLoading) {
      return (
        <div className="text-center py-12">
          <Preloader />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {tCommon("loading")}
          </p>
        </div>
      );
    }

    if (status === "needsLogin") {
      // 로그인 후 이 초대 페이지로 돌아오도록 returnUrl 전달
      const invitePath = `/invite/${token}`;
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("inviteReceived")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("loginToAccept")}
          </p>
          {inviteInfo?.inviteEmail && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("invitedAs", { email: inviteInfo.inviteEmail })}
            </p>
          )}
          <Button onClick={() => signInWithGoogle(invitePath)} className="w-full max-w-xs mx-auto">
            {tAuth("login")}
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t("loginReturnHint")}
          </p>
        </div>
      );
    }

    if (status === "ready") {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("inviteReceived")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("inviteDescription")}
          </p>
          <Button onClick={handleAccept} className="w-full max-w-xs mx-auto">
            {t("acceptInvite")}
          </Button>
        </div>
      );
    }

    if (status === "accepting") {
      return (
        <div className="text-center py-8">
          <Preloader />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {t("accepting")}
          </p>
        </div>
      );
    }

    if (status === "accepted") {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("inviteAccepted")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("inviteAcceptedDesc")}
          </p>
          <Link href="/">
            <Button className="w-full max-w-xs mx-auto">
              {t("goHome")}
            </Button>
          </Link>
        </div>
      );
    }

    // error
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          {errorKey === "alreadyUsed" ? (
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          ) : (
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {errorKey === "alreadyUsed" ? t("inviteAlreadyUsed") : t("inviteError")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getErrorMessage(errorKey)}
        </p>
        <Link href="/">
          <Button outline className="w-full max-w-xs mx-auto">
            {t("goHome")}
          </Button>
        </Link>
      </div>
    );
  };

  return (
    <Page>
      <Block>
        <Card className="p-6 md:p-8 max-w-md mx-auto mt-12">
          {renderContent()}
        </Card>
      </Block>
    </Page>
  );
}
