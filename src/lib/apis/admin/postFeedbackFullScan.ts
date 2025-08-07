import axiosInstance from '@lib/apis/axiosInstance';

export const postFeedbackFullScan = async (): Promise<void> => {
  await axiosInstance.post('/api/admin/feedback/full-scan');
};
