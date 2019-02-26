// Chargement des modules 
var express = require('express');
var app = express();
var server = app.listen(8080, function() {
    console.log("C'est parti ! En attente de connexion sur le port 8080...");
});

// Ecoute sur les websockets
var io = require('socket.io').listen(server);

// Configuration d'express pour utiliser le répertoire "public"
app.use(express.static('public'));
// set up to 
app.get('/', function(req, res) {  
    res.sendFile(__dirname + '/public/dezain.html');
});



/*** Gestion des clients et des connexions ***/
var clients = {};       // id -> socket
var nombreUser = 0;

var Jeu = {
    nomCreateur : undefined,
    nompartie : undefined,
    nbManche : undefined,
    nbJoueur : undefined,
    tpsTour : undefined,
    alphabet : undefined,
    temps : undefined,
    enJeu : false,
    t_nomJoueurs : [],
    t_doisJouer :[],
    ensembleJoueurs : {},
    setOptions : function(nomCreateur,nbManche,nbJoueur,tpsTour,alphabet){
        Jeu.nomCreateur = nomCreateur;
        Jeu.nompartie = 'Partie de '+nomCreateur;
        Jeu.nbManche = nbManche;
        Jeu.nbJoueur = nbJoueur;
        Jeu.tpsTour = tpsTour;
        Jeu.alphabet = alphabet;
    },
    ajoutJoueur : function(joueur){
        Jeu.ensembleJoueurs[joueur.getNom()]=joueur
        Jeu.t_nomJoueurs.push(joueur.getNom());
        Jeu.t_doisJouer.push(joueur.getNom());
    },
    deconnecterJoueur : function(joueur){
        delete Jeu.ensembleJoueurs[joueur];
        console.log(Jeu);
    },
    lancerChrono : function(tps){
        Jeu.temps = tps - 1;
        if(Jeu.temps > -1)
            io.sockets.emit('temps',Jeu.temps);
        //Reactualisation du chrono si different de 0.
        if ( tps > 0)
        {
            setTimeout(function(){Jeu.lancerChrono(Jeu.temps);}, 1000);
        }
        else{
            io.sockets.emit('tempsEcoule');
        }
    },
    lancerTour(){
        Jeu.enJeu = true;
        Jeu.lancerChrono(Jeu.tpsTour);
    },
    lancerManche(){
        var min = Math.ceil(0);
        var max = Math.floor(Jeu.t_doisJouer.length);
        var rand = Math.floor(Math.random() * (max - min)) + min;
        console.log(Jeu.t_nomJoueurs[rand]+' est le dessinateur');
        var dessinateur = Jeu.t_nomJoueurs[rand];
        Jeu.t_doisJouer.splice(rand,1);
        console.log(Jeu.t_doisJouer);
        clients[Jeu.ensembleJoueurs[dessinateur].nom].emit('dessinateur');
        if(Jeu.t_doisJouer.length != 0){
            setTimeout(function(){Jeu.lancerManche();},360);
        }
    }
};

class Joueur {
    constructor(nom,numAvatar){
        this.nom = nom;
        this.avatar = numAvatar;
        this.rank = 0;
        this.score = 0;
        this.nombreEssai = 3;
        this.dessinateur = false;
        this.trouveSolution = false;
    }
    setNom(nom){
        this.nom = nom;
    }
    getNom(){
        return this.nom;
    }
    setAvatar(avatar){
        this.avatar = avatar;
    }
    getAvatar(){
        return this.avatar;
    }
    setRank(rank){
        this.rank = rank;
    }
}
// Quand un client se connecte, on le note dans la console
io.on('connection', function (socket) {

    function chrono(temps){
        temps = temps - 1;
        io.sockets.emit('temps',temps);
        //Reactualisation du chrono si different de 0.
        if ( temps > 0)
        {
            setTimeout(function(){chrono(temps);}, 1000);
        }
        else{
            io.sockets.emit('finTemps');
        }
    }

    // message de debug
    if(Object.keys(Jeu.ensembleJoueurs).length === 0){
        socket.emit('createur');
        //Jeu.lancerChrono(300);
    }
    else{
        socket.emit('invite');
    }
    var currentID = null;
    var joueur = null;
    /**
     *  Doit être la première action après la connexion.
     *  @param  id  string  l'identifiant saisi par le client
     */

    socket.on("creerPartie", function(options) {
        Jeu.setOptions(options.createur,options.nbManche,options.nbJoueur,options.tpsTour);
        console.log("Nouveau jeu créé par " + Jeu.nomCreateur);
        console.log(Jeu);
    });

    socket.on("verif",function(){
        if(Object.keys(Jeu.ensembleJoueurs).length+1 < Jeu.nbJoueur){
            socket.emit("check",true);
        }
        else {
            if(Object.keys(Jeu.ensembleJoueurs).length+1 == Jeu.nbJoueur) {
                socket.emit("check",true);
                console.log('Le jeu va se lancer');
                //Jeu.lancerTour();
            }
            else{
                socket.emit("check",false);
            }
        }
    });

    socket.on("login", function(logJoueur) {
        while (clients[logJoueur.pseudo]) {
            logJoueur.pseudo = logJoueur.pseudo + "(1)";
        }
        currentID = logJoueur.pseudo;
        clients[currentID] = socket;
        joueur = new Joueur(logJoueur.pseudo, logJoueur.avatar);
        console.log("Nouvel utilisateur : " + currentID);
        Jeu.ajoutJoueur(joueur);
        // envoi d'un message de bienvenue à ce client
        socket.emit("bienvenue", joueur.getNom());
        // envoi aux autres clients
        socket.broadcast.emit("message", {
            from: null,
            to: null,
            text: currentID + " a rejoint la discussion",
            date: Date.now()
        });
        // envoi de la nouvelle liste à tous les clients connectés
        io.sockets.emit("liste", Jeu.ensembleJoueurs);
        if (Object.keys(Jeu.ensembleJoueurs).length == Jeu.nbJoueur){
            setTimeout(function(){Jeu.lancerManche();},50);
         }
    });
    
    
    /**
     *  Réception d'un message et transmission à tous.
     *  @param  msg     Object  le message à transférer à tous  
     */
    socket.on("message", function(msg) {
        console.log("Reçu message");
        /*// si jamais la date n'existe pas, on la rajoute
        msg.date = Date.now();
        // si message privé, envoi seulement au destinataire
        if (msg.to != null && clients[msg.to] !== undefined) {
            console.log(" --> message privé");
            clients[msg.to].emit("message", msg);
            if (msg.from != msg.to) {
                socket.emit("message", msg);
            }
        }
        else {*/
        if(!Jeu.enJeu) {
            console.log(" --> broadcast");
            io.sockets.emit("message", msg);
        }
        else{
            Jeu.ensembleJoueurs[msg.from].nombreEssai--;
            if(Jeu.ensembleJoueurs[msg.from].nombreEssai === 0){
                socket.emit('bloquerChat');
            }
            io.sockets.emit("message", msg);
        }
        //}
    });
    

    /** 
     *  Gestion des déconnexions
     */
    
    // fermeture
    socket.on("logout", function() { 
        // si client était identifié (devrait toujours être le cas)
        if (currentID) {
            console.log("Sortie de l'utilisateur " + currentID);
            // envoi de l'information de déconnexion
            socket.broadcast.emit("message", 
                { from: null, to: null, text: currentID + " a quitté la discussion", date: Date.now() } );
                // suppression de l'entrée
            delete clients[currentID];
            Jeu.deconnecterJoueur(joueur.getNom());
            // envoi de la nouvelle liste pour mise à jour
            socket.broadcast.emit("liste", Jeu.ensembleJoueurs);
        }
    });
    
    // déconnexion de la socket
    socket.on("disconnect", function(reason) { 
        // si client était identifié
        if (currentID) {
            // envoi de l'information de déconnexion
            socket.broadcast.emit("message", 
                { from: null, to: null, text: currentID + " vient de se déconnecter de l'application", date: Date.now() } );
                // suppression de l'entrée
            delete clients[currentID];
            Jeu.deconnecterJoueur(joueur.getNom());
            // envoi de la nouvelle liste pour mise à jour
            socket.broadcast.emit("liste", Jeu.ensembleJoueurs);
            console.log("Client déconnecté\nIl reste "+Object.keys(Jeu.ensembleJoueurs).length+" joueur(s)");
            if(Object.keys(Jeu.ensembleJoueurs).length === 0){
                console.log("On supprime la partie");
            }
        }
    });
});