'use client';

import { useRouter } from 'next/navigation';

export default function DeleteQuoteButton({ id }: { id: number }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('정말로 이 견적서를 삭제하시겠습니까? 복구할 수 없습니다.'))
      return;

    try {
      const res = await fetch(`/api/estimate/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('삭제되었습니다.');
        router.refresh(); // 목록 새로고침
      } else {
        alert('삭제 실패: 서버 오류');
      }
    } catch (error) {
      console.error(error);
      alert('오류가 발생했습니다.');
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-500 hover:text-red-700 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors"
    >
      삭제
    </button>
  );
}
