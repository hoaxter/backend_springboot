import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register({ onAuth }) {
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', role:'RIDER', vehicleNumber:'', vehicleType:'Sedan' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      onAuth();
      nav(data.role === 'RIDER' ? '/rider' : '/driver');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        <h1>Join <span style={{background:'linear-gradient(135deg,#6366f1,#a855f7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>RideBook</span></h1>
        <p>Create an account to get started</p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="role-toggle">
          <button className={`role-btn ${form.role==='RIDER'?'active':''}`} onClick={()=>set('role','RIDER')}>🚶 Rider</button>
          <button className={`role-btn ${form.role==='DRIVER'?'active':''}`} onClick={()=>set('role','DRIVER')}>🚗 Driver</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Enter your name" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="Enter email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Create password" required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="Phone number" />
          </div>
          {form.role === 'DRIVER' && <>
            <div className="form-group">
              <label>Vehicle Number</label>
              <input className="input" value={form.vehicleNumber} onChange={e=>set('vehicleNumber',e.target.value)} placeholder="e.g., KA01AB1234" required />
            </div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <select className="input" value={form.vehicleType} onChange={e=>set('vehicleType',e.target.value)}>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
          </>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <a onClick={()=>nav('/login')}>Sign In</a>
        </div>
      </div>
    </div>
  );
}
