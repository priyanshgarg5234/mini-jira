import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export const NotFoundPage = () => (
  <EmptyState title="Page not found" action={<Link to="/" className="btn btn--primary btn--md">Go to tasks</Link>}>
    The link may be wrong, or the item was deleted.
  </EmptyState>
);
