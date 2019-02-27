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
    nbJoueurMax : undefined,
    nbJoueur : 0,
    tpsTour : undefined,
    alphabet : undefined,
    enJeu : false,
    finManche : false,
    t_nomJoueurs : [],
    ensembleJoueurs : {},
    setOptions : function(nomCreateur,nbManche,nbJoueur,tpsTour,alphabet){
        Jeu.nomCreateur = nomCreateur;
        Jeu.nompartie = 'Partie de '+nomCreateur;
        Jeu.nbManche = nbManche;
        Jeu.nbJoueurMax = nbJoueur;
        Jeu.tpsTour = tpsTour;
        Jeu.alphabet = alphabet;
    },
    ajoutJoueur : function(joueur){
        Jeu.ensembleJoueurs[joueur.getNom()]=joueur;
        if(!Jeu.enJeu){
            Jeu.t_nomJoueurs.push(joueur.getNom());
        }
        this.nbJoueur++;
    },
    deconnecterJoueur : function(joueur){
        delete Jeu.ensembleJoueurs[joueur];
        t_nomJoueurs = Object.keys(Jeu.ensembleJoueurs);
        this.nbJoueur--;
        console.log(t_nomJoueurs);
    },
    manche : {
        t_doisJouer : [],
        nonDessinateur : [],
        Start: function(t_nomJoueurs){
            this.t_doisJouer = t_nomJoueurs;
            console.log('JOUEUR DE LA MANCHE : ',this.t_doisJouer);
            this.lancerTour();
        },
        lancerTour(){
        	this.nonDessinateur = [];
		for(var i in this.t_doisJouer){
		    	if(!Jeu.ensembleJoueurs[this.t_doisJouer[i]].aEteDrawer){
		        	this.nonDessinateur.push(Jeu.ensembleJoueurs[this.t_doisJouer[i]].nom);
		        }
		}
		console.log('On lance un tour, ceux qui peuvent être dessinateur sont : ',this.nonDessinateur);
        	Jeu.tour.setTour(this.nonDessinateur,this.t_doisJouer);
        },
    },
    tour : {
        setTour(joueursNonDrawer,joueurDuTour){
            for(var i in joueurDuTour) {
                Jeu.ensembleJoueurs[joueurDuTour[i]].dessinateur = false;
            }
            console.log('JOUEURS QUI PEUVENT ETRE DESSINATEUR : ',joueursNonDrawer);
            
            //var t = Object.keys(joueursNonDrawer);
            var min = Math.ceil(0);
            var max = Math.floor(joueursNonDrawer.length);
            var rand = Math.floor(Math.random() * (max - min)) + min;
            /*Tirage aléatoire du dessinateur*/
            var drawer = joueursNonDrawer[rand];
            console.log('DESSINATEUR : ',drawer);
            Jeu.ensembleJoueurs[drawer].dessinateur = true;
            Jeu.ensembleJoueurs[drawer].aEteDrawer = true;
	    clients[drawer].emit('dessinateur');

            var joueursTour = [];
            for(var i in Jeu.manche.t_doisJouer){
                if(Jeu.ensembleJoueurs[Jeu.manche.t_doisJouer[i]].dessinateur === false){
                    clients[Jeu.manche.t_doisJouer[i]].emit('joueur');
                    joueursTour.push(Jeu.manche.t_doisJouer[i]);
                }
            }
            Jeu.tour.Start(Jeu.tpsTour,joueursTour,drawer);
        },
        Start: function(tpsTour,joueurs,dessinateur){
            Jeu.enJeu = true;
            Jeu.chrono.Start(tpsTour);
            console.log('joueurs du tour :',joueurs);
        },
    },
    chrono : {
            secondsLeft: 0,
            timer: undefined,

            Start: function(secondsLeft) {
                //Initialisation du nombre de secondes selon la valeur passée en paramètre
                this.secondsLeft = secondsLeft;
                //Démarrage du chrono
                this.timer = setInterval(this.Tick.bind(this), 1000);
            },

            Tick: function() {
                //On actualise la valeur affichée du nombre de secondes
                io.sockets.emit('temps',--this.secondsLeft);
                if(this.secondsLeft === 0){
                    //Tps écoulé -> arrêt du timer
                    this.Stop();
                    if(Jeu.manche.nonDessinateur.length-1 === 0){
                        Jeu.finManche = true;
                        console.log("Fin de manche");
                    }else{
                        console.log('Fin de tour');
                        Jeu.manche.lancerTour();
                    }
                }

            },

            Stop: function() {
                //quand le temps est écoulé, on arrête le timer
                clearInterval(this.timer);
                //Et on appelle la fonction qui gère la fin du temps imparti et poursuit le traitement
                //Ici, pour le test, simplement une fonction alert
                //console.log('Fin de manche');
            }

        /*Jeu.temps = tps;
        //Reactualisation du chrono si different de 0.
        if ( Jeu.temps > 0)
        {
            io.sockets.emit('temps',Jeu.temps);
            setTimeout(function(){Jeu.lancerChrono(Jeu.temps--);}, 1000);
        }else{
            io.sockets.emit('tempsEcoule');
        }*/
    }
   /* lancerTour(){
        Jeu.enJeu = true;
        Jeu.chrono.Start(Jeu.tpsTour);
        var min = Math.ceil(0);
        var max = Math.floor(Jeu.t_doisJouer.length);
        var rand = Math.floor(Math.random() * (max - min)) + min;
        //Tirage aléatoire du dessinateur
        console.log(Jeu.t_nomJoueurs[rand]+' est
        le dessinateur');
        var dessinateur = Jeu.t_nomJoueurs[rand];
        Jeu.t_doisJouer.splice(rand,1);
        //On supprime le dessinateur de la liste des joueurs à jouer
        console.log(Jeu.t_doisJouer);
        clients[Jeu.ensembleJoueurs[dessinateur].nom].emit('dessinateur');
    },
    lancerManche(){
        Jeu.t_doisJouer = Jeu.t_nomJoueurs;
        setTimeout(function(){Jeu.lancerTour();},5000);
    }*/
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
        this.aEteDrawer = false;
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

    // message de debug
    if(Object.keys(Jeu.ensembleJoueurs).length === 0){
        socket.emit('createur');
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
    });

    socket.on("verif",function(){
        if(Object.keys(Jeu.ensembleJoueurs).length+1 < Jeu.nbJoueurMax){
            socket.emit("check",true);
        }
        else {
            if(Object.keys(Jeu.ensembleJoueurs).length+1 == Jeu.nbJoueurMax) {
                socket.emit("check",true);
                console.log('Le jeu va se lancer');
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
        if (Object.keys(Jeu.ensembleJoueurs).length == Jeu.nbJoueurMax){
           setTimeout(function(){Jeu.manche.Start(Jeu.t_nomJoueurs);},50);
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
            if(Object.keys(Jeu.ensembleJoueurs).length === 0){
                console.log("On supprime la partie");
            }
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
