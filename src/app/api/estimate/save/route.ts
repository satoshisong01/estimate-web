import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. 현재 로그인한 사용자 ID 찾기
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
      expiryDate,
      conditions,
      // 이미지 필드
      imageLayout,
      imageComponent,
      imageMaintenance,
      imageSchedule,
    } = body;

    // 2. 메모 데이터 병합 (기존 로직 유지)
    const memoData = JSON.stringify({ expiryDate, conditions });

    // 3. 견적서 메인 저장 (editor_id 추가됨!)
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
        memoData,
        imageLayout,
        imageComponent,
        imageMaintenance,
        imageSchedule,
        userId, // $13: editor_id
      ],
    );

    const newId = insertResult[0].id;

    // 4. 품목 저장 (quotation_id 사용, 기존 컬럼 모두 포함)
    if (items && items.length > 0) {
      const itemInsertPromises = items.map((item: any, index: number) => {
        return executeQuery(
          `INSERT INTO est_quotation_items 
          (quotation_id, category, name, spec, unit, quantity, unit_price, supply_price, remarks, sort_order, section)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            newId, // quotation_id
            item.category || '',
            item.name,
            item.spec,
            item.unit,
            item.quantity,
            item.unitPrice,
            item.quantity * item.unitPrice, // supply_price 계산
            item.remarks,
            index, // sort_order
            item.section || 'main', // section
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
