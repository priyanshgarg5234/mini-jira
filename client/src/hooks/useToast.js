import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { showToast } from '../features/ui/toastSlice';

export function useToast() {
  const dispatch = useDispatch();
  return useMemo(
    () => ({
      success: (m) => dispatch(showToast(m, 'success')),
      error: (m) => dispatch(showToast(m, 'error')),
    }),
    [dispatch]
  );
}
