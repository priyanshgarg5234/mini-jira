import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseApiError } from '../api/baseApi';
import { useLoginMutation } from '../api/endpoints';
import { Button, Input } from '../components/ui';
import { setCredentials } from '../features/auth/authSlice';

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!values.email.trim()) found.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) found.email = 'Enter a valid email address';
    if (!values.password) found.password = 'Password is required';
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      const data = await login({ email: values.email.trim(), password: values.password }).unwrap();
      dispatch(setCredentials(data));
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      setErrors({ ...parsed.fields, form: parsed.message });
      setValues((v) => ({ ...v, password: '' }));
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__head">
          <h1>Mini Jira</h1>
          <p>Sign in to see your team’s tasks</p>
        </div>
        <form className="stack login__body" onSubmit={submit} noValidate>
          {errors.form && <div className="alert alert--error" role="alert">{errors.form}</div>}
          <Input label="Email" type="email" autoComplete="username" required value={values.email} error={errors.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} />
          <Input label="Password" type="password" autoComplete="current-password" required value={values.password} error={errors.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))} />
          <Button type="submit" loading={isLoading} className="btn--block">Sign in</Button>
          <p className="small muted center-text">Accounts are created by your workspace admin.</p>
        </form>
      </div>
    </div>
  );
}
