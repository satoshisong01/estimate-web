import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// 1. 수정하기 (PUT)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userResult = await executeQuery(
      'SELECT id FROM est_users WHERE email = $1',
      [session.user.email],
    );
    const userId = userResult[0]?.id;

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
      imageLayout,
      imageComponent,
      imageMaintenance,
      imageSchedule,
      // ★ 여기서도 memo를 그대로 받음
      memo,
    } = body;

    // 업데이트 쿼리 (memo=$8 사용)
    await executeQuery(
      `UPDATE est_quotations 
       SET title=$1, customer_name=$2, customer_ref=$3, quotation_date=$4, 
           total_amount=$5, vat=$6, grand_total=$7, memo=$8,
           image_layout=$10, image_component=$11, image_maintenance=$12, image_schedule=$13,
           editor_id=$14, updated_at=NOW()
       WHERE id=$9`,
      [
        title,
        customerName,
        customerRef,
        quotationDate,
        totalAmount,
        vat,
        grandTotal,
        memo, // $8: memo 업데이트
        id, // $9
        imageLayout,
        imageComponent,
        imageMaintenance,
        imageSchedule,
        userId, // $14
      ],
    );

    // 기존 품목 삭제 후 재등록
    await executeQuery(
      'DELETE FROM est_quotation_items WHERE quotation_id = $1',
      [id],
    );

    if (items && items.length > 0) {
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
            item.section || 'main',
          ],
        );
      });
      await Promise.all(itemInsertPromises);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('수정 실패:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

// 2. 삭제하기 (DELETE) - 기존 유지
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await executeQuery('DELETE FROM est_quotations WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
