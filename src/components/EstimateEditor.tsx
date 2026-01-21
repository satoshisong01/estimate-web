'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- 타입 정의 ---
interface EstimateItem {
  section?: 'main' | 'detail';
  category: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  remarks: string;
}

interface EditorProps {
  initialData?: any;
}

interface ImageSectionProps {
  title: string;
  fieldName: string;
  imageUrl: string;
  isActive: boolean;
  isPrintChecked: boolean;
  onDelete: () => void;
  // 수정됨: 파일을 직접 받도록 변경 (드래그앤드롭 대응)
  onUpload: (file: File) => void;
}

type TabType =
  | 'cover'
  | 'detail'
  | 'layout'
  | 'component'
  | 'maintenance'
  | 'schedule';

export default function EstimateEditor({ initialData }: EditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('cover');

  const [printOptions, setPrintOptions] = useState({
    cover: true,
    detail: true,
    layout: true,
    component: true,
    maintenance: true,
    schedule: true,
  });

  const [header, setHeader] = useState({
    title: initialData?.title || '',
    customerName: initialData?.customer_name || '',
    customerRef: initialData?.customer_ref || '',
    quotationDate: initialData?.quotation_date
      ? new Date(initialData.quotation_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    expiryDate: initialData?.memo
      ? JSON.parse(initialData.memo).expiryDate
      : '견적 제출일로부터 30일',
    conditions: initialData?.memo
      ? JSON.parse(initialData.memo).conditions
      : '1. 결제조건 : 계약금 50%, 준공 후 50% (VAT 별도)\n2. 공사기간 : 계약 후 협의\n3. 특이사항 : 현장 여건에 따라 변동될 수 있음',
    imageLayout: initialData?.image_layout || '',
    imageComponent: initialData?.image_component || '',
    imageMaintenance: initialData?.image_maintenance || '',
    imageSchedule: initialData?.image_schedule || '',
  });

  const [mainItems, setMainItems] = useState<EstimateItem[]>([]);
  const [detailItems, setDetailItems] = useState<EstimateItem[]>([]);

  useEffect(() => {
    if (initialData?.items) {
      const mains = initialData.items.filter(
        (i: any) => !i.section || i.section === 'main',
      );
      const details = initialData.items.filter(
        (i: any) => i.section === 'detail',
      );
      setMainItems(
        mains.length > 0
          ? mains
          : [
              {
                section: 'main',
                category: '',
                name: '',
                spec: '',
                unit: '',
                quantity: 0,
                unitPrice: 0,
                remarks: '',
              },
            ],
      );
      setDetailItems(
        details.length > 0
          ? details
          : [
              {
                section: 'detail',
                category: '',
                name: '',
                spec: '',
                unit: '',
                quantity: 0,
                unitPrice: 0,
                remarks: '',
              },
            ],
      );
    } else {
      setMainItems([
        {
          section: 'main',
          category: '',
          name: '',
          spec: '',
          unit: '',
          quantity: 0,
          unitPrice: 0,
          remarks: '',
        },
      ]);
      setDetailItems([
        {
          section: 'detail',
          category: '',
          name: '',
          spec: '',
          unit: '',
          quantity: 0,
          unitPrice: 0,
          remarks: '',
        },
      ]);
    }
  }, [initialData]);

  const [total, setTotal] = useState(0);
  const [vat, setVat] = useState(0);

  useEffect(() => {
    const sum = mainItems.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    setTotal(sum);
    setVat(Math.floor(sum * 0.1));
  }, [mainItems]);

  const handleHeaderChange = (e: any) =>
    setHeader({ ...header, [e.target.name]: e.target.value });

  const handleItemChange = (
    isDetail: boolean,
    index: number,
    field: keyof EstimateItem,
    value: any,
  ) => {
    const targetItems = isDetail ? [...detailItems] : [...mainItems];
    const setTarget = isDetail ? setDetailItems : setMainItems;
    // @ts-ignore
    targetItems[index] = { ...targetItems[index], [field]: value };
    setTarget(targetItems);
  };

  const addItem = (isDetail: boolean) => {
    const newItem: EstimateItem = {
      section: isDetail ? 'detail' : 'main',
      category: '',
      name: '',
      spec: '',
      unit: '',
      quantity: 0,
      unitPrice: 0,
      remarks: '',
    };
    if (isDetail) setDetailItems([...detailItems, newItem]);
    else setMainItems([...mainItems, newItem]);
  };

  const removeItem = (isDetail: boolean, index: number) => {
    const targetItems = isDetail ? detailItems : mainItems;
    const setTarget = isDetail ? setDetailItems : setMainItems;
    if (targetItems.length > 1)
      setTarget(targetItems.filter((_, i) => i !== index));
  };

  // 수정됨: File 객체를 직접 받아서 업로드 처리
  const handleFileUpload = async (file: File, fieldName: string) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success)
        setHeader((prev) => ({ ...prev, [fieldName]: data.url }));
    } catch (err) {
      alert('업로드 실패');
    }
  };

  const handleSave = async () => {
    if (!header.customerName) return alert('수신(업체명)을 입력해주세요.');
    if (!header.title) return alert('공사명(건명)을 입력해주세요.');
    const allItems = [...mainItems, ...detailItems];
    const isEditMode = !!initialData?.id;
    const url = isEditMode
      ? `/api/estimate/${initialData.id}`
      : '/api/estimate/save';
    const method = isEditMode ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...header,
          items: allItems,
          totalAmount: total,
          vat,
          grandTotal: total + vat,
        }),
      });
      if (res.ok) {
        alert('저장되었습니다.');
        router.push('/');
        router.refresh();
      }
    } catch (e) {
      alert('오류 발생');
    }
  };

  const getDisplayClass = (tabName: TabType, isPrintChecked: boolean) => {
    const screenClass = activeTab === tabName ? 'block' : 'hidden';
    const printClass = isPrintChecked
      ? 'print:block print-visible'
      : 'print:hidden print-hidden';
    return `${screenClass} ${printClass}`;
  };

  const renderTable = (items: EstimateItem[], isDetail: boolean) => (
    <div className="w-full mb-4">
      <table className="w-full border-collapse border border-black text-sm print:text-xs">
        <thead className="print:bg-transparent">
          <tr>
            <th className="border border-black p-1 w-8">No</th>
            <th className="border border-black p-1">품명/구분</th>
            <th className="border border-black p-1">규격</th>
            <th className="border border-black p-1 w-12">단위</th>
            <th className="border border-black p-1 w-16">수량</th>
            <th className="border border-black p-1 w-24">단가</th>
            <th className="border border-black p-1 w-24">공급가액</th>
            <th className="border border-black p-1">비고</th>
            <th className="border border-black p-1 w-8 no-print">삭제</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-gray-400 p-1 text-center">
                {idx + 1}
              </td>
              <td className="border border-gray-400 p-0">
                <input
                  className="w-full p-1 outline-none bg-transparent"
                  value={item.name}
                  onChange={(e) =>
                    handleItemChange(isDetail, idx, 'name', e.target.value)
                  }
                />
              </td>
              <td className="border border-gray-400 p-0">
                <input
                  className="w-full p-1 outline-none bg-transparent"
                  value={item.spec}
                  onChange={(e) =>
                    handleItemChange(isDetail, idx, 'spec', e.target.value)
                  }
                />
              </td>
              <td className="border border-gray-400 p-0">
                <input
                  className="w-full p-1 outline-none text-center bg-transparent"
                  value={item.unit}
                  onChange={(e) =>
                    handleItemChange(isDetail, idx, 'unit', e.target.value)
                  }
                />
              </td>
              <td className="border border-gray-400 p-0">
                <input
                  type="number"
                  className="w-full p-1 outline-none text-right bg-transparent"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(
                      isDetail,
                      idx,
                      'quantity',
                      Number(e.target.value),
                    )
                  }
                />
              </td>
              <td className="border border-gray-400 p-0">
                <input
                  type="number"
                  className="w-full p-1 outline-none text-right bg-transparent"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleItemChange(
                      isDetail,
                      idx,
                      'unitPrice',
                      Number(e.target.value),
                    )
                  }
                />
              </td>
              <td className="border border-gray-400 p-1 text-right">
                {(item.quantity * item.unitPrice).toLocaleString()}
              </td>
              <td className="border border-gray-400 p-0">
                <input
                  className="w-full p-1 outline-none bg-transparent"
                  value={item.remarks}
                  onChange={(e) =>
                    handleItemChange(isDetail, idx, 'remarks', e.target.value)
                  }
                />
              </td>
              <td className="border border-gray-400 p-1 text-center no-print">
                <button
                  onClick={() => removeItem(isDetail, idx)}
                  className="text-red-500 font-bold"
                >
                  X
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {!isDetail && (
          <tfoot className="print:table-footer-group">
            <tr className="print:bg-transparent font-bold">
              <td
                colSpan={6}
                className="border border-gray-400 p-1 text-center"
              >
                소 계 (VAT 별도)
              </td>
              <td className="border border-gray-400 p-1 text-right">
                {total.toLocaleString()}
              </td>
              <td className="border border-gray-400" colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>
      <div className="text-center no-print">
        <button
          onClick={() => addItem(isDetail)}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 mt-2 shadow"
        >
          + 행 추가
        </button>
      </div>
    </div>
  );

  // ★ 수정: 드래그 앤 드롭 기능 추가
  const ImageSection = ({
    title,
    imageUrl,
    isActive,
    isPrintChecked,
    onDelete,
    onUpload,
  }: ImageSectionProps) => {
    // 드래그 상태 관리
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        onUpload(file);
      }
    };

    return (
      <div
        className={`break-before-page ${
          isActive ? 'block' : 'hidden'
        } ${isPrintChecked ? 'print:block print-visible' : 'print:hidden print-hidden'}`}
      >
        <div className="p-8 h-full min-h-[900px] flex flex-col items-center">
          <h2 className="text-3xl font-extrabold mb-8 border-b-2 border-black pb-2 w-full text-center">
            {title}
          </h2>
          {imageUrl ? (
            <div className="relative w-full flex-1 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={title}
                className="max-w-full max-h-[800px] object-contain"
              />
              <button
                onClick={onDelete}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded opacity-50 hover:opacity-100 no-print"
              >
                삭제
              </button>
            </div>
          ) : (
            // 드래그 앤 드롭 영역
            <div
              className={`w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors
                ${isDragging ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-500'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 no-print shadow flex flex-col items-center">
                <span>+ 이미지 업로드 (또는 드래그)</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(file);
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };

  const fieldName2TabId = (title: string): TabType => {
    if (title.includes('배치도')) return 'layout';
    if (title.includes('구성품')) return 'component';
    if (title.includes('유지관리')) return 'maintenance';
    if (title.includes('추진일정')) return 'schedule';
    return 'layout';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen print:p-0 print:max-w-none">
      {/* 상단 컨트롤 */}
      <div className="mb-6 no-print space-y-4">
        <div className="flex justify-between items-center p-4 rounded border">
          <h1 className="text-2xl font-bold">
            {initialData ? '견적서 수정' : '새 견적서 작성'}
          </h1>
          <div className="space-x-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black font-medium"
            >
              🖨️ 인쇄 / PDF 저장
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              저장
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'cover', label: '1. 견적서(표지)' },
            { id: 'detail', label: '2. 산출내역서' },
            { id: 'layout', label: '3. 배치도' },
            { id: 'component', label: '4. 주요구성품' },
            { id: 'maintenance', label: '5. 유지관리' },
            { id: 'schedule', label: '6. 추진일정' },
          ].map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center border rounded px-3 py-2 cursor-pointer ${activeTab === tab.id ? 'border-blue-500 font-bold text-blue-700' : 'text-gray-600'}`}
            >
              <button
                onClick={() => setActiveTab(tab.id as TabType)}
                className="mr-2 text-sm"
              >
                {tab.label}
              </button>
              <input
                type="checkbox"
                checked={printOptions[tab.id as keyof typeof printOptions]}
                onChange={() =>
                  setPrintOptions((prev) => ({
                    ...prev,
                    [tab.id]: !prev[tab.id as keyof typeof printOptions],
                  }))
                }
                className="w-4 h-4"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 1. 견적서 표지 (Main) */}
      <div className={`${getDisplayClass('cover', printOptions.cover)}`}>
        <div className="p-10 min-h-[1050px] relative flex flex-col justify-between">
          <div>
            <div className="text-center mb-10 mt-4">
              <h1 className="text-4xl font-extrabold tracking-[1rem] underline decoration-4 underline-offset-8">
                견 적 서
              </h1>
            </div>

            <div className="flex gap-6 mb-8 items-stretch">
              <div className="flex-1">
                <table className="w-full border-collapse border-2 border-black h-full text-base">
                  <tbody>
                    <tr>
                      <td className="border border-black text-center font-bold w-24 p-2 text-sm">
                        수 신
                      </td>
                      <td className="border border-black p-2">
                        <div className="flex items-center">
                          <input
                            type="text"
                            name="customerName"
                            value={header.customerName}
                            onChange={handleHeaderChange}
                            className="w-full font-bold outline-none"
                            placeholder="업체명"
                          />
                          <span className="font-bold whitespace-nowrap ml-1">
                            귀하
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black text-center font-bold p-2 text-sm">
                        참 조
                      </td>
                      <td className="border border-black p-2">
                        <input
                          type="text"
                          name="customerRef"
                          value={header.customerRef}
                          onChange={handleHeaderChange}
                          className="w-full outline-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black text-center font-bold p-2 text-sm">
                        날 짜
                      </td>
                      <td className="border border-black p-2">
                        <input
                          type="date"
                          name="quotationDate"
                          value={header.quotationDate}
                          onChange={handleHeaderChange}
                          className="w-full outline-none font-medium"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black text-center font-bold p-2 text-sm">
                        건 명
                      </td>
                      <td className="border border-black p-2">
                        <input
                          type="text"
                          name="title"
                          value={header.title}
                          onChange={handleHeaderChange}
                          className="w-full outline-none font-bold"
                          placeholder="공사명"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black text-center font-bold p-2 text-sm">
                        합 계
                      </td>
                      <td className="border border-black p-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">
                            ₩ {(total + vat).toLocaleString()}
                          </span>
                          <span className="text-sm font-bold">(VAT포함)</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex-1">
                <table className="w-full border-collapse border-2 border-black h-full text-sm">
                  <tbody>
                    <tr>
                      <td
                        className="border border-black p-1 w-10 text-center font-bold writing-vertical"
                        rowSpan={5}
                      >
                        공<br />급<br />자
                      </td>
                      <td className="border border-black p-1 w-20 text-center font-bold text-[13px]">
                        등록번호
                      </td>
                      <td
                        className="border border-black p-1 font-bold text-center"
                        colSpan={3}
                      >
                        143-87-01160
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center font-bold text-[13px]">
                        상 호
                      </td>
                      <td className="border border-black p-1 text-center text-[10px]">
                        (주)퍼스트씨앤디
                      </td>
                      <td className="border border-black p-1 w-14 text-center font-bold text-[13px]">
                        성 명
                      </td>
                      <td className="border border-black p-1 text-center relative text-[10px]">
                        김 종 우{' '}
                        <span className="text-[10px] text-gray-400 print:text-black">
                          (인)
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center font-bold text-[13px]">
                        주 소
                      </td>
                      <td
                        className="border border-black p-1 text-center text-xs tracking-tighter"
                        colSpan={3}
                      >
                        경기도 화성시 동탄첨단산업1로 27
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center font-bold text-[13px]">
                        업 태
                      </td>
                      <td className="border border-black p-1 text-center text-[10px]">
                        서비스업/제조업
                      </td>
                      <td className="border border-black p-1 text-center font-bold text-[13px]">
                        종 목
                      </td>
                      <td className="border border-black p-1 text-center text-[10px]">
                        응용소프트웨어
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center font-bold text-[13px]">
                        전 화
                      </td>
                      <td
                        className="border border-black p-1 text-center font-bold"
                        colSpan={3}
                      >
                        010-5617-9500
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {renderTable(mainItems, false)}
          </div>

          <div className="mt-8">
            <div className="border-2 border-black p-4">
              <h3 className="font-bold text-base mb-3 border-b border-gray-300 pb-1">
                ※ 견적 조건 및 특이사항
              </h3>
              <div className="flex gap-4 mb-2 items-center text-sm">
                <span className="font-bold w-20 shrink-0">1. 유효기간:</span>
                <input
                  type="text"
                  name="expiryDate"
                  value={header.expiryDate}
                  onChange={handleHeaderChange}
                  className="flex-1 outline-none bg-transparent border-b border-gray-200"
                />
              </div>
              <div className="flex gap-4 text-sm">
                <span className="font-bold w-20 shrink-0 mt-1">
                  2. 특이사항:
                </span>
                <textarea
                  name="conditions"
                  value={header.conditions}
                  onChange={handleHeaderChange}
                  rows={4}
                  className="flex-1 outline-none bg-transparent resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 산출내역서 (Detail) */}
      <div
        className={`break-before-page ${getDisplayClass('detail', printOptions.detail)}`}
      >
        <div className="p-10 min-h-[1050px] flex flex-col">
          <div className="text-center mb-8 mt-4">
            <h2 className="text-3xl font-extrabold tracking-widest border-b-2 border-black inline-block pb-2">
              세부 산출내역서
            </h2>
          </div>
          <div className="text-right text-sm mb-1 font-bold">
            [단위: 원 / VAT 별도]
          </div>
          {renderTable(detailItems, true)}
        </div>
      </div>

      {/* 3. 이미지 섹션들 */}
      {[
        {
          key: 'layout',
          title: '태양광 배치도',
          field: 'imageLayout',
          img: header.imageLayout,
        },
        {
          key: 'component',
          title: '주요 구성품',
          field: 'imageComponent',
          img: header.imageComponent,
        },
        {
          key: 'maintenance',
          title: '안전 유지관리 계획',
          field: 'imageMaintenance',
          img: header.imageMaintenance,
        },
        {
          key: 'schedule',
          title: '사업 추진 일정',
          field: 'imageSchedule',
          img: header.imageSchedule,
        },
      ].map((sec) => (
        <ImageSection
          key={sec.key}
          title={sec.title}
          imageUrl={sec.img}
          fieldName={sec.field}
          isActive={activeTab === sec.key}
          isPrintChecked={printOptions[sec.key as keyof typeof printOptions]}
          onDelete={() => setHeader((prev) => ({ ...prev, [sec.field]: '' }))}
          onUpload={(file) => handleFileUpload(file, sec.field)}
        />
      ))}
    </div>
  );
}
