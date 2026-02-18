const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// public directory is at the project root (sibling of back)
const publicPath = path.join(__dirname, '..', 'public');

app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// DB config from env with sensible defaults for local dev
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_auth',
    multipleStatements: true,
};

let db;

// Try to connect with retries (useful because DB container may not be ready yet)
function connectWithRetry(attemptsLeft = 10, delayMs = 2000) {
    const conn = mysql.createConnection(dbConfig);
    conn.connect(function (err) {
        if (err) {
            console.error('MySQL connection failed:', err.message);
            try { conn.destroy(); } catch (e) {}
            if (attemptsLeft > 0) {
                console.log(`Retrying MySQL connection in ${delayMs}ms... (${attemptsLeft} attempts left)`);
                setTimeout(() => connectWithRetry(attemptsLeft - 1, delayMs), delayMs);
            } else {
                console.error('Could not connect to MySQL after multiple attempts. Exiting.');
                process.exit(1);
            }
        } else {
            db = conn;
            console.log('Connected to MySQL database');
            // start server after successful DB connection
            startServer();
        }
    });
}

// Start the Express server (called after DB connection)
function startServer() {
    app.listen(port, function () {
        console.log('Node server is running on port ' + port);
    });
}

function verifyLetter(input) {
    const regexLettres = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
    return regexLettres.test(input);
}

function verifyLetterPassword(input) {
    const regexLettres = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
    return regexLettres.test(input);
}

// Begin connection attempts
connectWithRetry();

app.get('/', function (req, res) {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/register', function (req, res) {
    res.sendFile(path.join(publicPath, 'register.html'));
});

// Serve the index as the login page (there's no login.html in public)
app.get('/login', function (req, res) {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.post('/register', function (req, res) {
    const nom = req.body.nom;
    const prenom = req.body.prenom;
    const password = req.body.password;
    const email = req.body.email;

    if (!nom || !prenom || !email || !password) {
        return res.status(400).send('Missing required fields');
    }

    if(!verifyLetter(nom) || !verifyLetter(prenom)) {
        return res.status(400).send('Name contains invalid characters');
    }
    
    const sql = 'INSERT INTO clients (nom, prenom, email, password) VALUES (?, ?, ?, ?)';
    db.query(sql, [nom, prenom, email, password], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        res.redirect('/login');
    });
});

app.post('/login', function (req, res) {
    const email = req.body.email || req.body.username;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).send('Missing email or password');
    }

    if(!verifyLetterPassword(password)) {
        return res.status(400).send('Password contains invalid characters');
    }

    const sql = 'SELECT * FROM clients WHERE email = ? AND password = ?';
    db.query(sql, [email, password], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        if (result.length > 0) {
            res.sendFile(path.join(publicPath, 'accueil.html'));
        } else {
            res.status(401).send('Invalid username or password');
        }
    });
});

app.post('/objet', function (req, res) {
    const objet = req.body.objet || req.body.name || req.body.nom;
    const prix = req.body.price || req.body.prix;

    if (!objet || !prix) {
        return res.status(400).send('Missing objet or prix');
    }
    
    if(isNaN(prix)) {
        return res.status(400).send('Prix must be a number');
    }

    if(!verifyLetter(objet)) {
        return res.status(400).send('Objet contains invalid characters');
    }

    const regexPrix = /^\d+(\.\d{1,2})?$/;
    if(!regexPrix.test(prix)) {
        return res.status(400).send('Prix format is invalid');
    }

    const sql = 'INSERT INTO objets (objet, prix) VALUES (?, ?)';
    db.query(sql, [objet, prix], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        res.send('Objet ajouté avec succès');
    });
});

app.get('/objets', function (req, res) {
    const sql = 'SELECT * FROM objets';
    db.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.json(results);
    });
});

app.delete('/delete_objet', function (req, res) {
    const objet = req.body.objet;
    const prix = req.body.prix;
    if (!objet || prix === undefined) {
        return res.status(400).send('Missing objet or prix');
    }
    const sql = 'DELETE FROM objets WHERE objet = ? AND prix = ?';
    console.log(`Deleting objet: ${objet} with prix: ${prix}`);
    db.query(sql, [objet, prix], function (err, result) {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        return res.status(204).send();
    });
});

// server is started after successful DB connection

