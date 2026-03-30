require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Session = require('./models/Session');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('🔗 Connected to Database...');
  
  // 1. DROP THE ENTIRE DATABASE (Destroys all corrupted invisible rules)
  await mongoose.connection.db.dropDatabase();
  console.log('💥 Database completely destroyed and wiped clean!');

  // 2. CREATE A BRAND NEW, CLEAN ADMIN
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const newAdmin = new User({
    role: 'Admin',
    name: 'Main Admin',
    email: 'admin@college.edu',
    password: hashedPassword,
    isRegistered: true
  });
  
  await newAdmin.save();
  console.log('✅ Fresh Admin Created!');
  console.log('📧 Admin Login: admin@college.edu');
  console.log('🔑 Password: admin123');
  console.log('\n🚀 System reset! You can now start your server and register Moksh safely.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});