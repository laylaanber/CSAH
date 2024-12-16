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
        await connectDB();
        console.log('Starting section seeding...');
        
        // Clear existing sections
        await AvailableSectionV2.deleteMany({});
        console.log('Cleared existing sections');

        // Insert new sections
        const result = await AvailableSectionV2.create(sections);
        console.log(`Seeded ${result.courses?.length || 0} courses with sections`);
        
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    }
}

seedSections();