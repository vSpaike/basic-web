var express = require('express');
var bodyParser = require("body-parser");
var con = require('mysql');
var path = require('path');

var app = express();
const port = 5000

const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_auth',
    multipleStatements: true
})

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    con.connect(function (err) {
        if (err) throw err;
        var sql = "INSERT INTO users (username, password) VALUES (?, ?)";
        con.query(sql, [username, password], function (err, result) {
            if (err) throw err;
            res.redirect('/login');
        });
    });
});

app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});


app.listen(port, function () {
    console.log('Node server is running on port ' + port);
});

