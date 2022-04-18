const {Joi} = require('express-validation')



const logSchema = {
    body:Joi.object({
        userID:Joi.number().required(),
        password:Joi.string().required()
    }).required()
}

const regSchema ={
    body:Joi.object({
        name:Joi.string().required(),
        phone:Joi.string().required(),
        email:Joi.string().email().required(),
        password:Joi.string().required()
    }).required()
}


module.exports = {logSchema,regSchema}