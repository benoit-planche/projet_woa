const express = require('express');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');

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

//username and password
const myusername = 'user1'
const mypassword = 'mypassword'

// a variable to save a session
var session;

let liste = [
    {user: "Jules", price: 15, description: "Dernière transaction"},
    {user: "Mathieu", price: 10, description: "Deuxième transaction"},
    {user: "Mathis", price: 5, description: "Troisième transaction"},
    {user: "Benoit", price: 10, description: "Quatrième transaction"}
    ];

let listeGroupe = [
    {name: "Cagnote 1", ref:"/cagnotes/cagnote"},
    {name: "Cagnote 2", ref:"#"},
    {name: "Cagnote 3", ref:"#"},
    {name: "Cagnote 4", ref:"#"},
    {name: "Cagnote 5", ref:"#"},
    {name: "Cagnote 6", ref:"#"}
]

document.getElementById

app.get('/',(req,res) => {
    session=req.session;
    if(session.userid){
        res.render('cagnotes/cagnote.ejs',{liste: liste});
    }else
    res.render('index.ejs')
});

app.post('/user',(req,res) => {
    if(req.body.username == myusername && req.body.password == mypassword){
        session=req.session;
        session.userid=req.body.username;
        console.log(req.session)
        res.render('cagnotes/cagnote.ejs',{liste: liste});
    }
    else{
        res.send('Invalid username or password');
    }
})

app.get('/compte/views', (req,res) => {
    res.render('compte/views');
})

app.get('/groupe', (req,res) => {
    res.render('cagnotes/groupes',{listeGroupe: listeGroupe});
})

app.get('/logout',(req,res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(PORT, () => console.log(`Server Running at port ${PORT}`));