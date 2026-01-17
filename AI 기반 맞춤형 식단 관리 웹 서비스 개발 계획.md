# **멀티모달 LLM 비전 기술 기반의 초개인화 대사 질환 및 범용 식단 관리 생태계 구축을 위한 통합 개발 연구 보고서**

디지털 헬스케어 패러다임이 단순한 데이터 기록의 시대를 넘어 인공지능(AI) 기반의 능동적 가이드 시스템으로 진화함에 따라, 사용자 개개인의 생리적 특성과 질환 유무를 고려한 초개인화 식단 관리 서비스의 필요성이 대두되고 있다. 특히 페닐케톤뇨증(PKU)과 같은 희귀 대사 질환자의 경우, 단백질 및 특정 아미노산 섭취량의 미세한 오차가 신경학적 손상 등 치명적인 결과로 이어질 수 있어 일상적인 식단 관리의 정밀도가 일반인에 비해 비약적으로 높아야 한다.1 본 연구 보고서는 사용자가 음성 및 텍스트로 제안한 식단 관리 웹 서비스 아이디어를 구체화하여, 범용적 사용성과 질환별 전문성을 동시에 확보할 수 있는 기술적 아키텍처와 실행 전략을 제시한다. 대형 언어 모델(LLM)의 비전 기능을 활용한 자동 영양 분석, 반응형 웹과 네이티브 하이브리드 앱을 아우르는 멀티 플랫폼 전략, 그리고 국내 법규를 준수하는 민감 정보 처리 방안을 체계적으로 고찰한다.

## **대사 질환 관리의 임상적 특수성과 PKU 전용 모듈의 필요성**

식단 관리 서비스의 핵심 사용자층은 건강 증진을 목적으로 하는 일반 대중뿐만 아니라, 특정 영양소 섭취를 엄격히 제한해야 하는 질환자 그룹을 포함한다. 페닐케톤뇨증(PKU)은 체내에서 필수 아미노산인 페닐알라닌(Phe)을 대사하지 못해 발생하는 유전성 대사 질환으로, 지능 저하와 같은 비가역적 손상을 방지하기 위해 평생에 걸친 식사 요법이 요구된다.1 일반적인 식단 앱이 칼로리와 3대 영양소(탄수화물, 단백질, 지방)에 집중하는 것과 달리, PKU 관리 시스템은 '단백질 당 페닐알라닌 함량'이라는 훨씬 미세한 데이터 단위를 다루어야 한다.1

PKU 식단 관리의 기술적 난제는 시중에 유통되는 일반 식품의 영양성분 표시에 페닐알라닌 함량이 명시되지 않는다는 점이다.1 따라서 서비스는 단백질 함량을 기반으로 한 페닐알라닌 추정 계산기 기능을 제공해야 하며, 사용자가 본인의 질환 상태(PKU 등)를 설정했을 때 UI/UX가 해당 지표 중심으로 재구성되는 '모드 전환' 기능이 필수적이다.4 예를 들어, PKU 모드에서는 일반적인 단백질 섭취 권장량 대신 '페닐알라닌 허용량'이 대시보드의 중심이 되며, PKU-1이나 PKU-2와 같은 특수 제조 분유 및 저단백 햇반 등 특수 식품 데이터베이스가 우선적으로 노출되어야 한다.2

| 질환 관리 항목 | 일반 사용자 식단 관리 | PKU 환자 특화 관리 |
| :---- | :---- | :---- |
| **주요 추적 지표** | 칼로리, 단백질, 지방, 탄수화물 | 페닐알라닌(Phe), 단백질 등가물(Protein Equivalent) |
| **데이터 정밀도** | 그램(g) 단위의 대략적 기록 | 밀리그램(mg) 단위의 정밀 추적 4 |
| **특수 식품 의존도** | 낮음 (일반 가공식품 및 자연식) | 매우 높음 (특수 분유, 저단백 특수 식품) 2 |
| **AI 조언 알고리즘** | 체중 감량 및 근육량 증대 중심 | 혈중 페닐알라닌 농도 유지 및 성장 발달 지원 1 |
| **섭취 제한 알림** | 목표 칼로리 달성 여부 | 일일/주간 페닐알라닌 허용량 초과 방지 5 |

이러한 특수성을 고려할 때, 서비스 초기 설정 단계에서 사용자의 질환 유무를 파악하고 그에 따른 개인화된 영양 목표치를 설정하는 기능은 서비스의 정체성을 결정짓는 핵심 요소가 된다. 단순히 먹은 음식을 기록하는 것을 넘어, 한 주간의 단백질 섭취 제한량을 기반으로 "이번 주에 섭취 가능한 단백질 양이 이만큼 남았습니다"와 같은 구체적인 피드백을 제공함으로써 사용자의 심리적 부담을 줄이고 순응도를 높일 수 있다.

## **멀티모달 LLM 비전을 활용한 자동 식단 분석 시스템**

사용자가 음식을 먹을 때마다 사진을 찍어 올리면 AI가 이를 분석하여 자동으로 기록하는 기능은 식단 관리의 진입 장벽을 낮추는 결정적인 도구이다. 최근의 연구에 따르면, GPT-4o나 Claude 3.5 Sonnet과 같은 최신 멀티모달 LLM은 음식 사진을 통해 식품의 종류, 대략적인 무게, 영양 성분을 추정하는 데 있어 숙련된 영양사에 준하는 성능을 보여주고 있다.6 특히 GPT-4o는 복잡한 수학적 계산과 상세한 설명 제공에서 강점을 보이며, Claude 3.5 Sonnet은 추론의 논리적 정확성과 낮은 환각률(Hallucination)로 인해 임상적 보조 도구로서의 가치가 높다.8

### **LLM 비전 모델의 성능 비교 및 선택 전략**

식단 분석의 정확도를 높이기 위해서는 각 모델의 특성을 이해하고 최적의 모델을 선택해야 한다. 연구 데이터에 따르면, GPT-4o와 Claude 3.5 Sonnet은 음식 무게 추정에서 약 36\~37%의 평균 절대 백분율 오차(MAPE)를 기록하여, Gemini 1.5 Pro(64% 이상)에 비해 월등히 높은 정확도를 보였다.6

| 모델명 | 에너지 추정 정확도 (MAPE) | 장점 | 단점 |
| :---- | :---- | :---- | :---- |
| **GPT-4o** | 35.8% | 빠른 응답 속도, 시각적 요소 분석 및 계산 능력 탁월 8 | 대용량 데이터 추출 시 정확도 편차 존재 10 |
| **Claude 3.5 Sonnet** | 35.8% | 정교한 논리 추론, 코드 생성 및 정형 데이터 추출 강점 7 | GPT-4o 대비 약간 느린 처리 속도 10 |
| **Gemini 1.5 Pro** | 64.2% 이상 | 긴 컨텍스트 윈도우, 구글 생태계 통합 용이 | 영양소 추정에서의 높은 오차율 6 |

이들 모델은 공통적으로 음식의 양이 많아질수록 과소평가(Underestimation)하는 경향이 있으며, 이를 보정하기 위해 사용자가 사진과 함께 음식의 명칭이나 재료, 대략적인 용량을 추가 정보로 입력할 수 있는 인터페이스가 반드시 수반되어야 한다.6 AI는 사용자가 제공한 텍스트 힌트와 이미지의 시각적 특징(그릇 크기, 주변 사물과의 비율 등)을 결합하여 분석 결과의 신뢰도를 보정한다.6

### **영양사 모사형 2단계 프롬프트 엔지니어링 (Two-Step Prompting)**

단순히 "이 사진의 칼로리를 알려줘"라는 단일 프롬프트보다, 전문 영양사의 사고 과정을 모사한 2단계 분석 프롬프트가 훨씬 높은 정확도를 보장한다.12

1. **구성 요소 해체(Deconstruction):** 첫 번째 단계에서 LLM은 이미지 내의 각 음식 항목을 식별하고, 주요 재료와 조리법(튀기기, 굽기 등), 그리고 시각적 참조물을 활용한 예상 중량을 리스트업한다.12  
2. **영양 수치 산출(Calculation):** 두 번째 단계에서는 해체된 리스트를 바탕으로 USDA나 한국 식품영양성분 DB와 같은 신뢰할 수 있는 소스를 참조하여 최종 칼로리와 단백질, 페닐알라닌 함량을 산출한다.11

이러한 방식은 모델이 이미지에서 바로 수치를 찍어 맞추는 방식이 아니라, 논리적 추론 과정을 거치도록 유도함으로써 오차를 줄이고 사용자에게 분석 근거를 명확히 제시할 수 있게 한다.12

## **하이브리드 기술 스택: Next.js와 Capacitor를 활용한 플랫폼 전략**

사용자가 요구한 "웹 서비스 우선, 이후 앱 출시" 전략을 실현하기 위해 가장 효율적인 기술 스택은 Next.js와 Capacitor의 조합이다. Next.js는 강력한 서버 사이드 렌더링(SSR)과 검색 엔진 최적화(SEO)를 제공하며, Capacitor는 작성된 웹 코드를 네이티브 앱(iOS, Android)으로 변환해주는 브릿지 역할을 수행한다.13

### **웹-앱 통합 아키텍처 구축**

Next.js로 개발된 반응형 웹 사이트는 브라우저를 통해 접근하는 일반 사용자에게 최적의 레이아웃을 제공한다. 이후 앱스토어 출시 단계에서는 Capacitor를 사용하여 동일한 코드베이스를 기반으로 네이티브 기능을 추가하게 된다.15

* **반응형 레이아웃 및 UI:** Tailwind CSS와 Konsta UI를 결합하여 웹에서는 넓은 대시보드를, 모바일에서는 iOS 및 Android 네이티브 스타일의 컴포넌트를 제공할 수 있다.13  
* **네이티브 기능 확장:** Capacitor 플러그인을 통해 스마트폰의 카메라 API에 직접 접근하여 식단 사진을 촬영하고, Firebase Cloud Messaging(FCM)을 연동하여 푸시 알림 기능을 구현할 수 있다.16  
* **정적 내보내기(Static Export)의 중요성:** Capacitor는 웹 자산을 네이티브 컨테이너에 포함시켜야 하므로, Next.js 설정에서 output: 'export'를 활성화해야 한다.13 이는 서버 사이드 로직 대신 클라이언트 사이드 데이터 페칭(Client-side Data Fetching) 위주로 설계를 전환해야 함을 의미한다.19

### **하이브리드 앱의 성능 및 배포 관리**

| 플랫폼 유형 | 기술적 이점 | 고려 사항 |
| :---- | :---- | :---- |
| **반응형 웹 (Next.js)** | 빠른 초기 개발 속도, 쉬운 유지보수, 광범위한 접근성 | 네이티브 하드웨어 접근 제한 (푸시 알림, 고성능 카메라 연동 등) |
| **PWA (Progressive Web App)** | 설치 없이 홈 화면 추가 가능, 오프라인 지원 | iOS에서의 제한적인 푸시 알림 기능 19 |
| **하이브리드 앱 (Capacitor)** | 단일 코드베이스로 iOS/Android 스토어 진입 가능 14 | 스토어 심사 과정 필요, 네이티브 라이브러리 의존성 관리 15 |

이 모델을 통해 개발팀은 하나의 코드베이스만 관리하면서 웹 서비스 운영과 동시에 앱스토어 사용자까지 확보할 수 있는 경제적이고 확장성 있는 구조를 갖추게 된다.14

## **공공 및 특수 데이터베이스 연동 가이드**

식단 관리의 정확성은 기반이 되는 영양성분 데이터의 품질에 좌우된다. 본 서비스는 대한민국 식품의약품안전처(MFDS)에서 제공하는 공공 데이터와 PKU 환자를 위한 특수 식품 DB를 유기적으로 결합해야 한다.21

### **식약처 식품영양성분 DB 오픈 API 활용**

식품안전나라 및 공공데이터포털을 통해 제공되는 식약처의 오픈 API는 국내에서 유통되는 가공식품과 외식 메뉴의 영양 정보를 가장 공신력 있게 제공한다.22

* **데이터 항목:** 에너지(kcal), 단백질(g), 지방(g), 탄수화물(g), 당류(g), 나트륨(mg) 등 주요 영양소를 포함한다.22  
* **연동 방법:** 공공데이터포털에서 인증키를 발급받아 JSON 또는 XML 형태로 데이터를 호출할 수 있으며, 자바스크립트의 fetch API를 사용하여 클라이언트 사이드에서 직접 영양 정보를 검색하는 기능을 구현할 수 있다.24  
* **프로그램 신청:** 식약처에서는 단순 데이터 제공 외에도 '식이영양 진단 프로그램'의 소스코드와 DB를 산업계에 개방하고 있으므로, 이를 신청하여 맞춤형 서비스 개발의 기반으로 활용할 수 있다.22

### **PKU 및 희귀 질환을 위한 특수 데이터 보정**

국내 공공 API는 아미노산 단위의 세부 정보(페닐알라닌 함량 등)를 제공하지 않는 경우가 많다.22 따라서 PKU 모드 사용자를 위해 다음과 같은 보완 전략이 필요하다.

* **단백질-페닐알라닌 변환 상수 활용:** 자연 식품의 경우, 총 단백질 함량에 일정 계수($1g$ 단백질 당 약 $50mg$의 페닐알라닌)를 곱하여 추정치를 계산하는 로직을 내장할 수 있다.3  
* **특수 제조 식품 DB 구축:** 매일유업 등 국내 제조사에서 공급하는 PKU 전용 분유(PKU-1, 2)나 저단백 가공식품의 상세 영양성분표를 자체 데이터베이스화하여 우선적으로 매칭시켜야 한다.2  
* **사용자 참여형 데이터 등록:** 시중에 새로 출시된 식품의 사진과 영양성분표를 사용자가 직접 업로드하면 AI가 텍스트를 인식(OCR)하여 공유 DB에 등록하는 기능을 통해 데이터 커버리지를 지속적으로 확장한다.23

## **AI 코칭 알고리즘과 행동 수정 모델**

식단 관리 서비스의 진정한 가치는 단순 기록을 넘어 사용자의 식습관을 개선하는 '코칭'에 있다. AI는 실시간 피드백 루프를 통해 사용자가 설정한 목표(예: 주간 단백질 제한량)를 달성할 수 있도록 돕는다.25

### **행동 과학 기반의 피드백 루프**

AI 코칭 시스템은 '신호(Cue) \- 루틴(Routine) \- 보상(Reward)'이라는 습관 형성 프레임워크를 기반으로 설계된다.27

* **신호 식별:** 사용자의 활동 데이터와 과거 기록을 분석하여 식사 시간이 지연되거나 고단백 음식을 섭취할 가능성이 높은 상황을 예측하고 미리 알림을 보낸다.25  
* **루틴 최적화:** 사용자가 복잡한 기록을 귀찮아하는 패턴이 감지되면 "사진 한 장만 찍어주세요, 나머지는 제가 하겠습니다"와 같은 메시지로 기록의 난이도를 낮춰준다.27  
* **동적 보상 및 가이드:** 목표를 잘 준수하고 있을 때는 긍정적인 강화 메시지를 보내고, 허용량을 초과했을 때는 "남은 주간 동안 단백질 섭취를 조절할 수 있는 3가지 저단백 레시피를 추천해 드릴까요?"와 같은 건설적인 대안을 제시한다.26

### **의료적 조언과 웰니스 경계 준수 가이드라인**

식단 관리 앱이 제공하는 조언이 의료 행위로 간주되어 법적 문제를 일으키지 않도록 주의해야 한다. 2024년 개정된 식약처 가이드라인에 따르면, 질병의 진단이나 치료를 목적으로 하는 소프트웨어는 의료기기로 분류되지만, 건강한 생활 습관을 장려하거나 일상적인 건강 관리를 돕는 앱은 '비의료용 웰니스 제품'으로 분류된다.29

* **권장 문구 표시:** "본 서비스는 의료기기가 아니며, 질병의 유무를 판단하거나 치료할 수 없습니다. 중요한 의학적 결정은 반드시 의사와 상의하십시오"라는 주의 문구를 서비스 내에 명시해야 한다.29  
* **기능적 제한:** AI가 직접적인 약물 처방을 권유하거나 질병의 진단명을 확정하는 등의 발언을 하지 않도록 프롬프트 가드레일을 설정해야 한다.29 대신 "사용자가 입력한 목표치에 근거한 영양 균형 정보"임을 강조하는 방식이 적절하다.

## **개인정보 보호 및 민감 정보 보안 아키텍처**

질환 정보(PKU 등)는 대한민국 개인정보보호법상 '민감 정보'로 분류되어 일반 개인정보보다 훨씬 엄격한 관리 수준이 요구된다.32

### **국내 법규 준수를 위한 보안 조치**

사용자의 질환 정보와 식단 기록을 안전하게 보호하기 위해 기술적, 관리적, 물리적 보호 조치를 병행해야 한다.34

* **암호화 통신 및 저장:** 고유식별정보(주민등록번호 등은 수집 자제)와 건강 상태 정보는 저장 시 AES-256 이상의 강력한 알고리즘으로 암호화해야 하며, 네트워크 전송 시에는 반드시 HTTPS/TLS 구간 암호화를 적용해야 한다.36  
* **접속 기록 보관:** 민감 정보를 처리하는 시스템의 경우, 접속 기록(로그)을 최소 2년 이상 안전하게 보관하고 정기적으로 점검해야 한다.34  
* **별도 동의 절차:** 회원가입 시 일반 약관 외에 '민감 정보 수집 및 이용'에 대한 항목을 별도로 구성하여 사용자로부터 명시적인 동의를 받아야 한다.33

### **모바일 앱 환경에서의 투명성 확보**

개인정보보호위원회의 최신 지침에 따라 모바일 앱 내에서의 개인정보 처리 방침 공개 방식도 개선되어야 한다.33

* **접근성 강화:** 설정 화면, 회원가입 화면 등 사용자가 쉽게 찾을 수 있는 위치에 처리 방침을 상시 공개해야 한다.33  
* **자동 수집 거부 권리:** 쿠키나 행태 정보 수집에 대해 사용자가 쉽게 거부할 수 있는 설정 메뉴(예: 맞춤형 광고 거부 설정)를 제공해야 한다.33  
* **아동 정보 보호:** 만 14세 미만 아동이 서비스를 이용할 경우 법정 대리인의 동의 여부를 확인하는 절차가 필수적이다.34

## **결론 및 향후 발전 방향**

본 연구에서 제안한 식단 관리 웹 서비스는 멀티모달 LLM의 비전 분석 능력을 활용해 사용자의 기록 편의성을 극대화하는 동시에, PKU와 같은 특수 질환자를 위한 전용 모드를 제공함으로써 시장의 니치 마켓(Niche Market)과 매스 마켓(Mass Market)을 동시에 공략할 수 있는 강력한 잠재력을 가진다. Next.js와 Capacitor 기반의 하이브리드 전략은 초기 개발 비용을 최소화하면서도 향후 모바일 앱 시장으로의 유연한 확장을 보장한다.13

향후 서비스는 단순히 섭취량을 기록하는 단계를 넘어, 연속 혈당 측정기(CGM)나 스마트워치와 같은 웨어러블 기기와의 데이터 연동을 통해 생체 반응을 실시간으로 분석하는 통합 헬스케어 플랫폼으로 진화해야 한다.25 또한, 한국형 식품 데이터의 지속적인 정밀화와 생성형 AI의 개인화 코칭 알고리즘 고도화를 통해, 모든 사용자가 자신만의 인공지능 영양사를 주머니 속에 소유하는 시대를 열 수 있을 것으로 기대된다. 이 과정에서 개인정보 보호법 준수와 의료기기 분류 경계에 대한 지속적인 모니터링은 서비스의 지속 가능성을 담보하는 필수 과제가 될 것이다.29

#### **참고 자료**

1. PKU Diet \- Phenylketonuria \- Apps on Google Play, 1월 17, 2026에 액세스, [https://play.google.com/store/apps/details?id=app.pkudiet](https://play.google.com/store/apps/details?id=app.pkudiet)  
2. 페닐케톤뇨증, PKU | 식사요법 | 의료정보 \- 서울아산병원, 1월 17, 2026에 액세스, [https://www.amc.seoul.kr/asan/healthinfo/mealtherapy/mealTherapyDetail.do?mtId=110](https://www.amc.seoul.kr/asan/healthinfo/mealtherapy/mealTherapyDetail.do?mtId=110)  
3. 유전성 대사질환의 식사요법 \- 대한영양사협회, 1월 17, 2026에 액세스, [https://www.dietitian.or.kr/board/file/64/38382867520110215092148](https://www.dietitian.or.kr/board/file/64/38382867520110215092148)  
4. PKU Diet • Phenylketonuria \- App Store \- Apple, 1월 17, 2026에 액세스, [https://apps.apple.com/ru/app/pku-diet-phenylketonuria/id1534022932?l=en](https://apps.apple.com/ru/app/pku-diet-phenylketonuria/id1534022932?l=en)  
5. AI-Powered PKU Diet Tracking App \- Cycle Vita, 1월 17, 2026에 액세스, [https://cyclevita.life/cycle-vita-pku/](https://cyclevita.life/cycle-vita-pku/)  
6. Performance evaluation of Three Large Language Models for Nutritional Content Estimation from Food Images \- ResearchGate, 1월 17, 2026에 액세스, [https://www.researchgate.net/publication/395491050\_Performance\_evaluation\_of\_Three\_Large\_Language\_Models\_for\_Nutritional\_Content\_Estimation\_from\_Food\_Images](https://www.researchgate.net/publication/395491050_Performance_evaluation_of_Three_Large_Language_Models_for_Nutritional_Content_Estimation_from_Food_Images)  
7. Claude vs. GPT-4.5 vs. Gemini: A Comprehensive Comparison \- Evolution AI, 1월 17, 2026에 액세스, [https://www.evolution.ai/post/claude-vs-gpt-4o-vs-gemini](https://www.evolution.ai/post/claude-vs-gpt-4o-vs-gemini)  
8. GPT 4o vs Claude 3.5 vs Gemini 2.0 \- Which LLM to Use When \- Analytics Vidhya, 1월 17, 2026에 액세스, [https://www.analyticsvidhya.com/blog/2025/01/gpt-4o-claude-3-5-gemini-2-0-which-llm-to-use-and-when/](https://www.analyticsvidhya.com/blog/2025/01/gpt-4o-claude-3-5-gemini-2-0-which-llm-to-use-and-when/)  
9. Claude 3.5 Sonnet vs GPT 4o: Model Comparison 2025 \- Galileo AI, 1월 17, 2026에 액세스, [https://galileo.ai/blog/claude-3-5-sonnet-vs-gpt-4o-enterprise-ai-model-comparison](https://galileo.ai/blog/claude-3-5-sonnet-vs-gpt-4o-enterprise-ai-model-comparison)  
10. Comparison Analysis: Claude 3.5 Sonnet vs GPT-4o \- Vellum AI, 1월 17, 2026에 액세스, [https://www.vellum.ai/blog/claude-3-5-sonnet-vs-gpt4o](https://www.vellum.ai/blog/claude-3-5-sonnet-vs-gpt4o)  
11. NutriGen: Personalized Meal Plan Generator Leveraging Large Language Models to Enhance Dietary and Nutritional Adherence \- arXiv, 1월 17, 2026에 액세스, [https://arxiv.org/html/2502.20601v1](https://arxiv.org/html/2502.20601v1)  
12. Decomposing Food Images for Better Nutrition Analysis: A Nutritionist-Inspired Two-Step Multimodal LLM Approach, 1월 17, 2026에 액세스, [https://openaccess.thecvf.com/content/CVPR2025W/MTF/papers/Khlaisamniang\_Decomposing\_Food\_Images\_for\_Better\_Nutrition\_Analysis\_A\_Nutritionist-Inspired\_Two-Step\_CVPRW\_2025\_paper.pdf](https://openaccess.thecvf.com/content/CVPR2025W/MTF/papers/Khlaisamniang_Decomposing_Food_Images_for_Better_Nutrition_Analysis_A_Nutritionist-Inspired_Two-Step_CVPRW_2025_paper.pdf)  
13. Build Native Apps with Next.js 15 \+ Capacitor (2025) \- Capgo, 1월 17, 2026에 액세스, [https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/)  
14. Build a Next.js Capacitor Mobile App \- NextNative, 1월 17, 2026에 액세스, [https://nextnative.dev/blog/capacitor-mobile-app](https://nextnative.dev/blog/capacitor-mobile-app)  
15. Next.js \+ Capacitor: One Codebase for Web and Mobile Apps \- Muhammad Selim, 1월 17, 2026에 액세스, [https://muhammadselim.pages.dev/blog/nextjscapacitor-one-codebase-for-web-and-mobile-apps/](https://muhammadselim.pages.dev/blog/nextjscapacitor-one-codebase-for-web-and-mobile-apps/)  
16. Your Guide to Capacitor Push Notifications \- NextNative, 1월 17, 2026에 액세스, [https://nextnative.dev/blog/capacitor-push-notifications](https://nextnative.dev/blog/capacitor-push-notifications)  
17. Build Your Android & iOS Mobile App in 2025: A Complete guide for beginner | Instillsoft, 1월 17, 2026에 액세스, [https://instillsoft.com/blog/beginner-guide-ionic-capacitor-2025](https://instillsoft.com/blog/beginner-guide-ionic-capacitor-2025)  
18. Build a Next.js Mobile App from Scratch with Capacitor 8 \- Capgo, 1월 17, 2026에 액세스, [https://capgo.app/blog/nextjs-mobile-app-capacitor-from-scratch/](https://capgo.app/blog/nextjs-mobile-app-capacitor-from-scratch/)  
19. Turning Next.js project into native app (Capacitor, PWA builder, Cordova) : r/nextjs \- Reddit, 1월 17, 2026에 액세스, [https://www.reddit.com/r/nextjs/comments/1fh8vw4/turning\_nextjs\_project\_into\_native\_app\_capacitor/](https://www.reddit.com/r/nextjs/comments/1fh8vw4/turning_nextjs_project_into_native_app_capacitor/)  
20. To Convert Existing Next JS web app into mobile app using (Capacitor) | by Tharun Goud, 1월 17, 2026에 액세스, [https://medium.com/@tharungoud\_91948/to-convert-existing-next-js-web-app-into-mobile-app-using-capacitor-1466ac31e7c2](https://medium.com/@tharungoud_91948/to-convert-existing-next-js-web-app-into-mobile-app-using-capacitor-1466ac31e7c2)  
21. 식품의약품안전처\_식품영양성분DB정보 \- 공공데이터포털, 1월 17, 2026에 액세스, [https://www.data.go.kr/data/15127578/openapi.do](https://www.data.go.kr/data/15127578/openapi.do)  
22. 공공데이터(OPEN API) \- 식품영양성분 데이터베이스 \- 식품안전나라, 1월 17, 2026에 액세스, [https://various.foodsafetykorea.go.kr/nutrient/industry/openApi/info.do](https://various.foodsafetykorea.go.kr/nutrient/industry/openApi/info.do)  
23. 식품의약품안전처 식품영양성분 데이터베이스 \- 식품안전나라, 1월 17, 2026에 액세스, [https://various.foodsafetykorea.go.kr/nutrient/](https://various.foodsafetykorea.go.kr/nutrient/)  
24. \[OpenAPI : Java\] \- 공공데이터포털 : 식품영양성분DB OPEN API \- u:SZero', 1월 17, 2026에 액세스, [https://u-szero24.tistory.com/59](https://u-szero24.tistory.com/59)  
25. AI Feedback Loops for Habit Tracking \- Healify Blog, 1월 17, 2026에 액세스, [https://www.healify.ai/blog/ai-feedback-loops-habit-tracking](https://www.healify.ai/blog/ai-feedback-loops-habit-tracking)  
26. AI Nutrition Coaches: Are They Legit or Just Another Wellness Trend? \- FinancialContent, 1월 17, 2026에 액세스, [https://markets.financialcontent.com/wral/article/pulsebulletin-2025-12-7-ai-nutrition-coaches-are-they-legit-or-just-another-wellness-trend](https://markets.financialcontent.com/wral/article/pulsebulletin-2025-12-7-ai-nutrition-coaches-are-they-legit-or-just-another-wellness-trend)  
27. How AI Adjusts Habits with Feedback Loops \- Healify Blog, 1월 17, 2026에 액세스, [https://www.healify.ai/blog/how-ai-adjusts-habits-with-feedback-loops](https://www.healify.ai/blog/how-ai-adjusts-habits-with-feedback-loops)  
28. Artificial Intelligence in Nutrition and Dietetics: A Comprehensive Review of Current Research \- PMC \- PubMed Central, 1월 17, 2026에 액세스, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12563881/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12563881/)  
29. 의료기기와 개인용 건강관리(웰니스)제품 판단기준, 1월 17, 2026에 액세스, [https://www.geumcheon.go.kr/health/downloadBbsFileStr.do?atchmnflStr=zTMhT8hz7py7kQrX1lqyHQ%3D%3D](https://www.geumcheon.go.kr/health/downloadBbsFileStr.do?atchmnflStr=zTMhT8hz7py7kQrX1lqyHQ%3D%3D)  
30. (의료기기)「의료기기와 개인용 건강관리(웰니스)제품 판단기준(지침)」마련 알림, 1월 17, 2026에 액세스, [https://www.mfds.go.kr/brd/m\_861/view.do?seq=20156\&srchFr=\&srchTo=\&srchWord=\&srchTp=\&itm\_seq\_1=0\&itm\_seq\_2=0\&multi\_itm\_seq=0\&company\_cd=\&company\_nm=\&page=6](https://www.mfds.go.kr/brd/m_861/view.do?seq=20156&srchFr&srchTo&srchWord&srchTp&itm_seq_1=0&itm_seq_2=0&multi_itm_seq=0&company_cd&company_nm&page=6)  
31. 웰니스 제품, 의료기기 아닌 공산품…허가·신고 불필요 \- 메디칼타임즈, 1월 17, 2026에 액세스, [https://www.medicaltimes.com/Mobile/News/NewsView.html?ID=1098191](https://www.medicaltimes.com/Mobile/News/NewsView.html?ID=1098191)  
32. 개인정보처리방침 \- 식단의발견, 1월 17, 2026에 액세스, [https://www.food-discovery.com/privacy](https://www.food-discovery.com/privacy)  
33. 개인정보보호 – 2025년 개인정보 처리방침 작성지침(가이드라인) 최신 개정본, 주요 내용은?, 1월 17, 2026에 액세스, [https://cheongchul.com/blog/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8-2025%EB%85%84-%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4-%EC%B2%98%EB%A6%AC%EB%B0%A9%EC%B9%A8-%EC%9E%91%EC%84%B1%EC%A7%80%EC%B9%A8(%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8)-%EC%B5%9C%EC%8B%A0-%EA%B0%9C%EC%A0%95%EB%B3%B8-%EC%A3%BC%EC%9A%94-%EB%82%B4%EC%9A%A9%EC%9D%80](https://cheongchul.com/blog/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8-2025%EB%85%84-%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4-%EC%B2%98%EB%A6%AC%EB%B0%A9%EC%B9%A8-%EC%9E%91%EC%84%B1%EC%A7%80%EC%B9%A8\(%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8\)-%EC%B5%9C%EC%8B%A0-%EA%B0%9C%EC%A0%95%EB%B3%B8-%EC%A3%BC%EC%9A%94-%EB%82%B4%EC%9A%A9%EC%9D%80)  
34. 2025\. 2\. 17\. \~ 2025\. 6\. 11\. 적용지침 | 행정안전부, 1월 17, 2026에 액세스, [https://mois.go.kr/frt/sub/popup/personalInfo25\_popup/screen.do](https://mois.go.kr/frt/sub/popup/personalInfo25_popup/screen.do)  
35. \[가이드라인\] 개인정보의 안전성 확보조치 기준 안내서(2024.10.) \- CELA, 1월 17, 2026에 액세스, [https://www.cela.kr/4/?bmode=view\&idx=124662448](https://www.cela.kr/4/?bmode=view&idx=124662448)  
36. 개인정보의 안전성 확보조치 기준 안내서, 1월 17, 2026에 액세스, [https://business.cch.com/CybersecurityPrivacy/KoreanGuidetotheStandardsforEnsuringtheSafetyofPersonalInformationOctober2024.pdf](https://business.cch.com/CybersecurityPrivacy/KoreanGuidetotheStandardsforEnsuringtheSafetyofPersonalInformationOctober2024.pdf)  
37. 행정규칙 \> 개인정보의 안전성 확보조치 기준 \- 국가법령정보센터, 1월 17, 2026에 액세스, [https://www.law.go.kr/LSW//admRulInfoP.do?admRulSeq=2100000265956\&chrClsCd=010201](https://www.law.go.kr/LSW//admRulInfoP.do?admRulSeq=2100000265956&chrClsCd=010201)  
38. 개인정보 처리 통합 안내서(2025.7.), 1월 17, 2026에 액세스, [https://law.ne.kr/entry/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4-%EC%B2%98%EB%A6%AC-%ED%86%B5%ED%95%A9-%EC%95%88%EB%82%B4%EC%84%9C20257](https://law.ne.kr/entry/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4-%EC%B2%98%EB%A6%AC-%ED%86%B5%ED%95%A9-%EC%95%88%EB%82%B4%EC%84%9C20257)  
39. 개인정보의 안전성 확보조치 기준 안내서(2024.10) \- 안내서 상세 | 개인정보 포털, 1월 17, 2026에 액세스, [https://www.privacy.go.kr/front/bbs/bbsView.do?bbsNo=BBSMSTR\_000000000049\&bbscttNo=20767](https://www.privacy.go.kr/front/bbs/bbsView.do?bbsNo=BBSMSTR_000000000049&bbscttNo=20767)