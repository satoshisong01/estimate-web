import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { executeQuery } from '@/lib/db';
import DeleteQuoteButton from '@/components/DeleteQuoteButton';
import CopyEstimateButton from '@/components/CopyEstimateButton';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/api/auth/signin');
  }

  // ★ 수정됨: est_quotations 테이블 사용 & editor_id로 조인
  // (컬럼명은 실제 DB에 맞춰 snake_case로 작성했습니다)
  const query = `
    SELECT 
      q.id, 
      q.title, 
      q.customer_name, 
      q.quotation_date, 
      q.grand_total, 
      q.created_at,
      u.name as editor_name
    FROM est_quotations q
    LEFT JOIN est_users u ON q.editor_id = u.id::text
    ORDER BY q.created_at DESC
  `;

  const estimates = await executeQuery(query);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">견적서 관리 대장</h1>
        <div className="flex gap-4 items-center">
          <span className="text-gray-600">
            안녕하세요, <strong>{session.user?.name}</strong>님
          </span>
          <Link
            href="/estimate/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition cursor-pointer"
          >
            + 새 견적서 작성
          </Link>
          <CopyEstimateButton
            estimates={estimates.map((est: any) => ({
              id: est.id,
              title: est.title,
              customer_name: est.customer_name,
            }))}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 uppercase font-bold">
            <tr>
              <th className="px-6 py-3 w-16 text-center">No.</th>
              <th className="px-6 py-3">견적명</th>
              <th className="px-6 py-3">수신(업체명)</th>
              <th className="px-6 py-3 w-32">견적일</th>
              <th className="px-6 py-3 text-right">총 합계(원)</th>
              <th className="px-6 py-3 text-center">최종 수정자</th>
              <th className="px-6 py-3 text-center w-32">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {estimates.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  등록된 견적서가 없습니다.
                </td>
              </tr>
            ) : (
              estimates.map((est: any, idx: number) => (
                <tr key={est.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-center text-gray-500">
                    {estimates.length - idx}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link
                      href={`/estimate/${est.id}`}
                      className="hover:underline hover:text-blue-600 block"
                    >
                      {est.title || '(제목 없음)'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {est.customer_name}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {est.quotation_date
                      ? new Date(est.quotation_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">
                    {Number(est.grand_total || 0).toLocaleString()}
                  </td>

                  {/* ▼ 수정자 이름 표시 */}
                  <td className="px-6 py-4 text-center">
                    {est.editor_name ? (
                      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                        {est.editor_name}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 flex-nowrap">
                      <Link
                        href={`/estimate/${est.id}`}
                        className="inline-block text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-50 whitespace-nowrap cursor-pointer"
                      >
                        수정/조회
                      </Link>
                      <DeleteQuoteButton id={Number(est.id)} />
                    </div>
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
