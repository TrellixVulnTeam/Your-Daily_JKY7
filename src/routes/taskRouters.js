const { Router } = require('express');
const express = require('express')
const taskRouter = express.Router()
const { dashboard ,getAllUserDetails,getUserById, getAllItems, createItem, getCartPersonDetails, getDeliveryBoyDetails, addCartPerson, declinedOrders, disputedOrders, scheduledOrders, downloadScheduledOrders, newOrders, acceptNewOrders, acceptRequest, singleCartPerson, cancelScheduledOrders} = require('../controllers/tasks');
const { pool } = require('../database/connection');
const authenticate = require('../middlewares/auth');
const permission = require('../middlewares/permission');





taskRouter.use(authenticate,permission)








taskRouter.get('/',dashboard)

taskRouter.get('/users',getAllUserDetails)

taskRouter.get('/user/:ID',getUserById)

taskRouter.get('/items/:catID',getAllItems)

taskRouter.post('/item/:catID',createItem)

taskRouter.get('/cart_persons',getCartPersonDetails)

taskRouter.get('/cart_person/:ID',singleCartPerson)

taskRouter.post('/cart_person',addCartPerson)

taskRouter.get('/delivery_boys',getDeliveryBoyDetails)

taskRouter.get('/declined_orders',declinedOrders)

taskRouter.get('/disputed_orders',disputedOrders)

taskRouter.get('/scheduled_orders',scheduledOrders)

taskRouter.get('/download/scheduled_order',downloadScheduledOrders)

taskRouter.delete('/schedule_order/:ID',cancelScheduledOrders)

taskRouter.get('/new_orders_list',newOrders)

taskRouter.get('/accept_orders',acceptNewOrders)

taskRouter.post('/accept_request',acceptRequest)





module.exports = taskRouter