'use client';

import { useState, useCallback, useEffect } from 'react';
import UserDetailModal from '@components/admin/userManagement/UserDetailModal';
import UserList from '@components/admin/userManagement/UserList';
import { useInfiniteUsers } from '@hooks/admin/useInfiniteScroll';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { User } from '@type/admin/user';

//유저 전체 흐름 관라(검색 + 리스트 + 상세보기)

export default function UserManagement() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  const {
    users,
    isLoading,
    isFetching,
    hasNextPage,
    loadMoreRef,
    fetchNextPage,
  } = useInfiniteUsers(searchKeyword);

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
        <div className="flex justify-end items-center gap-2 mb-4">
          <Label htmlFor="user-search">검색:</Label>
          <Input
            id="user-search"
            placeholder="이름 또는 이메일"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-[240px]"
          />
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
