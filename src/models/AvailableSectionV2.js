const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    section: {
        type: String,
        required: true
    },
    days: {
        type: String,
        enum: ['Sunday-Tuesday-Thursday', 'Monday-Wednesday'],
        required: true
    },
    time: {
        type: String,
        required: true
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
            message: props => `${props.value} is not a valid semester format!`
        }
    },
    courses: [{
        courseId: {
            type: String,
            required: true,
            ref: 'CourseV2'
        },
        sections: [sectionSchema]
    }]
}, { timestamps: true });

availableSectionSchema.index({ semester: 1 });

const AvailableSectionV2 = mongoose.model('AvailableSectionV2', availableSectionSchema);
module.exports = AvailableSectionV2;