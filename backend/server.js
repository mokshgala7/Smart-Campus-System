const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('./automation'); 
require('dotenv').config();

const authRoutes = require('./routes/auth');
const hardwareRoutes = require('./routes/hardware');
const dashboardRoutes = require('./routes/dashboard'); 

const app = express();

app.use(express.json()); 
app.use(cors());        

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Database Connected Successfully'))
  .catch(err => console.error('❌ Database Error:', err));

app.use('/api/auth', authRoutes); 
app.use('/api/hardware', hardwareRoutes); 
app.use('/api/dashboard', dashboardRoutes); 

app.get('/api/status', (req, res) => {
  res.json({ message: 'Backend Engine is actively running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});