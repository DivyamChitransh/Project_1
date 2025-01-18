const mongoose = require('mongoose');
const userData = new mongoose.Schema({
    name: String,
    role: {type: String, enum: ['student','instructor']},
    email: String,
    enrolledCourses: [{type: mongoose.Schema.Types.ObjectId, ref: 'Course'}],
    preferredLanguage: String,
    active: {type:Boolean},
    profile: {
        bio:String,
        socialLinks: {platform: String,url:String},
        preferrences: {
            preferredLanguages: String
        }
    }
});

module.exports = mongoose.model('User',userData);