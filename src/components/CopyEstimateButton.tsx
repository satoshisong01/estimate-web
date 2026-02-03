'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EstimateRow {
  id: number;
  title: string | null;
  customer_name: string | null;
}

export default function CopyEstimateButton({
  estimates,
}: {
  estimates: EstimateRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async (sourceId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estimate/${sourceId}`);
      if (!res.ok) throw new Error('견적서를 불러올 수 없습니다.');
      const data = await res.json();

      const saveRes = await fetch('/api/estimate/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.id)
        throw new Error('복사 저장에 실패했습니다.');

      setOpen(false);
      router.push(`/estimate/${saveData.id}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error ? err.message : '복사 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition cursor-pointer"
      >
        + 새 견적(카피)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b font-bold">복사할 견적서 선택</div>
            <div className="p-4 overflow-y-auto flex-1">
              {estimates.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  복사할 견적서가 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {estimates.map((est) => (
                    <li key={est.id}>
                      <button
                        type="button"
                        onClick={() => handleCopy(est.id)}
                        disabled={loading}
                        className="w-full text-left px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 hover:border-emerald-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="font-medium text-gray-900 block truncate">
                          {est.title || '(제목 없음)'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {est.customer_name || '-'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="px-4 py-2 border rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              >
                {loading ? '복사 중…' : '취소'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
