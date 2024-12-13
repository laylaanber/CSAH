// src/models/Preference.js
const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    ref: 'Student'
  },
  preferredDays: {
    type: String,
    enum: ['sun_tue_thu', 'mon_wed', 'daily', 'idc'],
    required: true
  },
  preferBreaks: {
    type: String,
    enum: ['yes', 'no', 'idc'],
    required: true
  },
  targetCreditHours: {
    type: Number,
    required: true,
    min: 12,
    max: 18
  },
  specificCourses: [{
    type: String,
    ref: 'Course'
  }],
  coursesToImprove: [{
    type: String,
    ref: 'Course'
  }],
  categoryPreferences: {
    networking: {
      type: String,
      enum: ['prefer', 'neutral', 'dislike'],
      default: 'neutral'
    },
    hardware: {
      type: String,
      enum: ['prefer', 'neutral', 'dislike'],
      default: 'neutral'
    },
    software: {
      type: String,
      enum: ['prefer', 'neutral', 'dislike'],
      default: 'neutral'
    },
    electrical: {
      type: String,
      enum: ['prefer', 'neutral', 'dislike'],
      default: 'neutral'
    }
  }
}, { timestamps: true });

const PreferenceV2 = mongoose.model('PreferenceV2', preferenceSchema);
module.exports = PreferenceV2;