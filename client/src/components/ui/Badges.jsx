import { PRIORITIES, STATUSES, labelOf } from '../../utils/constants';

export const PriorityBadge = ({ priority }) => (
  <span className={`badge badge--${priority}`}>{labelOf(PRIORITIES, priority)}</span>
);

export const StatusBadge = ({ status }) => (
  <span className={`badge badge--st-${status}`}>{labelOf(STATUSES, status)}</span>
);

export const RoleBadge = ({ role }) => <span className={`badge badge--role-${role}`}>{role}</span>;
