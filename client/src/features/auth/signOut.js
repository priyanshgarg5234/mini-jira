import { baseApi } from '../../api/baseApi';
import { requestLogout } from '../../api/session';
import { loggedOut } from './authSlice';

/** Revokes the refresh token server-side, then clears all cached data. */
export const signOut = () => async (dispatch) => {
  await requestLogout();
  dispatch(loggedOut());
  dispatch(baseApi.util.resetApiState());
};
