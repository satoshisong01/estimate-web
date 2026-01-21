import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// 1. 수정하기 (PUT)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // Next.js 15: await 필수
    const body = await req.json();

    const {
      title,
      customerName,
      customerRef,
      quotationDate,
      items,
      totalAmount,
      vat,
      grandTotal,
      expiryDate,
      conditions,
      // ▼ 추가된 이미지 필드들
      imageLayout,
      imageComponent,
      imageMaintenance,
      imageSchedule,
    } = body;

    const memoData = JSON.stringify({ expiryDate, conditions });

    // 1-1. 헤더(표지) 업데이트
    // 이미지 컬럼($10~$13) 추가됨
    await executeQuery(
      `UPDATE est_quotations 
       SET title=$1, customer_name=$2, customer_ref=$3, quotation_date=$4, 
           total_amount=$5, vat=$6, grand_total=$7, memo=$8,
           image_layout=$10, image_component=$11, image_maintenance=$12, image_schedule=$13,
           updated_at=NOW()
       WHERE id=$9`,
      [
        title,
        customerName,
        customerRef,
        quotationDate,
        totalAmount,
        vat,
        grandTotal,
        memoData,
        id, // $9: WHERE id = $9
        imageLayout, // $10
        imageComponent, // $11
        imageMaintenance, // $12
        imageSchedule, // $13
      ],
    );

    // 1-2. 기존 품목 삭제 후 재등록 (가장 안전한 수정 방식)
    await executeQuery(
      'DELETE FROM est_quotation_items WHERE quotation_id = $1',
      [id],
    );

    // 1-3. 품목 다시 저장 (section 구분 포함)
    const itemInsertPromises = items.map((item: any, index: number) => {
      return executeQuery(
        `INSERT INTO est_quotation_items 
        (quotation_id, category, name, spec, unit, quantity, unit_price, supply_price, remarks, sort_order, section)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          item.category || '',
          item.name,
          item.spec,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
          item.remarks,
          index,
          item.section || 'main', // section 값이 없으면 'main'으로 저장
        ],
      );
    });

    await Promise.all(itemInsertPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('수정 실패:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// 2. 삭제하기 (DELETE)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // Next.js 15: await 필수

    // CASCADE 설정이 되어있다면 자식 테이블(items)도 자동 삭제됨
    // 만약 CASCADE가 없다면 여기서 items를 먼저 지워야 하지만, 보통은 quotation만 지우면 됨
    await executeQuery('DELETE FROM est_quotations WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
