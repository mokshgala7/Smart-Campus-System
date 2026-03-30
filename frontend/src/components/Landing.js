import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  // This function sends the user to the login page and securely passes their chosen role
  const handleSelectRole = (selectedRole) => {
    navigate('/login', { state: { role: selectedRole } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f4f4', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '40px', margin: '0', color: '#000' }}>⚡ Smart Campus Access</h1>
        <p style={{ fontSize: '18px', color: '#555', marginTop: '10px' }}>Please select your portal to continue</p>
      </div>

      <div style={{ display: 'flex', gap: '30px' }}>
        
        {/* STUDENT BUTTON */}
        <div 
          onClick={() => handleSelectRole('Student')}
          style={cardStyle}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>🧑‍🎓</div>
          <h2 style={{ margin: 0, color: '#000' }}>Student Portal</h2>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '10px' }}>View attendance & time spent</p>
        </div>

        {/* ADMIN BUTTON */}
        <div 
          onClick={() => handleSelectRole('Admin')}
          style={{...cardStyle, borderBottom: '8px solid #F44336'}} // Red accent for Admin
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '50px', marginBottom: '15px' }}>🛡️</div>
          <h2 style={{ margin: 0, color: '#000' }}>Admin Portal</h2>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '10px' }}>Enroll students & manage system</p>
        </div>

      </div>
    </div>
  );
}

const cardStyle = {
  width: '250px',
  padding: '40px 20px',
  backgroundColor: '#fff',
  border: '3px solid #000',
  borderBottom: '8px solid #FFC107', // Yellow accent for Student
  borderRadius: '12px',
  boxShadow: '6px 6px 0px #000',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
};

export default Landing;