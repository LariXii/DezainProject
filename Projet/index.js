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
    enTour : false,
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
    	this.nbJoueur++;
    	joueur.setRank(this.nbJoueur);
        Jeu.ensembleJoueurs[joueur.getNom()]=joueur;
        if(!Jeu.enJeu){
            Jeu.t_nomJoueurs.push(joueur.getNom());
        }
    },
    deconnecterJoueur : function(joueur){
    	console.log(joueur," se déconnecte");
        delete Jeu.ensembleJoueurs[joueur];
        t_nomJoueurs = Object.keys(Jeu.ensembleJoueurs);
        this.nbJoueur--;
        for(var i in Jeu.manche.t_doisJouer){
        	if(Jeu.manche.t_doisJouer[i] === joueur){
        		Jeu.manche.t_doisJouer.splice(i,1);
        	}
        }
        for(var i in Jeu.manche.nonDessinateur){
        	if(Jeu.manche.nonDessinateur[i] === joueur){
        		Jeu.manche.nonDessinateur.splice(i,1);
        	}
        }
        console.log(Jeu);
        if(Jeu.enTour){
        	console.log(Jeu.tour.drawer);
        	if(joueur === Jeu.tour.drawer){
			Jeu.tour.Stop();
			console.log('Le dessinateur s\'est déconnecté');
			if(Jeu.nbJoueur === 1){
				Jeu.tour.Stop();
				Jeu.enJeu = false;
				console.log('Plus assez de joueur pour jouer la manche');
				io.sockets.emit('finManche',Jeu.ensembleJoueurs);
			}
        	}
        	if(Jeu.nbJoueur === 1){
			Jeu.tour.Stop();
			Jeu.enJeu = false;
			console.log('Plus assez de joueur pour jouer la manche');
			io.sockets.emit('finManche',Jeu.ensembleJoueurs);
        	}
        }
    },
    manche : {
        t_doisJouer : [],
        nonDessinateur : [],
        Start: function(t_nomJoueurs){
            Jeu.enJeu = true;
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
    		drawer : undefined,
    		joueursTour : [],
    		solution : /^ra$/,
    		nbTrouve : 0,
        setTour(joueursNonDrawer,joueurDuTour){
        	for(var j in Jeu.ensembleJoueurs){
        		Jeu.ensembleJoueurs[j].trouveSolution = false;
        	}
            for(var i in joueurDuTour) {
                Jeu.ensembleJoueurs[joueurDuTour[i]].dessinateur = false;
            }
            console.log('JOUEURS QUI PEUVENT ETRE DESSINATEUR : ',joueursNonDrawer);
            
            //var t = Object.keys(joueursNonDrawer);
            var min = Math.ceil(0);
            var max = Math.floor(joueursNonDrawer.length);
            var rand = Math.floor(Math.random() * (max - min)) + min;
            /*Tirage aléatoire du dessinateur*/
            this.drawer = joueursNonDrawer[rand];
            console.log('DESSINATEUR : ',this.drawer);
            Jeu.ensembleJoueurs[this.drawer].dessinateur = true;
            Jeu.ensembleJoueurs[this.drawer].aEteDrawer = true;
	    clients[this.drawer].emit('dessinateur');
            this.joueursTour = [];
            for(var i in Jeu.manche.t_doisJouer){
                if(Jeu.ensembleJoueurs[Jeu.manche.t_doisJouer[i]].dessinateur === false){
                    clients[Jeu.manche.t_doisJouer[i]].emit('joueur');
                    this.joueursTour.push(Jeu.manche.t_doisJouer[i]);
                }
            }
            Jeu.tour.Start(Jeu.tpsTour,this.joueursTour,this.drawer);
        },
        Start: function(tpsTour,joueurs,dessinateur){
            Jeu.enTour = true;
            Jeu.chrono.Start(tpsTour);
            console.log('joueurs du tour :',joueurs);
        },
        Stop(){
        	console.log('Fin du tour');
        	Jeu.enTour = false;
        	Jeu.chrono.Stop();
        	Jeu.tour.CalculScore();
        	this.nbTrouve = 0;
        	io.sockets.emit('clear');
        	io.sockets.emit('liste',Jeu.ensembleJoueurs);
        },
        CalculScore(){
        	console.log('Il y a eu ',this.nbTrouve,' joueur(s) qui ont trouvé la solution\nIl y a ',Jeu.nbJoueur,' joueur(s) dans la partie');
        	Jeu.ensembleJoueurs[Jeu.tour.drawer].score += 100*(this.nbTrouve/Jeu.nbJoueur);
        	console.log('Le dessinateur est ',Jeu.tour.drawer,' il a gagné ',Jeu.ensembleJoueurs[Jeu.tour.drawer].score,'points');
        	Jeu.t_nomJoueurs.sort(function(a,b){
        		return Jeu.ensembleJoueurs[b].score - Jeu.ensembleJoueurs[a].score;
        	});
        	var rank = 1;
        	for(var i in Jeu.t_nomJoueurs){
			Jeu.ensembleJoueurs[Jeu.t_nomJoueurs[i]].rank = rank;
			rank++;
        	}
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
                if(Jeu.tour.nbTrouve === Jeu.nbJoueur-1){
                	this.Stop();
                	if(Jeu.manche.nonDessinateur.length-1 === 0){
		                Jeu.finManche = true;
		                Jeu.tour.Stop();
		                console.log("Fin de manche");
		                io.sockets.emit('finManche',Jeu.ensembleJoueurs);
		            }else{
		                Jeu.tour.Stop();
		                Jeu.manche.lancerTour();
		           }
                }else{
		        if(this.secondsLeft === 0){
		            //Tps écoulé -> arrêt du timer
		            this.Stop();
		            if(Jeu.manche.nonDessinateur.length-1 === 0){
		                Jeu.finManche = true;
		                console.log("Fin de manche");
		                io.sockets.emit('finManche',Jeu.ensembleJoueurs);
		            }else{
		                Jeu.tour.Stop();
		                Jeu.manche.lancerTour();
		           }
		       }
		}
            },

            Stop: function() {
                //quand le temps est écoulé, on arrête le timer
                this.secondsLeft = 0;
                clearInterval(this.timer);
                //Et on appelle la fonction qui gère la fin du temps imparti et poursuit le traitement
                //Ici, pour le test, simplement une fonction alert
                //console.log('Fin de manche');
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

	socket.on('canvas',function(img){
		io.sockets.emit('canvas',img);
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
                clients[msg.from].emit('bloquerChat');
            }
            if(msg.text.match(Jeu.tour.solution)){
            	clients[msg.from].emit('trouvéSolution');
            	console.log(msg.from+" A trouvé la solution a "+msg.temps+" s");
            	Jeu.ensembleJoueurs[msg.from].score += 5 + msg.temps * 0.25; 
            	Jeu.ensembleJoueurs[msg.from].trouveSolution = true;
            	msg.find = true;
            	Jeu.tour.nbTrouve++;
            	io.sockets.emit("message", msg);
            }else{
            	io.sockets.emit("message", msg);
            }
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
            	Jeu.chrono.Stop();
            	Jeu.enJeu = false;
            	Jeu.finManche = false;
            	delete Jeu;
                console.log("On supprime la partie");
                console.log(Jeu);
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
            	Jeu.chrono.Stop();
            	Jeu.enJeu = false;
            	Jeu.finManche = false;
            	delete Jeu;
                console.log("On supprime la partie");
                console.log(Jeu);
            }
        }
    });
});