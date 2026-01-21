import Link from 'next/link';
import { executeQuery } from '@/lib/db';
import { getServerSession } from 'next-auth';
import DeleteQuoteButton from '@/components/DeleteQuoteButton';

// 숫자를 천 단위 콤마 형식으로 변환 (예: 56,000,000)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(amount);
};

export default async function Home() {
  const session = await getServerSession();

  // 비로그인 상태 처리
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-xl font-bold">로그인이 필요한 서비스입니다.</h2>
        <Link
          href="/api/auth/signin"
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  // DB에서 견적서 목록 조회 (최신순 정렬)
  const quotations: any = await executeQuery(
    'SELECT * FROM est_quotations ORDER BY created_at DESC',
  );

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">견적서 관리 대장</h1>
        <Link
          href="/estimate/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors shadow-sm"
        >
          + 새 견적서 작성
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                No.
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                견적명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수신(업체명)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                견적일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                총 합계(원)
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quotations.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  작성된 견적서가 없습니다.
                </td>
              </tr>
            ) : (
              quotations.map((q: any) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {q.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link
                      href={`/estimate/${q.id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {q.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(q.quotation_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                    {formatCurrency(Number(q.grand_total))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {/* 클라이언트 컴포넌트인 삭제 버튼 사용 */}
                    <DeleteQuoteButton id={q.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
