const { pool } = require('../database/connection')
const bcrypt = require('bcryptjs');
const { createToken } = require('../utils/jwt');


const register = async(req,res,next)=>{
    const {name,phone,email,password} = req.body
    
    
    
    const secPass = await securePass(password)
    
    const sql = `INSERT INTO users(name,phone,email,password)
                     VALUES($1,$2,$3,$4) RETURNING id`
    try{
        const result = await pool.query(sql,[name,phone,email,secPass])
        res.status(200).json({data:result.rows})
    }
    catch(err){
        next()
        res.status(400).json({err:err.message})
    }
}

const securePass = async(password)=>{
    const passHash = await bcrypt.hash(password,10)
    return passHash
}


const login = async(req,res,next)=>{
    const {userID,password} = req.body
    
    const sql =`SELECT id,password FROM users WHERE id=$1`
    
    
    try{
        const result = await pool.query(sql,[userID])
        const token = await createToken(result.rows[0].id)
        const isMatched = checkPass(password,result.rows[0].password)
        if(isMatched){
            res.status(200).json({message:'User Logged In Successfully.',token})
        }
        else{
            res.status(400).json({message:"Login Failed"})
        }

        
        
    }
    catch(err){
        next()
        res.status(401).json({err:err.message,message:'Login failed'})
    }
    
}

const checkPass = async(password,passHash)=>{
    const passMatch = await bcrypt.compare(password,passHash)
    return passMatch
}

module.exports = {register,login}
