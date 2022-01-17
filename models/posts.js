const dotenv = require("dotenv");
const { ObjectId } = require("mongodb");
const _conn = require("../General/dbContext");
const dateTime = require("../General/dateTime");
dotenv.config();

/* Mongo collection */
const collectionName = "posts";

/* CRUD Operation */
module.exports = {
    // [GET] ReadList (Partially, Filtering, and Categorize) - add filter by name
    ReadListPost: function (page, pageLength, filterByCategory, sortBy, res) {
        if (!page || !pageLength)
            return res.status(400).send({ code: 0, message: `Bad Request` });
        try {
            _conn.dbContext((error, db) => {
                if (error) throw error;
                const posts = db.collection(collectionName);
                // filtering
                let filter = {};
                if (filterByCategory)
                    filter = {categories: filterByCategory};
                // sorting
                let sort = {};
                if (sortBy) {
                    if (sortBy === "Popular") sort = {likes: -1};
                    if (sortBy === "Latest") sort = {post_time: -1};
                    if (sortBy === "Date") sort = {post_time: -1};
                    if (sortBy === "Related") sort = {likes: -1, post_time: 1};
                }
                // pagination
                let skip = (page - 1) * pageLength;
                posts.aggregate([
                    {$match: filter},
                    {$sort: sort},
                    {$limit: pageLength},
                    {$skip: skip},
                    {$lookup:
                        {
                            from: 'users',
                            localField: 'id_user',
                            foreignField: '_id',
                            as: 'user'
                        }
                    }
                ]).toArray((error, result) => {
                    if (error) throw error;
                    if (result == null || result.length == 0) {
                        return res.status(404).send({
                            code: 0,
                            message: `Not Found`
                        });
                    }
                    else {
                        for (let i = 0; i < result.length; i++) {
                            // unset properties
                            delete result[i].title;
                            delete result[i].desc;
                            delete result[i].post_time;
                            delete result[i].edited_time;
                            delete result[i].user[0]._id;
                            delete result[i].user[0].email;
                            delete result[i].user[0].password;
                            delete result[i].user[0].followings;
                            delete result[i].user[0].followers;
                            delete result[i].user[0].mylikes;
                        }
                        return res.status(200).send({
                            code: 1,
                            message: `ReadList Successfully`,
                            data: result
                        });
                    }
                });
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    },

    // [GET] ReadByID (Detail)
    ReadByIDPost: function (id_post, res) {
        if (!ObjectId.isValid(id_post))
            return res.status(400).send({ code: 0, message: `Bad Request` });
        try {
            _conn.dbContext((error, db) => {
                if (error) throw error;
                const posts = db.collection(collectionName);
                posts.aggregate([
                    {$match: {_id: ObjectId(id_post)}},
                    {$lookup:
                        {
                            from: 'users',
                            localField: 'id_user',
                            foreignField: '_id',
                            as: 'user'
                        }
                    }
                ]).toArray((error, result) => {
                    if (error) throw error;
                    if (result == null || result.length == 0) {
                        return res.status(404).send({
                            code: 0,
                            message: `Post doesn't exists`
                        });
                    }
                    else {
                        // unset properties
                        delete result[0].user[0]._id;
                        delete result[0].user[0].email;
                        delete result[0].user[0].password;
                        delete result[0].user[0].followings;
                        delete result[0].user[0].followers;
                        delete result[0].user[0].mylikes;
                        return res.status(200).send({
                            code: 1,
                            message: `Post successfully retrieved`,
                            data: result[0]
                        });
                    }
                });
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    },

    // [POST] Add (Used by userPost)
    AddPost: function (id_user, categories, title, desc, post_images, res) {
        if (!ObjectId.isValid(id_user) || !categories || !title || !desc || !post_images)
            return res.status(400).send({ code: 0, message: `Bad Request` });
        try {
            _conn.dbContext((error, db) => {
                if (error) throw error;
                const posts = db.collection(collectionName);
                // Create the document
                const doc = {
                    id_user: ObjectId(id_user),
                    categories: categories,
                    title: title,
                    desc: desc,
                    post_images: post_images,
                    like_by: [],
                    likes: 0,
                    post_time: dateTime.Now(),
                    edited_time: "0"
                };
                posts.insertOne(doc).then(result => {
                    return res.status(200).send({
                        code: 1,
                        message: "Post successfully created"
                    });
                })
                .catch(error => { throw error });
            });
        } catch (error) {
            
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    },

    // [PUT/PATCH] Edit
    EditPost: function (id_post, categories, title, desc, post_images, res) {
        if (!ObjectId.isValid(id_post))
            return res.status(400).send({ code: 0, message: `Bad Request` });
        try {
            _conn.dbContext((error, db) => {
                if (error) throw error;
                const posts = db.collection(collectionName);
                posts.findOne({_id: ObjectId(id_post)}, (error, result) => {
                    if (error) throw error;
                    if (result == null) {
                        return res.status(400).send({
                            code: 0,
                            message: `Bad Request`
                        });
                    }
                    if (!categories || categories === [])
                        categories = result.categories;
                    if (!title)
                        title = result.title;
                    if (!desc)
                        desc = result.desc;
                    if (!post_images || post_images === [])
                        post_images = result.post_images;
                    
                    let doc = {
                        categories: categories,
                        title: title,
                        desc: desc,
                        post_images: post_images,
                        edited_time: dateTime.Now()
                    };
                    posts.updateOne({_id: ObjectId(id_post)}, {$set: doc}, (error, result) => {
                        if (error) throw error;
                        if (result.modifiedCount == 0) {
                            return res.status(500).send({
                                code: 0,
                                message: `Update Post failed`
                            });
                        }
                        return res.status(200).send({
                            code: 1,
                            message: `Post has updated`
                        });
                    });
                });
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    },

    // [PUT/PATCH] Plus Like
    EditLikePost: function (id_post, like_by, res) {
        if (!ObjectId.isValid(id_post) || !like_by)
            return res.status(400).send({ code: 0, message: `Bad Request` });
        try {
            _conn.dbContext((error, db) => {
                if (error) throw error;
                const posts = db.collection(collectionName);
                posts.findOne({_id: ObjectId(id_post)}, (error, result) => {
                    if (error) throw error;
                    if (result == null) {
                        return res.status(400).send({
                            code: 0,
                            message: `Bad Request`
                        });
                    }
                    posts.updateOne({_id: ObjectId(id_post)}, {
                        $push: {like_by: like_by},
                        $inc: {likes: 1}
                    }, (error, result) => {
                        if (error) throw error;
                        if (result.modifiedCount == 0) {
                            return res.status(500).send({
                                code: 0,
                                message: `Post like not updated`
                            });
                        }
                        db.collection("users").updateOne({username: like_by}, {
                            $push: {mylikes: ObjectId(id_post)}
                        }, (error, result) => {
                            if (error) throw error;
                            if (result.modifiedCount == 0) {
                                return res.status(500).send({
                                    code: 0,
                                    message: `User like not updated`
                                });
                            }
                            return res.status(200).send({
                                code: 1,
                                message: `Liked`
                            });
                        });
                    });
                });
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    },

    // [DELETE] Delete Permanently
    DeletePost: function (id_post, res) {
        if (!ObjectId.isValid(id_post))
            return res.status(400).send({ code: 0, message: `Bad Request` });
        try {
            _conn.dbContext((error, db) => {
                if (error) throw error;
                const posts = db.collection(collectionName);
                posts.deleteOne({_id: ObjectId(id_post)}, (error, result) => {
                    if (error) throw error;
                    if (result.deletedCount == 0) {
                        return res.status(500).send({
                            code: 0,
                            message: `Delete post failed`
                        });
                    }
                    return res.status(200).send({
                        code: 1,
                        message: `Post has deleted`
                    });
                });
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    }
};