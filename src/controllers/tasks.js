const { restart } = require('nodemon')
const { application_name } = require('pg/lib/defaults')
const { pool } = require('../database/connection')
const { authenticate } = require('../middlewares/auth')





const dashboard = (req, res, next) => {
    const sql = `SELECT COUNT(user_id) FILTER (WHERE permission_type = 'cart-boy')     AS total_cart_boy,
                    COUNT(user_id) FILTER (WHERE permission_type = 'delivery-boy') AS total_delivery_boy,
                    COUNT(user_id) FILTER (WHERE permission_type = 'user')         AS total_users
                    FROM user_permission`

    const sql1 = `SELECT COUNT(id) AS total_items FROM items`

    const sql2 = `SELECT COUNT(id) AS total_disputed_orders FROM disputed_orders`

    const sql3 = `SELECT COUNT(id) AS total_denied_orders FROM rejected_orders`

    const sql4 = `SELECT SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS "total_unassigned_orders",
                    SUM(CASE WHEN created_at>=now()- INTERVAL '1 week' THEN 1 ELSE 0 END) AS "past_week_orders"
                    FROM orders`

    const sql5 = `SELECT SUM(CASE WHEN permission_type = 'user' THEN 1 ELSE 0 END) AS "active_users"
                    FROM user_permission
                    JOIN users ON user_permission.user_id = users.id
                    JOIN orders ON users.id = orders.user_id
                    WHERE orders.created_at>=now() - INTERVAL '10 days'`

    const sql6 = `SELECT count(id) AS total_scheduled_orders
                    FROM scheduled_orders
                    WHERE created_at >= now()
                    AND end_date >= now()`

    try {
        const result = pool.query(sql)
        const result1 = pool.query(sql1)
        const result2 = pool.query(sql2)
        const result3 = pool.query(sql3)
        const result4 = pool.query(sql4)
        const result5 = pool.query(sql5)
        const result6 = pool.query(sql6)


        // let data = []
        Promise.all([result, result1, result2, result3, result4, result5,result6]).then(values => {
            // values.forEach(arr=>{
            //     data.push(arr.rows[0])
            // })


            res.status(200).json(values)


            // const data = values.map(arr => arr.rows[0])
            // return res.status(200).json({
            //     data
            // })
        })

    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

const userDetails = async (req, res, next) => {
    const sql = `SELECT DISTINCT ON (users.id) users.id,
                    users.name,
                    address.address_data,
                    AVG(orders.staff_rating)                          AS Rating,
                    COUNT(amount)                                     AS total_orders,
                    users.phone,
                    COUNT(status) FILTER (WHERE status = 'declined' ) AS declined,
                    COUNT(status) FILTER (WHERE status = 'cancelled') AS cancelled,
                    users.flags
                FROM users
                    JOIN user_permission ON users.id = user_permission.user_id
                    JOIN orders ON users.id = orders.id
                    JOIN address ON users.id = address.user_id
                WHERE permission_type = 'user'
                GROUP BY users.id, address.address_data
                ORDER BY users.id`
    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

const singleUserDetails = async (req, res, next) => {
    const { ID } = req.params
    // console.log(ID)
    const sql = `SELECT user_permission.user_id,
                    users.name,
                    users.phone,
                    AVG(orders.staff_rating)                          AS rating,
                    COUNT(orders.id)                                  AS total_orders,
                    users.flags,
                    COUNT(status) FILTER (WHERE status = 'cancelled') AS cancelled
                FROM user_permission
                    JOIN orders ON user_permission.user_id = orders.id
                    JOIN users ON user_permission.user_id = users.id
                WHERE user_permission.permission_type = 'user'
                AND users.id = $1
                GROUP BY user_permission.user_id, users.name, users.phone, users.flags`

    const sql1 = `SELECT address.address_data
                    FROM orders
                    JOIN address ON orders.address_id = address.id
                    WHERE address.user_id = $1
                    GROUP BY orders.address_id,address.address_data
                    ORDER BY orders.address_id LIMIT 3`


    try {
        const result = pool.query(sql, [ID])
        const result1 = pool.query(sql1, [ID])
        Promise.all([result, result1]).then(values => {
            const data = values.map(arr => arr.rows)
            return res.status(200).json({
                data
            })
        })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }

}


const all_items = async (req, res, next) => {
    const { catID } = req.params
    // console.log(catID)
    const sql = `SELECT images.path, items.name, items.price, items.base_quantity, items.in_stock
                    FROM items
                            JOIN item_images ON items.id = item_images.item_id
                            JOIN images ON item_images.image_id = images.id
                    WHERE items.category = $1`
    try {
        const result = await pool.query(sql, [catID])
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


const addItem = async (req, res, next) => {
    const { catID } = req.params
    const {
        name,
        base_quantity,
        price,
        strikethrough_price
    } = req.body
    const sql = `INSERT INTO items(category,name,base_quantity,price,strikethrough_price) VALUES ($1,$2,$3,$4,$5) returning id`

    try {
        const result = await pool.query(sql, [catID, name, base_quantity, price, strikethrough_price])
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }

}



const cartPersonDetails = async (req, res, next) => {
    const sql = `SELECT users.id,
                    users.name,
                    AVG(staff_rating),
                    SUM(orders.amount),
                    COUNT(orders.amount)                              AS total_orders,
                    users.phone,
                    COUNT(status) FILTER (WHERE status = 'declined' ) AS declined,
                    COUNT(status) FILTER (WHERE status = 'cancelled') AS cancelled,
                    users.flags
                FROM users
                    JOIN user_permission ON users.id = user_permission.user_id
                    LEFT JOIN orders ON users.id = orders.id
                WHERE permission_type = 'cart-boy'
                GROUP BY users.id, orders.amount
                ORDER BY users.id`
    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}


const singleCartPerson = async(req,res,next)=>{
    const {ID} = req.params
    const sql = `SELECT users.name,
                    users.phone,
                    users.flags,
                    AVG(user_rating)                                  AS Rating,
                    COUNT(amount)                                     AS total_orders,
                    COUNT(status) FILTER (WHERE status = 'declined')  AS Denied_orders,
                    COUNT(status) FILTER (WHERE status = 'cancelled') AS Cancelled_orders
                FROM users
                    JOIN orders ON users.id = orders.user_id
                    JOIN user_permission ON users.id = user_permission.user_id
                WHERE user_permission.permission_type = 'cart-boy'
                AND users.id = $1
                GROUP BY users.id`
    try{
        const result = await pool.query(sql,[ID])
        res.status(200).json({data:result.rows[0]})
    }
    catch(err){
        next()
        res.status(400).json({err:err.message})
    }
}




const deliveryBoyDetails = async (req, res, next) => {
    const sql = `SELECT users.id,
                    users.name,
                    AVG(staff_rating),
                    SUM(orders.amount),
                    COUNT(orders.amount)                              AS total_orders,
                    users.phone,
                    COUNT(status) FILTER (WHERE status = 'declined' ) AS declined,
                    COUNT(status) FILTER (WHERE status = 'cancelled') AS cancelled,
                    users.flags
                FROM users
                    JOIN user_permission ON users.id = user_permission.user_id
                    LEFT JOIN orders ON users.id = orders.id
                WHERE permission_type = 'delivery-boy'
                GROUP BY users.id, orders.amount
                ORDER BY users.id`
                
    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

const addCartPerson = async (req, res, next) => {
    const { name, phone } = req.body
    const sql = 'INSERT INTO users(name,phone) VALUES($1,$2)'
    try {
        const result = await pool.query(sql, [name, phone])
        res.status(200).json({ message: "user added successfully", data: result.rows })
    }
    catch (err) {
        res.status(400).json({ err: err.message })
        next()
    }
}

const declinedOrders = async (req, res, next) => {
    const sql = `SELECT orders.id,address.address_data,users.phone,orders.order_type,orders.delivery_time
                    FROM orders
                    JOIN address ON orders.address_id = address.id
                    JOIN users ON orders.user_id = users.id
                WHERE orders.status = 'declined'`
    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


const disputedOrders = async (req, res, next) => {
    const sql = `SELECT disputed_orders.order_id,
                    address.address_data,
                    users.phone,
                    disputed_orders.disputed_at,
                    disputed_orders.resolved_at IS NOT NULL AS action
                FROM disputed_orders
                    LEFT JOIN orders ON orders.id = disputed_orders.order_id
                    LEFT JOIN users ON users.id = orders.user_id
                    LEFT JOIN address on address.id = orders.address_id;`

    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}

const scheduledOrders = async (req, res, next) => {
    const sql = `SELECT scheduled_orders.id         AS order_ID,
                    address.address_data        AS user_address,
                    scheduled_orders.created_at AS scheduled_on,
                    scheduled_orders.start_date AS scheduled_for,
                    users.phone                 AS contact
                FROM scheduled_orders
                    JOIN address ON scheduled_orders.address_id = address.id
                    JOIN users ON scheduled_orders.user_id = users.id
                ORDER BY scheduled_orders.id`

    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


const downloadScheduledOrders = async (req, res, next) => {
    const { startDate, endDate } = req.params
    const sql = `SELECT scheduled_orders.id         AS order_ID,
                    address.address_data        AS user_address,
                    scheduled_orders.created_at AS scheduled_on,
                    scheduled_orders.start_date AS scheduled_for,
                    users.phone                 AS contact
                FROM scheduled_orders
                    JOIN address ON scheduled_orders.address_id = address.id
                    JOIN users ON scheduled_orders.user_id = users.id
                WHERE scheduled_orders.start_date::date >= $1::date
                AND scheduled_orders.end_date::date <= $2::date
                ORDER BY scheduled_orders.id`
    try {
        const result = await pool.query(sql, [startDate, endDate])
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}




const cancelScheduledOrders = async(req,res,next)=>{
    const {ID} = req.params
    const sql = `UPDATE scheduled_orders
                 SET archived_at = now()
                 WHERE id = $1`

    try{
        const result = await pool.query(sql,[ID])
        res.status(200).json({message:'Data updated successfully',data:result.rows})
    }
    catch(err){
        next()
        res.status(400).json({err:err.message})
    }
}




const newOrders = async (req, res, next) => {
    const sql = `SELECT orders.id,address.address_data,users.phone,orders.order_type,orders.status
                    FROM orders
                    JOIN address ON orders.address_id = address.id
                    JOIN users ON orders.user_id = users.id
                    WHERE orders.status = 'processing' AND orders.order_type = 'now'
                    ORDER BY orders.id`

    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


const acceptNewOrders = async (req, res, next) => {
    const sql = `SELECT name
                    FROM users
                    JOIN user_permission ON users.id = user_permission.user_id
                    WHERE user_permission.permission_type = 'cart-boy' OR user_permission.permission_type = 'delivery-boy'`

    try {
        const result = await pool.query(sql)
        res.status(200).json({ data: result.rows })

    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }

}



const acceptRequest = async (req, res, next) => {
    const { userId, perType } = req.body
    // console.log(userId,perType)
    const sql = `INSERT INTO user_permission(user_id,permission_type) VALUES($1,$2)`
    try {
        const result = await pool.query(sql, [userId, perType])
        res.status(200).json({ data: result.rows })
    }
    catch (err) {
        res.status(400).json({ err: err.message })
    }
}








module.exports = {
    dashboard,
    userDetails,
    singleUserDetails,
    all_items, addItem,
    cartPersonDetails,
    deliveryBoyDetails,
    addCartPerson,
    declinedOrders,
    disputedOrders,
    scheduledOrders,
    downloadScheduledOrders,
    cancelScheduledOrders,
    newOrders,
    acceptNewOrders,
    acceptRequest,
    singleCartPerson
}

