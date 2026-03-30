const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

async function createFirstAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Creating Admin...');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@college.edu' });
    if (adminExists) {
      console.log('Admin account already exists!');
      process.exit();
    }

    // Hash the password for security
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create the Admin User
    const adminUser = new User({
      role: 'Admin',
      name: 'College Administrator',
      email: 'admin@college.edu',
      password: hashedPassword
    });

    await adminUser.save();
    console.log('✅ Success! Admin account created.');
    console.log('Email: admin@college.edu');
    console.log('Password: admin123');
    process.exit();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createFirstAdmin();