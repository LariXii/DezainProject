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
var serv_joueurs = {};
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
var serveur = {
    ensemblePartie : {},
    ajoutPartie(partie){
        this.ensemblePartie[partie.nomPartie] = partie;
    },
    supprimePartie(partie){
        delete this.ensemblePartie[partie.nomPartie];
    }
};

function Glyphes(glyphes,nomPartie) {
    /**
     *  Clés des glyphes éligibles par rapport aux options actuellement sélectionnées
     *  (fonction privée -- interne à la classe)
     */
    var getGlyphKeys = function () {
        //Ici cbs devrais contenir les valeurs des inputs
        return Object.keys(glyphes).filter(function (elem, _index, _array) {
            // closure qui s'appuie sur les checkbox qui ont été sélectionnées (cbs)
            for (var i = 0; i < serveur.ensemblePartie[nomPartie].cbs.length; i++) {
                // on vérifie si la clé (elem) matche la regex définie comme valeur de la checkbox
                var patt = new RegExp("\\b" + serveur.ensemblePartie[nomPartie].cbs[i] + "\\b", "g");
                if (patt.test(elem)) {
                    return true;
                }
            }
            return false;
        });
    }
    /**
     *  Choisit trois glyphes différents entre elles et différentes de celle dont la clé
     *  est passée en paramètre
     *  @param old          String  clé du glyphe
     *  @param alphabet     String  alphabet considéré
     */
    this.getThreeGlyphes = function (old, alphabet) {
        var eligible = getGlyphKeys();
        var aTrouver = [];
        var aEviter = [old];
        var key;
        for (var i = 0; i < 3; i++) {
            do {
                key = eligible[Math.random() * eligible.length | 0];
            }
            while (aEviter.indexOf(key) >= 0);
            aEviter.push(key);
            aTrouver[i] = {key: key, ascii: glyphes[key]};

        }

        return aTrouver;
    }
}

class Partie {
    constructor (nomCreateur,nomPartie,nbManche,nbJoueur,tpsTour,alphabet,cbs){
        this.nomCreateur = nomCreateur;
        this.nomPartie = nomPartie;
        this.nbManche = nbManche;
        this.nbJoueurMax = nbJoueur;
        this.tpsTour = tpsTour;
        this.alphabet = alphabet;
        this.ensembleJoueurs = {};
        this.joueursManche = [];
        this.ordreJoueur = [];
        this.enJeu = false;
        this.enAttente = false;
        this.enScore = false;
        this.nbMancheJouer = 0;
        this.nbJoueur = 0;
        this.manche = null;
        this.socketJoueur = {};
        //Jeu.cbs prend cette valeur
        this.cbs = cbs;
        console.log(cbs);
        this.last = null;
        this.objGlyphes = null;
        //nombre de checkbox valide mais les tableaux sont tous

        /** Dernier glyphe à faire deviner */
        /**Fonction pour lancer les 3 caractères */
        /**
         *  Change la lettre/syllabe à reconnaître.
         */
        /**
         *  Classe représentant l'ensemble des glyphes
         */
    }
    ajoutJoueur(joueur,socket){
        this.nbJoueur++;
        joueur.setRank(this.nbJoueur);
        this.ensembleJoueurs[joueur.getNom()]=joueur;
        this.ordreJoueur.push(joueur.getNom());
        if(!this.enJeu){
            this.joueursManche.push(joueur.getNom());
        }
        this.socketJoueur[joueur.getNom()] = socket;
    }
    deconnecterJoueur(joueur) {
        delete this.ensembleJoueurs[joueur];
        delete this.socketJoueur[joueur];
        for (var i in this.ordreJoueur) {
            if (this.ordreJoueur[i] === joueur) {
                this.ordreJoueur.splice(i, 1);
            }
        }
        this.nbJoueur--;
        if(this.manche) {
            this.manche.deconnecterJoueur(joueur);
        }
    }
    jeu() {
        this.enJeu = true;
    }
    finJeu() {
        this.enJeu = false;
    }
    enjeu() {
        return this.enJeu;
    }
    getJoueursManche() {
        return this.joueursManche;
    }
    lancerManche() {
        this.nbMancheJouer++;
        console.log('La manche',this.nbMancheJouer,' commence !');
        serveur.ensemblePartie[this.nomPartie].enScore = true ;
        for(var i in this.socketJoueur) {
            this.socketJoueur[i].emit('startManche',this.nbMancheJouer,this.nbManche);
        }
        this.manche = new Manche(this.nomPartie);
    }
}

class Manche {
    constructor(nomPartie){
        console.log('Nouvelle manche créée');
        this.joueursManche = serveur.ensemblePartie[nomPartie].joueursManche;
        this.ensembleJoueursM = serveur.ensemblePartie[nomPartie].ensembleJoueurs;
        this.nomPartie = nomPartie;
        this.alphabet = serveur.ensemblePartie[nomPartie].alphabet;
        this.last = serveur.ensemblePartie[nomPartie].last;
        this.aTrouve = [];
        this.tour = null;
        this.lancerTour();
    }
    change(){
        // récupération de l'alphabet
        if (this.alphabet == "les2") {
            this.alphabet = (Math.random() < 0.5) ? 'hiragana' : 'katakana';
        }
        if(this.alphabet == 'hiragana'){
            this.objGlyphes =  new Glyphes(kanji.hiragana,this.nomPartie);
        }else{
            this.objGlyphes = new Glyphes(kanji.katakana,this.nomPartie);
        }
        console.log("Alphabet selectionné "+this.alphabet);
            // sélection de 3 glyphes
            this.aTrouve = this.objGlyphes.getThreeGlyphes(this.last,this.alphabet);
            // choix du glyphe à deviner parmi les 3
            var rand = Math.random() * 3 | 0;
            this.last = this.aTrouve[rand].key;
            console.log(this.aTrouve);
    }
    lancerTour(){
        serveur.ensemblePartie[this.nomPartie].enScore = false ;
        console.log('Joueurs qui peuvent être dessinateur',this.joueursManche);
        this.nonDessinateur = [];
        for(var i in this.joueursManche){
            if(!this.ensembleJoueursM[this.joueursManche[i]].aEteDrawer){
                this.nonDessinateur.push(this.ensembleJoueursM[this.joueursManche[i]].nom);
            }
        }
        for(var j in this.ensembleJoueursM){
            this.ensembleJoueursM[j].trouveSolution = false;
            this.ensembleJoueursM[j].nombreEssai = 3;
            this.ensembleJoueursM[j].estBloque = false;
            this.ensembleJoueursM[j].dessinateur = false;
        }
        console.log('Les joueurs qui n\'ont pas encore été dessinateur : ',this.nonDessinateur);
        //Tirage aléatoire du dessinateur
        var min = Math.ceil(0);
        var max = Math.floor(this.nonDessinateur.length);
        var rand = Math.floor(Math.random() * (max - min)) + min;
        this.drawer = this.nonDessinateur[rand];
        console.log('DESSINATEUR : ',this.drawer);
        this.ensembleJoueursM[this.drawer].dessinateur = true;
        this.ensembleJoueursM[this.drawer].aEteDrawer = true;
        this.ensembleJoueursM[this.drawer].estBloque = true;
        this.change();
        this.tour = new Tour(this.nomPartie,this.drawer,this.aTrouve);
    }
    deconnecterJoueur(joueur,nbJoueur){
        for(var i in this.joueursManche){
            if(this.joueursManche[i] === joueur){
                this.joueursManche.splice(i,1);
            }
        }
        for(var i in this.nonDessinateur){
            if(this.nonDessinateur[i] === joueur){
                this.nonDessinateur.splice(i,1);
            }
        }
            if(joueur === this.drawer){
                console.log('Le dessinateur s\'est déconnecté');
                if(nbJoueur > 1){
                    console.log('Il reste des joueurs, on calcul les scores');
                    this.tour.Stop();
                    this.lancerTour();
                }
            }
            if(nbJoueur === 1){
                console.log('PAUSE');
                this.tour.Stop();
                this.fin();
            }
        console.log("Joueurs en jeu",serveur.ensemblePartie[this.nomPartie].ordreJoueur);
        console.log('Les joueurs qui doivent jouer sont ',this.joueursManche);
        console.log("Les joueurs qui n'ont pas encore dessiné sont ",this.nonDessinateur);
    }
    fin(){
        serveur.ensemblePartie[this.nomPartie].enJeu = false;
        if(serveur.ensemblePartie[this.nomPartie].nbMancheJouer == serveur.ensemblePartie[this.nomPartie].nbManche){
            for(var i in serveur.ensemblePartie[this.nomPartie].socketJoueur){
                serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('finJeu',this.ensembleJoueursM);
            }
            console.log('Fin du jeu');
        }else{
            if(serveur.ensemblePartie[this.nomPartie].nbJoueur > 1){
                serveur.ensemblePartie[this.nomPartie].enScore = true ;
                for(var i in serveur.ensemblePartie[this.nomPartie].socketJoueur){
                    serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('finManche',this.ensembleJoueursM);
                }
                for(var i in this.ensembleJoueursM){
                    this.ensembleJoueursM[i].aEteDrawer = false;
                }
                var nomM = this.nomPartie;
                setTimeout(function(){serveur.ensemblePartie[nomM].lancerManche();},5000);
            }
            else{
                io.sockets.emit('attenteJoueur');
            }
        }
    }
}
class Tour  {
    constructor(nomPartie,drawer,aTrouve){
        console.log('Nouveau tour');
        this.drawer = drawer;
        this.tpsTour = serveur.ensemblePartie[nomPartie].tpsTour;
        this.nomPartie = nomPartie;
        this.ensembleJoueursT = serveur.ensemblePartie[this.nomPartie].ensembleJoueurs;
        this.solution = null;
        this.nbTrouve = 0;
        this.nbBloque = 0;
        this.chrono = null;
        this.canvas = null;
        console.log('Lettre selectionné du tour',aTrouve);
        serveur.ensemblePartie[this.nomPartie].socketJoueur[this.drawer].emit('dessinateur',aTrouve);
        serveur.ensemblePartie[this.nomPartie].enAttente = true;
        for(var i in serveur.ensemblePartie[this.nomPartie].socketJoueur) {
            serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('message',{from: null, text: this.drawer+" est le dessinateur",find : false,temps : null});
        }
        for(var i in this.ensembleJoueursT){
            if(!this.ensembleJoueursT[i].dessinateur){
                serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('joueur');
            }
        }
    }

    getSolution(){
        return this.solution;
    }

    trouve(){
        this.nbTrouve++;
    }

    bloque(){
        this.nbBloque++;
    }

    Start(solution){
        serveur.ensemblePartie[this.nomPartie].enJeu = true;
        console.log(solution);
        this.solution = new RegExp('^'+solution+'$');
        console.log('Le tour commence');
        console.log('Le canvas choisi est :',this.solution);
        this.chrono = new Chrono(this.tpsTour,this.nomPartie);
    }
    Stop(){
        serveur.ensemblePartie[this.nomPartie].enJeu = false;
        console.log('Fin du tour');
        this.CalculScore();
        for(var i in serveur.ensemblePartie[this.nomPartie].socketJoueur){
            console.log("J'envoie les infos");
            serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('liste',this.ensembleJoueursT,serveur.ensemblePartie[this.nomPartie].ordreJoueur);
            serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('finTour',serveur.ensemblePartie[this.nomPartie].ordreJoueur);
        }
    }
    CalculScore(){
        console.log('Il y a eu ',this.nbTrouve,' joueur(s) qui ont trouvé la solution\nIl y a ',serveur.ensemblePartie[this.nomPartie].nbJoueur,' joueur(s) dans la partie');
        console.log(serveur.ensemblePartie[this.nomPartie].ordreJoueur);
        if(this.ensembleJoueursT[this.drawer]){
            (this.ensembleJoueursT[this.drawer].aide)?this.ensembleJoueursT[this.drawer].score += parseInt((20*(this.nbTrouve/(serveur.ensemblePartie[this.nomPartie].nbJoueur-1)))/2):this.ensembleJoueursT[this.drawer].score += parseInt(20*(this.nbTrouve/(serveur.ensemblePartie[this.nomPartie].nbJoueur-1)));
        }
        var nomT = this.nomPartie;
        serveur.ensemblePartie[this.nomPartie].ordreJoueur.sort(function(a,b){
            return serveur.ensemblePartie[nomT].ensembleJoueurs[b].score - serveur.ensemblePartie[nomT].ensembleJoueurs[a].score;
        });
        var rank = 1;
        for(var i in serveur.ensemblePartie[this.nomPartie].ordreJoueur){
            this.ensembleJoueursT[serveur.ensemblePartie[this.nomPartie].ordreJoueur[i]].rank = rank;
            rank++;
        }
    }
}

class Chrono{
    constructor(secondsLeft,nomPartie){
        this.nomPartie = nomPartie;
        //Initialisation du nombre de secondes selon la valeur passée en paramètre
        this.secondsLeft = secondsLeft;
        //Démarrage du chrono
        this.timer = setInterval(this.Tick.bind(this), 1000);
    }

    Tick(){
        //On actualise la valeur affichée du nombre de secondes
        --this.secondsLeft;
        for(var i in serveur.ensemblePartie[this.nomPartie].socketJoueur){
            serveur.ensemblePartie[this.nomPartie].socketJoueur[i].emit('temps',this.secondsLeft);
        }
        console.log('Il y a ',serveur.ensemblePartie[this.nomPartie].manche.tour.nbBloque,'joueurs bloqué');
        if(serveur.ensemblePartie[this.nomPartie].manche.tour.nbBloque == serveur.ensemblePartie[this.nomPartie].nbJoueur-1){
            this.Stop();
            //On regarde si il reste des dessinateurs potentiel
            console.log('Il reste ',serveur.ensemblePartie[this.nomPartie].manche.nonDessinateur.length,'joueurs qui n\'ont pas fait dessinateur');
            if( serveur.ensemblePartie[this.nomPartie].manche.nonDessinateur.length-1 == 0){
                serveur.ensemblePartie[this.nomPartie].manche.tour.Stop();
                serveur.ensemblePartie[this.nomPartie].manche.fin();
            }else{
                serveur.ensemblePartie[this.nomPartie].manche.tour.Stop();
                serveur.ensemblePartie[this.nomPartie].manche.lancerTour();
            }
        }else{
            if(this.secondsLeft === 0){
                //Tps écoulé -> arrêt du timer
                this.Stop();
                //On regarde si il reste des dessinateurs potentiel
                if( serveur.ensemblePartie[this.nomPartie].manche.nonDessinateur.length-1 == 0){
                    serveur.ensemblePartie[this.nomPartie].manche.tour.Stop();
                    serveur.ensemblePartie[this.nomPartie].manche.fin();
                }else{
                    serveur.ensemblePartie[this.nomPartie].manche.tour.Stop();
                    serveur.ensemblePartie[this.nomPartie].manche.lancerTour();
                }
            }
        }
    }

    Stop() {
        //quand le temps est écoulé, on arrête le timer
        this.secondsLeft = 0;
        clearInterval(this.timer);
        //Et on appelle la fonction qui gère la fin du temps imparti et poursuit le traitement
        //Ici, pour le test, simplement une fonction alert
        //console.log('Fin de manche');
    }
}

class Joueur {
    constructor(nom,numAvatar,socket){
        this.nom = nom;
        this.avatar = numAvatar;
        this.rank = 0;
        this.score = 0;
        this.nombreEssai = 3;
        this.dessinateur = false;
        this.trouveSolution = false;
        this.aEteDrawer = false;
        this.estBloque = false;
        this.aide = false;
    }
    getNom(){
        return this.nom;
    }
    getSocket(){
        return this.socket;
    }
    setRank(rank){
        this.rank = rank;
    }
}
// Quand un client se connecte, on le note dans la console
io.on('connection', function (socket) {
    // io.sockets.emit('test');
    // message de debug
    io.sockets.emit('listePartie',Object.keys(serveur.ensemblePartie));
    var currentID = null;
    var joueur = null;

    /**
     *  Doit être la première action après la connexion.
     *  @param  id  string  l'identifiant saisi par le client
     */

    socket.on("creerPartie", function(options) {
        console.log("Nouveau jeu créé par " + options.createur);
        var partie = new Partie(options.createur,options.nomPartie,options.nbManche,options.nbJoueur,options.tpsTour,options.alphabet,options.cbs);
        serveur.ajoutPartie(partie);
        io.sockets.emit('listePartie',Object.keys(serveur.ensemblePartie));
    });

    socket.on("verif",function(nomPartie){
            if(serveur.ensemblePartie[nomPartie].nbJoueur+1 < serveur.ensemblePartie[nomPartie].nbJoueurMax){
                socket.emit("check",true);
            }
            else {
                if(serveur.ensemblePartie[nomPartie].nbJoueur+1 == serveur.ensemblePartie[nomPartie].nbJoueurMax){
                    socket.emit("check",true);
                }
                else{
                    socket.emit("check",false);
                }
            }
    });

    socket.on('lancePartie',function(nomPartie){
       serveur.ensemblePartie[nomPartie].lancerManche();
    });

    socket.on('lanceTour',function(solution){
        console.log('On lance le tour');
        serveur.ensemblePartie[solution.nomPartie].enAttente = false;
        serveur.ensemblePartie[solution.nomPartie].manche.tour.Start(solution.solution);
        for(var i in serveur.ensemblePartie[solution.nomPartie].socketJoueur){
            serveur.ensemblePartie[solution.nomPartie].socketJoueur[i].emit('startTour',serveur.ensemblePartie[solution.nomPartie].tpsTour,
                serveur.ensemblePartie[solution.nomPartie].nbMancheJouer,
                serveur.ensemblePartie[solution.nomPartie].nbManche
            );
        }
    });

    socket.on('aideDemandee',function(nom){
       var drawer = serveur.ensemblePartie[nom].manche.tour.drawer;
       serveur.ensemblePartie[nom].ensembleJoueurs[drawer].aide = true;
    });

    socket.on("login", function(logJoueur) {
        while (clients[logJoueur.pseudo]) {
            logJoueur.pseudo = logJoueur.pseudo + "(1)";
        }
        currentID = logJoueur.pseudo;
        serv_joueurs[currentID] = logJoueur.nomPartie
        clients[currentID] = socket;
        joueur = new Joueur(logJoueur.pseudo,logJoueur.avatar);
        console.log("Nouvel utilisateur : " + currentID);
        serveur.ensemblePartie[logJoueur.nomPartie].ajoutJoueur(joueur,socket);
        // envoi d'un message de bienvenue à ce client
        socket.emit("bienvenue", joueur.getNom());
        var cvs = null;
        if(serveur.ensemblePartie[logJoueur.nomPartie].manche) {
            cvs = serveur.ensemblePartie[logJoueur.nomPartie].manche.tour.canvas;
        }
        socket.emit("infoPartie",
            {mancheJouer : serveur.ensemblePartie[logJoueur.nomPartie].nbMancheJouer,
                manche :  serveur.ensemblePartie[logJoueur.nomPartie].nbManche,
                enScore : serveur.ensemblePartie[logJoueur.nomPartie].enScore,
                enAttente :serveur.ensemblePartie[logJoueur.nomPartie].enAttente,
                canvas :cvs }
        );
        // envoi aux autres clients
        for (var i in serveur.ensemblePartie[logJoueur.nomPartie].socketJoueur) {
            serveur.ensemblePartie[logJoueur.nomPartie].socketJoueur[i].emit("message", {
                from: null,
                to: null,
                text: currentID + " a rejoint la discussion",
                date: Date.now()
            });
        }
        var listJoueur = serveur.ensemblePartie[logJoueur.nomPartie].ensembleJoueurs;
        var ordre = serveur.ensemblePartie[logJoueur.nomPartie].ordreJoueur;
        for (var i in serveur.ensemblePartie[logJoueur.nomPartie].socketJoueur) {
            // envoi de la nouvelle liste à tous les clients connectés
            serveur.ensemblePartie[logJoueur.nomPartie].socketJoueur[i].emit("liste",listJoueur,ordre);
        }
    });

    socket.on('canvas',function(img,nomPartie){
        serveur.ensemblePartie[nomPartie].manche.tour.canvas = img;
        for (var i in serveur.ensemblePartie[nomPartie].ensembleJoueurs) {
            if (!serveur.ensemblePartie[nomPartie].ensembleJoueurs[i].dessinateur) {
                serveur.ensemblePartie[nomPartie].socketJoueur[i].emit('canvas', img);
            }
        }
    });
    /**
     *  Réception d'un message et transmission à tous.
     *  @param  msg     Object  le message à transférer à tous
     */
    socket.on("message", function(msg) {
        console.log("Reçu message");
        if(!serveur.ensemblePartie[msg.serv].enjeu()) {
            console.log(" --> broadcast");
            for(var i in serveur.ensemblePartie[msg.serv].socketJoueur){
                serveur.ensemblePartie[msg.serv].socketJoueur[i].emit("message", msg);
            }
        }
        else{
            serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].nombreEssai--;
            if(serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].nombreEssai === 0){
                serveur.ensemblePartie[msg.serv].socketJoueur[msg.from].emit('bloquerChat',serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from]);
                serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].estBloque = true;
                serveur.ensemblePartie[msg.serv].manche.tour.bloque();

            }
            if(msg.text.match(serveur.ensemblePartie[msg.serv].manche.tour.getSolution())){
                for(var i in serveur.ensemblePartie[msg.serv].socketJoueur){
                    serveur.ensemblePartie[msg.serv].socketJoueur[i].emit("trouveSolution", msg.from);
                }
                console.log(msg.from+" a trouvé la solution il gagne ",parseInt(20 * (msg.temps / serveur.ensemblePartie[msg.serv].tpsTour)),'points');
                serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].score += parseInt(15 * (msg.temps / serveur.ensemblePartie[msg.serv].tpsTour));
                serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].trouveSolution = true;
                if(!serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].estBloque){
                    serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from].estBloque = true;
                    serveur.ensemblePartie[msg.serv].manche.tour.bloque();
                    serveur.ensemblePartie[msg.serv].socketJoueur[msg.from].emit('bloquerChat',serveur.ensemblePartie[msg.serv].ensembleJoueurs[msg.from]);
                }
                serveur.ensemblePartie[msg.serv].manche.tour.trouve();
                msg.find = true;
                for(var i in serveur.ensemblePartie[msg.serv].socketJoueur){
                    serveur.ensemblePartie[msg.serv].socketJoueur[i].emit("message", msg);
                }
            }else{
                for(var i in serveur.ensemblePartie[msg.serv].socketJoueur){
                    serveur.ensemblePartie[msg.serv].socketJoueur[i].emit("message", msg);
                }
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
            // envoi de l'information de déconnexion
            for (var i in serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur) {
                serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].emit("message", {
                    from: null,
                    to: null,
                    text: currentID + " a quitter la discussion",
                    date: Date.now()
                });
            }
            // suppression de l'entrée
            delete clients[currentID];
            serveur.ensemblePartie[serv_joueurs[currentID]].deconnecterJoueur(joueur.getNom());
            // envoi de la nouvelle liste pour mise à jour
            for (var i in serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur) {
                console.log('HEY');
                serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].emit("liste",
                    serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].ensembleJoueurs,
                    serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].ordreJoueur);
            }
            console.log("Client déconnecté\nIl reste "+serveur.ensemblePartie[serv_joueurs[currentID]].nbJoueur+" joueur(s)");
            if(serveur.ensemblePartie[serv_joueurs[currentID]].nbJoueur == 0){
                delete serveur.ensemblePartie[serv_joueurs[currentID]];
                console.log(serveur);
            }
        }
    });

    // déconnexion de la socket
    socket.on("disconnect", function(reason) {
        // si client était identifié
        if (currentID) {
            // envoi de l'information de déconnexion
            for (var i in serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur) {
                serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].emit("message", {
                    from: null,
                    to: null,
                    text: currentID + " s'est déconnecté de l'application",
                    date: Date.now()
                });
            }
            // suppression de l'entrée
            delete clients[currentID];
            serveur.ensemblePartie[serv_joueurs[currentID]].deconnecterJoueur(joueur.getNom());
            // envoi de la nouvelle liste pour mise à jour
            for (var i in serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur) {
                serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].emit("liste",
                    serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].ensembleJoueurs,
                    serveur.ensemblePartie[serv_joueurs[currentID]].socketJoueur[i].ordreJoueur);
            }
            console.log("Client déconnecté\nIl reste "+serveur.ensemblePartie[serv_joueurs[currentID]].nbJoueur+" joueur(s)");
            if(serveur.ensemblePartie[serv_joueurs[currentID]].nbJoueur == 0){
                delete serveur.ensemblePartie[serv_joueurs[currentID]];
                console.log(serveur);
            }
        }
    });
});
