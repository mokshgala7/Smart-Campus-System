const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['Admin', 'Student'], required: true },
  name: { type: String, required: true },
  sap_id: { type: String, unique: true, sparse: true }, // The unique college ID
  email: { type: String, unique: true, sparse: true },
  password: { type: String }, // Optional at first, until the student registers
  
  // Hardware Links
  studentId: { type: String, unique: true, sparse: true }, // The RFID UID
  fingerprintId: { type: Number },
  
  // Status Flags
  isRegistered: { type: Boolean, default: false }, // True once student creates a password
  currentStatus: { type: String, enum: ['Inside', 'Outside'], default: 'Outside' }
});

module.exports = mongoose.model('User', userSchema);