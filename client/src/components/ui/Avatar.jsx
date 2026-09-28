const initials = (name = '?') => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export const Avatar = ({ user, size = 32 }) => (
  <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} title={user?.name} aria-hidden="true">
    {initials(user?.name)}
  </span>
);
