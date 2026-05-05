import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      onAuth();
      nav(data.role === 'RIDER' ? '/rider' : '/driver');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const fillDemo = (role) => {
    setEmail(role === 'rider' ? 'rider@demo.com' : 'driver1@demo.com');
    setPassword('password');
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        <h1>Welcome to <span style={{background:'linear-gradient(135deg,#6366f1,#a855f7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>RideBook</span></h1>
        <p>Sign in to book rides or start driving</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn btn-outline" style={{flex:1,fontSize:12}} onClick={()=>fillDemo('rider')}>Demo Rider</button>
          <button className="btn btn-outline" style={{flex:1,fontSize:12}} onClick={()=>fillDemo('driver')}>Demo Driver</button>
        </div>
        <div className="auth-switch">
          Don't have an account? <a onClick={()=>nav('/register')}>Sign Up</a>
        </div>
      </div>
    </div>
  );
}
