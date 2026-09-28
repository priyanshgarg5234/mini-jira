import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { requestRefresh } from '../../api/session';

/**
 * The access token lives only in Redux memory (never localStorage), so an XSS
 * bug can't read a long-lived credential. On page load the session is restored
 * from the httpOnly refresh cookie.
 */
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => (await requestRefresh()) ?? rejectWithValue(null),
  { condition: (_, { getState }) => getState().auth.status === 'idle' } // StrictMode-safe: runs once
);

const authSlice = createSlice({
  name: 'auth',
  initialState: { accessToken: null, user: null, status: 'idle' }, // idle | checking | authenticated | guest
  reducers: {
    setCredentials(state, { payload }) {
      state.accessToken = payload.accessToken;
      state.user = payload.user;
      state.status = 'authenticated';
    },
    setUser(state, { payload }) {
      state.user = payload;
    },
    loggedOut(state) {
      state.accessToken = null;
      state.user = null;
      state.status = 'guest';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'checking';
      })
      .addCase(restoreSession.fulfilled, (state, { payload }) => {
        state.accessToken = payload.accessToken;
        state.user = payload.user;
        state.status = 'authenticated';
      })
      .addCase(restoreSession.rejected, (state) => {
        state.status = 'guest';
      });
  },
});

export const { setCredentials, setUser, loggedOut } = authSlice.actions;
export default authSlice.reducer;
