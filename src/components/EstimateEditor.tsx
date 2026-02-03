'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './EstimateEditor.module.css';

// --- [유틸] 숫자를 한글로 변환 ---
function numberToKorean(number: number): string {
  if (number === 0) return '영';
  const units = ['', '만', '억', '조', '경'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
  const tenUnits = ['', '십', '백', '천'];

  let result = '';
  let unitIndex = 0;
  let numStr = number.toString();

  while (numStr.length > 0) {
    const chunk = numStr.slice(-4);
    numStr = numStr.slice(0, -4);

    let chunkToKorean = '';
    let hasValue = false;

    for (let i = 0; i < chunk.length; i++) {
      const digit = parseInt(chunk.charAt(chunk.length - 1 - i), 10);
      if (digit > 0) {
        chunkToKorean = digits[digit] + tenUnits[i] + chunkToKorean;
        hasValue = true;
      }
    }

    if (hasValue) {
      result = chunkToKorean + units[unitIndex] + result;
    }
    unitIndex++;
  }

  return result;
}

// --- [유틸] 콤마 관련 함수 ---
const parseNumber = (value: string) => {
  return Number(value.replace(/[^0-9]/g, ''));
};

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

interface ImageTab {
  id: string;
  label: string;
  url: string;
}

/** 이미지 탭 또는 산출내역서(세부) 탭 */
interface ExtraTab {
  id: string;
  type: 'image' | 'detail';
  label: string;
  url?: string;
  items?: EstimateItem[];
}

interface EditorProps {
  initialData?: any;
}

interface ImageSectionProps {
  tabData: { id: string; label: string; url: string };
  isActive: boolean;
  isPrintChecked: boolean;
  onDelete: () => void;
  onUpload: (file: File) => void;
}

export default function EstimateEditor({ initialData }: EditorProps) {
  const router = useRouter();

  const [coverLabel, setCoverLabel] = useState('1. 견적서(표지)');
  const [detailLabel, setDetailLabel] = useState('2. 산출내역서');

  const defaultExtraTabs: ExtraTab[] = [
    { id: 'layout', type: 'image', label: '3. 배치도', url: '' },
    { id: 'component', type: 'image', label: '4. 주요구성품', url: '' },
    { id: 'maintenance', type: 'image', label: '5. 유지관리', url: '' },
    { id: 'schedule', type: 'image', label: '6. 추진일정', url: '' },
  ];
  const [extraTabs, setExtraTabs] = useState<ExtraTab[]>(defaultExtraTabs);
  const [showAddTabMenu, setShowAddTabMenu] = useState(false);

  const [activeTabId, setActiveTabId] = useState<string>('cover');

  const [printOptions, setPrintOptions] = useState<Record<string, boolean>>({
    cover: true,
    detail: true,
    layout: true,
    component: true,
    maintenance: true,
    schedule: true,
  });

  const defaultConditions = `1. 태양광 견적용량 : 806.4kW ( F1 건물위)
2. 설치장소 : 씨와이오토텍 F1
3. 견적유효기간 : 견적일로부터 30일
4. 납기 : 발주 후 6개월 이내 (협의조정)
5. 결제조건 : 협의
6. 견적 별도항목 : 한전 시설부담금 및 기존 건물 구조보강비 (현장실측 후 산정)
7. 하자보증 : 태양광 12년(성능보증 30년, 제품 보증 12년), 인버터 5년 무상 보증`;

  const [header, setHeader] = useState({
    title: initialData?.title || '',
    customerName: initialData?.customer_name || '',
    customerRef: initialData?.customer_ref || '',
    quotationDate: initialData?.quotation_date
      ? new Date(initialData.quotation_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    deliveryDate: initialData?.memo
      ? JSON.parse(initialData.memo).deliveryDate || '발주 후 6개월 이내'
      : '발주 후 6개월 이내',
    expiryDate: initialData?.memo
      ? JSON.parse(initialData.memo).expiryDate
      : '견적일로부터 30일',
    conditions: initialData?.memo
      ? JSON.parse(initialData.memo).conditions
      : defaultConditions,
  });

  const [mainItems, setMainItems] = useState<EstimateItem[]>([]);
  const [detailItems, setDetailItems] = useState<EstimateItem[]>([]);

  useEffect(() => {
    if (initialData?.items) {
      const mains = initialData.items.filter(
        (i: any) => !i.section || i.section === 'main'
      );
      const details = initialData.items.filter(
        (i: any) => i.section === 'detail'
      );

      setMainItems(
        mains.length > 0
          ? mains
          : [
              {
                section: 'main',
                category: '태양광 설치공사',
                name: '',
                spec: '',
                unit: '식',
                quantity: 1,
                unitPrice: 0,
                remarks: '',
              },
            ]
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
            ]
      );
    } else {
      setMainItems([
        {
          section: 'main',
          category: '태양광 설치공사',
          name: '',
          spec: '',
          unit: '식',
          quantity: 1,
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

    if (initialData?.memo) {
      try {
        const memoObj = JSON.parse(initialData.memo);
        if (memoObj.tabConfig) {
          setCoverLabel(
            memoObj.tabConfig.coverLabel ||
              memoObj.tabConfig.coverTabLabel ||
              '1. 견적서(표지)'
          );
          setDetailLabel(
            memoObj.tabConfig.detailLabel ||
              memoObj.tabConfig.detailTabLabel ||
              '2. 산출내역서'
          );

          if (memoObj.tabConfig.extraTabs) {
            setExtraTabs(memoObj.tabConfig.extraTabs);
            const newPrintOpts: Record<string, boolean> = {
              cover: true,
              detail: true,
            };
            memoObj.tabConfig.extraTabs.forEach((tab: ExtraTab) => {
              newPrintOpts[tab.id] = true;
            });
            setPrintOptions((prev) => ({ ...prev, ...newPrintOpts }));
          } else if (memoObj.tabConfig.imageTabs) {
            const tabs: ExtraTab[] = memoObj.tabConfig.imageTabs.map(
              (t: ImageTab) => ({
                id: t.id,
                type: 'image' as const,
                label: t.label,
                url: t.url || '',
              })
            );
            setExtraTabs(tabs);
            const newPrintOpts: Record<string, boolean> = {
              cover: true,
              detail: true,
            };
            tabs.forEach((tab) => {
              newPrintOpts[tab.id] = true;
            });
            setPrintOptions((prev) => ({ ...prev, ...newPrintOpts }));
          }
        } else {
          const legacyTabs: ExtraTab[] = [
            {
              id: 'layout',
              type: 'image',
              label: '3. 배치도',
              url: initialData.image_layout || '',
            },
            {
              id: 'component',
              type: 'image',
              label: '4. 주요구성품',
              url: initialData.image_component || '',
            },
            {
              id: 'maintenance',
              type: 'image',
              label: '5. 유지관리',
              url: initialData.image_maintenance || '',
            },
            {
              id: 'schedule',
              type: 'image',
              label: '6. 추진일정',
              url: initialData.image_schedule || '',
            },
          ];
          setExtraTabs(legacyTabs);
        }
      } catch (e) {
        console.error('Memo parse error', e);
      }
    }
  }, [initialData]);

  const getDocumentNumber = () => {
    if (initialData?.id) {
      return `FIRST25-${String(initialData.id).padStart(3, '0')}`;
    }
    const date = new Date(header.quotationDate);
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `FIRST${year}${month}${day}-01`;
  };

  /** 탭 라벨에서 구분용 이름 추출 (예: "2. 산출내역서" → "산출내역서") */
  const getCategoryFromLabel = (label: string) => {
    const m = label.match(/^\d+\.\s*(.+)$/);
    return m ? m[1].trim() : label.trim();
  };

  const detailTotal = detailItems.reduce(
    (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
    0
  );
  const extraDetailTotals = extraTabs
    .filter((t) => t.type === 'detail' && t.items)
    .map((t) =>
      (t.items || []).reduce(
        (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
        0
      )
    );
  const coverSyntheticRows: EstimateItem[] = [
    {
      category: getCategoryFromLabel(detailLabel),
      name: '',
      spec: '',
      unit: '식',
      quantity: 1,
      unitPrice: detailTotal,
      remarks: '',
    },
    ...extraTabs
      .filter((t) => t.type === 'detail' && t.items)
      .map(
        (t) =>
          ({
            category: getCategoryFromLabel(t.label),
            name: '',
            spec: '',
            unit: '식',
            quantity: 1,
            unitPrice: (t.items || []).reduce(
              (acc, item) =>
                acc + Number(item.quantity) * Number(item.unitPrice),
              0
            ),
            remarks: '',
          } as EstimateItem)
      ),
  ];
  /** 산출내역서 합산 행을 맨 위에, 그 다음 수동 입력 행 */
  const coverDisplayRows = [...coverSyntheticRows, ...mainItems];

  const total =
    mainItems.reduce(
      (acc, item) => acc + Number(item.quantity) * Number(item.unitPrice),
      0
    ) +
    detailTotal +
    extraDetailTotals.reduce((a, b) => a + b, 0);

  const handleHeaderChange = (e: any) =>
    setHeader({ ...header, [e.target.name]: e.target.value });

  const handleItemChange = (
    isDetail: boolean,
    index: number,
    field: keyof EstimateItem,
    value: any
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

  const addImageTab = () => {
    setShowAddTabMenu(false);
    const newId = `img_${Date.now()}`;
    const newTab: ExtraTab = {
      id: newId,
      type: 'image',
      label: '새 탭',
      url: '',
    };
    setExtraTabs((prev) => [...prev, newTab]);
    setPrintOptions((prev) => ({ ...prev, [newId]: true }));
    setActiveTabId(newId);
  };

  const addDetailSheet = () => {
    setShowAddTabMenu(false);
    const newId = `detail_${Date.now()}`;
    const newTab: ExtraTab = {
      id: newId,
      type: 'detail',
      label: '산출내역서',
      items: [
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
    };
    setExtraTabs((prev) => [...prev, newTab]);
    setPrintOptions((prev) => ({ ...prev, [newId]: true }));
    setActiveTabId(newId);
  };

  const removeExtraTab = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    const tab = extraTabs.find((t) => t.id === idToRemove);
    const msg =
      tab?.type === 'detail'
        ? '정말 이 산출내역서 탭을 삭제하시겠습니까?'
        : '정말 이 탭을 삭제하시겠습니까? (이미지도 함께 삭제됩니다)';
    if (confirm(msg)) {
      setExtraTabs((prev) => prev.filter((t) => t.id !== idToRemove));
      if (activeTabId === idToRemove) {
        setActiveTabId('cover');
      }
    }
  };

  const updateTabLabel = (id: string, newLabel: string) => {
    if (id === 'cover') setCoverLabel(newLabel);
    else if (id === 'detail') setDetailLabel(newLabel);
    else {
      setExtraTabs((prev) =>
        prev.map((tab) => (tab.id === id ? { ...tab, label: newLabel } : tab))
      );
    }
  };

  const handleFileUpload = async (file: File, tabId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setExtraTabs((prev) =>
          prev.map((tab) =>
            tab.id === tabId && tab.type === 'image'
              ? { ...tab, url: data.url }
              : tab
          )
        );
      }
    } catch (err) {
      alert('업로드 실패');
    }
  };

  const handleExtraDetailItemChange = (
    tabId: string,
    index: number,
    field: keyof EstimateItem,
    value: unknown
  ) => {
    setExtraTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId || tab.type !== 'detail' || !tab.items) return tab;
        const next = [...tab.items];
        next[index] = { ...next[index], [field]: value };
        return { ...tab, items: next };
      })
    );
  };

  const addExtraDetailItem = (tabId: string) => {
    setExtraTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId || tab.type !== 'detail') return tab;
        const items = tab.items || [];
        return {
          ...tab,
          items: [
            ...items,
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
        };
      })
    );
  };

  const removeExtraDetailItem = (tabId: string, index: number) => {
    setExtraTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId || tab.type !== 'detail' || !tab.items) return tab;
        if (tab.items.length <= 1) return tab;
        return {
          ...tab,
          items: tab.items.filter((_, i) => i !== index),
        };
      })
    );
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

    const imageTabList = extraTabs.filter((t) => t.type === 'image');
    const tabConfig = {
      coverLabel,
      detailLabel,
      extraTabs,
      imageTabs: imageTabList.map((t) => ({
        id: t.id,
        label: t.label,
        url: t.url || '',
      })),
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...header,
          items: allItems,
          totalAmount: total,
          vat: Math.floor(total * 0.1),
          grandTotal: Math.floor(total * 1.1),
          imageLayout: imageTabList[0]?.url || '',
          imageComponent: imageTabList[1]?.url || '',
          imageMaintenance: imageTabList[2]?.url || '',
          imageSchedule: imageTabList[3]?.url || '',
          memo: JSON.stringify({
            deliveryDate: header.deliveryDate,
            expiryDate: header.expiryDate,
            conditions: header.conditions,
            tabConfig,
          }),
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

  const getDisplayClass = (tabId: string) => {
    const isActive = activeTabId === tabId;
    const isPrint = printOptions[tabId] ?? true;

    const screenClass = isActive ? 'block' : 'hidden';
    const printClass = isPrint
      ? 'print:block print-visible'
      : 'print:hidden print-hidden';
    return `${screenClass} ${printClass}`;
  };

  const renderTable = (
    items: EstimateItem[],
    isDetail: boolean,
    options?: {
      /** 합산 행이 뒤에 올 때: 이 인덱스 이상이 합산(읽기전용) */
      syntheticStartIndex?: number;
      /** 합산 행이 앞에 올 때: 이 인덱스 미만이 합산(읽기전용) */
      syntheticEndIndex?: number;
      onAddItem?: () => void;
      onRemoveItem?: (index: number) => void;
      onItemChange?: (
        index: number,
        field: keyof EstimateItem,
        value: unknown
      ) => void;
    }
  ) => {
    const syntheticStart = options?.syntheticStartIndex ?? -1;
    const syntheticEnd = options?.syntheticEndIndex ?? -1;
    const addCb = options?.onAddItem ?? (() => addItem(isDetail));
    const removeCb =
      options?.onRemoveItem ?? ((idx: number) => removeItem(isDetail, idx));
    const changeCb =
      options?.onItemChange ??
      ((idx: number, field: keyof EstimateItem, value: unknown) =>
        handleItemChange(isDetail, idx, field, value));
    return (
      <div className="w-full mb-4">
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead className="bg-gray-100 print:bg-transparent">
            <tr>
              <th className="border border-black p-1 w-8">No</th>
              <th className="border border-black p-1 w-24">
                {isDetail ? '품명' : '구 분'}
              </th>
              <th className="border border-black p-1">규 격</th>
              <th className="border border-black p-1 w-10">단위</th>
              <th className="border border-black p-1 w-14">수량</th>
              <th className="border border-black p-1 w-24">단가</th>
              <th className="border border-black p-1 w-24">금 액</th>
              <th className="border border-black p-1 w-24">비고</th>
              <th className="border border-black p-1 w-8 no-print">삭제</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isSynthetic =
                (syntheticEnd >= 0 && idx < syntheticEnd) ||
                (syntheticStart >= 0 && idx >= syntheticStart);
              return (
                <tr key={idx}>
                  <td className="border border-gray-400 p-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-400 p-0">
                    <input
                      className={`w-full p-1 outline-none bg-transparent ${
                        !isDetail ? 'text-center font-bold' : ''
                      }`}
                      value={isDetail ? item.name : item.category}
                      onChange={(e) =>
                        !isSynthetic &&
                        changeCb(
                          idx,
                          isDetail ? 'name' : 'category',
                          e.target.value
                        )
                      }
                      readOnly={isSynthetic}
                      placeholder=""
                    />
                  </td>
                  <td className="border border-gray-400 p-0">
                    <input
                      className="w-full p-1 outline-none bg-transparent"
                      value={item.spec}
                      onChange={(e) =>
                        !isSynthetic && changeCb(idx, 'spec', e.target.value)
                      }
                      readOnly={isSynthetic}
                    />
                  </td>
                  <td className="border border-gray-400 p-0">
                    <input
                      className="w-full p-1 outline-none text-center bg-transparent"
                      value={item.unit}
                      onChange={(e) =>
                        !isSynthetic && changeCb(idx, 'unit', e.target.value)
                      }
                      readOnly={isSynthetic}
                    />
                  </td>
                  <td className="border border-gray-400 p-0">
                    <input
                      type="text"
                      className="w-full p-1 outline-none text-right bg-transparent"
                      value={
                        item.quantity === 0
                          ? ''
                          : item.quantity.toLocaleString()
                      }
                      onChange={(e) =>
                        !isSynthetic &&
                        changeCb(idx, 'quantity', parseNumber(e.target.value))
                      }
                      readOnly={isSynthetic}
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-400 p-0">
                    <input
                      type="text"
                      className="w-full p-1 outline-none text-right bg-transparent"
                      value={
                        item.unitPrice === 0
                          ? ''
                          : item.unitPrice.toLocaleString()
                      }
                      onChange={(e) =>
                        !isSynthetic &&
                        changeCb(idx, 'unitPrice', parseNumber(e.target.value))
                      }
                      readOnly={isSynthetic}
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-gray-400 p-1 text-right font-medium">
                    {(item.quantity * item.unitPrice).toLocaleString()}
                  </td>
                  <td className="border border-gray-400 p-0">
                    <input
                      className="w-full p-1 outline-none bg-transparent"
                      value={item.remarks}
                      onChange={(e) =>
                        !isSynthetic && changeCb(idx, 'remarks', e.target.value)
                      }
                      readOnly={isSynthetic}
                    />
                  </td>
                  <td className="border border-gray-400 p-1 text-center no-print">
                    {!isSynthetic ? (
                      <button
                        onClick={() => removeCb(idx)}
                        className="text-red-500 font-bold"
                      >
                        X
                      </button>
                    ) : (
                      <span />
                    )}
                  </td>
                </tr>
              );
            })}
            {!isDetail &&
              items.length < 3 &&
              Array.from({ length: 3 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-gray-400 p-1">&nbsp;</td>
                  <td className="border border-gray-400 p-1" colSpan={7}></td>
                  <td className="border border-gray-400 p-1 no-print"></td>
                </tr>
              ))}
          </tbody>
          {!isDetail && (
            <tfoot className="print:table-footer-group">
              <tr className="bg-gray-50 print:bg-transparent font-bold">
                <td
                  colSpan={6}
                  className="border border-black p-1 text-center tracking-widest"
                >
                  합 계
                </td>
                <td className="border border-black p-1 text-right">
                  {total.toLocaleString()}
                </td>
                <td className="border border-black p-1 text-center text-xs">
                  (VAT 별도)
                </td>
                <td className="border border-black no-print"></td>
              </tr>
              <tr className="bg-yellow-50 print:bg-transparent font-extrabold text-lg">
                <td
                  colSpan={6}
                  className="border border-black p-2 text-center tracking-widest text-[16px]"
                >
                  최종 합계
                </td>
                <td className="border border-black p-2">
                  <div className="flex items-center justify-end text-[16px] whitespace-nowrap">
                    <span className="mr-1">₩</span>
                    <span>{total.toLocaleString()}</span>
                  </div>
                </td>
                <td className="border border-black p-2 text-center text-sm">
                  부가세 별도
                </td>
                <td className="border border-black no-print"></td>
              </tr>
            </tfoot>
          )}
        </table>
        <div className="text-center no-print">
          <button
            onClick={addCb}
            className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 mt-2 shadow"
          >
            + 행 추가
          </button>
        </div>
      </div>
    );
  };

  const ImageSection = ({
    tabData,
    isActive,
    isPrintChecked,
    onDelete,
    onUpload,
  }: ImageSectionProps) => {
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
      if (file) onUpload(file);
    };

    return (
      <div
        className={`break-before-page ${isActive ? 'block' : 'hidden'} ${
          isPrintChecked
            ? 'print:block print-visible'
            : 'print:hidden print-hidden'
        }`}
      >
        <div
          className={`p-8 h-full min-h-[900px] flex flex-col items-center ${styles.paperBorder} relative`}
        >
          {/* ▼ 우측 상단 로고 (모든 이미지 탭) ▼ */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="logo"
            className="absolute top-10 right-10 w-32 z-0 opacity-80"
          />

          <input
            value={tabData.label}
            onChange={(e) => updateTabLabel(tabData.id, e.target.value)}
            className="text-3xl font-extrabold mb-8 border-b-2 border-black pb-2 w-full text-center bg-transparent outline-none cursor-text relative z-10"
          />
          {tabData.url ? (
            <div className="relative w-full flex-1 flex items-center justify-center z-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tabData.url}
                alt={tabData.label}
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
            <div
              className={`w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors z-10 ${
                isDragging
                  ? 'border-blue-500 text-blue-500'
                  : 'border-gray-300 text-gray-500'
              }`}
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

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen print:p-0 print:max-w-none">
      {/* 상단 컨트롤 */}
      <div className="mb-6 no-print space-y-4">
        <div className="flex justify-between items-center p-4 rounded border bg-white shadow-sm">
          <h1 className="text-2xl font-bold">
            {initialData ? '견적서 수정' : '새 견적서 작성'}
          </h1>
          <div className="space-x-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-black font-medium"
            >
              🖨️ 인쇄 / PDF
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
        <div className="flex flex-wrap gap-2 items-center">
          {/* 고정 탭 1 */}
          <div
            className={`flex items-center border rounded px-3 py-2 cursor-pointer bg-white ${
              activeTabId === 'cover'
                ? 'border-blue-500 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <input
              value={coverLabel}
              onChange={(e) => setCoverLabel(e.target.value)}
              onClick={() => setActiveTabId('cover')}
              className={`mr-2 text-sm bg-transparent outline-none w-auto min-w-[80px] cursor-pointer ${
                activeTabId === 'cover'
                  ? 'font-bold text-blue-700'
                  : 'text-gray-600'
              }`}
            />
            <input
              type="checkbox"
              checked={printOptions.cover}
              onChange={() =>
                setPrintOptions((prev) => ({ ...prev, cover: !prev.cover }))
              }
              className="w-4 h-4 cursor-pointer"
            />
          </div>
          {/* 고정 탭 2 */}
          <div
            className={`flex items-center border rounded px-3 py-2 cursor-pointer bg-white ${
              activeTabId === 'detail'
                ? 'border-blue-500 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <input
              value={detailLabel}
              onChange={(e) => setDetailLabel(e.target.value)}
              onClick={() => setActiveTabId('detail')}
              className={`mr-2 text-sm bg-transparent outline-none w-auto min-w-[80px] cursor-pointer ${
                activeTabId === 'detail'
                  ? 'font-bold text-blue-700'
                  : 'text-gray-600'
              }`}
            />
            <input
              type="checkbox"
              checked={printOptions.detail}
              onChange={() =>
                setPrintOptions((prev) => ({ ...prev, detail: !prev.detail }))
              }
              className="w-4 h-4 cursor-pointer"
            />
          </div>
          {/* 동적 탭 (이미지 / 산출내역서) */}
          {extraTabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center border rounded px-3 py-2 cursor-pointer bg-white ${
                activeTabId === tab.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                value={tab.label}
                onChange={(e) => updateTabLabel(tab.id, e.target.value)}
                onClick={() => setActiveTabId(tab.id)}
                className={`mr-2 text-sm bg-transparent outline-none w-24 cursor-pointer ${
                  activeTabId === tab.id
                    ? 'font-bold text-blue-700'
                    : 'text-gray-600'
                }`}
              />
              <input
                type="checkbox"
                checked={printOptions[tab.id] ?? true}
                onChange={() =>
                  setPrintOptions((prev) => ({
                    ...prev,
                    [tab.id]: !prev[tab.id],
                  }))
                }
                className="w-4 h-4 cursor-pointer mr-2"
              />
              <button
                onClick={(e) => removeExtraTab(e, tab.id)}
                className="text-red-400 hover:text-red-600 font-bold px-1 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowAddTabMenu((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold shadow-sm"
              title="새 탭 추가"
            >
              ＋
            </button>
            {showAddTabMenu && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white border rounded shadow-lg z-50 min-w-[140px]">
                <button
                  type="button"
                  onClick={addImageTab}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  이미지 업로드
                </button>
                <button
                  type="button"
                  onClick={addDetailSheet}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                >
                  산출내역서(세부내역)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. 견적서 표지 (Main) */}
      <div className={`${getDisplayClass('cover')}`}>
        <div
          className={`p-10 min-h-[1050px] relative flex flex-col justify-between ${styles.paperBorder}`}
        >
          {/* ▼ 우측 상단 로고 추가 (견적서) ▼ */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="logo"
            className="absolute top-15 right-10 w-32 z-0 opacity-80"
          />

          <div className="relative z-10">
            <div className="text-center mb-6 mt-4 relative">
              <input
                value={coverLabel}
                onChange={(e) => setCoverLabel(e.target.value)}
                className="text-4xl font-extrabold tracking-[1rem] underline decoration-4 underline-offset-8 text-center w-full bg-transparent outline-none cursor-text"
              />
              <div className="absolute top-2 left-0 text-sm font-bold">
                No. {getDocumentNumber()}
              </div>
            </div>

            {/* ▼▼▼ 상단 정보 (큰 테두리) ▼▼▼ */}
            <div className="mb-4 border-2 border-black bg-white/50 backdrop-blur-sm">
              {/* 좌우 분할 영역 (아래쪽 테두리로 구분) */}
              <div className="flex gap-0 items-stretch border-b border-black">
                {/* 좌측: 수신처 정보 */}
                <div className="flex-1 border-r border-black">
                  <table className="w-full h-full text-[12px]">
                    <colgroup>
                      <col className="w-24 bg-gray-50" />
                      <col />
                    </colgroup>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="p-2 text-center font-bold border-r border-gray-300">
                          견 적 명
                        </td>
                        <td className="p-2">
                          <input
                            name="title"
                            value={header.title}
                            onChange={handleHeaderChange}
                            className="w-full font-bold outline-none bg-transparent"
                            placeholder="공사명 입력"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-2 text-center font-bold border-r border-gray-300">
                          수 신
                        </td>
                        <td className="p-2 flex items-center">
                          <input
                            name="customerName"
                            value={header.customerName}
                            onChange={handleHeaderChange}
                            className="w-full font-bold outline-none bg-transparent"
                            placeholder="수신처 입력"
                          />
                          <span className="shrink-0 font-bold ml-1">귀하</span>
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-2 text-center font-bold border-r border-gray-300">
                          참 조
                        </td>
                        <td className="p-2">
                          <input
                            name="customerRef"
                            value={header.customerRef}
                            onChange={handleHeaderChange}
                            className="w-full outline-none bg-transparent"
                            placeholder="참조인 입력"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-2 text-center font-bold border-r border-gray-300">
                          견적일자
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            name="quotationDate"
                            value={header.quotationDate}
                            onChange={handleHeaderChange}
                            className="w-full outline-none bg-transparent"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold border-r border-gray-300 text-blue-700">
                          납기예정
                        </td>
                        <td className="p-2">
                          <input
                            name="deliveryDate"
                            value={header.deliveryDate}
                            onChange={handleHeaderChange}
                            className="w-full outline-none bg-transparent"
                            placeholder="예: 발주 후 6개월"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 우측: 공급자 정보 */}
                <div className="flex-1">
                  <table className="w-full h-full text-[12px]">
                    <colgroup>
                      <col className="w-8 bg-gray-50" />
                      <col className="w-20 bg-gray-50" />
                      <col />
                      <col className="w-16 bg-gray-50" />
                      <col className="w-20" />
                    </colgroup>
                    <tbody>
                      <tr className="border-b border-black">
                        <td
                          rowSpan={6}
                          className="p-1 text-center font-bold border-r border-black"
                          style={{ writingMode: 'vertical-rl' }}
                        >
                          공 급 자
                        </td>
                        <td className="p-1 text-center font-bold border-r border-gray-300">
                          사업자번호
                        </td>
                        <td
                          colSpan={3}
                          className="p-1 text-center font-bold text-lg tracking-widest"
                        >
                          143-87-01160
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 text-center font-bold border-r border-gray-300">
                          회 사 명
                        </td>
                        <td className="p-1 text-center">(주)퍼스트씨앤디</td>
                        <td className="p-1 text-center font-bold border-l border-r border-gray-300">
                          대 표
                        </td>
                        <td className="p-1 text-center relative overflow-visible">
                          <span className="relative z-10">
                            김 종 우
                            <span className="text-gray-400 text-xs ml-1">
                              (인)
                            </span>
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/sign.png"
                            alt="직인"
                            className="absolute w-14 top-1/2 right-2 transform -translate-y-1/2 opacity-90 mix-blend-multiply z-0 pointer-events-none print:block"
                            style={{ right: '10px', top: '50%' }}
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 text-center font-bold border-r border-gray-300">
                          주 소
                        </td>
                        <td colSpan={3} className="p-1 text-center text-xs">
                          경기도 화성시 동탄첨단산업1로 27
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 text-center font-bold border-r border-gray-300">
                          업 태
                        </td>
                        <td colSpan={3} className="p-1 text-center text-xs">
                          제조업, 도매 및 소매업 정보통신업
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="p-1 text-center font-bold border-r border-gray-300">
                          종 목
                        </td>
                        <td colSpan={3} className="p-1 text-center text-xs">
                          <p>에너지 저장장치 제조업, 전자상거래 및 통신판매,</p>
                          <p>
                            응용 소프트웨어 개발 및 공급업, 컴퓨터 프로그래밍
                            서비스업
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-1 text-center font-bold border-r border-gray-300">
                          연 락 처
                        </td>
                        <td
                          colSpan={3}
                          className="p-1 text-center text-xs leading-relaxed"
                        >
                          <strong>김 종 우 대표이사</strong>
                          <br />
                          010-5617-9500 / jongwoo@firstcorea.com
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ▼▼▼ 하단: 최종견적금액 (통합 1행) ▼▼▼ */}
              <div className="flex h-16 border-t border-black">
                {/* 라벨 부분: flex-col로 줄바꿈 확실하게 */}
                <div className="w-24 bg-gray-100 border-r border-black p-2 text-center font-extrabold flex flex-col justify-center items-center text-sm">
                  <span>최종견적금액</span>
                  <span className="text-[10px] font-normal mt-0.5">
                    (부가세별도)
                  </span>
                </div>
                {/* 값 부분: flex-row로 가로 배치, 한글 먼저 */}
                <div className="flex-1 flex items-center justify-around px-4">
                  <span className="text-base font-bold mr-2">
                    일금 {numberToKorean(total)} 원整
                  </span>
                  <span className="text-lg font-bold ">
                    ( ₩ {total.toLocaleString()} )
                  </span>
                </div>
              </div>
            </div>

            {renderTable(coverDisplayRows, false, {
              syntheticEndIndex: coverSyntheticRows.length,
              onAddItem: () => addItem(false),
              onRemoveItem: (idx) => {
                if (idx >= coverSyntheticRows.length)
                  removeItem(false, idx - coverSyntheticRows.length);
              },
              onItemChange: (idx, field, value) => {
                if (idx >= coverSyntheticRows.length)
                  handleItemChange(
                    false,
                    idx - coverSyntheticRows.length,
                    field,
                    value
                  );
              },
            })}
          </div>

          {/* ▼▼▼ [수정] mt-4 -> mt-1 (위로 올림), 내부 패딩 및 글자 크기 축소 ▼▼▼ */}
          <div className="mt-1 relative z-10">
            <div className="border-2 border-black p-2 bg-gray-50/90 backdrop-blur-sm">
              {/* 제목 크기 text-lg -> text-base 로 축소, 마진 축소 */}
              <h3 className="font-bold text-base mb-1 border-b-2 border-gray-300 pb-1 text-center">
                &lt; 견 적 조 건 &gt;
              </h3>

              {/* 본문 텍스트 크기 text-sm -> text-xs (더 작게) */}
              <div className="flex gap-2 text-xs">
                <span className="font-bold w-14 shrink-0 mt-0.5">
                  유효기간:
                </span>
                <input
                  name="expiryDate"
                  value={header.expiryDate}
                  onChange={handleHeaderChange}
                  className="w-40 outline-none bg-transparent border-b border-gray-300 h-5"
                />
              </div>

              <textarea
                name="conditions"
                value={header.conditions}
                onChange={handleHeaderChange}
                rows={7}
                // text-xs 적용, leading-relaxed -> leading-normal (줄간격 좁힘)
                className="w-full mt-1 outline-none bg-transparent resize-none whitespace-pre-wrap text-xs leading-normal"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 산출내역서 (Detail) */}
      <div className={`${getDisplayClass('detail')}`}>
        <div
          className={`p-10 min-h-[1050px] flex flex-col ${styles.paperBorder} relative`}
        >
          {/* ▼ 우측 상단 로고 추가 (산출내역서) ▼ */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="logo"
            className="absolute top-15 right-10 w-32 z-0 opacity-80"
          />

          <div className="text-center mb-8 mt-4 relative z-10">
            <input
              value={detailLabel}
              onChange={(e) => setDetailLabel(e.target.value)}
              className="text-3xl font-extrabold tracking-widest border-b-2 border-black pb-2 text-center w-full bg-transparent outline-none cursor-text"
            />
          </div>
          <div className="text-right text-sm mb-1 font-bold relative z-10">
            [단위: 원 / VAT 별도]
          </div>
          <div className="relative z-10">{renderTable(detailItems, true)}</div>
        </div>
      </div>

      {/* 3. 동적 탭: 이미지 업로드 / 산출내역서 */}
      {extraTabs.map((tab) =>
        tab.type === 'image' ? (
          <ImageSection
            key={tab.id}
            tabData={{
              id: tab.id,
              label: tab.label,
              url: tab.url || '',
            }}
            isActive={activeTabId === tab.id}
            isPrintChecked={printOptions[tab.id] ?? true}
            onDelete={() =>
              setExtraTabs((prev) =>
                prev.map((t) =>
                  t.id === tab.id && t.type === 'image' ? { ...t, url: '' } : t
                )
              )
            }
            onUpload={(file) => handleFileUpload(file, tab.id)}
          />
        ) : (
          <div key={tab.id} className={`${getDisplayClass(tab.id)}`}>
            <div
              className={`p-10 min-h-[1050px] flex flex-col ${styles.paperBorder} relative`}
            >
              <img
                src="/logo.png"
                alt="logo"
                className="absolute top-10 right-10 w-32 z-0 opacity-80"
              />
              <div className="text-center mb-8 mt-4 relative z-10">
                <input
                  value={tab.label}
                  onChange={(e) => updateTabLabel(tab.id, e.target.value)}
                  className="text-3xl font-extrabold tracking-widest border-b-2 border-black pb-2 text-center w-full bg-transparent outline-none cursor-text"
                />
              </div>
              <div className="text-right text-sm mb-1 font-bold relative z-10">
                [단위: 원 / VAT 별도]
              </div>
              <div className="relative z-10">
                {renderTable(tab.items || [], true, {
                  onAddItem: () => addExtraDetailItem(tab.id),
                  onRemoveItem: (idx) => removeExtraDetailItem(tab.id, idx),
                  onItemChange: (idx, field, value) =>
                    handleExtraDetailItemChange(tab.id, idx, field, value),
                })}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
