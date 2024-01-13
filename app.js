const express = require('express');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'woa_application',
    host: '192.168.122.127',
    database: 'woa',
    password: 'woaPoly',
    port: 5432,
});

const app = express();
app.set('views', './views')
app.set('view engine', 'ejs')

const PORT = 4000;
const oneDay = 1000 * 60 * 60 * 24;

//session middleware
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false
}));

// parsing the incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serving public file
app.use(express.static(__dirname));

// cookie parser middleware
app.use(cookieParser());

// a variable to save a session
var session;
let liste;
pool.query('SELECT nom_utilisateur as user, montant_depense as price, description_depense as description FROM projet.utilisateurs NATURAL JOIN projet.depenses;', (err, result) => {
    if (err) {
        console.error('Erreur lors de l\'exécution de la requête :', err);
    } else {
        liste = result.rows;
    }
});
let listes = [
    {user: "Jules", price: 15, description: "Dernière transaction"},
    {user: "Mathieu", price: 10, description: "Deuxième transaction"},
    {user: "Mathis", price: 5, description: "Troisième transaction"},
    {user: "Benoit", price: 10, description: "Quatrième transaction"}
    ];

let listeGroupe;
    pool.query('SELECT nom_utilisateur as user, montant_depense as price, description_depense as description FROM projet.utilisateurs NATURAL JOIN projet.depenses;', (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
        } else {
            liste = result.rows;
        }
    });

let listeGroupes = [
    {name: "Cagnote 1", ref:"/cagnotes/cagnote"},
    {name: "Cagnote 2", ref:"#"},
    {name: "Cagnote 3", ref:"#"},
    {name: "Cagnote 4", ref:"#"},
    {name: "Cagnote 5", ref:"#"},
    {name: "Cagnote 6", ref:"#"}
]

app.get('/',(req,res) => {
    session=req.session;
    if(session.userid){
        res.render('cagnotes/cagnote.ejs',{liste: liste});
    }else
    res.render('index.ejs')
});

app.post('/user',(req,res) => {
    pool.query('SELECT username_utilisateur, mdp_utilisateur FROM projet.utilisateurs', (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.status(500).send('Erreur serveur');
        } else {
            for (let row of result.rows) {
                if(req.body.username == row.username_utilisateur && req.body.password == row.mdp_utilisateur){
                    session=req.session;
                    session.userid=req.body.username;
                    console.log(req.session);
                    pool.query('SELECT nom_utilisateur as user, montant_depense as price, description_depense as description FROM projet.utilisateurs NATURAL JOIN projet.depenses;', (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'exécution de la requête :', err);
                        } else {
                            liste = result.rows;
                        }
                    });
                    res.render('cagnotes/cagnote.ejs',{liste: liste});
                    return;
                }
            }
            res.send('Invalid username or password');
        }
    })
});
    

app.get('/compte/views', (req,res) => {
    res.render('compte/views');
})

app.post('/connexion', (req,res) => {
    pool.query('INSERT INTO projet.utilisateurs (nom_utilisateur, prenom_utilisateur, username_utilisateur, mdp_utilisateur, mail_utilisateur) VALUES ($1, $2, $3, $4, $5)', [req.body.nom, req.body.prenom, req.body.username, req.body.password, req.body.mail], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.status(500).send('Erreur serveur');
        } else {    
            res.render('index.ejs');
        }
    })
})

app.post('/compte/inscription', (req,res) => {
    res.render('compte/inscription');
})

app.get('/groupe', (req,res) => {
    res.render('cagnotes/groupes',{listeGroupe: listeGroupe});
})

app.get('/logout',(req,res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Server Running at port ${PORT}`));