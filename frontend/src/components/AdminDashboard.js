import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
  const [data, setData] = useState({ students: [], sessions: [] });
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [enrollStep, setEnrollStep] = useState(1); 
  const [formData, setFormData] = useState({ name: '', email: '', sap_id: '' });
  const [scanStatus, setScanStatus] = useState('Waiting for hardware scan...');

  // BUG 3 FIX: Store the poll interval in a ref so closeModal/abort can ALWAYS
  // clear it, regardless of whether the component re-rendered since it was created.
  // A locally-scoped variable inside startHardwareScan is unreachable from closeModal.
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'Admin') navigate('/');

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/');
  };

  const startHardwareScan = async (e) => {
    e.preventDefault();
    setEnrollStep(2); 
    
    try {
      await axios.post('http://localhost:5000/api/hardware/set-mode', { mode: 'ENROLL' });
      
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await axios.get('http://localhost:5000/api/hardware/enroll-status');
          const { rfid, fingerprint, message } = statusRes.data;

          if (message) {
            setScanStatus(message);
          }

          if (rfid && fingerprint) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            
            await axios.post('http://localhost:5000/api/auth/register', {
              ...formData,
              role: 'Student',
              password: 'smartcampus123',
              studentId: rfid,
              fingerprintId: fingerprint
            });

            await axios.post('http://localhost:5000/api/hardware/set-mode', { mode: 'GATE' });
            
            setEnrollStep(3); 
            fetchData(); 
          }
        } catch (intervalErr) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          await axios.post('http://localhost:5000/api/hardware/set-mode', { mode: 'GATE' }); 
          
          const errorMsg = intervalErr.response?.data?.error || "Registration failed.";
          setScanStatus(`❌ Error: ${errorMsg}`);
        }
      }, 1000);

    } catch (err) {
      console.error("Hardware initialization error", err);
      setScanStatus("❌ Error communicating with hardware.");
    }
  };

  const closeModal = async () => {
    // BUG 3 FIX: Always clear the poll interval before closing.
    // Without this, clicking "Abort" leaves a zombie interval running,
    // which continues to call setState on an unmounted component and
    // can trigger unexpected re-registrations.
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setShowModal(false);
    setEnrollStep(1);
    setFormData({ name: '', email: '', sap_id: '' });
    setScanStatus('Waiting for hardware scan...');
    await axios.post('http://localhost:5000/api/hardware/set-mode', { mode: 'GATE' });
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh', position: 'relative' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '20px', border: '3px solid #000', borderRadius: '8px', boxShadow: '5px 5px 0px #000', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#000' }}>🛡️ Administrator Console</h1>
          <p style={{ margin: '5px 0 0 0', color: '#555', fontWeight: 'bold' }}>Live Campus Monitoring</p>
        </div>
        <div>
          <button onClick={() => setShowModal(true)} style={{...btnStyle, backgroundColor: '#4CAF50', marginRight: '15px'}}>
            + Provision New Student
          </button>
          <button onClick={handleSignOut} style={btnStyle}>Sign Out</button>
        </div>
      </div>

      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ borderBottom: '4px solid #F44336', paddingBottom: '10px', marginTop: 0 }}>
              Hardware Enrollment
            </h2>

            {enrollStep === 1 && (
              <form onSubmit={startHardwareScan} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <input type="text" placeholder="Student Name" required style={inputStyle} 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input type="email" placeholder="Student Email" required style={inputStyle} 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="text" placeholder="SAP ID / Roll Number" required style={inputStyle} 
                  value={formData.sap_id} onChange={e => setFormData({...formData, sap_id: e.target.value})} />
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" style={{...btnStyle, backgroundColor: '#FFC107', flex: 1, color: '#000'}}>Next: Scan Hardware</button>
                  <button type="button" onClick={closeModal} style={{...btnStyle, backgroundColor: '#ddd', color: '#000'}}>Cancel</button>
                </div>
              </form>
            )}

            {enrollStep === 2 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>📡</div>
                <h3 style={{ margin: '0 0 10px 0' }}>System is in ENROLL Mode</h3>
                
                <p style={{ color: '#000', backgroundColor: '#FFC107', padding: '10px', borderRadius: '4px', fontWeight: 'bold', border: '2px solid #000' }}>
                  {scanStatus}
                </p>
                
                <p style={{ fontSize: '12px', color: '#888', marginTop: '20px' }}>Please scan the new RFID card and fingerprint at the physical gate now.</p>
                <button onClick={closeModal} style={{...btnStyle, backgroundColor: '#F44336', marginTop: '20px'}}>Abort Registration</button>
              </div>
            )}

            {enrollStep === 3 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>🎉</div>
                <h3 style={{ margin: '0 0 10px 0' }}>Student Provisioned Successfully!</h3>
                <p style={{ color: '#555' }}>The hardware ID has been permanently linked to SAP ID: {formData.sap_id}.</p>
                <button onClick={closeModal} style={{...btnStyle, backgroundColor: '#000', marginTop: '20px'}}>Close & Return to Dashboard</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
        <div style={cardStyle}>
          <h2 style={{ borderBottom: '4px solid #FFC107', paddingBottom: '10px', marginTop: 0 }}>Enrolled Students</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}><th style={thStyle}>Name</th><th style={thStyle}>SAP ID</th><th style={thStyle}>Status</th></tr>
            </thead>
            <tbody>
              {data.students.map(student => (
                <tr key={student._id}>
                  <td style={tdStyle}><strong>{student.name}</strong></td>
                  <td style={tdStyle}>{student.sap_id || '--'}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: '2px solid #000', backgroundColor: student.currentStatus === 'Inside' ? '#FFC107' : '#F44336', color: student.currentStatus === 'Inside' ? '#000' : '#fff' }}>
                      {student.currentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={cardStyle}>
          <h2 style={{ borderBottom: '4px solid #FF9800', paddingBottom: '10px', marginTop: 0 }}>Live Gate Activity</h2>
          <table style={tableStyle}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}><th style={thStyle}>Date</th><th style={thStyle}>Student</th><th style={thStyle}>Check In</th><th style={thStyle}>Check Out</th></tr>
            </thead>
            <tbody>
              {data.sessions.map(session => (
                <tr key={session._id}>
                  <td style={tdStyle}>{session.date}</td>
                  <td style={tdStyle}><strong>{session.studentObjId?.name || 'Unknown'}</strong></td>
                  <td style={tdStyle}>{new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={tdStyle}>{session.checkOutTime ? new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Now...'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

const cardStyle = { backgroundColor: '#fff', padding: '25px', border: '3px solid #000', borderRadius: '8px', boxShadow: '6px 6px 0px #000' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '15px' };
const thStyle = { padding: '12px', textAlign: 'left', borderBottom: '3px solid #000' };
const tdStyle = { padding: '12px', borderBottom: '1px solid #ddd' };
const btnStyle = { padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };
const inputStyle = { padding: '12px', fontSize: '16px', border: '2px solid #000', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#fff', padding: '40px', border: '4px solid #000', borderRadius: '12px', width: '400px', boxShadow: '10px 10px 0px #000', boxSizing: 'border-box' };

export default AdminDashboard;