const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const userRouter = require('./src/routes/userRouters')
const taskRouter = require('./src/routes/taskRouters')


app.use(bodyParser.json())
app.use('/user',userRouter)
app.use('/dashboard',taskRouter)





app.listen(5000,(req,res)=>{
    console.log('Server is listening on port 5000....')
})