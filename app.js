const express = require('express')
const hbs = require('hbs');
const app = express()

app.use(express.static(__dirname + '/static'));

app.get('/', function (req, res) {
  res.render('index.hbs');
})

app.get('/payment', function (req, res) {
  res.render('payment.hbs');
})

app.listen(3000)
