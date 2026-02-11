"use client";

import { useTranslations } from "next-intl";
import { UserCheck, Clock, Trash2, Mail, Eye, Pencil, Copy, ShieldCheck, Heart } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { useRouter } from "@/i18n/navigation";
import { usePatientContext } from "@/hooks/usePatientContext";
import PermissionEditor from "./PermissionEditor";
import type { CaregiverLink, RemoveLinkFn, UpdatePermissionsFn } from "@/hooks/useFamilyShare";

function MemberCard({
  link,
  isOwner,
  onRemove,
  onViewData,
  updatePermissions,
}: {
  link: CaregiverLink;
  isOwner: boolean;
  onRemove: (id: string) => void;
  onViewData?: (link: CaregiverLink) => void;
  updatePermissions?: UpdatePermissionsFn;
}) {
  const t = useTranslations("Family");
  const tCg = useTranslations("Caregiver");
  const tAdv = useTranslations("CaregiverAdvanced");

  const isPending = link.status === "pending";
  const hasEditPerm = link.permissions?.includes("edit");
  const displayName = isOwner
    ? (link.inviteEmail || t("unknownUser"))
    : (link.patientName || link.patientEmail || t("unknownUser"));

  const handleCopyInviteUrl = async () => {
    if (!link.inviteToken) {
      toast.error(t("copyFailed"));
      return;
    }
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${baseUrl}/invite/${link.inviteToken}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isPending
                ? "bg-amber-100 dark:bg-amber-900/30"
                : "bg-green-100 dark:bg-green-900/30"
            }`}
          >
            {isPending ? (
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {displayName}
            </p>
            <div className="flex items-center gap-1.5">
              {isPending ? (
                <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  {t("statusPending")}
                </span>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("statusAccepted")}
                  </p>
                  <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                    hasEditPerm
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}>
                    {hasEditPerm ? (
                      <><Pencil className="w-3 h-3" />{tCg("canEdit")}</>
                    ) : (
                      <><Eye className="w-3 h-3" />{tCg("viewOnly")}</>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 보호자 뷰: "데이터 보기" 버튼 */}
          {!isOwner && !isPending && onViewData && (
            <button
              onClick={() => onViewData(link)}
              className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              aria-label={tCg("selectPatient")}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {/* Pending 초대: 링크 복사 버튼 */}
          {isOwner && isPending && (
            <button
              onClick={handleCopyInviteUrl}
              className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              aria-label={t("copyLink")}
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => onRemove(link.id)}
              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              aria-label={t("removeLink")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Permission editor for accepted links (patient view only) */}
      {isOwner && !isPending && updatePermissions && (
        <PermissionEditor
          linkId={link.id}
          currentPermissions={link.permissions || ["view"]}
          isOwner={isOwner}
          updatePermissions={updatePermissions}
        />
      )}

      {/* Guidance text for patient view */}
      {isOwner && !isPending && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
          {tAdv("growthGuidance")}
        </p>
      )}
    </div>
  );
}

interface FamilyMembersProps {
  caregivers: CaregiverLink[];
  patients: CaregiverLink[];
  isLoading: boolean;
  removeLink: RemoveLinkFn;
  updatePermissions: UpdatePermissionsFn;
}

export default function FamilyMembers({
  caregivers,
  patients,
  isLoading,
  removeLink,
  updatePermissions,
}: FamilyMembersProps) {
  const t = useTranslations("Family");
  const router = useRouter();
  const { setActivePatient } = usePatientContext();

  const handleViewData = (link: CaregiverLink) => {
    setActivePatient(
      {
        id: link.patientProfileId,
        name: link.patientName || null,
        email: link.patientEmail || "",
      },
      link.permissions || ["view"]
    );
    router.push("/");
  };

  const handleRemove = async (linkId: string) => {
    const confirmed = window.confirm(t("removeLinkConfirm"));
    if (!confirmed) return;

    const result = await removeLink(linkId);
    if (result.success) {
      toast.success(t("linkRemoved"));
    } else {
      toast.error(t("linkRemoveFailed"));
    }
  };

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <div className="animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 w-6 h-6 mx-auto" />
      </div>
    );
  }

  const hasLinks = caregivers.length > 0 || patients.length > 0;

  if (!hasLinks) {
    return (
      <div className="py-4 text-center">
        <Mail className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("noMembers")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {caregivers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("sectionMyCaregivers")}
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("sectionMyCaregiversDesc")}
          </p>
          <div className="space-y-2">
            {caregivers.map((link) => (
              <MemberCard
                key={link.id}
                link={link}
                isOwner={true}
                onRemove={handleRemove}
                updatePermissions={updatePermissions}
              />
            ))}
          </div>
        </div>
      )}
      {patients.length > 0 && (
        <div>
          {caregivers.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 mb-4" />
          )}
          <div className="flex items-center gap-2 mb-1.5">
            <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {t("sectionPeopleICareFor")}
            </h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {t("sectionPeopleICareForDesc")}
          </p>
          <div className="space-y-2">
            {patients.map((link) => (
              <MemberCard
                key={link.id}
                link={link}
                isOwner={false}
                onRemove={handleRemove}
                onViewData={handleViewData}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
