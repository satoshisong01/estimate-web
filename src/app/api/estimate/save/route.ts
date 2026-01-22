import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
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
      // image 필드들
      imageLayout,
      imageComponent,
      imageMaintenance,
      imageSchedule,
      // ★ 핵심: 프론트엔드에서 완성해서 보내준 memo 문자열을 그대로 받습니다.
      memo,
    } = body;

    // (기존의 memoData 생성 로직 삭제하고, 받은 memo를 바로 사용)

    const insertResult = await executeQuery(
      `INSERT INTO est_quotations (
        title, customer_name, customer_ref, quotation_date, 
        total_amount, vat, grand_total, memo,
        image_layout, image_component, image_maintenance, image_schedule,
        editor_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING id`,
      [
        title,
        customerName,
        customerRef,
        quotationDate,
        totalAmount,
        vat,
        grandTotal,
        memo, // $8: 받은 memo 그대로 저장
        imageLayout,
        imageComponent,
        imageMaintenance,
        imageSchedule,
        userId,
      ],
    );

    const newId = insertResult[0].id;

    if (items && items.length > 0) {
      const itemInsertPromises = items.map((item: any, index: number) => {
        return executeQuery(
          `INSERT INTO est_quotation_items 
          (quotation_id, category, name, spec, unit, quantity, unit_price, supply_price, remarks, sort_order, section)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newId,
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

    return NextResponse.json({ success: true, id: newId });
  } catch (error) {
    console.error('저장 실패:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
