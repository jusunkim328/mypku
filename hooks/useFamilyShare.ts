"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDevAuthState } from "@/lib/devAuth";

export interface CaregiverLink {
  id: string;
  caregiverUserId: string | null;
  patientProfileId: string;
  relationship: string;
  permissions: string[];
  status: "pending" | "accepted" | "revoked";
  inviteEmail: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  patientEmail?: string;
  patientName?: string;
}

export type SendInviteFn = (
  email: string
) => Promise<{ success: boolean; inviteUrl?: string; error?: string }>;

export type RemoveLinkFn = (
  linkId: string
) => Promise<{ success: boolean; error?: string }>;

export interface UseFamilyShareReturn {
  caregivers: CaregiverLink[];
  patients: CaregiverLink[];
  pendingInvites: CaregiverLink[];
  isLoading: boolean;
  sendInvite: SendInviteFn;
  acceptInvite: (
    token: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeLink: RemoveLinkFn;
  refresh: () => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CaregiverLink {
  return {
    id: row.id,
    caregiverUserId: row.caregiver_user_id,
    patientProfileId: row.patient_profile_id,
    relationship: row.relationship,
    permissions: row.permissions || ["view", "edit"],
    status: row.status,
    inviteEmail: row.invite_email,
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  };
}

export function useFamilyShare(): UseFamilyShareReturn {
  const { user, isAuthenticated } = useAuth();
  const [caregivers, setCaregivers] = useState<CaregiverLink[]>([]);
  const [patients, setPatients] = useState<CaregiverLink[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CaregiverLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabaseRef = useRef(createClient());

  const fetchLinks = useCallback(async () => {
    if (!user) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled) return;

    setIsLoading(true);
    try {
      const supabase = supabaseRef.current;

      const selectCols = "id, caregiver_user_id, patient_profile_id, relationship, permissions, status, invite_email, invited_at, accepted_at";

      const [caregiverResult, patientResult] = await Promise.all([
        supabase.from("caregiver_links").select(selectCols).eq("patient_profile_id", user.id).order("invited_at", { ascending: false }),
        supabase.from("caregiver_links").select(selectCols).eq("caregiver_user_id", user.id).order("invited_at", { ascending: false }),
      ]);

      if (caregiverResult.error) throw caregiverResult.error;
      if (patientResult.error) throw patientResult.error;

      // 보호자 뷰: SECURITY DEFINER 함수로 연결된 환자 프로필 조회
      // (profiles RLS 우회 — 연결된 환자만 반환)
      let patientProfiles: Record<string, { email: string; name: string | null }> = {};

      if ((patientResult.data || []).length > 0) {
        const { data: profiles } = await supabase.rpc(
          "get_linked_patient_profiles",
          { caregiver_uid: user.id }
        );

        if (profiles) {
          patientProfiles = Object.fromEntries(
            (profiles as { id: string; email: string; name: string | null }[]).map(
              (p) => [p.id, { email: p.email, name: p.name }]
            )
          );
        }
      }

      const allCaregivers = (caregiverResult.data || []).map(mapRow);
      const allPatients = (patientResult.data || []).map((row) => {
        const link = mapRow(row);
        const profile = patientProfiles[link.patientProfileId];
        if (profile) {
          link.patientEmail = profile.email;
          link.patientName = profile.name || undefined;
        }
        return link;
      });

      setCaregivers(allCaregivers.filter((l) => l.status !== "revoked"));
      setPatients(allPatients.filter((l) => l.status === "accepted"));
      setPendingInvites(allPatients.filter((l) => l.status === "pending"));
    } catch (error) {
      console.error("[useFamilyShare] 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLinks();
    }
  }, [isAuthenticated, fetchLinks]);

  // Realtime 구독
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const devAuthState = getDevAuthState();
    if (devAuthState.enabled) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`family-links:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caregiver_links",
          filter: `patient_profile_id=eq.${user.id}`,
        },
        () => { fetchLinks(); }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "caregiver_links",
          filter: `caregiver_user_id=eq.${user.id}`,
        },
        () => { fetchLinks(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAuthenticated, fetchLinks]);

  // 초대 생성 → inviteUrl 반환
  const sendInvite: SendInviteFn = useCallback(
    async (email) => {
      if (!user) return { success: false, error: "notAuthenticated" };

      try {
        const response = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (!response.ok) {
          return { success: false, error: result.error || "inviteFailed" };
        }

        await fetchLinks();
        return { success: true, inviteUrl: result.inviteUrl };
      } catch (error) {
        console.error("[useFamilyShare] 초대 발송 실패:", error);
        return { success: false, error: "inviteFailed" };
      }
    },
    [user, fetchLinks]
  );

  // 초대 수락 → RPC 함수 호출 (서버 측 검증)
  const acceptInvite = useCallback(
    async (token: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "notAuthenticated" };

      try {
        const supabase = supabaseRef.current;

        const { data, error } = await supabase.rpc(
          "accept_invite_by_token",
          { invite_token_param: token }
        );

        if (error) throw error;
        if (!data) return { success: false, error: "acceptFailed" };

        const result = data as unknown as { success: boolean; error?: string };

        if (result.success) {
          await fetchLinks();
        }

        return result;
      } catch (error) {
        console.error("[useFamilyShare] 초대 수락 실패:", error);
        return { success: false, error: "acceptFailed" };
      }
    },
    [user, fetchLinks]
  );

  // 링크 삭제 → 결과 반환 (RLS + 클라이언트 가드로 소유권 검증)
  const removeLink: RemoveLinkFn = useCallback(
    async (linkId) => {
      if (!user) return { success: false, error: "notAuthenticated" };

      try {
        const supabase = supabaseRef.current;

        const { error } = await supabase
          .from("caregiver_links")
          .delete()
          .eq("id", linkId)
          .eq("patient_profile_id", user.id);

        if (error) throw error;

        await fetchLinks();
        return { success: true };
      } catch (error) {
        console.error("[useFamilyShare] 링크 삭제 실패:", error);
        return { success: false, error: "removeFailed" };
      }
    },
    [user, fetchLinks]
  );

  return {
    caregivers,
    patients,
    pendingInvites,
    isLoading,
    sendInvite,
    acceptInvite,
    removeLink,
    refresh: fetchLinks,
  };
}
