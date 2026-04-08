import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function StudentDashboard() {
  const [mySessions, setMySessions] = useState([]);
  const [totalTime, setTotalTime] = useState(0);
  const navigate = useNavigate();

  // Get user from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id || user._id; // Handle both ID formats

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'Student') {
      navigate('/');
    } else {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [navigate]);

  const fetchData = async () => {
    try {
      const response = await axios.get('https://smart-campus-system-87sd.onrender.com/api/dashboard');
      const allSessions = response.data.sessions || [];

      // 1. Filter sessions for THIS student only
      const filteredSessions = allSessions.filter(session => {
        const studentId = session.studentObjId?._id || session.studentObjId;
        return studentId === userId;
      });

      setMySessions(filteredSessions);

      // 2. Sum up total minutes correctly
      const totalMinutes = filteredSessions.reduce((sum, session) => {
        const mins = parseInt(session.durationMinutes) || 0;
        return sum + mins;
      }, 0);
      
      setTotalTime(totalMinutes);

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleSignOut = () => {
    localStorage.clear(); 
    navigate('/');        
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayHours = Math.floor(totalTime / 60);
  const displayMinutes = totalTime % 60;

  // --- STYLES ---
  const cardStyle = { backgroundColor: '#fff', padding: '25px', border: '3px solid #000', borderRadius: '8px', boxShadow: '6px 6px 0px #000' };
  const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '15px' };
  const thStyle = { padding: '12px', textAlign: 'left', borderBottom: '3px solid #000' };
  const tdStyle = { padding: '12px', borderBottom: '1px solid #ddd' };
  const signOutBtnStyle = { padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '20px', border: '3px solid #000', borderRadius: '8px', boxShadow: '5px 5px 0px #000', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#000', textTransform: 'capitalize' }}>🧑‍🎓 Welcome, {user.name}!</h1>
          <p style={{ margin: '5px 0 0 0', color: '#555', fontWeight: 'bold' }}>Personal Attendance Portal</p>
        </div>
        <button onClick={handleSignOut} style={signOutBtnStyle}>
          Sign Out
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

        <div style={{...cardStyle, borderBottom: '8px solid #FFC107', textAlign: 'center'}}>
          <h2 style={{ margin: 0, color: '#555', fontSize: '18px', textTransform: 'uppercase' }}>Total Time on Campus</h2>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#000', marginTop: '10px' }}>
            {displayHours > 0 && <span>{displayHours} <span style={{fontSize: '20px', color: '#555'}}>hrs</span> </span>}
            {displayMinutes} <span style={{fontSize: '20px', color: '#555'}}>mins</span>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ borderBottom: '4px solid #FF9800', paddingBottom: '10px', marginTop: 0 }}>My Gate Activity</h2>
          {mySessions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#555', fontStyle: 'italic', padding: '20px' }}>No gate scans recorded yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#eee' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Check In</th>
                  <th style={thStyle}>Check Out</th>
                  <th style={thStyle}>Session Duration</th>
                </tr>
              </thead>
              <tbody>
                {mySessions.map(session => (
                  <tr key={session._id}>
                    <td style={tdStyle}>{session.date}</td>
                    <td style={tdStyle}>{formatTime(session.checkInTime)}</td>
                    <td style={tdStyle}>{formatTime(session.checkOutTime)}</td>
                    <td style={tdStyle}>
                      {session.durationMinutes > 0 
                        ? <strong style={{ color: '#F44336' }}>{session.durationMinutes} min</strong> 
                        : <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Active Now...</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
