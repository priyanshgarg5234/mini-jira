import { baseApi } from './baseApi';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

const listTags = (type) => (res) => {
  const items = Array.isArray(res) ? res : res?.items ?? [];
  return [{ type, id: 'LIST' }, ...items.map((x) => ({ type, id: x._id }))];
};

export const api = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ---------- auth ----------
    login: build.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    changePassword: build.mutation({ query: (body) => ({ url: '/auth/password', method: 'PATCH', body }) }),
    logoutAll: build.mutation({ query: () => ({ url: '/auth/logout-all', method: 'POST' }) }),

    // ---------- users ----------
    getUsers: build.query({
      query: (params) => ({ url: '/users', params: clean(params) }),
      transformResponse: (r) => r.items,
      providesTags: listTags('User'),
    }),
    createUser: build.mutation({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    updateUser: build.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['User', 'Team', 'Project', 'Task'],
    }),

    // ---------- teams ----------
    getTeams: build.query({
      query: () => '/teams',
      transformResponse: (r) => r.items,
      providesTags: listTags('Team'),
    }),
    getTeam: build.query({
      query: (id) => `/teams/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Team', id }],
    }),
    createTeam: build.mutation({
      query: (body) => ({ url: '/teams', method: 'POST', body }),
      transformResponse: (r) => r.team,
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),
    updateTeam: build.mutation({
      query: ({ id, ...body }) => ({ url: `/teams/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Team', id }, { type: 'Team', id: 'LIST' }, 'Project'],
    }),
    deleteTeam: build.mutation({
      query: (id) => ({ url: `/teams/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Team', id: 'LIST' }],
    }),
    addTeamMember: build.mutation({
      query: ({ id, userId }) => ({ url: `/teams/${id}/members`, method: 'POST', body: { userId } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Team', id }, { type: 'Team', id: 'LIST' }, 'Project'],
    }),
    removeTeamMember: build.mutation({
      query: ({ id, userId }) => ({ url: `/teams/${id}/members/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Team', id }, { type: 'Team', id: 'LIST' }, 'Project', 'Task'],
    }),

    // ---------- projects ----------
    getProjects: build.query({
      query: () => '/projects',
      transformResponse: (r) => r.items,
      providesTags: listTags('Project'),
    }),
    createProject: build.mutation({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      transformResponse: (r) => r.project,
      invalidatesTags: [{ type: 'Project', id: 'LIST' }, 'Team'],
    }),
    updateProject: build.mutation({
      query: ({ id, ...body }) => ({ url: `/projects/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Project', id }, { type: 'Project', id: 'LIST' }, 'Team'],
    }),
    deleteProject: build.mutation({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }, 'Team'],
    }),
    getProject: build.query({
      query: (id) => `/projects/${id}`,
      transformResponse: (r) => r.project,
      providesTags: (_r, _e, id) => [{ type: 'Project', id }],
    }),
    addProjectTeam: build.mutation({
      query: ({ id, teamId }) => ({ url: `/projects/${id}/teams`, method: 'POST', body: { teamId } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Project', id }, { type: 'Project', id: 'LIST' }, 'Team'],
    }),
    removeProjectTeam: build.mutation({
      query: ({ id, teamId }) => ({ url: `/projects/${id}/teams/${teamId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Project', id }, { type: 'Project', id: 'LIST' }, 'Team', 'Task'],
    }),
    addProjectMember: build.mutation({
      query: ({ id, userId }) => ({ url: `/projects/${id}/members`, method: 'POST', body: { userId } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Project', id }, { type: 'Project', id: 'LIST' }],
    }),
    removeProjectMember: build.mutation({
      query: ({ id, userId }) => ({ url: `/projects/${id}/members/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Project', id }, { type: 'Project', id: 'LIST' }, 'Task'],
    }),

    // ---------- tasks ----------
    getTasks: build.query({
      query: (params) => ({ url: '/tasks', params: clean(params) }),
      providesTags: listTags('Task'),
    }),
    getComments: build.query({
      query: (id) => `/tasks/${id}/comments`,
      transformResponse: (r) => r.items,
      providesTags: (_r, _e, id) => [{ type: 'Comment', id }],
    }),
    addComment: build.mutation({
      query: ({ id, body }) => ({ url: `/tasks/${id}/comments`, method: 'POST', body: { body } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Comment', id }, { type: 'Activity', id }],
    }),
    updateComment: build.mutation({
      query: ({ id, commentId, body }) => ({ url: `/tasks/${id}/comments/${commentId}`, method: 'PATCH', body: { body } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Comment', id }],
    }),
    getActivity: build.query({
      query: (id) => `/tasks/${id}/activity`,
      transformResponse: (r) => r.items,
      providesTags: (_r, _e, id) => [{ type: 'Activity', id }],
    }),
    getTask: build.query({
      query: (id) => `/tasks/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Task', id }],
    }),
    createTask: build.mutation({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      transformResponse: (r) => r.task,
      invalidatesTags: [{ type: 'Task', id: 'LIST' }, 'Project'],
    }),
    updateTask: build.mutation({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      transformResponse: (r) => r.task,
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Task', id }, { type: 'Task', id: 'LIST' }, { type: 'Activity', id }, 'Project'],
    }),
  }),
});

export const {
  useLoginMutation,
  useChangePasswordMutation,
  useLogoutAllMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useAddTeamMemberMutation,
  useRemoveTeamMemberMutation,
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectQuery,
  useAddProjectTeamMutation,
  useRemoveProjectTeamMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useGetTasksQuery,
  useGetTaskQuery,
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useGetActivityQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} = api;
