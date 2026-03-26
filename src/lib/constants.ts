// 은행 목록
export const BANKS = [
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "기업은행",
  "농협은행",
  "수협은행",
  "카카오뱅크",
  "토스뱅크",
  "케이뱅크",
  "SC제일은행",
  "씨티은행",
  "대구은행",
  "부산은행",
  "광주은행",
  "제주은행",
  "전북은행",
  "경남은행",
  "새마을금고",
  "신협",
  "우체국",
  "기타",
] as const;

// 계좌 유형
export const ACCOUNT_TYPES = [
  { value: "checking", label: "보통예금" },
  { value: "savings", label: "저축예금" },
  { value: "deposit", label: "정기예금" },
  { value: "other", label: "기타" },
] as const;

// 거래 유형
export const TRANSACTION_TYPES = [
  { value: "deposit", label: "입금" },
  { value: "withdrawal", label: "출금" },
] as const;

// 카테고리 유형
export const CATEGORY_TYPES = [
  { value: "income", label: "수입" },
  { value: "expense", label: "지출" },
  { value: "transfer", label: "이체" },
] as const;

// 매출/매입 상태
export const PAYMENT_STATUS = [
  { value: "unpaid", label: "미수금", color: "destructive" },
  { value: "partial", label: "부분수금", color: "secondary" },
  { value: "paid", label: "수금완료", color: "default" },
] as const;

// 기본 카테고리 시드 데이터
export const DEFAULT_CATEGORIES = [
  { name: "매출입금", type: "income", account_code: "401", account_name: "상품매출" },
  { name: "용역매출", type: "income", account_code: "404", account_name: "용역매출" },
  { name: "이자수익", type: "income", account_code: "901", account_name: "이자수익" },
  { name: "상품매입", type: "expense", account_code: "501", account_name: "상품매입" },
  { name: "급여", type: "expense", account_code: "801", account_name: "급여" },
  { name: "복리후생비", type: "expense", account_code: "805", account_name: "복리후생비" },
  { name: "여비교통비", type: "expense", account_code: "811", account_name: "여비교통비" },
  { name: "통신비", type: "expense", account_code: "812", account_name: "통신비" },
  { name: "접대비", type: "expense", account_code: "818", account_name: "접대비" },
  { name: "임차료", type: "expense", account_code: "826", account_name: "임차료" },
  { name: "소모품비", type: "expense", account_code: "831", account_name: "소모품비" },
  { name: "세금과공과", type: "expense", account_code: "830", account_name: "세금과공과" },
  { name: "보험료", type: "expense", account_code: "807", account_name: "보험료" },
  { name: "계좌이체", type: "transfer", account_code: "103", account_name: "보통예금" },
] as const;

// 표준 계정과목 (더존 위하고 호환)
export const DEFAULT_CHART_OF_ACCOUNTS = [
  // 자산
  { code: "101", name: "현금", category: "asset", sub_category: "유동자산" },
  { code: "103", name: "보통예금", category: "asset", sub_category: "유동자산" },
  { code: "104", name: "정기예금", category: "asset", sub_category: "유동자산" },
  { code: "108", name: "외상매출금", category: "asset", sub_category: "유동자산" },
  { code: "109", name: "받을어음", category: "asset", sub_category: "유동자산" },
  { code: "110", name: "미수금", category: "asset", sub_category: "유동자산" },
  { code: "120", name: "선급금", category: "asset", sub_category: "유동자산" },
  { code: "121", name: "선급비용", category: "asset", sub_category: "유동자산" },
  { code: "124", name: "부가세대급금", category: "asset", sub_category: "유동자산" },
  { code: "201", name: "건물", category: "asset", sub_category: "비유동자산" },
  { code: "202", name: "차량운반구", category: "asset", sub_category: "비유동자산" },
  { code: "203", name: "비품", category: "asset", sub_category: "비유동자산" },
  // 부채
  { code: "251", name: "외상매입금", category: "liability", sub_category: "유동부채" },
  { code: "252", name: "지급어음", category: "liability", sub_category: "유동부채" },
  { code: "253", name: "미지급금", category: "liability", sub_category: "유동부채" },
  { code: "254", name: "미지급비용", category: "liability", sub_category: "유동부채" },
  { code: "255", name: "선수금", category: "liability", sub_category: "유동부채" },
  { code: "256", name: "예수금", category: "liability", sub_category: "유동부채" },
  { code: "257", name: "부가세예수금", category: "liability", sub_category: "유동부채" },
  { code: "280", name: "장기차입금", category: "liability", sub_category: "비유동부채" },
  // 자본
  { code: "331", name: "자본금", category: "equity", sub_category: "자본금" },
  { code: "341", name: "이익잉여금", category: "equity", sub_category: "이익잉여금" },
  // 수익
  { code: "401", name: "상품매출", category: "revenue", sub_category: "매출" },
  { code: "404", name: "용역매출", category: "revenue", sub_category: "매출" },
  { code: "901", name: "이자수익", category: "revenue", sub_category: "영업외수익" },
  { code: "902", name: "잡이익", category: "revenue", sub_category: "영업외수익" },
  // 비용
  { code: "501", name: "상품매입", category: "expense", sub_category: "매출원가" },
  { code: "801", name: "급여", category: "expense", sub_category: "판매비와관리비" },
  { code: "803", name: "퇴직급여", category: "expense", sub_category: "판매비와관리비" },
  { code: "805", name: "복리후생비", category: "expense", sub_category: "판매비와관리비" },
  { code: "807", name: "보험료", category: "expense", sub_category: "판매비와관리비" },
  { code: "811", name: "여비교통비", category: "expense", sub_category: "판매비와관리비" },
  { code: "812", name: "통신비", category: "expense", sub_category: "판매비와관리비" },
  { code: "814", name: "수도광열비", category: "expense", sub_category: "판매비와관리비" },
  { code: "818", name: "접대비", category: "expense", sub_category: "판매비와관리비" },
  { code: "820", name: "감가상각비", category: "expense", sub_category: "판매비와관리비" },
  { code: "826", name: "임차료", category: "expense", sub_category: "판매비와관리비" },
  { code: "829", name: "수선비", category: "expense", sub_category: "판매비와관리비" },
  { code: "830", name: "세금과공과", category: "expense", sub_category: "판매비와관리비" },
  { code: "831", name: "소모품비", category: "expense", sub_category: "판매비와관리비" },
  { code: "832", name: "지급수수료", category: "expense", sub_category: "판매비와관리비" },
  { code: "840", name: "광고선전비", category: "expense", sub_category: "판매비와관리비" },
  { code: "845", name: "운반비", category: "expense", sub_category: "판매비와관리비" },
  { code: "951", name: "이자비용", category: "expense", sub_category: "영업외비용" },
] as const;
