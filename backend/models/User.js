const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  role: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, 
  sap_id: { type: String },
  studentId: { type: String },       // The RFID Tag
  fingerprintId: { type: String },   // The Fingerprint ID Scanner Number
  isRegistered: { type: Boolean, default: false },
  currentStatus: { type: String, default: 'Outside' }
});

module.exports = mongoose.model('User', UserSchema);