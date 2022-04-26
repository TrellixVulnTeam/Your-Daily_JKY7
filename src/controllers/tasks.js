const { restart } = require('nodemon')
const { application_name } = require('pg/lib/defaults')
const { pool } = require('../database/connection')
const { authenticate } = require('../middlewares/auth')



//Dashboard Details

const dashboard = (req, res, next) => {
    const dashboardQuery = `SELECT COUNT(user_id) FILTER (WHERE permission_type = 'cart-boy')     AS total_cart_boy,
                                COUNT(user_id) FILTER (WHERE permission_type = 'delivery-boy') AS total_delivery_boy,
                                COUNT(user_id) FILTER (WHERE permission_type = 'user')         AS total_users
                                FROM user_permission`

    const itemsQuery = `SELECT COUNT(id) AS total_items FROM items`

    const disputedQuery = `SELECT COUNT(id) AS total_disputed_orders FROM disputed_orders`

    const rejectedQuery = `SELECT COUNT(id) AS total_denied_orders FROM rejected_orders`

    const pastWeekQuery = `SELECT SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS "total_unassigned_orders",
                            SUM(CASE WHEN created_at>=now()- INTERVAL '1 week' THEN 1 ELSE 0 END) AS "past_week_orders"
                            FROM orders`

    const activeUserQuery = `SELECT SUM(CASE WHEN permission_type = 'user' THEN 1 ELSE 0 END) AS "active_users"
                                FROM user_permission
                                JOIN users ON user_permission.user_id = users.id
                                JOIN orders ON users.id = orders.user_id
                                WHERE orders.created_at>=now() - INTERVAL '10 days'`

    const scheduledQuery = `SELECT count(id) AS total_scheduled_orders
                            FROM scheduled_orders
                            WHERE created_at >= now()
                            AND end_date >= now()`

    try {
        const dashboardResult = pool.query(dashboardQuery)
        const itemResult = pool.query(itemsQuery)
        const disputedResult = pool.query(disputedQuery)
        const rejectedResult = pool.query(rejectedQuery)
        const pastWeekResult = pool.query(pastWeekQuery)
        const activeUserResult = pool.query(activeUserQuery)
        const scheduledResult = pool.query(scheduledQuery)


        let data = {}
        Promise.all([dashboardResult, itemResult, disputedResult, rejectedResult, pastWeekResult, activeUserResult, scheduledResult]).then(values => {
            values.forEach(arr => {
                data = { ...data, ...arr.rows[0] }

            })
            return res.status(200).json(data)
        })

    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

//Getting all the user data

const getAllUserDetails = async (req, res, next) => {
    const usersQuery = `SELECT DISTINCT ON (users.id) users.id,
                            users.name,
                            address.address_data,
                            AVG(orders.staff_rating)                          AS Rating,
                            SUM(amount)                                       AS total_business,
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
        const usersResult = await pool.query(usersQuery)
        res.status(200).json(usersResult.rows)
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

// const getUserById = async (req, res, next) => {
//     const { ID } = req.params
//     // console.log(ID)
//     const  userQuery = `SELECT user_permission.user_id,
//                             users.name,
//                             users.phone,
//                             AVG(orders.staff_rating)                          AS rating,
//                             COUNT(orders.id)                                  AS total_orders,
//                             users.flags,
//                             COUNT(status) FILTER (WHERE status = 'cancelled') AS cancelled
//                         FROM user_permission
//                             JOIN orders ON user_permission.user_id = orders.id
//                             JOIN users ON user_permission.user_id = users.id
//                         WHERE user_permission.permission_type = 'user'
//                         AND users.id = $1
//                         GROUP BY user_permission.user_id, users.name, users.phone, users.flags`

//     const addressQuery = `SELECT address.address_data
//                             FROM orders
//                             JOIN address ON orders.address_id = address.id
//                             WHERE address.user_id = $1
//                             GROUP BY orders.address_id,address.address_data
//                             ORDER BY orders.address_id LIMIT 3`


//     try {
//         const userResult = pool.query(userQuery, [ID])
//         const addressResult = pool.query(addressQuery, [ID])
//         let data = []
//         Promise.all([userResult, addressResult]).then(values => {
//             values.forEach(arr=>{
//                 data.push(arr.rows)



//             })
//             return res.status(200).json(data)

//         })

//     }
//     catch (err) {
//         next()
//         res.status(400).json({ err: err.message })
//     }

// }





// const getUserById = async(req,res,next)=>{
//     const {ID} = req.params
//     sql = `SELECT user_permission.user_id,
//                 users.name,
//                 users.phone,
//                 AVG(orders.staff_rating)                          AS rating,
//                 COUNT(orders.id)                                  AS total_orders,
//                 users.flags,
//                 COUNT(status) FILTER (WHERE status = 'cancelled') AS cancelled,
//                 array_agg(address.address_data)                   AS top_three_locations,
//                 array_agg(orders.amount)                          AS top_three_items,
//                 orders.address_id
//             FROM user_permission
//                 JOIN orders ON user_permission.user_id = orders.id
//                 JOIN users ON user_permission.user_id = users.id
//                 JOIN address ON user_permission.user_id = address.user_id
//             WHERE user_permission.permission_type = 'user'

//             AND users.id = $1
//             GROUP BY user_permission.user_id, users.name, users.phone, users.flags, orders.address_id, orders.id
//             ORDER BY orders.address_id, orders.id DESC
//             LIMIT 3`
//     try{
//         const result = await pool.query(sql,[ID])
//         res.status(200).json(result.rows)
//     }
//     catch(err){
//         next()
//         res.status(400).json({err:err.message})
//     }
// }


//Getting data of single user by ID

const getUserById = async (req, res, next) => {
    const {ID} = req.params
    const userDetailsQuery = `SELECT
                                user_permission.user_id as id,
                                users.name,
                                users.phone,
                                count(orders.id) AS total_orders,
                                COUNT(status) FILTER  ( WHERE  status='cancelled' ) AS cancelled,
                            AVG(user_rating) AS average_rating,
                            users.flags
                            FROM user_permission
                            JOIN users ON users.id = user_permission.user_id
                            JOIN orders ON user_permission.user_id = orders.user_id
                                                WHERE permission_type='user' AND user_permission.user_id=$1
                            GROUP BY user_permission.user_id, users.name,users.phone,users.flags`

    const addressQuery = `SELECT address.address_data
                            FROM orders
                                    JOIN address ON orders.address_id = address.id
                            WHERE address.user_id = $1
                            GROUP BY orders.address_id, address.address_data
                            ORDER BY orders.address_id
                            LIMIT 3`


    const itemsQuery = `SELECT
                        amount
                    FROM 	orders
                    WHERE user_id=$1
                    ORDER BY amount DESC LIMIT 3`

    

    try {
        const userDetailsResult = pool.query(userDetailsQuery, [ID])
        const addressResult = pool.query(addressQuery,[ID])
        const itemsResult = pool.query(itemsQuery,[ID])
        
        const [user, addresses, items] = await Promise.all([userDetailsResult,addressResult,itemsResult])
        user.rows[0].address = addresses.rows.map(address=> address.address_data)
        user.rows[0].amounts = items.rows.map(item=> item.amount)
        return res.status(200).json(user.rows[0])
        
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }

}


//Getting all the items regarding to its category ID

const getAllItems = async (req, res, next) => {
    const { catID } = req.params
    // console.log(catID)
    const itemsQuery = `SELECT images.path, items.category,items.name, items.price, items.base_quantity, items.in_stock
                            FROM items
                                    JOIN item_images ON items.id = item_images.item_id
                                    JOIN images ON item_images.image_id = images.id
                            WHERE items.category = $1`
    try {
        const itemsResult = await pool.query(itemsQuery, [catID])
        res.status(200).json(itemsResult.rows)
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


//Creating an item in the list

const createItem = async (req, res, next) => {
    const { catID } = req.params
    const {
        name,
        base_quantity,
        price,
        strikethrough_price
    } = req.body
    const itemQuery = `INSERT INTO items(category,name,base_quantity,price,strikethrough_price) VALUES ($1,$2,$3,$4,$5) returning id`

    try {
        const itemResult = await pool.query(itemQuery, [catID, name, base_quantity, price, strikethrough_price])
        res.status(200).json({ data: itemResult.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }

}

//Getting details of all the cart persons 

const getCartPersonDetails = async (req, res, next) => {
    const cartPersonsQuery = `SELECT users.id,
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
        const cartPersonsResult = await pool.query(cartPersonsQuery)
        res.status(200).json({ data: cartPersonsResult.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

//Getting details of all the cart-persons

const singleCartPerson = async (req, res, next) => {
    const { ID } = req.params
    const cartPersonQuery = `SELECT users.name,
                                users.phone,
                                users.flags,
                                AVG(user_rating)                                  AS Rating,
                                SUM(amount)                                       AS total_business,
                                users.created_at                                  AS reg_date,
                                users.enabled,                                   
                                COUNT(amount)                                     AS total_orders,
                                COUNT(status) FILTER (WHERE status = 'declined')  AS Denied_orders,
                                COUNT(status) FILTER (WHERE status = 'cancelled') AS Cancelled_orders
                            FROM users
                                JOIN orders ON users.id = orders.user_id
                                JOIN user_permission ON users.id = user_permission.user_id
                            WHERE user_permission.permission_type = 'cart-boy'
                            AND users.id = $1
                            GROUP BY users.id`
    try {
        const cartPersonResult = await pool.query(cartPersonQuery, [ID])
        res.status(200).json(cartPersonResult.rows[0])
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


//Getting all the details of the delivery boy

const getDeliveryBoyDetails = async (req, res, next) => {
    const deliveryBoysQuery = `SELECT users.id,
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
        const deliveryBoyResult = await pool.query(deliveryBoysQuery)
        res.status(200).json(deliveryBoyResult.rows)
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })

    }
}

//Adding new cart-person

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

//Getting all the declined orders

const declinedOrders = async (req, res, next) => {
    const declinedOrdersQuery = `SELECT orders.id,address.address_data,users.phone,orders.mode,orders.status,orders.order_type,orders.delivery_time
                                    FROM orders
                                    JOIN address ON orders.address_id = address.id
                                    JOIN users ON orders.user_id = users.id
                                WHERE orders.status = 'declined'`
    try {
        const declinedOrdersResult = await pool.query(declinedOrdersQuery)
        res.status(200).json(declinedOrdersResult.rows)
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}

//Getting all the disputed orders 

const disputedOrders = async (req, res, next) => {
    const disputedOrdersQuery = `SELECT disputed_orders.order_id,
                                    address.address_data,
                                    users.phone,
                                    disputed_orders.disputed_at,
                                    disputed_orders.resolved_at,
                                    disputed_orders.resolved_at IS NOT NULL AS action
                                FROM disputed_orders
                                    LEFT JOIN orders ON orders.id = disputed_orders.order_id
                                    LEFT JOIN users ON users.id = orders.user_id
                                    LEFT JOIN address on address.id = orders.address_id;`

    try {
        const disputedOrdersResult = await pool.query(disputedOrdersQuery)
        res.status(200).json({ data: disputedOrdersResult.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}

//Getting all the scheduled orders

const scheduledOrders = async (req, res, next) => {
    const scheduledOrdersQuery = `SELECT scheduled_orders.id         AS order_ID,
                                    address.address_data        AS user_address,
                                    scheduled_orders.created_at AS scheduled_on,
                                    scheduled_orders.mode,
                                    scheduled_orders.start_date AS scheduled_for,
                                    users.phone                 AS contact,
                                    users.name,
                                    scheduled_orders.amount
                                FROM scheduled_orders
                                    JOIN address ON scheduled_orders.address_id = address.id
                                    JOIN users ON scheduled_orders.user_id = users.id
                                ORDER BY scheduled_orders.id`

    try {
        const scheduledOrdersResult = await pool.query(scheduledOrdersQuery)
        res.status(200).json(scheduledOrdersResult.rows)
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}

//download scheduled orders with start and end date

const downloadScheduledOrders = async (req, res, next) => {
    const { startDate, endDate } = req.query
    // console.log(startDate,endDate)
    const downloadOrdersQuery = `SELECT scheduled_orders.id         AS order_ID,
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
        const downloadOrdersResult = await pool.query(downloadOrdersQuery, [startDate, endDate])
        res.status(200).json({ data: downloadOrdersResult.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}


//Getting all the cancel scheduled orders

const cancelScheduledOrders = async (req, res, next) => {
    const { ID } = req.params
    const cancelOrdersQuery = `UPDATE scheduled_orders
                                SET archived_at = now()
                                WHERE id = $1`

    try {
        const cancelOrdersResult = await pool.query(cancelOrdersQuery, [ID])
        res.status(200).json({ message: 'Data updated successfully', data: cancelOrdersResult.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}

//All the new orders


const newOrders = async (req, res, next) => {
    const newOrdersQuery = `SELECT orders.id,address.address_data,users.phone,orders.order_type,orders.status
                                FROM orders
                                JOIN address ON orders.address_id = address.id
                                JOIN users ON orders.user_id = users.id
                                WHERE orders.status = 'processing' AND orders.order_type = 'now'
                                ORDER BY orders.id`

    try {
        const newOrdersResult = await pool.query(newOrdersQuery)
        res.status(200).json({ data: newOrdersResult.rows })
    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }
}

//accepting all the new orders

const acceptNewOrders = async (req, res, next) => {
    const acceptOrdersQuery = `SELECT name
                                FROM users
                                JOIN user_permission ON users.id = user_permission.user_id
                                WHERE user_permission.permission_type = 'cart-boy' OR user_permission.permission_type = 'delivery-boy'`

    try {
        const acceptOrdersResult = await pool.query(acceptOrdersQuery)
        res.status(200).json({ data: acceptOrdersResult.rows })

    }
    catch (err) {
        next()
        res.status(400).json({ err: err.message })
    }

}

//accepting the new requests

const acceptRequest = async (req, res, next) => {
    const { userId, perType } = req.body
    // console.log(userId,perType)
    const acceptRequestQuery = `INSERT INTO user_permission(user_id,permission_type) VALUES($1,$2)`
    try {
        const acceptRequestResult = await pool.query(acceptRequestQuery, [userId, perType])
        res.status(200).json({ data: acceptRequestResult.rows })
    }
    catch (err) {
        res.status(400).json({ err: err.message })
    }
}








module.exports = {
    dashboard,
    getAllUserDetails,
    getUserById,
    getAllItems,
    createItem,
    getCartPersonDetails,
    getDeliveryBoyDetails,
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

