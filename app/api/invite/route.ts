import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invite
 * 보호자 초대 생성
 *
 * Body: { email: string }
 * - caregiver_links에 pending 레코드 생성
 * - invite_token 생성 (UUID)
 * - inviteUrl 반환 (Web Share API 또는 클립보드로 공유)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "notAuthenticated" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalidRequest" }, { status: 400 });
    }
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "invalidEmail" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "invalidEmail" },
        { status: 400 }
      );
    }

    // 자기 자신 초대 방지
    if (user.email?.toLowerCase() === trimmedEmail) {
      return NextResponse.json(
        { error: "cannotInviteSelf" },
        { status: 400 }
      );
    }

    // 중복 초대 확인
    const { data: existing } = await supabase
      .from("caregiver_links")
      .select("id, status")
      .eq("patient_profile_id", user.id)
      .eq("invite_email", trimmedEmail)
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "alreadyInvited" },
        { status: 409 }
      );
    }

    const inviteToken = crypto.randomUUID();

    const { data: link, error: insertError } = await supabase
      .from("caregiver_links")
      .insert({
        patient_profile_id: user.id,
        relationship: "parent",
        permissions: ["view", "edit"],
        status: "pending",
        invite_email: trimmedEmail,
        invite_token: inviteToken,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const inviteUrl = `${request.nextUrl.origin}/invite/${inviteToken}`;

    return NextResponse.json({
      success: true,
      inviteId: link.id,
      inviteUrl,
    });
  } catch (error) {
    console.error("[API /invite] 에러:", error);
    return NextResponse.json(
      { error: "inviteFailed" },
      { status: 500 }
    );
  }
}
