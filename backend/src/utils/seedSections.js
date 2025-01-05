const mongoose = require('mongoose');
const AvailableSectionV2 = require('../models/AvailableSectionV2');
const sections = require('../data/courses_sections.json');
require('dotenv').config();

async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/course-selection-hub';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
        });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

async function seedSections() {
    try {
        const sections = require('../data/courses_sections.json');
        await AvailableSectionV2.deleteMany({}); // Clear existing
        await AvailableSectionV2.create(sections);
        console.log('Successfully seeded sections data');
    } catch (error) {
        console.error('Error seeding sections:', error);
    }
}

// Run this once to populate the database
seedSections();