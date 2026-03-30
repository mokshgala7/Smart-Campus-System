const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  studentObjId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, 
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date },
  durationMinutes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Session', sessionSchema);