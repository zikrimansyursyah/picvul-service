const { Authentication, AddUser } = require("../models/users");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    Login: function (req, res) {
        const { email, password } = req.body;
        try {
            let validation = Authentication(email, password);
            if (!validation.result) {
                if (validation.error) throw validation.error;
                return res.status(401).send({code: 1, message: "Email or Password is wrong"});
            }
            // Create and assign token
            let payload = { id: validation.user.id_user, name: validation.user.fullname};
            const token = jwt.sign(payload, process.env.JWT_SECRET_KEY);

            return res.cookie("access_token", token, {
                httpOnly: true,
                secure: process.env.APP_ENV === "production"
            }).status(200).send({
                code: 1,
                message: "Login Successfully 😏 🍀"
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    },
    Authorization: function (req, res, next) {
        const token = req.cookies.access_token;
        try {
            if (!token) throw err;
            const data = jwt.verify(token, process.env.JWT_SECRET_KEY);
            req.user = data.name;
            return next();
        } catch (err) {
            return res.sendStatus(403);
        }
    },
    UserRegist: function (req, res) {
        const { email, username, fullname, password, job, profile_image } = req.body;
        AddUser(email, username, fullname, password, job, profile_image, res);
    },
    Logout: function (req, res) {
        try {
            res.clearCookie("access_token");
            return res.status(200).send({
                code: 1,
                message: "Successfully logged out 😏 🍀"
            });
        } catch (error) {
            return res.status(500).send({
                code: -1,
                message: `Internal Server Error: ${error}`
            });
        }
    }
}