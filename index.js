const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/usermodels.js');
const Course = require('./models/coursemodels.js');
const app = express();
app.use(express.json());
mongoose.connect('mongodb://localhost:27017/LMS-DB')
.then(() => {
console.log('Database Connected!');
})
.catch(error => console.error(error));

app.post('/users', async(req,res) => {
    try{
        const user = new User(req.body);
    await user.save();
    res.status(201).send(user);
    }
    catch(error){
        res.status(400).send({message: 'Error in Creating user!',error});
    }
});

app.post('/users', async(req,res) => {
    try{
        const {name,email,role,preferredLanguage,profile} = req.body;
        const newUser = new User({name,email,role,preferredLanguage,profile})
    const saveuser = await newUser.save();
    res.status(200).json(saveuser);
    }
    catch(error){
        res.status(500).json({error:error.message})
    }
})

app.get('/users', async(req,res) => {
    const {role} = req.query;
    try{
        const filter = role?{role}:{};
        const users = await User.find(filter).populate({
            path: 'enrolledCourses',
            model: 'Course',
            select: 'name'
        });
    res.status(200).send(users);
    }
    catch(error){
        res.status(500).send({message: 'Error in retriving user!',error});
    }
});

app.get('/users/role',async(req,res) => {
    const {role} = req.query;
    try{
        const users = await User.find({role});
        res.status(200).send(users);
    }
    catch(error){
        res.status(400).send({message: 'Enter in retrieving user by role!',error});
    }
});

app.get('/users/advance-filter', async(req,res) => {
    const {preferredLanguages,platform,biokeyword} = req.query;
    try{
        const filter = {};
        if(preferredLanguages){
            filter['profile.preferrences.preferredLanguages'] = preferredLanguages;
        }
        if(platform){
            filter['profile.socialLinks.platform'] = platform;
        }
        if(biokeyword){
            filter['profile.bio'] = {$regex:biokeyword,$options:'i'};
        }
        const users = await User.find(filter);
        res.status(200).send(users);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
})

app.put('/users/:id' , async(req,res) => {
    try{
        const user = await User.findByIdAndUpdate(req.params.id,req.body,{new:true, runValidators:true});
        if(!user){
            return res.status(404).send({message: 'Invalid user!'});
        }
        res.status(200).send(user);
    }
    catch(error){
        res.status(400).send({messgae: 'Cannot update course!',error});
    }
});

app.delete('/users/:id' , async(req,res) => {
    try{
        const user = await User.findByIdAndDelete(req.params.id);
        if(!user){
            return res.status(404).send({message: 'Invalid user!'});
        }
        res.status(200).send({message: 'User deleted !', user});
    }
    catch(error){
        res.status(500).send({message: 'Error in Deleting!',error});
    }
});

app.post('/users/:id/enroll', async(req,res) => {
    const {id} = req.params;
    const {courseName} = req.body;

    try{
        const user = await User.findById(id);
        const course = await Course.findOne({title: courseName});
        if(!user || !course){
           return res.status(404).json({message: 'Cant find user or course!'});
        }
        if(user.role !== 'student'){
            return res.status(403).json({message: 'Only students can apply!'});
        }
        if(user.enrolledCourses.includes(course._id)){
            return res.status(400).json({message: 'User already enrolled in this course!'});
        }
        if(course.enrolledstudets.length >= course.max_capacity){
            return res.status(400).json({message: 'Max Capacity reached!'});
        }
        user.enrolledCourses.push(course._id);
        course.enrolledstudets.push(user._id);
        await user.save();
        await course.save();
        res.status(200).json({message: 'User enrolled!'});
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
});

app.get('/analytics/user-count', async(req,res) => {
    try{
        const usercount = await User.countDocuments();
        const usersbyrole = await User.aggregate([
            {$group: {_id: "$role", count: {$sum:1}}}
        ]);
        res.status(200).json({usercount,usersbyrole});
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
});

app.get('/analytics/user-report', async(req,res) => {
    try{
        const userreport = await User.aggregate([
            {$match: {active: true}},{$group: {_id: '$preferredLanguage',activeusers: { $sum: 1 },students: {$sum: {$cond: [{ $eq: ['$role', 'student'] }, 1, 0]}},
            instructors: {$sum: {$cond: [{ $eq: ['$role', 'instructor'] }, 1, 0]}}}},
            {$addFields: {totalStudents: '$students',totalInstructors: '$instructors'}},
            {$project: {_id:1,activeusers:1,totalstudents:'$students',totalinstructors:'$instructors'}},
        ]);
        res.status(200).json({userreport});
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
})

app.post('/courses', async(req,res) => {
    try{
    const course = new Course(req.body);
    await course.save();
    res.status(201).send(course);
    }
    catch(error){
        res.status(400).send({message: 'Unable to create course!',error});
    }
});

app.post('/courses', async(req,res) => {
    try{
        const {title,instructor,duration,max_capacity,category,schedule} = req.body;
        const newCourse = new Course({
            title,instructor,duration,max_capacity,category,schedule});
            const saveCourse = await newCourse.save();
            res.status(201).json(saveCourse);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
})

app.get('/courses', async(req,res) => {
    const {title,instructor} = req.query;
    try{
    const filter = {};
    if(title){
        filter.title = {$regex: title, $options: 'i'};
    }
    if(instructor){
    filter.instructor = {$regex: instructor, $option: 'i'};
    }
    const courses = await Course.find(filter, 'title instructor duration category');
    res.status(200).send(courses);
    }
    catch(error){
    res.status.send(500).send({message: "Error in Getting course!",error});
    }
});


app.get('/courses/filter',async(req,res) => {
    const {instructor,max_capacity,minDuration,day,titlekey} = req.query;
    try{
        const query = {};
        if(instructor){
            query.instructor = instructor;
        }
        if(max_capacity){
            query.max_capacity = {$gte: parseInt(max_capacity)};
        }
        if(minDuration){
            query.minDuration = {$gte: parseInt(minDuration)};
        }
        if(day){
            query['schedule.days'] = day;
        }
        if(titlekey){
            query.title = {$regex:titlekey,$options: 'i'};
        }
        const courses = await Course.find(query);
        res.status(200).send(courses);
    }
    catch(error){
        res.status(400).send({message: 'Enter in retrieving course!',error});
    }
});

app.get('/users/search', async(req,res) => {
    const {bio} = req.query;
    try{
        const users = await User.find({
            'profile.bio': {$regex:bio,$options:'i'},
        });
        res.status(200).send(users);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
})

app.put('/courses/:id' , async(req,res) => {
    try{
        const course = await Course.findByIdAndUpdate(req.params.id,req.body,{new:true, runValidators:true});
        if(!course){
            return res.status(404).send({message: 'Invalid Course!'});
        }
        res.status(200).send(course);
    }
    catch(error){
        res.status(400).send({messgae: 'Cannot update course!',error});
    }
});

app.delete('/courses/:id' , async(req,res) => {
    try{
        const course = await Course.findByIdAndDelete(req.params.id);
        if(!course){
            return res.status(404).send({message: 'Invalid Course!'});
        }
        res.status(200).send({message: 'Course deleted !', course});
    }
    catch(error){
        res.status(500).send({message: 'Error in Deleting!',error});
    }
});

app.get('/courses/:id/enrolled', async(req,res) => {
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({message: 'Invalid Course!'});
    }
    try{
        const students = await User.find({courseIds: id,role: 'student'});
        res.status(200).json(students);
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
});

app.get('/courses/search', async(req,res) => {
    const {title} = req.query;
    try{
        const courses = await Course.find({title: {$regex: title, $options: 'i'},});
        res.status(200).send(courses);
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
});

app.get('/analytics/course-count', async(req,res) => {
    try{
        const courseCount = await Course.aggregate([
            {$group: {_id: '$category', count: {$sum: 1}}},{$sort: {count:-1}}
        ]);
        res.status(200).json({courseCount});
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
});

app.get('/analytics/course-popularity', async(req,res) => {
    try{
        const coursepopular = await Course.aggregate([
            {$match: {enrollmentCount:{$gt:0}}},
            {$sort: {enrollmentCount: -1}},
            {$limit:5},{$project: {title:1,instructor:1,enrollmentCount:1}}
        ]);
        res.status(200).json({coursepopular});
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
});

app.get('/analytics/course-progress', async(req,res) => {
    try {
    const durationCategories = await Course.aggregate([
    {$addFields: {durationCategory: {$switch: {branches: [{ case: { $lte: ["$duration", 5] }, then: "short" },
    { case: { $and: [{ $gt: ["$duration", 5] }, { $lte: ["$duration", 15] }] }, then: "medium" }, 
    { case: { $gt: ["$duration", 15] }, then: "long" } ],default: "unknown" }}}},
    {$group: {_id: "$durationCategory",count: { $sum: 1 }}},
    {$project: {_id: 0,durationCategory: "$_id",count: 1}}
    ]);
        res.status(200).json({ durationCategories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/analytics/engagement', async(req,res) => {
    const {page = 1,limit = 10} = req.query;
    try{
        const engagementreport = await User.aggregate([
            {$group: {_id: '$preferredLanguage',totalUsers: {$sum: 1}}},
            {$addFields: {mostCommonPreferences: '$_id',totalPreferences: '$totalUsers'}},
            {$project: {_id:0,mostCommonPreferences:1,totalPreferences:1}},
            {$skip: (page-1)*limit},
            {$limit: parseInt(limit)}
        ]);
        res.status(200).json({page,limit,engagementreport});
    }
    catch(error){
        res.status(500).json({error: error.message});
    }
});

app.get('/analytics/summary', async(req,res) => {
    const {page=1, limit=5} = req.query;
    try{
        const Summary = await User.aggregate([{$facet: {users: [{$group: {_id: '$role',userCount:{$sum:1},avgCoursesEnrolled:{$avg:{$size:"$enrolledCourses"}}}},
        {$addFields: {mostPopularCourse: {$first:'$preferredLanguage'}}},
        {$project: {_id:1,userCount:1,avgCoursesEnrolled:1,mostPopularCourse:1}},
        {$skip:(page-1)*limit},
        {$limit:parseInt(limit)}],
        courses: [{$group:{_id:'$category',avgEnrollment:{$avg:'$enrollmentCount'},maxEnrollment:{$max:'$enrollmentCount'},
        totalenrollmentCount:{$sum:{$cond:[{$gt:['$enrollmentCount',0]},1,0]}}}},
        {$sort:{avgEnrollment: -1}},
        {$skip:(page-1)*limit},
        {$limit:parseInt(limit)}]}}]);
        res.status(200).json({page,limit,Summary});
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
});

app.get('/analytics/custom-report', async(req,res) => {
    const {filterField,filterValue,sortField='_id',sortOrder = 1,page=1,limit=10} = req.body;
    try{
        const customreport = await User.aggregate([
            {$match: {[filterField]:filterValue}},
            {$addFields: {enrollmentCount: {$size: '$enrolledCourses'}}},
            {$sort: {[sortField]: parseInt(sortOrder)}},
            {$skip: (page-1)*limit},
            {$limit: parseInt(limit)},
            {$project:{name:1,role:1,preferredLanguage:1,enrollmentCount:1}}
        ]);
        res.status(200).json({page,limit,customreport});
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
});

const PORT = 8081;
app.listen(PORT, () => {
    console.log(`Server Running at ${PORT}`);
})
