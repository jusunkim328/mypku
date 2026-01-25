"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Page, Card, Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/useToast";
import { useRouter } from "@/i18n/navigation";

export default function LoginContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  const t = useTranslations("Auth");

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch {
      toast.error(t("loginFailed"));
    }
  };

  if (isLoading) {
    return (
      <Page>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 w-8 h-8" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="max-w-sm w-full p-8 text-center animate-scale-in">
          {/* 로고 */}
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-3xl text-white font-bold">P</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">MyPKU</h1>
          <p className="text-gray-600 text-sm mb-8">
            AI-Powered Diet Management
          </p>

          {/* Google 로그인 버튼 */}
          <Button
            large
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("loginWithGoogle")}
          </Button>

          {/* 게스트 모드 */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <Button
              outline
              onClick={() => router.push("/")}
              className="w-full"
            >
              {t("continueWithoutLogin")}
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              {t("guestModeDesc")}
            </p>
          </div>
        </Card>

        {/* 면책조항 */}
        <p className="text-xs text-gray-400 mt-6 text-center max-w-sm">
          {t("termsAgreement")}
        </p>
      </div>
    </Page>
  );
}
