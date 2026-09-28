import { useState } from 'react';
import { parseApiError } from '../../api/baseApi';
import { useAddCommentMutation, useGetCommentsQuery, useUpdateCommentMutation } from '../../api/endpoints';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDateTime, timeAgo } from '../../utils/dates';
import { Avatar } from '../ui';
import { Button, Spinner } from '../ui';

function CommentItem({ comment, taskId, mine }) {
  const toast = useToast();
  const [updateComment, { isLoading }] = useUpdateCommentMutation();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);

  const save = async () => {
    if (!text.trim()) return toast.error('Comment cannot be empty');
    try {
      await updateComment({ id: taskId, commentId: comment._id, body: text.trim() }).unwrap();
      setEditing(false);
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  return (
    <li className="comment">
      <Avatar user={comment.author} />
      <div className="comment__main">
        <div className="comment__meta">
          <strong>{comment.author?.name ?? 'Unknown user'}</strong>
          <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt)}>{timeAgo(comment.createdAt)}</time>
          {comment.editedAt && <span className="muted small" title={`Edited ${formatDateTime(comment.editedAt)}`}>(edited)</span>}
          {mine && !editing && (
            <button type="button" className="btn btn--link btn--tiny" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>
        {editing ? (
          <div className="stack stack--tight">
            <textarea className="input textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit comment" autoFocus />
            <div className="row">
              <Button size="sm" loading={isLoading} onClick={save}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => { setText(comment.body); setEditing(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="comment__body prose">{comment.body}</p>
        )}
      </div>
    </li>
  );
}

export function Comments({ taskId }) {
  const toast = useToast();
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useGetCommentsQuery(taskId);
  const [addComment, { isLoading: posting }] = useAddCommentMutation();
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const post = async () => {
    if (!text.trim()) return setError('Write something first');
    try {
      await addComment({ id: taskId, body: text.trim() }).unwrap();
      setText('');
      setError('');
    } catch (err) {
      toast.error(parseApiError(err).message);
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="comments">
      {comments.length === 0 ? (
        <p className="muted comments__empty">No comments yet. Start the discussion below.</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <CommentItem key={c._id} comment={c} taskId={taskId} mine={c.author?._id === user._id} />
          ))}
        </ul>
      )}
      <div className="composer">
        <Avatar user={user} />
        <div className="composer__main">
          <label htmlFor="new-comment" className="sr-only">Add a comment</label>
          <textarea
            id="new-comment"
            className={`input textarea ${error ? 'input--error' : ''}`}
            rows={3}
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => { setText(e.target.value); setError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); post(); }
            }}
          />
          {error && <p className="field__error">{error}</p>}
          <div className="composer__actions">
            <span className="small muted">Ctrl + Enter to post</span>
            <Button size="sm" onClick={post} loading={posting} disabled={!text.trim()}>Comment</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
