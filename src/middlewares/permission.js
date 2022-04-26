const { pool } = require('../database/connection')



const permission = async(req,res,next)=>{
    const sql = `SELECT permission_type
                        FROM user_permission
                        WHERE user_id = $1`
    try{
        const result = await pool.query(sql, [req.userId])
            // console.log('result of 2nd query',result)
            if(result.rows[0].permission_type=='store-manager'){
                next()
            }
            else{
                res.status(200).json({err:err.message})
            }
    }
    catch(err){
        next()
        res.status(400).json({message:"User is not admin or a store manager."})
    }
            
}

module.exports = permission