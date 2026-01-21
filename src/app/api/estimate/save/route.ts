import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '@/lib/db';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    // 1. 로그인 세션 확인
    const session = await getServerSession(authOptions);
    const body = await req.json();

    // 프론트엔드에서 보낸 모든 데이터 받기
    const {
      title,
      customerName,
      customerRef,
      quotationDate,
      expiryDate,
      conditions,
      items,
      totalAmount,
      vat,
      grandTotal,
      // ▼ 이미지 경로들
      imageLayout,
      imageComponent,
      imageMaintenance,
      imageSchedule,
    } = body;

    // 2. 작성자(user_id) 찾기
    const userEmail = session?.user?.email;
    let userId = null;

    if (userEmail) {
      const userRes: any = await executeQuery(
        'SELECT id FROM est_users WHERE email = $1',
        [userEmail],
      );
      if (userRes.length > 0) userId = userRes[0].id;
    }

    // 3. 견적서 헤더(표지) 저장
    // image_~ 컬럼 4개 추가됨
    const memoData = JSON.stringify({ expiryDate, conditions });

    const insertHeaderQuery = `
      INSERT INTO est_quotations 
      (user_id, title, customer_name, customer_ref, quotation_date, total_amount, vat, grand_total, memo,
       image_layout, image_component, image_maintenance, image_schedule)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;

    const headerResult: any = await executeQuery(insertHeaderQuery, [
      userId,
      title,
      customerName,
      customerRef,
      quotationDate,
      totalAmount,
      vat,
      grandTotal,
      memoData,
      imageLayout, // $10
      imageComponent, // $11
      imageMaintenance, // $12
      imageSchedule, // $13
    ]);

    const newQuotationId = headerResult[0].id;

    // 4. 세부 품목(Items) 저장
    // section 컬럼($11) 추가됨: 'main'이면 표지용, 'detail'이면 세부내역서용
    const itemInsertPromises = items.map((item: any, index: number) => {
      return executeQuery(
        `INSERT INTO est_quotation_items 
        (quotation_id, category, name, spec, unit, quantity, unit_price, supply_price, remarks, sort_order, section)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newQuotationId,
          item.category || '',
          item.name,
          item.spec,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.quantity * item.unitPrice,
          item.remarks,
          index,
          item.section || 'main', // section 값이 없으면 기본적으로 'main'으로 저장
        ],
      );
    });

    await Promise.all(itemInsertPromises);

    return NextResponse.json({ success: true, id: newQuotationId });
  } catch (error) {
    console.error('견적서 저장 실패:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
