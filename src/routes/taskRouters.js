const { Router } = require('express');
const express = require('express')
const taskRouter = express.Router()
const { dashboard ,userDetails,singleUserDetails, all_items, addItem, cartPersonDetails, deliveryBoyDetails, addCartPerson, declinedOrders, disputedOrders, scheduledOrders, downloadScheduledOrders, newOrders, acceptNewOrders, acceptRequest, singleCartPerson, cancelScheduledOrders} = require('../controllers/tasks');
const { pool } = require('../database/connection');
const authenticate = require('../middlewares/auth');





taskRouter.use(authenticate)







taskRouter.get('/',dashboard)

taskRouter.get('/user_details',userDetails)

taskRouter.get('/user_details/:ID',singleUserDetails)

taskRouter.get('/items/:catID',all_items)

taskRouter.post('/item/:catID',addItem)

taskRouter.get('/cart_person_details',cartPersonDetails)

taskRouter.get('/cart_person_details/:ID',singleCartPerson)

taskRouter.post('/cart_person/addCartPerson',addCartPerson)

taskRouter.get('/delivery_boy_details',deliveryBoyDetails)

taskRouter.get('/declined_orders',declinedOrders)

taskRouter.get('/disputed_orders',disputedOrders)

taskRouter.get('/scheduled_orders',scheduledOrders)

taskRouter.get('/download/scheduled_orders/:startDate/:endDate',downloadScheduledOrders)

taskRouter.put('/cancel_scheduled_order/:ID',cancelScheduledOrders)

taskRouter.get('/new_orders_list',newOrders)

taskRouter.get('/new_orders',acceptNewOrders)

taskRouter.post('/accept_request',acceptRequest)





module.exports = taskRouter