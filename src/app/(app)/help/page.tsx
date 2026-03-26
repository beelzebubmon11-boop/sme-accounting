import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">사용자 매뉴얼</h2><p className="text-muted-foreground">SME 회계 프로그램 사용법</p></div>

      <Tabs defaultValue="start">
        <TabsList className="flex-wrap">
          <TabsTrigger value="start">시작하기</TabsTrigger>
          <TabsTrigger value="voucher">전표 입력</TabsTrigger>
          <TabsTrigger value="bank">통장관리</TabsTrigger>
          <TabsTrigger value="sales">매출/매입</TabsTrigger>
          <TabsTrigger value="reports">장부/원장</TabsTrigger>
          <TabsTrigger value="vat">부가세</TabsTrigger>
          <TabsTrigger value="assets">고정자산</TabsTrigger>
          <TabsTrigger value="closing">결산</TabsTrigger>
          <TabsTrigger value="export">위하고</TabsTrigger>
        </TabsList>

        <TabsContent value="start"><Card><CardHeader><CardTitle>1. 시작하기</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <h4>1-1. 회사 정보 설정</h4>
          <p><strong>설정 → 회사 정보</strong>에서 회사명, 사업자번호, 대표자명을 입력합니다. 이 정보는 재무제표와 위하고 내보내기에 사용됩니다.</p>
          <h4>1-2. 계정과목 확인</h4>
          <p><strong>설정 → 계정과목 관리</strong>에서 기본 계정과목을 확인합니다. 더존 표준 계정과목이 미리 설정되어 있습니다.</p>
          <h4>1-3. 거래처 등록</h4>
          <p><strong>거래처</strong> 메뉴에서 매출/매입 거래처를 등록합니다. 사업자번호를 입력하면 세금계산서 관리에 활용됩니다.</p>
          <h4>1-4. 계좌 등록</h4>
          <p><strong>통장관리 → 계좌 관리</strong>에서 은행 계좌를 등록합니다. 초기 잔액을 정확히 입력하세요.</p>
        </CardContent></Card></TabsContent>

        <TabsContent value="voucher"><Card><CardHeader><CardTitle>2. 전표 입력</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <h4>2-1. 전표 유형</h4>
          <ul>
            <li><strong>입금전표</strong>: 은행 입금 시 (차변: 보통예금 / 대변: 매출 등)</li>
            <li><strong>출금전표</strong>: 은행 출금 시 (차변: 비용 등 / 대변: 보통예금)</li>
            <li><strong>대체전표</strong>: 계정 간 대체 (현금→예금 이체 등)</li>
            <li><strong>매출전표</strong>: 매출 발생 시 자동 생성</li>
            <li><strong>매입전표</strong>: 매입 발생 시 자동 생성</li>
            <li><strong>일반전표</strong>: 기타 일반 분개</li>
          </ul>
          <h4>2-2. 입력 방법</h4>
          <p>전표관리 → 전표 입력에서 전표일, 유형을 선택하고 차변/대변 라인을 입력합니다. <strong>차변 합계와 대변 합계가 반드시 일치</strong>해야 저장됩니다.</p>
          <h4>2-3. 자동 전표</h4>
          <p>매출/매입을 등록하면 전표가 자동 생성됩니다. 통장 엑셀을 업로드해도 입출금 전표가 자동 생성됩니다.</p>
        </CardContent></Card></TabsContent>

        <TabsContent value="bank"><Card><CardHeader><CardTitle>3. 통장관리</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <h4>3-1. 통장 엑셀 업로드</h4>
          <p>은행에서 다운받은 엑셀 파일을 업로드하면 자동으로 입출금 내역이 등록됩니다.</p>
          <ol>
            <li>통장관리 → 통장 엑셀 업로드 클릭</li>
            <li>대상 계좌 선택</li>
            <li>엑셀 파일 업로드</li>
            <li>컬럼 매핑 (날짜/입금/출금/잔액/적요)</li>
            <li>미리보기 확인 후 등록</li>
          </ol>
        </CardContent></Card></TabsContent>

        <TabsContent value="sales"><Card><CardHeader><CardTitle>4. 매출/매입</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <p>매출/매입을 등록하면 자동으로 전표가 생성됩니다.</p>
          <h4>매출 전표 자동 분개</h4>
          <p>차변: 외상매출금(108) / 대변: 상품매출(401) + 부가세예수금(257)</p>
          <h4>매입 전표 자동 분개</h4>
          <p>차변: 상품매입(501) + 부가세대급금(124) / 대변: 외상매입금(251)</p>
        </CardContent></Card></TabsContent>

        <TabsContent value="reports"><Card><CardHeader><CardTitle>5. 장부/원장</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <ul>
            <li><strong>합계잔액시산표</strong>: 모든 계정의 차변/대변 합계와 잔액을 한눈에 확인</li>
            <li><strong>총계정원장</strong>: 전체 계정의 월별 증감 현황</li>
            <li><strong>계정별원장</strong>: 특정 계정의 전표 내역과 잔액 추이</li>
            <li><strong>거래처원장</strong>: 특정 거래처와의 모든 거래 내역</li>
            <li><strong>현금출납장</strong>: 현금 입출금 내역</li>
          </ul>
        </CardContent></Card></TabsContent>

        <TabsContent value="vat"><Card><CardHeader><CardTitle>6. 부가세</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <p>매출/매입에 입력된 부가세를 자동으로 집계하여 부가세 신고서를 생성합니다.</p>
          <p>부가세 → 부가세 신고서에서 기간을 선택하면 매출세액, 매입세액, 납부/환급세액이 자동 계산됩니다.</p>
        </CardContent></Card></TabsContent>

        <TabsContent value="assets"><Card><CardHeader><CardTitle>7. 고정자산</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <p>고정자산을 등록하고 감가상각을 자동 계산합니다.</p>
          <ul>
            <li><strong>정액법</strong>: (취득원가 - 잔존가치) / 내용연수</li>
            <li><strong>정률법</strong>: 장부가액 × 상각률</li>
          </ul>
          <p>감가상각비는 전표로 자동 생성되어 손익계산서에 반영됩니다.</p>
        </CardContent></Card></TabsContent>

        <TabsContent value="closing"><Card><CardHeader><CardTitle>8. 결산</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <p>회계연도 말에 결산을 수행합니다.</p>
          <ol>
            <li>감가상각비 등 결산 정리 전표 입력</li>
            <li>합계잔액시산표로 차대 균형 확인</li>
            <li>재무상태표, 손익계산서 확인</li>
            <li>결산 마감 처리</li>
            <li>전기이월 (다음 연도 기초잔액 설정)</li>
          </ol>
        </CardContent></Card></TabsContent>

        <TabsContent value="export"><Card><CardHeader><CardTitle>9. 위하고 내보내기</CardTitle></CardHeader><CardContent className="prose prose-sm max-w-none space-y-4">
          <p>더존 위하고에 업로드할 수 있는 엑셀 파일을 생성합니다.</p>
          <ul>
            <li><strong>통장 서식</strong>: 거래일자, 입금, 출금, 잔액, 적요</li>
            <li><strong>일반전표</strong>: 차변/대변 계정코드, 금액, 적요</li>
            <li><strong>매입매출전표</strong>: 공급가액, 세액, 거래처, 품목</li>
          </ul>
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
