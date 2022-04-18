const jwt = require('jsonwebtoken')
const { pool } = require('../database/connection')
const { secretKey } = require('../utils/jwt')

const authenticate = async (req, res, next) => {
    const tokenHeader = req.header('Authorization')
    if (!tokenHeader.startsWith('Bearer ')) {
        res.status(400).json({ 'err': 'token invalid' })
    }

    try {
        const token = tokenHeader.split(' ')[1]
        // console.log(token)
        if (token) {
            const decoded = await jwt.verify(token, secretKey)
            // console.log(decoded)
            req.userId = decoded["id"]
            // console.log(req.userId)
            const sql = `SELECT permission_type
                        FROM user_permission
                        WHERE user_id = $1`
            const result = await pool.query(sql, [req.userId])
            // console.log('result of 2nd query',result)
            if(result.rows[0].permission_type=='store-manager'){
                next()
            }
            else{
                res.status(200).json({err:err.message})
            }
            


        }
        else {
            return res.status(401).json({
                "err": "invalid token"
            })
        }
    }
    catch (err) {
        res.status(400).json('authorization failed')
    }
}

module.exports = authenticate