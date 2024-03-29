const express = require('express');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'woa_application',
    host: '162.38.112.140',
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
    saveUninitialized: true,
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
let success = {
    nom: false,
    prenom: false,
    mail: false,
    mdp: false
};

let liste;
let totalDepense;
let listeGroupe;

function groupe(req, res) {
    if(!session) {
        res.redirect('/');
    }
    if (req.body.ref == 'new_groupe') {
        pool.query('INSERT INTO projet.groupes (nom_groupe, total_depense, id_owner) VALUES ($1, $2, $3)', [req.body.nom_groupe, 0, session.userid], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'exécution de la requête :', err);
                res.redirect(307, '/groupe');
            }
        });
    }

    session = req.session;
    if (session.username) {
        pool.query('SELECT nom_groupe as name, id_groupe as ref FROM projet.groupes NATURAL JOIN projet.faitparties f natural join projet.utilisateurs u where u.username_utilisateur = $1;', [session.username], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'exécution de la requête :', err);
                res.redirect(307, '/groupe');
            } else {
                listeGroupe = result.rows;
                res.render('cagnotes/groupes', { listeGroupe: listeGroupe });
            }
        });
    } else {
        res.redirect('/');
    }
}

app.get('/', (req, res) => {
    session = req.session;
    if (session.username) {
        res.redirect(307, '/groupe');
    } else {
        res.render('index.ejs')
    }
});

app.post('/cagnotes/cagnote', (req, res) => {
    if(!session) {
        res.redirect('/');
    }
    if (req.body.id != null) {
        session.dernier_page = req.body.id;
    }

    pool.query('SELECT ROUND(balance::numeric, 2) as balance from calculate_user_balance($1) where username_utilisateur = $2;', [session.dernier_page, session.username], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.redirect(307, '/groupe');
        } else {
            let balance
            if(result.rows[0].balance == null) {
                balance = 0;
            } else {
                balance = result.rows[0].balance;
            }
            pool.query('SELECT u.username_utilisateur as username, u.prenom_utilisateur as user, d.montant_depense as price, d.description_depense as description FROM projet.utilisateurs u NATURAL JOIN projet.depenses d natural join projet.groupes g WHERE g.id_groupe = $1 order by date_depense desc;', [session.dernier_page], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    liste = result.rows;

                    pool.query('SELECT g.nom_groupe as nom_groupe, g.total_depense as totalDepense, g.id_owner as owner FROM projet.groupes g WHERE id_groupe = $1;', [session.dernier_page], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'exécution de la requête :', err);
                            res.redirect(307, '/groupe');
                        } else {
                            totalDepense = result.rows[0].totaldepense;
                            liste.owner = result.rows[0].owner;
                            liste.nom_groupe = result.rows[0].nom_groupe;
                            pool.query('SELECT u.username_utilisateur AS username FROM projet.utilisateurs u WHERE u.id_utilisateur in (select a.id_utilisateur from projet.amis a where a.id_amis = $1 and a.valide_amis = true) or u.id_utilisateur in (select a.id_amis from projet.amis a where a.id_utilisateur = $1 and a.valide_amis = true);', [session.userid], (err, result) => {
                                if (err) {
                                    console.error('Erreur lors de l\'exécution de la requête :', err);
                                    res.redirect(307, '/groupe');
                                } else {
                                    listeAmis = result.rows;
                                    pool.query('SELECT u.username_utilisateur AS username, f.contribution  AS contribution FROM projet.utilisateurs u JOIN projet.faitparties f ON u.id_utilisateur = f.id_utilisateur WHERE f.id_groupe = $1;', [session.dernier_page], (err, result) => {
                                        if (err) {
                                            console.error('Erreur lors de l\'exécution de la requête :', err);
                                            res.redirect(307, '/groupe');
                                        } else {
                                            listeMembres = result.rows;
                                            let listeAmisNonMembres = [];
                                            listeAmis.forEach(user => {
                                                let isMember = false;
                                                listeMembres.forEach(membre => {
                                                    if (user.username == membre.username) {
                                                        isMember = true;
                                                    }
                                                });
                                                if (!isMember) {
                                                    listeAmisNonMembres.push(user.username);
                                                }
                                            });

                                            res.render('cagnotes/cagnote.ejs',
                                                {
                                                    liste: liste,
                                                    totalDepense: totalDepense,
                                                    listeAmis: listeAmisNonMembres,
                                                    listeMembres: listeMembres,
                                                    listeAmisNonMembres: listeAmisNonMembres,
                                                    session: session,
                                                    balance: balance
                                                });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });

});

app.post('/user', (req, res) => {
    pool.query('SELECT * FROM projet.utilisateurs WHERE username_utilisateur = $1 AND mdp_utilisateur::password = $2;', [req.body.username, req.body.password], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.redirect(307, '/groupe');
        } else {
            console.log(result.rows);
            if (result.rows.length > 0) {
                session = req.session;
                session.username = req.body.username;
                session.userid = result.rows[0].id_utilisateur;
                session.dernier_page = result.rows[0].dernier_page;

                if (session.dernier_page != null) {
                    res.redirect(307, '/cagnotes/cagnote');
                } else {
                    res.redirect(307, '/groupe');
                }
            }
        }
    });
});

app.post('/update', (req, res) => {
    if(!session) {
        res.redirect('/');
    }
    switch (req.body.ref) {

        case 'update_contribution':
            let total_contribution = 0;
            let body = {username: {}, contribution: {}};
            body.username = req.body.username;
            body.contribution = req.body.contribution;
             body.contribution.forEach(element => {
                total_contribution += parseInt(element);
            });
            if (total_contribution == 100) {
                let i = 0;
                while (body.username.length > i) {
                    pool.query('UPDATE projet.faitparties SET contribution = $1 WHERE id_groupe = $2 AND id_utilisateur = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $3)', [body.contribution[i], session.dernier_page, body.username[i]], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'exécution de la requête :', err);
                            res.redirect(307, '/groupe');
                        }
                    });
                    i++;
                }
                res.redirect(307, '/cagnotes/cagnote');
            } else {
                res.redirect(307, '/cagnotes/cagnote');
            } 
            break;

        case 'supprimer_groupe':
            pool.query('DELETE FROM projet.groupes WHERE id_groupe = $1', [session.dernier_page], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');

                } else {    
                    res.redirect(307, '/groupe');
                }
            }
            );
            break;

        case 'changer_proprietaire_groupe':
            pool.query('UPDATE projet.groupes SET id_owner = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $1) WHERE id_groupe = $2', [req.body.new_owner, session.dernier_page], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/cagnotes/cagnote');
                }
            });
            break;

        case 'delete_membres':
            pool.query('DELETE FROM projet.faitparties WHERE id_groupe = $1 AND id_utilisateur = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $2)', [session.dernier_page, req.body.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/cagnotes/cagnote');
                }
            });
            break;

        case 'update_nom_groupe':
            pool.query('UPDATE projet.groupes SET nom_groupe = $1 WHERE id_groupe = $2', [req.body.nom_groupe, session.dernier_page], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/cagnotes/cagnote');
                }
            });
            break;

        case 'add_membre':
            pool.query('INSERT INTO projet.faitparties (id_groupe, id_utilisateur) VALUES ($1, (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $2))', [session.dernier_page, req.body.membre], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/cagnotes/cagnote');
                }
            });
            break;

        case 'add_transaction':
            pool.query('INSERT INTO projet.depenses (id_groupe, id_utilisateur, montant_depense, description_depense, date_depense) VALUES ($1, (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $2), $3, $4, $5)', [session.dernier_page, req.body.crediteur, req.body.montant, req.body.description, req.body.date], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/cagnotes/cagnote');
                }
            });
            break;

        case 'add_amis':
            pool.query('SELECT count(*) FROM projet.utilisateurs WHERE username_utilisateur = $1', [req.body.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    if (result.rows[0].count == 1) {
                        pool.query('INSERT INTO projet.amis (id_utilisateur, id_amis) VALUES ((SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $1), (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $2))', [session.username, req.body.username], (err, result) => {
                            if (err) {
                                console.error('Erreur lors de l\'exécution de la requête :', err);
                                res.redirect(307, '/groupe');
                            } else {
                                success.amis = true;
                                res.redirect(307, '/compte/views');
                            }
                        });
                    } else {
                        res.redirect(307, '/compte/views');
                    }
                }
            });
            break;

        case 'amis_refuse':
            pool.query('DELETE FROM projet.amis WHERE id_utilisateur = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $1) AND id_amis = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $2)', [req.body.username, session.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/compte/views');
                }
            });
            break;

        case 'amis_accepte':
            pool.query('UPDATE projet.amis SET valide_amis = true WHERE id_utilisateur = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $1) AND id_amis = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $2)', [req.body.username, session.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    res.redirect(307, '/compte/views');
                }
            });
            break;

        case 'update_email':
            pool.query('UPDATE projet.utilisateurs SET mail_utilisateur = $1 WHERE username_utilisateur = $2', [req.body.email, session.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    success.mail = true;
                    res.redirect(307, '/compte/views');
                } 
                
            });
            break;
        case 'update_nom':
            pool.query('UPDATE projet.utilisateurs SET nom_utilisateur = $1 WHERE username_utilisateur = $2', [req.body.nom, session.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    success.nom = true;
                    res.redirect(307, '/compte/views');
                }
                
            });
            break;
        case 'update_prenom':
            pool.query('UPDATE projet.utilisateurs SET prenom_utilisateur = $1 WHERE username_utilisateur = $2', [req.body.prenom, session.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                } else {
                    success.prenom = true;
                    res.redirect(307, '/compte/views');
                }
                
            });
            break;
        case 'update_mdp':
            if (req.body.password == req.body.password2) {
                pool.query('UPDATE projet.utilisateurs SET mdp_utilisateur = $1 WHERE username_utilisateur = $2', [req.body.password, session.username], (err, result) => {
                    if (err) {
                        console.error('Erreur lors de l\'exécution de la requête :', err);
                        res.redirect(307, '/groupe');
                    } else {
                        success.mdp = true;
                        res.redirect(307, '/compte/views');
                    }
                    
                });
            }
            else {
                res.redirect(307, '/compte/views');
            }
            break;
        default:
            res.redirect(307, '/compte/views');
            break;

    }
});

app.post('/compte/views', (req, res) => {
    if(!session) {
        res.redirect('/');
    }
    let get_success = success;
    success = {
        nom: false,
        prenom: false,
        mail: false,
        mdp: false,
        amis: false
    };
    pool.query('SELECT * FROM projet.utilisateurs WHERE username_utilisateur = $1', [session.username], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.redirect(307, '/groupe');
        }
        else {
            user = result.rows[0];
            pool.query('SELECT u.username_utilisateur AS username FROM projet.utilisateurs u JOIN projet.amis a ON u.id_utilisateur = a.id_utilisateur WHERE a.id_amis = (SELECT id_utilisateur FROM projet.utilisateurs WHERE username_utilisateur = $1) and valide_amis = false ;', [session.username], (err, result) => {
                if (err) {
                    console.error('Erreur lors de l\'exécution de la requête :', err);
                    res.redirect(307, '/groupe');
                }
                else {
                    demande_amis = result.rows;
                     res.render('compte/views', { user: user, success: get_success, demande_amis: demande_amis });
                }
            });
        }
    });

})

app.post('/connexion', (req, res) => {
    if(!session) {
        res.redirect('/');
    }
    pool.query('INSERT INTO projet.utilisateurs (nom_utilisateur, prenom_utilisateur, username_utilisateur, mdp_utilisateur, mail_utilisateur) VALUES ($1, $2, $3, $4, $5)', [req.body.nom, req.body.prenom, req.body.username, req.body.password, req.body.mail], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
        }
    });
    res.render('index.ejs');
})

app.post('/compte/inscription', (req, res) => {
    res.render('compte/inscription');
});

app.post('/groupe', groupe);

app.get('/groupe', groupe);

app.post('/logout', (req, res) => {
    if(!session) {
        res.redirect('/');
    }
    pool.query('UPDATE projet.utilisateurs SET dernier_page = $1 WHERE username_utilisateur = $2', [session.dernier_page, session.username], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'exécution de la requête :', err);
            res.redirect(307, '/groupe');
        }
    });
    req.session.destroy();
    res.redirect('/');
});

app.use((req, res) => {
    if (session) {
        res.redirect(307, '/groupe');
    }
    else {
        res.redirect('/');
    }
});

app.listen(PORT, () => console.log(`Server Running at port ${PORT}`));