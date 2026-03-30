import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard'; // <-- UNLOCKED

function App() {
  return (
    <div style={{ backgroundColor: '#f4f4f4', minHeight: '100vh', margin: 0 }}>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/student" element={<StudentDashboard />} /> {/* <-- UNLOCKED */}
        </Routes>
      </Router>
    </div>
  );
}

export default App;