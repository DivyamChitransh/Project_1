const mongoose = require('mongoose');
const courseData = new mongoose.Schema({
    title: String,
    instructor: String,
    duration: String,
    max_capacity: Number,
    enrolledstudents: [{type: mongoose.Schema.Types.ObjectId,ref: 'User'}],
    enrollmentCount: {type:Number, default:0},
    category: String,
    schedule: {
        startDate:Date,
        endDate: Date,
        days:[String]
    }
});

module.exports = mongoose.model('Course',courseData);