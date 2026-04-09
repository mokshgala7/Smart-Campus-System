import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const passedRole = location.state?.role || 'Student';

  const [isRegistering, setIsRegistering] = useState(false);
  const [role] = useState(passedRole); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sapId, setSapId] = useState(''); 
  
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!location.state?.role) navigate('/');
  }, [navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      if (isRegistering) {
        const payload = { role, name, email, password };
        if (role === 'Student') payload.sap_id = sapId;

        const res = await axios.post('http://localhost:5000/api/auth/register', payload);
        setMessage({ text: res.data.message, type: 'success' });
        setIsRegistering(false); 
        setPassword(''); 
        setSapId('');
      } else {
        const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });

        if (response.data.user.role !== role) {
          setMessage({ text: `Access Denied. This is the ${role} portal.`, type: 'error' });
          return;
        }

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.user.role);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        navigate(response.data.user.role === 'Admin' ? '/admin' : '/student');
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Something went wrong. Try again.', type: 'error' });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f4f4', fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/')} style={{ position: 'absolute', top: '20px', left: '20px', padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
        ← Back to Options
      </button>

      <div style={{ width: '400px', padding: '40px', border: '3px solid #000', borderRadius: '12px', boxShadow: '8px 8px 0px #000', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: '0', color: '#000', fontSize: '28px' }}>{role} Portal</h1>
          <div style={{ height: '4px', width: '50px', backgroundColor: role === 'Admin' ? '#F44336' : '#FF9800', margin: '10px auto' }}></div>
          <h2 style={{ margin: '0', color: '#555', fontSize: '18px' }}>
            {isRegistering ? 'Create an Account' : 'Secure Login'}
          </h2>
        </div>

        {message.text && (
          <div style={{ padding: '10px', marginBottom: '20px', border: '2px solid #000', backgroundColor: message.type === 'error' ? '#ffebee' : '#e8f5e9', color: message.type === 'error' ? '#F44336' : '#4CAF50', fontWeight: 'bold', textAlign: 'center' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isRegistering && (
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
          )}

          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
          
          {isRegistering && role === 'Student' && (
            <input type="text" placeholder="SAP ID / Roll Number" value={sapId} onChange={(e) => setSapId(e.target.value)} style={{...inputStyle, border: '2px solid #FF9800'}} required />
          )}

          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />

          <button type="submit" style={buttonStyle}>
            {isRegistering ? 'Register Now' : 'Access Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontWeight: 'bold' }}>
          {isRegistering ? "Already have an account? " : "Need an account? "}
          <span onClick={() => { setIsRegistering(!isRegistering); setMessage({ text: '', type: '' }); }} style={{ color: '#F44336', cursor: 'pointer', textDecoration: 'underline' }}>
            {isRegistering ? 'Log In here' : 'Register here'}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = { padding: '12px', fontSize: '16px', border: '2px solid #000', borderRadius: '4px', outline: 'none', width: '100%', boxSizing: 'border-box' };
const buttonStyle = { padding: '14px', fontSize: '16px', backgroundColor: '#FFC107', color: '#000', border: '2px solid #000', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '3px 3px 0px #000', marginTop: '10px' };

export default Login;