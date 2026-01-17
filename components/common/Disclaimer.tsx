"use client";

import { Block } from "@/components/ui";

export default function Disclaimer() {
  return (
    <Block className="!mt-6 !p-0">
      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 leading-relaxed">
        <p className="font-semibold text-gray-600 mb-1">면책조항</p>
        <p>
          본 서비스는 의료기기가 아니며, 질병의 유무를 판단하거나 치료할 수
          없습니다. 중요한 의학적 결정은 반드시 의사와 상의하십시오. AI 분석
          결과는 추정치이며 참고용입니다.
        </p>
      </div>
    </Block>
  );
}
