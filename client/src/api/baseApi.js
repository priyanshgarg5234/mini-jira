import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { loggedOut, setCredentials } from '../features/auth/authSlice';
import { logger } from '../utils/logger';
import { API_URL, requestRefresh } from './session';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('X-Requested-With', 'XMLHttpRequest');
    return headers;
  },
});

const urlOf = (args) => (typeof args === 'string' ? args : args.url);

/**
 * On 401 the access token has probably expired: refresh once and retry.
 * If the refresh fails too, the session is over and we sign out.
 */
async function baseQueryWithReauth(args, api, extra) {
  let result = await rawBaseQuery(args, api, extra);

  if (result.error?.status === 401 && !urlOf(args).startsWith('/auth/login')) {
    logger.debug('Access token rejected, refreshing session');
    const session = await requestRefresh();
    if (session) {
      api.dispatch(setCredentials(session));
      result = await rawBaseQuery(args, api, extra);
    } else {
      api.dispatch(loggedOut());
    }
  }

  if (result.error) {
    const requestId = result.meta?.response?.headers.get('X-Request-Id');
    logger.debug('API error', { url: urlOf(args), status: result.error.status, requestId, body: result.error.data });
  }
  return result;
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Team', 'Project', 'Task', 'Comment', 'Activity'],
  endpoints: () => ({}),
});

/** Turns any API error into { message, fields } for forms and toasts. */
export function parseApiError(error) {
  if (!error) return { message: '', fields: {} };
  const body = error.data?.error;
  const fields = {};
  for (const d of body?.details ?? []) {
    if (d.field && !fields[d.field]) fields[d.field] = d.message;
  }
  let message = body?.message;
  if (!message) {
    if (error.status === 'FETCH_ERROR') message = 'Cannot reach the server. Check your connection and try again.';
    else if (error.status === 'PARSING_ERROR') message = 'The server sent an unexpected response.';
    else message = 'Something went wrong. Try again.';
  }
  return { message, fields, requestId: body?.requestId };
}
