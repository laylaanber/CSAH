const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    section: {
        type: String,
        required: true
    },
    days: {
        type: String,
        enum: [
            'Sunday-Tuesday-Thursday', 
            'Monday-Wednesday',
            'Sunday-Tuesday',
            'Wednesday-Monday',
            'Thursday-Sunday-Tuesday',
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Sunday-Monday-Tuesday-Wednesday-Thursday',
            'N/A'
        ],
        required: true
    },
    time: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                // Allow "00:00 - 00:00" for N/A times and normal time ranges
                return /^([0-2][0-9]:[0-5][0-9]\s-\s[0-2][0-9]:[0-5][0-9])$/.test(v);
            },
            message: props => `${props.value} is not a valid time format! Use HH:MM - HH:MM`
        }
    }
});

const availableSectionSchema = new mongoose.Schema({
    semester: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\d{4}-[1-2]$/.test(v);
            },
            message: props => `${props.value} is not a valid semester format! Use YYYY-[1-2]`
        }
    },
    courses: [{
        courseId: {
            type: String,
            required: true,
            ref: 'CourseV2'
        },
        courseName: {
            type: String,
            required: true
        },
        sections: [sectionSchema]
    }]
}, { timestamps: true });

availableSectionSchema.index({ semester: 1 });
availableSectionSchema.index({ 'courses.courseId': 1 });

const AvailableSectionV2 = mongoose.model('AvailableSectionV2', availableSectionSchema);
module.exports = AvailableSectionV2;