const keys = require("./keys")

//Express app setup
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const { Pool } = require('pg')
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})

pgClient.on('error', ()=>{console.log('Lost PG connection')})

pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });
  
const redis = require('redis')

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
})

const redisPublisher = redisClient.duplicate()
app.get('/', (req,res) => {
    res.send('Hi')
})
app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('select * from values')
    res.send(values.rows)
})
app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values)=>{
        res.send(values)
    })
})

app.post('/values', async (req, res)=>{
    try{
    const index = req.body.index;

    if(parseInt(index) > 4000) {
        return res.status(422).send('Value too big!')
    }

    redisClient.hset('values', index, 'Nothing yet!')
    redisPublisher.publish('insert', index)

    pgClient.query('INSERT INTO values (number) VALUES ($1) ', [index])
    res.send({working: true})
}
catch(exp){b}
})

app.listen(5000, err => {
    console.log('Listening');
})
