const {Pool} = require('pg')

const pool = new Pool({
    host:'yourdaily-dev.c3mmtolbhl7f.ap-south-1.rds.amazonaws.com',
    user:'postgres',
    port:5432,
    password:'yourdaily2021',
    database:'yourdaily',
})

module.exports = {pool}