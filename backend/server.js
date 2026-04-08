const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('./automation'); // <-- Turns on the 4:00 PM automated emails
require('dotenv').config();

// --- IMPORT ROUTES ---
const authRoutes = require('./routes/auth');
const hardwareRoutes = require('./routes/hardware');
const dashboardRoutes = require('./routes/dashboard'); // Keep this active!

const app = express();

// --- MIDDLEWARE ---
app.use(express.json()); 
app.use(cors());        

// --- CONNECT TO DATABASE ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Database Connected Successfully'))
  .catch(err => console.error('❌ Database Error:', err));

// --- USE ROUTES ---
app.use('/api/auth', authRoutes); 
app.use('/api/hardware', hardwareRoutes); 
app.use('/api/dashboard', dashboardRoutes); // <-- Added this back so your tables load!

// A simple test route to verify it works
app.get('/api/status', (req, res) => {
  res.json({ message: 'Backend Engine is actively running!' });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});