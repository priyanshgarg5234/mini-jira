/**
 * API integration tests: real Express app + in-memory MongoDB.
 * Run: npm test  (first run downloads a MongoDB binary)
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let mongo;
let app;
const XHR = { 'X-Requested-With': 'XMLHttpRequest' };
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

before(async () => {
  mongo = await MongoMemoryServer.create();
  Object.assign(process.env, {
    MONGO_URI: mongo.getUri(),
    ACCESS_TOKEN_SECRET: 'x'.repeat(48),
    NODE_ENV: 'test',
    APP_TIMEZONE: 'UTC',
  });
  const { createApp } = await import('../src/app.js');
  const { User } = await import('../src/models/index.js');
  await mongoose.connect(process.env.MONGO_URI);
  await User.create({ name: 'Admin', email: 'admin@t.dev', password: 'Password123', role: 'admin' });
  app = createApp();
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function login(email, password = 'Password123') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, res.text);
  return { agent, token: res.body.accessToken, user: res.body.user };
}

describe('auth', () => {
  test('login returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@t.dev', password: 'Password123' });
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
    const cookie = res.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
  });

  test('refresh rotates the token and detects reuse of an old one', async () => {
    const cookieOf = (res) => res.headers['set-cookie'][0].split(';')[0];
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@t.dev', password: 'Password123' });
    const c1 = cookieOf(loginRes);

    const r1 = await request(app).post('/api/auth/refresh').set(XHR).set('Cookie', c1);
    assert.equal(r1.status, 200);
    const c2 = cookieOf(r1);
    assert.notEqual(c1, c2);

    // Replaying the old (rotated) token is treated as theft...
    const replay = await request(app).post('/api/auth/refresh').set(XHR).set('Cookie', c1);
    assert.equal(replay.status, 401);
    // ...and revokes the whole session, so the newest token stops working too.
    const after = await request(app).post('/api/auth/refresh').set(XHR).set('Cookie', c2);
    assert.equal(after.status, 401);
  });

  test('refresh requires the CSRF header', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@t.dev', password: 'Password123' });
    const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
    assert.equal((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status, 403);
  });

  test('locks the account after 5 failed attempts', async () => {
    const { token } = await login('admin@t.dev');
    await request(app).post('/api/users').set(bearer(token))
      .send({ name: 'Lock Me', email: 'lock@t.dev', password: 'Password123', role: 'user' });
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({ email: 'lock@t.dev', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'lock@t.dev', password: 'Password123' });
    assert.equal(res.status, 429);
  });
});

describe('teams, projects, tasks and comments', () => {
  const ctx = {};

  test('only admins add users; there are two roles', async () => {
    ctx.admin = await login('admin@t.dev');
    for (const [name, email] of [['User A', 'a@t.dev'], ['User B', 'b@t.dev'], ['Outsider', 'out@t.dev']]) {
      const r = await request(app).post('/api/users').set(bearer(ctx.admin.token))
        .send({ name, email, password: 'Password123', role: 'user' });
      assert.equal(r.status, 201, r.text);
    }
    const badRole = await request(app).post('/api/users').set(bearer(ctx.admin.token))
      .send({ name: 'M', email: 'm@t.dev', password: 'Password123', role: 'manager' });
    assert.equal(badRole.status, 400);

    ctx.a = await login('a@t.dev');
    ctx.b = await login('b@t.dev');
    ctx.out = await login('out@t.dev');
    const denied = await request(app).post('/api/users').set(bearer(ctx.a.token))
      .send({ name: 'X', email: 'x@t.dev', password: 'Password123', role: 'user' });
    assert.equal(denied.status, 403);
  });

  test('admin creates a team and a project; users cannot', async () => {
    const team = await request(app).post('/api/teams').set(bearer(ctx.admin.token))
      .send({ name: 'Web', members: [ctx.a.user._id, ctx.b.user._id] });
    assert.equal(team.status, 201, team.text);
    ctx.team = team.body.team;

    const project = await request(app).post('/api/projects').set(bearer(ctx.admin.token))
      .send({ name: 'Storefront', key: 'web', teams: [ctx.team._id] });
    assert.equal(project.status, 201, project.text);
    ctx.project = project.body.project;

    assert.equal((await request(app).post('/api/teams').set(bearer(ctx.a.token)).send({ name: 'Mine' })).status, 403);
    assert.equal((await request(app).post('/api/projects').set(bearer(ctx.a.token))
      .send({ name: 'Mine', key: 'MINE', teams: [ctx.team._id] })).status, 403);
  });

  test('task validation: required fields and no past due date', async () => {
    const missing = await request(app).post('/api/tasks').set(bearer(ctx.a.token)).send({ project: ctx.project._id });
    assert.equal(missing.status, 400);
    const fields = missing.body.error.details.map((d) => d.field);
    assert.ok(fields.includes('title') && fields.includes('priority'));

    const past = await request(app).post('/api/tasks').set(bearer(ctx.a.token))
      .send({ project: ctx.project._id, title: 'Old', priority: 'low', dueDate: '2020-01-01' });
    assert.equal(past.status, 400);
  });

  test('anyone on the project assigns an unassigned task; only admin or assignee reassigns', async () => {
    const created = await request(app).post('/api/tasks').set(bearer(ctx.a.token))
      .send({ project: ctx.project._id, title: 'Fix checkout', priority: 'high', dueDate: future(3) });
    assert.equal(created.status, 201, created.text);
    assert.equal(created.body.task.key, 'WEB-1');
    ctx.task = created.body.task;

    assert.equal((await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.a.token))
      .send({ assignee: ctx.a.user._id })).status, 200);
    assert.equal((await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.b.token))
      .send({ assignee: ctx.b.user._id })).status, 403);
    assert.equal((await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.admin.token))
      .send({ assignee: ctx.out.user._id })).status, 400);
    assert.equal((await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.admin.token))
      .send({ assignee: ctx.b.user._id })).status, 200);
  });

  test('comments can be added and edited by their author, and show up in history', async () => {
    const c = await request(app).post(`/api/tasks/${ctx.task._id}/comments`).set(bearer(ctx.a.token)).send({ body: 'Looking into it' });
    assert.equal(c.status, 201);
    const other = await request(app).patch(`/api/tasks/${ctx.task._id}/comments/${c.body.comment._id}`)
      .set(bearer(ctx.b.token)).send({ body: 'Hijack' });
    assert.equal(other.status, 403);
    const edit = await request(app).patch(`/api/tasks/${ctx.task._id}/comments/${c.body.comment._id}`)
      .set(bearer(ctx.a.token)).send({ body: 'Looking into it now' });
    assert.ok(edit.body.comment.editedAt);

    const history = await request(app).get(`/api/tasks/${ctx.task._id}/activity`).set(bearer(ctx.a.token));
    const actions = history.body.items.map((i) => i.action);
    assert.ok(actions.includes('created') && actions.includes('commented') && actions.includes('updated'));
    const reassign = history.body.items.find((i) => i.changes.some((ch) => ch.field === 'assignee' && ch.to === 'User B'));
    assert.ok(reassign, 'assignee change is recorded with names');
  });

  test('tasks cannot be deleted; closed tasks are read-only until reopened', async () => {
    assert.equal((await request(app).delete(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.admin.token))).status, 404);
    const close = await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.b.token)).send({ status: 'closed' });
    assert.equal(close.body.permissions.canEdit, false);
    assert.equal((await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.b.token)).send({ title: 'Changed' })).status, 400);
    assert.equal((await request(app).patch(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.b.token)).send({ status: 'todo' })).status, 200);
  });

  test('users outside the project cannot see its tasks', async () => {
    assert.equal((await request(app).get(`/api/tasks/${ctx.task._id}`).set(bearer(ctx.out.token))).status, 404);
    assert.equal((await request(app).get('/api/tasks').set(bearer(ctx.out.token))).body.meta.total, 0);
  });

  test('"deleting" a user deactivates them: record kept, sessions ended, open tasks unassigned', async () => {
    assert.equal((await request(app).delete(`/api/users/${ctx.b.user._id}`).set(bearer(ctx.admin.token))).status, 404);

    const res = await request(app).patch(`/api/users/${ctx.b.user._id}`).set(bearer(ctx.admin.token)).send({ isActive: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.isActive, false);
    assert.equal(res.body.unassignedTasks, 1);

    assert.equal((await request(app).get('/api/tasks').set(bearer(ctx.b.token))).status, 401);

    // Gone from the app: not listed, not viewable, not in team member lists, email not reusable.
    const users = await request(app).get('/api/users').set(bearer(ctx.admin.token));
    assert.ok(!users.body.items.some((u) => u.email === 'b@t.dev'));
    assert.equal((await request(app).get(`/api/users/${ctx.b.user._id}`).set(bearer(ctx.admin.token))).status, 404);
    const team = await request(app).get(`/api/teams/${ctx.team._id}`).set(bearer(ctx.admin.token));
    assert.ok(!team.body.team.members.some((m) => m.email === 'b@t.dev'));
    const reuse = await request(app).post('/api/users').set(bearer(ctx.admin.token))
      .send({ name: 'B again', email: 'b@t.dev', password: 'Password123', role: 'user' });
    assert.equal(reuse.status, 400);

    // ...but still in the database.
    const { User } = await import('../src/models/index.js');
    const stored = await User.findById(ctx.b.user._id);
    assert.equal(stored.isActive, false);
    assert.ok(stored.deactivatedAt);
  });
});
