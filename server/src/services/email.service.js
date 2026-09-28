import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { escapeHtml } from '../utils/html.js';

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true }); // dev: nothing leaves the machine

const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Done', closed: 'Closed' };

async function send({ to, subject, text, html }) {
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
    logger.info({ to, subject, delivered: Boolean(env.smtp.host) }, 'Email sent');
  } catch (err) {
    // A mail failure must never fail the user's request.
    logger.error({ err, to, subject }, 'Email failed');
  }
}

/**
 * Locally, emails are sent in the background so requests stay fast.
 * On Vercel the function may be frozen right after responding, so we wait.
 * send() never throws, so awaiting it can't fail the request.
 */
export const deliver = (promise) => (env.isServerless ? promise : undefined);

const taskUrl = (task) => `${env.clientUrl}/tasks/${task._id}`;

/** To the assignee when a task is assigned to them (skipped if they assigned themselves). */
export function notifyTaskAssigned({ task, assignee, actor }) {
  if (!assignee?.email || String(assignee._id) === String(actor._id)) return;
  const title = escapeHtml(task.title);
  return send({
    to: assignee.email,
    subject: `[${task.key}] Assigned to you: ${task.title}`,
    text: `${actor.name} assigned ${task.key} to you.\n\n${task.title}\nPriority: ${task.priority}\n${
      task.dueDate ? `Due: ${task.dueDate.toISOString().slice(0, 10)}\n` : ''
    }\n${taskUrl(task)}`,
    html: `<p>${escapeHtml(actor.name)} assigned <strong>${task.key}</strong> to you.</p>
<p><strong>${title}</strong><br>Priority: ${task.priority}${
      task.dueDate ? `<br>Due: ${task.dueDate.toISOString().slice(0, 10)}` : ''
    }</p><p><a href="${taskUrl(task)}">Open task</a></p>`,
  });
}

/** To the task creator when the status changes (skipped if they changed it themselves). */
export function notifyStatusChanged({ task, reporter, actor, from, to }) {
  if (!reporter?.email || String(reporter._id) === String(actor._id)) return;
  return send({
    to: reporter.email,
    subject: `[${task.key}] Status changed to ${STATUS_LABEL[to]}`,
    text: `${actor.name} changed ${task.key} from ${STATUS_LABEL[from]} to ${STATUS_LABEL[to]}.\n\n${task.title}\n${taskUrl(task)}`,
    html: `<p>${escapeHtml(actor.name)} changed <strong>${task.key}</strong> from ${STATUS_LABEL[from]} to <strong>${
      STATUS_LABEL[to]
    }</strong>.</p><p>${escapeHtml(task.title)}</p><p><a href="${taskUrl(task)}">Open task</a></p>`,
  });
}
