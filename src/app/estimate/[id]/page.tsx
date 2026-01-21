import { executeQuery } from '@/lib/db';
import EstimateEditor from '@/components/EstimateEditor';

// params 타입 변경: Promise<{ id: string }>
export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ★ 중요: 여기서 먼저 await를 해서 id를 꺼내야 합니다!
  const { id } = await params;

  // 1. 견적서 헤더 조회
  const headerRes: any = await executeQuery(
    'SELECT * FROM est_quotations WHERE id = $1',
    [id], // params.id 대신 id 사용
  );

  if (headerRes.length === 0) {
    return <div className="p-8 text-center">존재하지 않는 견적서입니다.</div>;
  }

  // 2. 견적서 품목 조회
  const itemsRes: any = await executeQuery(
    'SELECT * FROM est_quotation_items WHERE quotation_id = $1 ORDER BY sort_order ASC',
    [id], // params.id 대신 id 사용
  );

  // 3. 데이터 합치기
  const fullData = {
    ...headerRes[0],
    items: itemsRes.map((item: any) => ({
      category: item.category,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      remarks: item.remarks,
    })),
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <EstimateEditor initialData={fullData} />
    </div>
  );
}
