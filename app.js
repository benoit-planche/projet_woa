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

// variable global
var session;
let liste;
let totalDepense;
let listeGroupe;

app.get('/',(req,res) => {
    session=req.session;
    if(session.userid){
        res.redirect(307, '/cagnotes/cagnote');
    }else{
        res.render('index.ejs')
    }
});

app.post('/cagnotes/cagnote',(req,res) => {
    if (req.body.id != null) {
        session.dernier_page = req.body.id;
    }
    pool.query('SELECT u.username_utilisateur as username, u.prenom_utilisateur as user, d.montant_depense as price, d.description_depense as description FROM projet.utilisateurs u NATURAL JOIN projet.depenses d WHERE u.id_utilisateur IN ( SELECT id_utilisateur FROM projet.depenses WHERE id_groupe = $1)',[session.dernier_page] , (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
        } else {
            liste = result.rows;
            pool.query('SELECT g.total_depense as totalDepense FROM projet.groupes g WHERE id_groupe = $1;',[session.dernier_page], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                } else {
                    totalDepense = result.rows[0].totaldepense;
                    res.render('cagnotes/cagnote.ejs',{liste: liste, totalDepense: totalDepense, session: session});
                }
            });
        }
    });    
    
});

app.post('/user', (req, res) => {
    pool.query('SELECT username_utilisateur, mdp_utilisateur, dernier_page FROM projet.utilisateurs', (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.status(500).send('Erreur serveur');
        } else {
            for (let row of result.rows) {
                if (req.body.username == row.username_utilisateur && req.body.password == row.mdp_utilisateur) {
                    session = req.session;
                    session.userid = req.body.username;
                    session.dernier_page = row.dernier_page;
                    console.log(req.session);
                }
            }
            if (session == null) {
                res.send('Invalid username or password');
            } else {
                if (session.dernier_page != null) {
                    res.redirect(307, '/cagnotes/cagnote');
                } else {
                    res.redirect(307, '/groupe');
                }
            }
        }
    });
});
    

app.post('/compte/views', (req,res) => {
    res.render('compte/views');
})

app.post('/connexion', (req,res) => {
    pool.query('INSERT INTO projet.utilisateurs (nom_utilisateur, prenom_utilisateur, username_utilisateur, mdp_utilisateur, mail_utilisateur) VALUES ($1, $2, $3, $4, $5)', [req.body.nom, req.body.prenom, req.body.username, req.body.password, req.body.mail], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.status(500).send('Erreur serveur');
        } 
    })
    res.render('index.ejs');
})

app.post('/compte/inscription', (req,res) => {
    res.render('compte/inscription');
})

app.post('/groupe', (req,res) => {
    pool.query('SELECT nom_groupe as name, id_groupe as ref FROM projet.groupes NATURAL JOIN projet.faitparties f natural join projet.utilisateurs u where u.username_utilisateur = $1;',[session.userid] , (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
        } else {
            listeGroupe = result.rows;
            res.render('cagnotes/groupes',{listeGroupe: listeGroupe});
        }
    });
    
})

app.get('/logout',(req,res) => {
    pool.query('UPDATE projet.utilisateurs SET dernier_page = $1 WHERE username_utilisateur = $2', [session.dernier_page, session.userid], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
        }
    });
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Server Running at port ${PORT}`));