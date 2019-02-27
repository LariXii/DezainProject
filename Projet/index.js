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

var kanji = {
    "hiragana" : {
        "a" : 12354, "i" : 12356, "u" : 12358, "e" : 12360, "o" : 12362,
        "ka": 12363, "ga": 12364, "ki": 12365, "gi": 12366, "ku": 12367, "gu": 12368, "ke": 12369, "ge": 12370, "ko": 12371, "go": 12372,
        "sa": 12373, "za": 12374,
        "shi": 12375, "ji": 12376,
        "su": 12377, "zu": 12378,
        "se": 12379, "ze": 12380,
        "so": 12381, "zo": 12382,
        "ta": 12383, "da": 12384,
        "chi": 12385, "di": 12386,
        "tsu": 12388, "du": 12389,
        "te": 12390, "de": 12391,
        "to": 12392, "do": 12393,
        "na": 12394, "ni": 12395, "nu": 12396, "ne": 12397, "no": 12398,
        "ha": 12399, "ba": 12400, "pa": 12401,
        "hi": 12402, "bi": 12403, "pi": 12404,
        "fu": 12405, "bu": 12406, "pu": 12407,
        "he": 12408, "be": 12409, "pe": 12410,
        "ho": 12411, "bo": 12412, "po": 12413,
        "ma": 12414, "mi": 12415, "mu": 12416, "me": 12417, "mo": 12418,
        "ya": 12420, "yu": 12422, "yo": 12424,
        "ra": 12425, "ri": 12426, "ru": 12427, "re": 12428, "ro": 12429,
        "wa": 12431, "wi": 12432, "we": 12433, "wo": 12434,
        "n" : 12435,
        "vu": 12436
    },
    "katakana" : {
        "a" : 12450, "i" : 12452, "u" : 12454, "e" : 12456, "o" : 12458,
        "ka": 12459, "ga": 12460, "ki": 12461, "gi": 12462, "ku": 12463, "gu": 12464, "ke": 12465, "ge": 12466, "ko": 12467, "go": 12468,
        "sa": 12469, "za": 12470,
        "shi": 12471, "ji": 12472,
        "su": 12473, "zu": 12474,
        "se": 12475, "ze": 12476,
        "so": 12477, "zo": 12478,
        "ta": 12479, "da": 12480,
        "chi": 12481, "di": 12482,
        "tsu": 12484, "du": 12485,
        "te": 12486, "de": 12487,
        "to": 12488, "do": 12489,
        "na": 12490, "ni": 12491, "nu": 12492, "ne": 12493, "no": 12494,
        "ha": 12495, "ba": 12496, "pa": 12497,
        "hi": 12498, "bi": 12499, "pi": 12500,
        "fu": 12501, "bu": 12502, "pu": 12503,
        "he": 12504, "be": 12505, "pe": 12506,
        "ho": 12507, "bo": 12508, "po": 12509,
        "ma": 12510, "mi": 12511, "mu": 12512, "me": 12513, "mo": 12514,
        "ya": 12516, "yu": 12518, "yo": 12520,
        "ra": 12521, "ri": 12522, "ru": 12523, "re": 12524, "ro": 12525,
        "wa": 12527, "wi": 12528, "we": 12529, "wo": 12530,
        "n" : 12531,
        "vu": 12532, "va": 12535, "vi": 12536, "ve": 12537, "vo": 12538
    }
};

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
    nbMancheJouer : 0,
    t_nomJoueurs : [],
    ensembleJoueurs : {},
    setOptions : function(nomCreateur,nbManche,nbJoueur,tpsTour,alphabet){
        Jeu.nomCreateur = nomCreateur;
        Jeu.nompartie = 'Partie de '+nomCreateur;
        Jeu.nbManche = nbManche;
        Jeu.nbJoueurMax = nbJoueur;
        Jeu.tpsTour = tpsTour;
        Jeu.alphabet = alphabet;
        //Jeu.cbs prend cette valeur
        //Jeu.cbs = cbs;
        //nombre de checkbox valide mais les tableaux sont tous
        //console.log(cbs);

        // Ensemble des glyphes
        //var objGlyphes = null;

        /** Dernier glyphe à faire deviner */
        //var last = null;

        /**Fonction pour lancer les 3 caractères */
        //change();
        /**
         *  Change la lettre/syllabe à reconnaître.
         */
        /*function change() {
            // récupération de l'alphabet
            alpha = null;
            if (Jeu.alphabet == "les2") {
                Jeu.alphabet = (Math.random() < 0.5) ? 'hiragana' : 'katakana';
            }
            if(Jeu.alphabet == 'hiragana'){
                objGlyphes =  new Glyphes(kanji.hiragana);
            }else{
                objGlyphes = new Glyphes(kanji.katakana);
            }
            console.log("on Cherche des "+Jeu.alphabet);

            var aTrouver = objGlyphes.getThreeGlyphes(last, alphabet);

        }*/
        /**
         *  Classe représentant l'ensemble des glyphes
         */
        //function Glyphes(glyphes) {
        /**
         *  Clés des glyphes éligibles par rapport aux options actuellement sélectionnées
         *  (fonction privée -- interne à la classe)
         */
        /* var getGlyphKeys = function() {
                //Ici cbs devrais contenir les valeurs des inputs
                var cbs = Jeu.cbs;
                return Object.keys(glyphes).filter(function(elem, _index, _array) {
                    // closure qui s'appuie sur les checkbox qui ont été sélectionnées (cbs)
                    for (var i=0; i < cbs.length; i++) {
                        // on vérifie si la clé (elem) matche la regex définie comme valeur de la checkbox
                        var patt = new RegExp("\\b" + cbs[i].value + "\\b", "g");
                        if (patt.test(elem)) {
                            return true;
                        }
                    }
                    return false;
                });
            }*/
        /**
         *  Choisit trois glyphes différents entre elles et différentes de celle dont la clé
         *  est passée en paramètre
         *  @param old          String  clé du glyphe
         *  @param alphabet     String  alphabet considéré
         */
        /*this.getThreeGlyphes = function(old, alphabet) {
                var eligible = getGlyphKeys();
                var aTrouver = [];
                var aEviter = [old];
                var key;
                for (var i=0; i < 3; i++) {
                    do {
                        key = eligible[Math.random() * eligible.length | 0];
                    }
                    while (aEviter.indexOf(key) >= 0);
                    aEviter.push(key);
                    aTrouver[i] = { key: key, ascii: glyphes[key] };

                }

                return aTrouver;
            }
        }*/
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
        this.t_nomJoueurs = Object.keys(Jeu.ensembleJoueurs);
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
        if(Jeu.enTour){
            console.log(Jeu.tour.drawer);
            if(joueur === Jeu.tour.drawer){
                Jeu.tour.Stop();
                console.log('Le dessinateur s\'est déconnecté');
                if(Jeu.nbJoueur === 1){
                    Jeu.tour.Stop();
                    Jeu.manche.fin();
                }
            }
            if(Jeu.nbJoueur === 1){
                Jeu.tour.Stop();
                Jeu.manche.fin();
            }
        }
    },
    manche : {
        t_doisJouer : [],
        nonDessinateur : [],
        Start: function(t_nomJoueurs){
            console.log('La manche se lance');
            Jeu.enJeu = true;
            this.t_doisJouer = t_nomJoueurs;
            console.log('Les joueurs qui joueront sont : ',this.t_doisJouer);
            io.sockets.emit('startManche');
            this.lancerTour();
        },
        lancerTour(){
            this.nonDessinateur = [];
            for(var i in this.t_doisJouer){
                if(!Jeu.ensembleJoueurs[this.t_doisJouer[i]].aEteDrawer){
                    this.nonDessinateur.push(Jeu.ensembleJoueurs[this.t_doisJouer[i]].nom);
                }
            }
            console.log('Les joueurs non dessinateur sont : ',this.nonDessinateur);
            Jeu.tour.setTour(this.nonDessinateur,this.t_doisJouer);
        },
        fin(){
            Jeu.enJeu = false;
            Jeu.nbMancheJouer++;
            if(Jeu.nbMancheJouer == Jeu.nbManche){
                io.sockets.emit('finJeu',Jeu.ensembleJoueurs);
            }else{
                io.sockets.emit('finManche',Jeu.ensembleJoueurs);
                for(var i in Jeu.ensembleJoueurs){
                    Jeu.ensembleJoueurs[i].aEteDrawer = false;
                }
                setTimeout(function(){Jeu.manche.Start(Jeu.t_nomJoueurs);},5000);
            }
        },
    },
    tour : {
        drawer : undefined,
        joueursTour : [],
        solution : /^ra$/,
        nbTrouve : 0,
        nbBloque : 0,
        setTour(joueursNonDrawer,joueurDuTour){
            this.nbTrouve = 0;
            this.nbBloque = 0;
            for(var j in Jeu.ensembleJoueurs){
                Jeu.ensembleJoueurs[j].trouveSolution = false;
                Jeu.ensembleJoueurs[j].nombreEssai = 3;
                Jeu.ensembleJoueurs[j].estBloque = false;
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
            Jeu.ensembleJoueurs[this.drawer].estBloque = true;
            this.nbBloque++;
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
            io.sockets.emit('liste',Jeu.ensembleJoueurs,Jeu.t_nomJoueurs);
            io.sockets.emit('finTour',Jeu.t_nomJoueurs);
        },
        CalculScore(){
            console.log('Il y a eu ',this.nbTrouve,' joueur(s) qui ont trouvé la solution\nIl y a ',Jeu.nbJoueur,' joueur(s) dans la partie');
            Jeu.ensembleJoueurs[Jeu.tour.drawer].score += parseInt(20*(this.nbTrouve/(Jeu.nbJoueur-1)));
            console.log('Le dessinateur est ',Jeu.tour.drawer,' il a gagné ',parseInt(20*(this.nbTrouve/(Jeu.nbJoueur-1))),'points');
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
            if(Jeu.tour.nbBloque === Jeu.nbJoueur){
                this.Stop();
                //On regarde si il reste des dessinateurs potentiel
                if(Jeu.manche.nonDessinateur.length-1 === 0){
                    Jeu.tour.Stop();
                    Jeu.manche.fin();
                }else{
                    Jeu.tour.Stop();
                    Jeu.manche.lancerTour();
                }
            }else{
                if(this.secondsLeft === 0){
                    //Tps écoulé -> arrêt du timer
                    this.Stop();
                    //On regarde si il reste des dessinateurs potentiel
                    if(Jeu.manche.nonDessinateur.length-1 === 0){
                        Jeu.tour.Stop();
                        Jeu.manche.fin();
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
        this.estBloque = false;
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
   // io.sockets.emit('test');
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
        //if(Object.keys(Jeu.ensembleJoueurs).length === 0){
        console.log(Object.keys(Jeu.ensembleJoueurs).length+1);
            if(Object.keys(Jeu.ensembleJoueurs).length+1 < Jeu.nbJoueurMax){
                socket.emit("check",true);
            }
            else {
                if(Object.keys(Jeu.ensembleJoueurs).length+1 == Jeu.nbJoueurMax) {
                    socket.emit("check",true);
                }
                else{
                    socket.emit("check",false);
                }
            }
        //}

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
        console.log(Jeu.t_nomJoueurs);
        // envoi de la nouvelle liste à tous les clients connectés
        io.sockets.emit("liste", Jeu.ensembleJoueurs,Jeu.t_nomJoueurs);
        if (Object.keys(Jeu.ensembleJoueurs).length == Jeu.nbJoueurMax){
            console.log(Jeu);
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
                clients[msg.from].emit('bloquerChat',Jeu.ensembleJoueurs[msg.from]);
                Jeu.ensembleJoueurs[msg.from].estBloque = true;
                Jeu.tour.nbBloque++;
            }
            if(msg.text.match(Jeu.tour.solution)){
                io.sockets.emit('trouveSolution',msg.from);
                console.log(msg.from+" a trouvé la solution il gagne ",parseInt(20 * (msg.temps / Jeu.tpsTour)),'points');
                Jeu.ensembleJoueurs[msg.from].score += parseInt(15 * (msg.temps / Jeu.tpsTour));
                Jeu.ensembleJoueurs[msg.from].trouveSolution = true;
                Jeu.ensembleJoueurs[msg.from].estBloque = true;
                msg.find = true;
                Jeu.tour.nbTrouve++;
                Jeu.tour.nbBloque++;
                clients[msg.from].emit('bloquerChat',Jeu.ensembleJoueurs[msg.from]);
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
            socket.broadcast.emit("liste", Jeu.ensembleJoueurs,Jeu.t_nomJoueurs);
            if(Object.keys(Jeu.ensembleJoueurs).length === 0){
                Jeu.chrono.Stop();
                Jeu.enJeu = false;
                Jeu.finManche = false;
                Jeu = {};
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
            socket.broadcast.emit("liste", Jeu.ensembleJoueurs,Jeu.t_nomJoueurs);
            console.log("Client déconnecté\nIl reste "+Object.keys(Jeu.ensembleJoueurs).length+" joueur(s)");
            if(Object.keys(Jeu.ensembleJoueurs).length === 0){
                Jeu.chrono.Stop();
                Jeu.enJeu = false;
                Jeu.finManche = false;
                Jeu = {};
                console.log("On supprime la partie");
                console.log(Jeu);
            }
        }
    });
});
