"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Copy, Check, Share2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { toast } from "@/hooks/useToast";
import type { SendInviteFn } from "@/hooks/useFamilyShare";

// 주요 이메일 도메인: 이름 → 올바른 전체 도메인
const KNOWN_DOMAINS: Record<string, string> = {
  gmail: "gmail.com", googlemail: "googlemail.com",
  hotmail: "hotmail.com", outlook: "outlook.com", live: "live.com",
  yahoo: "yahoo.com", ymail: "ymail.com",
  naver: "naver.com", daum: "daum.net", hanmail: "hanmail.net", kakao: "kakao.com",
  icloud: "icloud.com", me: "me.com", mac: "mac.com",
  protonmail: "protonmail.com", proton: "proton.me",
  aol: "aol.com", mail: "mail.ru", yandex: "yandex.ru",
};

// 이름 부분 오타 → 올바른 이름
const NAME_TYPO_MAP: Record<string, string> = {
  gamil: "gmail", gmal: "gmail", gnail: "gmail", gmaill: "gmail",
  gmial: "gmail", gmai: "gmail", gmali: "gmail", gmaul: "gmail",
  outloo: "outlook", outlok: "outlook", outloок: "outlook",
  yaho: "yahoo", yahooo: "yahoo", uahoo: "yahoo",
  hotmal: "hotmail", hotmai: "hotmail", hotmial: "hotmail",
  nave: "naver", navr: "naver",
};

// TLD 오타 → 올바른 TLD
const TLD_TYPO_MAP: Record<string, string> = {
  // .com 오타
  co: "com", con: "com", cm: "com", cpm: "com", cmo: "com",
  vom: "com", xom: "com", om: "com", comm: "com", comn: "com",
  clm: "com", cim: "com", dom: "com", com_: "com",
  // .net 오타
  ne: "net", ner: "net", ney: "net", met: "net", nett: "net", bet: "net",
  // .org 오타
  og: "org", orh: "org", orf: "org", rg: "org",
  // .ru 오타
  ri: "ru", ry: "ru",
};

function suggestEmailFix(email: string): string | null {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return null;

  const domain = email.slice(atIndex + 1).toLowerCase();
  const dotIndex = domain.indexOf(".");
  if (dotIndex === -1) return null;

  const name = domain.slice(0, dotIndex);
  const tld = domain.slice(dotIndex + 1);

  // 1) 정확한 도메인 이름 → TLD 오타 체크
  if (name in KNOWN_DOMAINS) {
    const correctDomain = KNOWN_DOMAINS[name];
    if (domain !== correctDomain) {
      return email.slice(0, atIndex + 1) + correctDomain;
    }
    return null; // 도메인이 완벽히 일치
  }

  // 2) 이름 오타 → 올바른 이름으로 교정 + 올바른 TLD 적용
  const correctedName = NAME_TYPO_MAP[name];
  if (correctedName && correctedName in KNOWN_DOMAINS) {
    return email.slice(0, atIndex + 1) + KNOWN_DOMAINS[correctedName];
  }

  // 3) 알려지지 않은 도메인이지만 TLD가 흔한 오타인 경우
  const correctedTld = TLD_TYPO_MAP[tld];
  if (correctedTld && tld !== correctedTld) {
    return email.slice(0, atIndex + 1) + name + "." + correctedTld;
  }

  return null;
}

type PermissionLevel = "edit" | "view";

interface FamilyInviteProps {
  sendInvite: SendInviteFn;
}

export default function FamilyInvite({ sendInvite }: FamilyInviteProps) {
  const t = useTranslations("Family");
  const tCg = useTranslations("Caregiver");

  const [email, setEmail] = useState("");
  const [permLevel, setPermLevel] = useState<PermissionLevel>("edit");
  const [isSending, setIsSending] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [typoSuggestion, setTypoSuggestion] = useState<string | null>(null);

  const doSendInvite = async (emailToSend: string) => {
    setIsSending(true);
    setInviteUrl(null);
    setTypoSuggestion(null);

    const permissions = permLevel === "edit" ? ["view", "edit"] : ["view"];
    const result = await sendInvite(emailToSend.trim(), permissions);

    if (result.success && result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      toast.success(t("inviteCreated"));
    } else {
      const errorMessage =
        result.error === "alreadyInvited"
          ? t("alreadyInvited")
          : result.error === "cannotInviteSelf"
            ? t("cannotInviteSelf")
            : result.error === "invalidEmail"
              ? t("invalidEmail")
              : t("inviteFailed");
      toast.error(errorMessage);
    }

    setIsSending(false);
  };

  const handleSendInvite = async () => {
    if (!email.trim()) return;

    const suggestion = suggestEmailFix(email.trim());
    if (suggestion) {
      setTypoSuggestion(suggestion);
      return;
    }

    await doSendInvite(email);
  };

  const handleShare = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "MyPKU",
          text: t("shareInviteText"),
          url: inviteUrl,
        });
      } catch (err) {
        // 사용자 취소는 무시
        if (err instanceof Error && err.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const handleReset = () => {
    setInviteUrl(null);
    setEmail("");
    setCopied(false);
  };

  // 초대 생성 후: 공유/복사 UI
  if (inviteUrl) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">
            {t("inviteCreated")}
          </p>
          <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 text-xs text-gray-600 dark:text-gray-400 bg-transparent border-none outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label={t("copyLink")}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleShare} className="flex-1">
            <Share2 className="w-4 h-4 mr-1.5" />
            {t("shareInvite")}
          </Button>
        </div>

        <button
          onClick={handleReset}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline w-full text-center"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  // 이메일 입력 UI
  return (
    <div className="space-y-3">
      {/* 권한 선택 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPermLevel("edit")}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            permLevel === "edit"
              ? "bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {tCg("permEditor")}
        </button>
        <button
          type="button"
          onClick={() => setPermLevel("view")}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
            permLevel === "view"
              ? "bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
          }`}
        >
          {tCg("permViewer")}
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setTypoSuggestion(null); }}
          onFocus={(e) => e.target.select()}
          placeholder={t("emailPlaceholder")}
          className="flex-1"
        />
        <Button
          small
          onClick={handleSendInvite}
          disabled={isSending || !email.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {typoSuggestion && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
            {t("didYouMean", { email: typoSuggestion })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setEmail(typoSuggestion); setTypoSuggestion(null); }}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
            >
              {t("useCorrection")}
            </button>
            <button
              type="button"
              onClick={() => doSendInvite(email)}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t("sendAnyway")}
            </button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("inviteHelp")}
      </p>
    </div>
  );
}
