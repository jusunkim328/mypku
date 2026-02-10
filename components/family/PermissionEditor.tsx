"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/useToast";
import type { UpdatePermissionsFn } from "@/hooks/useFamilyShare";

interface PermissionEditorProps {
  linkId: string;
  currentPermissions: string[];
  isOwner: boolean; // 환자(true)만 변경 가능
  updatePermissions: UpdatePermissionsFn;
}

export default function PermissionEditor({
  linkId,
  currentPermissions,
  isOwner,
  updatePermissions,
}: PermissionEditorProps) {
  const t = useTranslations("CaregiverAdvanced");
  const [permissions, setPermissions] = useState<string[]>(currentPermissions);
  const [saving, setSaving] = useState(false);

  const hasEdit = permissions.includes("edit");
  const hasExport = permissions.includes("export");

  const handleToggle = async (perm: string, checked: boolean) => {
    if (!isOwner) return;

    // edit 권한 추가 시 확인 다이얼로그
    if (perm === "edit" && checked) {
      const confirmed = window.confirm(t("editPermConfirm"));
      if (!confirmed) return;
    }

    const newPerms = checked
      ? [...permissions.filter((p) => p !== perm), perm]
      : permissions.filter((p) => p !== perm);

    // view는 항상 포함
    if (!newPerms.includes("view")) {
      newPerms.unshift("view");
    }

    setPermissions(newPerms);
    setSaving(true);

    const result = await updatePermissions(linkId, newPerms);
    if (result.success) {
      toast.success(t("permissionsSaved"));
    } else {
      toast.error(t("permissionsSaveFailed"));
      setPermissions(currentPermissions); // rollback
    }

    setSaving(false);
  };

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("permissionsLabel")}
      </p>
      <label htmlFor={`perm-view-${linkId}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input id={`perm-view-${linkId}`} type="checkbox" checked disabled className="rounded" />
        {t("permView")}
      </label>
      <label htmlFor={`perm-edit-${linkId}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input
          id={`perm-edit-${linkId}`}
          type="checkbox"
          checked={hasEdit}
          disabled={!isOwner || saving}
          onChange={(e) => handleToggle("edit", e.target.checked)}
          className="rounded"
        />
        {t("permEdit")}
      </label>
      <label htmlFor={`perm-export-${linkId}`} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
        <input
          id={`perm-export-${linkId}`}
          type="checkbox"
          checked={hasExport}
          disabled={!isOwner || saving}
          onChange={(e) => handleToggle("export", e.target.checked)}
          className="rounded"
        />
        {t("permExport")}
      </label>
    </div>
  );
}
