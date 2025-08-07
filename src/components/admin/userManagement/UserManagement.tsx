'use client';

import { useState, useCallback, useEffect } from 'react';
import UserDetailModal from '@components/admin/userManagement/UserDetailModal';
import UserList from '@components/admin/userManagement/UserList';
import { useInfiniteUsers } from '@hooks/admin/useInfiniteScroll';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { User } from '@type/admin/user';
import { postFeedbackFullScan } from '@lib/apis/admin/postFeedbackFullScan';
import { Button } from '@components/ui/button';
import { formatDateHour } from '@utils/admin/formatDate';

//유저 전체 흐름 관라(검색 + 리스트 + 상세보기)

export default function UserManagement() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const {
    users,
    isLoading,
    isFetching,
    hasNextPage,
    loadMoreRef,
    fetchNextPage,
  } = useInfiniteUsers(searchKeyword);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lastSyncedAt');
    if (stored) {
      setLastSyncedAt(new Date(stored));
    }
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await postFeedbackFullScan();
      const now = new Date();
      setLastSyncedAt(now);
      localStorage.setItem('lastSyncedAt', now.toISOString()); // ✅ 저장
      alert('피드백 동기화가 완료되었습니다.');
    } catch {
      alert('동기화에 실패했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!hasNextPage || isFetching) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        fetchNextPage();
      }
    });

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetching, fetchNextPage]);

  const handleUserSelect = useCallback((user: User) => {
    setSelectedUserId(user.id);
    setIsDetailModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedUserId(null);
  }, []);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 키워드 검색*/}
        <div className="flex justify-between items-center gap-2 mb-4">
          {/* 왼쪽: 동기화 버튼 */}

          <div className="flex justify-between items-center gap-2">
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              variant="default"
              className="text-sm"
            >
              {isSyncing ? '동기화 중...' : '데이터 동기화'}
            </Button>
            {lastSyncedAt && (
              <span className="text-xs text-gray-500 mt-1">
                최근 수동 업데이트 시간:{' '}
                <span className="text-blue-600 font-medium">
                  {formatDateHour(lastSyncedAt.toISOString())}
                </span>
              </span>
            )}
          </div>
          {/* 오른쪽: 검색 입력창 */}
          <div className="flex items-center gap-2">
            <Label htmlFor="user-search">검색:</Label>
            <Input
              id="user-search"
              placeholder="이름 또는 이메일"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-[240px]"
            />
          </div>
        </div>

        {/* 유저 목록 */}
        <UserList
          users={users}
          onUserSelect={handleUserSelect}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          loadMoreRef={loadMoreRef}
        />

        {/* 상세 모달 */}
        {selectedUserId !== null && (
          <UserDetailModal
            userId={selectedUserId}
            isOpen={isDetailModalOpen}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
}
