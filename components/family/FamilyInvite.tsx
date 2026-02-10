"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Copy, Check, Share2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { toast } from "@/hooks/useToast";
import type { SendInviteFn } from "@/hooks/useFamilyShare";

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

  const handleSendInvite = async () => {
    if (!email.trim()) return;

    setIsSending(true);
    setInviteUrl(null);

    const permissions = permLevel === "edit" ? ["view", "edit"] : ["view"];
    const result = await sendInvite(email.trim(), permissions);

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
          onChange={(e) => setEmail(e.target.value)}
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
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("inviteHelp")}
      </p>
    </div>
  );
}
