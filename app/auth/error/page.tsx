"use client";

import Link from "next/link";
import { Page, Card, Button } from "@/components/ui";

export default function AuthErrorPage() {
  return (
    <Page>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            인증 오류
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            로그인 중 문제가 발생했습니다. 다시 시도해 주세요.
          </p>

          <div className="flex flex-col gap-2">
            <Link href="/auth/login">
              <Button large className="w-full">
                다시 로그인
              </Button>
            </Link>
            <Link href="/">
              <Button outline className="w-full">
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </Page>
  );
}
