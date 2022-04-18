const { Router } = require('express');
const express = require('express')
const {register,login} = require('../controllers/admin');
const { pool } = require('../database/connection');
const userRouter = express.Router()





userRouter.post('/register',register)


userRouter.post('/login',login)

module.exports = userRouter
