var nombreAvatar = 11;
var currentAvatar = 2;
document.addEventListener('DOMContentLoaded',function(){
	var socket = io.connect("http://localhost:8080/");
	var listePartie = [];
	var user = 'unknown';
	var nomPartie = null;
	var enjeu = false;
	var tempsTour = null;
	var dessinateur = false;
	var solutionChoisie = null;
	var dessin = document.getElementById("dessin");
	var overlay = document.getElementById('overlay');

		var ctxBG = dessin.getContext("2d");
		var ctxFG = overlay.getContext("2d");

		// Tailles des zones
		overlay.width = dessin.width = ctxBG.width = ctxFG.width = 500;
		overlay.height = dessin.height = ctxBG.height = ctxFG.height = 500;
		// Taille du crayon
		ctxBG.lineCap = ctxFG.lineCap = "round";

		var act = function(f, e) {
			var rect = dessin.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			f.call(currentCommand, x, y);
			envoiCanvas();
		};
		/**
		 *  Prototype de commande (classe abstraite)
		 */
		function Commande() {
			// bouton cliqué
			this.isDown = false;
			// fillStyle pour le dessin
			this.fsBG = "white",
			// fillStyle pour le calque
			this.fsFG = "white";
			// strokeStyle pour le dessin
			this.ssBG = "white";
			// strokeStyle pour le calque
			this.ssFG = "white";
		}
		// selection (paramétrage des styles)
		Commande.prototype.select = function() {
			ctxBG.fillStyle = this.fsBG;
			ctxFG.fillStyle = this.fsFG;
			ctxBG.strokeStyle = this.ssBG;
			ctxFG.strokeStyle = this.ssFG;
			currentCommand = this;
		};
		// action liée au déplacement de la souris
		Commande.prototype.move = function(x, y) {
			ctxFG.clearRect(0, 0, ctxFG.width, ctxFG.height);
		};
		// action liée au relâchement du bouton de la souris
		Commande.prototype.up = function(x, y) {
			this.isDown = false;
		};
		// action liée à l'appui sur le bouton de la souris
		Commande.prototype.down = function(x, y) {
			this.isDown = true;
		};
		// action liée à la sortie de la souris de la zone
		Commande.prototype.out = function() {
			this.isDown = false;
			ctxFG.clearRect(0, 0, ctxFG.width, ctxFG.height);
		};

		/**
		 *  Commande pour tracer (dessine un point)
		 *      au survol : affichage d'un point
		 *      au clic : dessin du point
		 */
		var tracer = new Commande();
		tracer.dessiner = function(ctx, x, y) {
			ctx.beginPath();
			ctx.arc(x, y, size.value/2, 0, 2*Math.PI);
			ctx.fill();
		};
		tracer.move = function(x, y) {
			// appel classe mère
			this.__proto__.move.call(this, x, y);
			// affichage sur le calque
			this.dessiner(ctxFG, x, y);
			// si bouton cliqué : impression sur la zone de dessin
			if (this.isDown) {
				this.dessiner(ctxBG, x, y);
			}
		};
		tracer.down = function(x, y) {
			// appel classe mère
			this.__proto__.down.call(this, x, y);
			// impression sur la zone de dessin
			this.dessiner(ctxBG, x, y);
		};

		/**
		 *  Commande pour gommer (effacer une zone)
		 *      au survol : affichage d'un rectangle représentant la zone à effacer
		 *      au clic : effacement de la zone
		 */
		var gommer = new Commande();
		gommer.ssFG = "black";
		gommer.effacer = function(x, y) {
			ctxBG.clearRect(x - size.value/2, y - size.value/2, size.value, size.value);
		}
		gommer.move = function(x, y) {
			this.__proto__.move.call(this, x, y);
			ctxFG.lineWidth = 1;
			if (this.isDown) {
				this.effacer(x, y);
			}
			ctxFG.strokeRect(x - size.value/2, y - size.value/2, size.value, size.value);
		}
		gommer.down = function(x, y) {
			this.__proto__.down.call(this, x, y);
			gommer.effacer(x,y);
		}

		/**
		 *  Commande pour tracer une ligne
		 *      au survol si clic appuyé : ombrage de la ligne entre le point de départ et le point courant.
		 *      au relâchement du clic : tracé de la ligne sur la zone de dessin
		 */
		var ligne = new Commande();
		ligne.ssFG = "white";
		ligne.dessiner = function(ctx, x, y) {
			ctx.lineWidth = size.value;
			ctx.beginPath();
			ctx.moveTo(this.startX, this.startY);
			ctx.lineTo(x, y);
			ctx.stroke();
		};
		ligne.move = function(x, y) {
			this.__proto__.move.call(this, x, y);
			ctxFG.lineWidth = size.value;
			if (this.isDown) {
				this.dessiner(ctxFG, x, y);
			}
			else tracer.dessiner(ctxFG, x, y);
		};
		ligne.down = function(x, y) {
			this.__proto__.down.call(this, x, y);
			this.startX = x;
			this.startY = y;
		};
		ligne.up = function(x, y) {
			this.__proto__.up.call(this, x, y);
			this.dessiner(ctxBG, x, y);
		};
		/**
		 *  Affectation des événements sur les boutons radios
		 *  et detection du bouton radio en cours de sélection.
		 */
		var radios = document.getElementsByName("radCommande");
		for (var i=0; i < radios.length; i++) {
			var selection = function() {
				if (this.checked) {
					currentCommand = eval(this.id);
					currentCommand.select();
				}
			}
			selection.apply(radios.item(i));
			radios.item(i).addEventListener("change", selection);
		}

	function permetDessin() {
		overlay.addEventListener("mousemove", function (e) {
			act(currentCommand.move, e);
		});
		overlay.addEventListener("mousedown", function (e) {
			act(currentCommand.down, e);
		});
		overlay.addEventListener("mouseup", function (e) {
			act(currentCommand.up, e);
		});
		overlay.addEventListener("mouseout", function (e) {
			act(currentCommand.out, e);
		});
	}

	document.getElementById("lobbyCreateGame").addEventListener("click",function() {
		document.getElementById("radio1").checked = true;
	});
	document.getElementById("lobbyJoinGame").addEventListener("click",function() {
		document.getElementById("radio3").checked = true;
	});

	document.getElementById("createGame").addEventListener("click",function(){
		if(document.getElementById('pseudoCrea').value) {
			user = document.getElementById('pseudoCrea').value;
			console.log('Createur',user);
		}
		if(document.getElementById('nomPartie').value) {
			nomPartie = document.getElementById('nomPartie').value;
			var cbs = document.querySelectorAll("#options input[type=checkbox]:checked");
			var valueCbs = [];
			for(var i in cbs){
				if(cbs[i].value)valueCbs.push(cbs[i].value);
			}
			socket.emit("creerPartie",{
				createur: user,nomPartie : nomPartie ,nbJoueur: document.getElementById('btnNombreJoueur').value,
				nbManche: document.getElementById('btnNombreManche').value,
				tpsTour: document.getElementById('btnDureeTour').value,
				alphabet : document.querySelector('#options input[name=radGlyphe]:checked').value,
				cbs : valueCbs
			});
			socket.emit("login", {pseudo: user, avatar: currentAvatar, nomPartie: nomPartie});
			document.getElementById("radio1").checked = false;
			document.getElementById("radio2").checked = true;
			document.getElementById('bcLanceGame').style.display = 'block';
		}
		else{
			alert('Nom de partie obligatoire');
		}
	});

	document.getElementById("btnJouer").addEventListener("click",function() {
		if (document.getElementById('pseudoInv').value) {
			user = document.getElementById('pseudoInv').value;
		}
		if(document.getElementById('nomPartieJ').value) {
			nomPartie = document.getElementById('nomPartieJ').value;
			if(listePartie.find(function(element){
				return element == nomPartie;
			})){
				socket.emit("verif",nomPartie);
				socket.on("check", function (bool) {
					if (bool) {
						socket.emit("login", {pseudo: user, avatar: currentAvatar, nomPartie: nomPartie});
						document.getElementById("radio3").checked = false;
						document.getElementById("radio2").checked = true;
					} else {
						alert("Nombre maximum de joueur atteint");
					}
				});
			}else{
				alert("La partie que vous essayez de rejoindre n'existe pas");
			}
		}
	});

	document.getElementById("lanceGame").addEventListener("click",function() {
		console.log('JE LANCE LA PARTIE');
		socket.emit('lancePartie',nomPartie);
		document.getElementById('bcLanceGame').style.display = 'none';
	});

	socket.on('listePartie',function(tabPartie){
		listePartie = tabPartie;
		console.log(listePartie);
	});

	socket.on('bienvenue',function(nom){
		user = nom ;
		document.getElementById('nom').firstChild.innerHTML = user;

	});

	socket.on('test',function(){
		console.log('Le test est concluant');
	});
    	
	document.getElementById("btnNombreJoueur").onchange = afficheNombreJoueur;
    	
	function afficheNombreJoueur(e){
		document.getElementById('param').getElementsByTagName('p')[0].innerHTML = "Nombre de joueur : "+e.target.value;
	}
    	
	document.getElementById("btnNombreManche").onchange = afficheNombreManche;
    	
	function afficheNombreManche(e){
		document.getElementById('param').getElementsByTagName('p')[1].innerHTML = "Nombre de manche : "+e.target.value;
	}
    	
	document.getElementById("btnDureeTour").onchange = afficheDureeTour;
    	
	function afficheDureeTour(e){
		document.getElementById('param').getElementsByTagName('p')[2].innerHTML = "Durée d'un tour : "+e.target.value+"s";
	}

	function reset(){
		document.getElementById("text").innerHTML = "";
		document.getElementById('monMessage').disabled = false;
	}

	document.getElementById("btnEnvoyer").addEventListener("click",function(e){
		var message = document.getElementById("monMessage").value.trim();
		if(message) {
			socket.emit("message", {serv: nomPartie,from: user, text: message,find : false,temps : tempsTour});
		}
		document.getElementById("monMessage").value = "";
	});
        
	socket.on('createur',function(){
		reset();
		document.getElementById("radio1").checked = true;
		document.getElementById('bcLanceGame').style.display = 'block';
	});
        
	socket.on('invite',function(){
		reset();
		document.getElementById("radio3").checked = true;
	});

	socket.on("liste",function(client,ordre){
		document.getElementById("playerList").innerHTML = "";
		for(var i in ordre){
			var div = document.createElement("div");
			(client[ordre[i]].trouveSolution)?div.className = 'player find':div.className = 'player';
			div.id = client[ordre[i]].nom;
			var rank = document.createElement("div");
			rank.className ="rank";
			rank.innerHTML = '#'+client[ordre[i]].rank;
			div.appendChild(rank);
			var divAvt = document.createElement('div');
			divAvt.className ='avatar';
			var avatar = document.createElement("img");
			avatar.src = '../images/avatar'+client[ordre[i]].avatar+'.png';
			avatar.width='48';
			divAvt.appendChild(avatar);
			div.appendChild(divAvt);
			var name = document.createElement("div");
			name.className = "name";
			name.innerHTML = client[ordre[i]].nom;
			div.appendChild(name);
			var score = document.createElement("div");
			score.className = "score";
			score.innerHTML = client[ordre[i]].score;
			div.appendChild(score);
			document.getElementById("playerList").appendChild(div);
		}
	});

	socket.on("message",function(msg){
		if(msg.find && msg.from !=null){
			document.getElementById("text").innerHTML += "<p style=\"color : green;font-weight:bold;\">"+msg.from+" guessed the word!</p>";
		}else{
			if(msg.from != null){
				document.getElementById("text").innerHTML += "<p>"+msg.from+" : "+msg.text+"</p>";
			}else{
				document.getElementById("text").innerHTML += "<p style=\"color : blue;font-weight:bold;\">"+msg.text+"</p>";
			}
                
		}
	});

	socket.on('trouveSolution',function(nom){
		document.getElementById(nom).className = 'player find';
	});

	socket.on('temps',function(tps){
		tempsTour = tps;
		document.getElementById('temps').innerHTML = tps;
	});

	socket.on('bloquerChat',function(joueurs){
		document.getElementById('monMessage').disabled = true;
		if(!joueurs.trouveSolution){
			document.getElementById(joueurs.nom).className = 'player lost';
		}
	});

	socket.on('dessinateur',function(lettres){
		var afficheSyllabe = document.getElementById("divInformation");
		for(var i = 0; i<3 ; i++){
			var g = document.createElement('div');
			g.setAttribute("class", "boxChoix");
			g.setAttribute("id",i);
			g.innerHTML = lettres[i].key;
			g.addEventListener('click',function(e){
				var sol = e.currentTarget;
				socket.emit('lanceTour',{solution : sol.innerText ,nomPartie : nomPartie});
				document.getElementById("divInformation").innerHTML ="";
				document.getElementById("divInformation").style.display="none";
				solutionChoisie = sol.id;
			});
			afficheSyllabe.appendChild(g);
		}
		document.getElementById("divInformation").style.display="block";
		/*setTimeout(function(){
			document.getElementById("divInformation").innerHTML ="";
			document.getElementById("divInformation").style.display="none";
			var sol =
			socket.emit('lanceTour',{solution : sol ,nomPartie : nomPartie});
			
		},5000);*/
		dessinateur = true;
		document.getElementById('toolbox').visible = true;
		document.getElementById('toolbox').hidden = false;
		document.getElementById('aide').addEventListener('click',function(){
			console.log("aide demander");
			socket.emit('aideDemandee',nomPartie);
			document.getElementById("helpOK").innerHTML = "&#"+lettres[solutionChoisie].ascii;
			document.getElementById("helpOK").style.display="block";
		});
		document.getElementById("helpOK").style.display="none";
		document.getElementById('monMessage').disabled = true;
		permetDessin();
	});

	socket.on('joueur',function(){
		currentCommand = null;
		dessinateur = false;
		document.getElementById('toolbox').hidden = true;
		document.getElementById('monMessage').disabled = false;
		enjeu = true;
		var afficheAttente = document.getElementById("divInformation");
		var p = document.createElement('p');
		p.innerHTML = "En attente du dessinateur";
		afficheAttente.appendChild(p);
		document.getElementById("helpOK").style.display="none";
		document.getElementById("divInformation").style.display="block";
	});

	socket.on('infoPartie',function(info){
		document.getElementById('temps').innerHTML = '';
		document.getElementById('manches').innerHTML = "Manches "+info.mancheJouer+" / "+info.manche;
		if(info.enAttente){
			console.log('Jeu en attente',info.enAttente);
			var afficheAttente = document.getElementById("divInformation");
			var p = document.createElement('p');
			p.innerHTML = "En attente du dessinateur";
			afficheAttente.appendChild(p);
			document.getElementById("divInformation").style.display="block";
		}else{
			if(info.enScore){
				console.log('Jeu en score',info.enScore);
				var afficheAttente = document.getElementById("divInformation");
				var p = document.createElement('p');
				p.innerHTML = "Lancement de la manche";
				afficheAttente.appendChild(p);
				document.getElementById("divInformation").style.display="block";
			}
			else{
				var img = new Image;
				img.src = info.canvas;
				img.onload = function () {
					ctxBG.drawImage(img, 0, 0);
				};
			}
		}
	});


	socket.on('startManche',function(nbMancheJouer,nbManche){
		var afficheScore = document.getElementById("divInformation");
		afficheScore.innerHTML = "";
		afficheScore.style.display = 'none';
		document.getElementById('manches').innerHTML = "Manches "+nbMancheJouer+" / "+nbManche;

	});

	socket.on('startTour',function(tps,nbMancheJouer,nbManche){
		var afficheScore = document.getElementById("divInformation");
		afficheScore.innerHTML = "";
		afficheScore.style.display = 'none';
		document.getElementById('temps').innerHTML = tps;
		document.getElementById('manches').innerHTML = "Manches "+nbMancheJouer+" / "+nbManche;
	});

	socket.on('finManche',function(joueurs){
		var afficheScore = document.getElementById("divInformation");
		afficheScore.innerHTML ="";
		afficheScore.style.display = 'block';
		var tabScore = [];
		for(var i in joueurs){
			tabScore.push(joueurs[i]);
		}
		console.log(tabScore);
		tabScore.sort(function(a,b){
			return a.rank - b.rank;
		});
		for(var i in tabScore){
			var p = document.createElement('p');
			p.innerHTML = '#'+tabScore[i].rank+' '+tabScore[i].nom+' points '+tabScore[i].score;
			afficheScore.appendChild(p);
		}
	});

	socket.on('finJeu',function(joueurs){
		var afficheScore = document.getElementById("divInformation");
		afficheScore.innerHTML ="";
		afficheScore.style.display = 'block';
		var h2 = document.createElement('h2');
		h2.innerHTML = 'FIN DU JEU';
		afficheScore.appendChild(h2);
	});
	
	socket.on('finTour',function(joueurs){
		document.getElementById('temps').innerHTML = '';
		ctxBG.clearRect(0, 0, 500, 500);
		for(var i in joueurs){
			document.getElementById(joueurs[i]).className = 'player';
		}
	});
	socket.on('canvas',function(imgURL){
		if(!dessinateur){
			var img = new Image;
			img.src = imgURL;
			img.onload = function () {
				ctxBG.drawImage(img, 0, 0);
			};
		}
	});

	function envoiCanvas() {
		var cvs = document.getElementById('dessin').toDataURL();
		socket.emit('canvas', cvs,nomPartie);
	}
	
var arrowL = document.getElementsByClassName('arrowLeft');
	var arrowR = document.getElementsByClassName('arrowRight');
	for(var i =0;i<2;i++){
		arrowL[i].addEventListener('click',changeAvatarLeft);
		arrowR[i].addEventListener('click',changeAvatarRight);
	}

	function changeAvatarLeft(e){
		var parent = e.target.offsetParent;
		var avatar = parent.getElementsByClassName('avatar');
		if(currentAvatar === 1 ){
			currentAvatar = nombreAvatar;
		}
		else{
			currentAvatar--;
		}
		avatar[0].src = './images/avatar'+currentAvatar+'.png';
	}

	function changeAvatarRight(e){
		var parent = e.target.offsetParent;
		var avatar = parent.getElementsByClassName('avatar');
		if(currentAvatar === nombreAvatar ){
			currentAvatar = 1;
		}
		else{
			currentAvatar++;
		}
		avatar[0].src = './images/avatar'+currentAvatar+'.png';
	}
});
