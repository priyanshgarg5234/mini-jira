import { createSlice, nanoid } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toasts',
  initialState: [],
  reducers: {
    toastAdded: {
      reducer: (state, { payload }) => {
        state.push(payload);
      },
      prepare: (message, tone = 'success') => ({ payload: { id: nanoid(), message, tone } }),
    },
    toastRemoved: (state, { payload }) => state.filter((t) => t.id !== payload),
  },
});

export const { toastAdded, toastRemoved } = toastSlice.actions;
export default toastSlice.reducer;

export const showToast = (message, tone) => (dispatch) => {
  const action = dispatch(toastAdded(message, tone));
  setTimeout(() => dispatch(toastRemoved(action.payload.id)), 4500);
};
