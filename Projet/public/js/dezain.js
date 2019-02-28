var nombreAvatar = 11;
var currentAvatar = 2;
document.addEventListener('DOMContentLoaded',function(){
	var socket = io.connect("http://localhost:8080/");
	var user = 'unknown';
	var enjeu = false;
	var tempsTour = null;
	var dessinateur = false;
	document.getElementById("createGame").addEventListener("click",function(){
		if(document.getElementById('pseudoCrea').value) {
			user = document.getElementById('pseudoCrea').value;
		}
		socket.emit("creerPartie",{createur : user,nbJoueur :document.getElementById('btnNombreJoueur').value ,
			nbManche : document.getElementById('btnNombreManche').value,
			tpsTour : document.getElementById('btnDureeTour').value
		});
		socket.emit("login", {pseudo : user, avatar : currentAvatar});
		document.getElementById("radio1").checked = false;
		document.getElementById("radio2").checked = true;
	});

	document.getElementById("btnJouer").addEventListener("click",function() {
		if (document.getElementById('pseudoInv').value) {
			user = document.getElementById('pseudoInv').value;
		}
		socket.emit("verif");
		socket.on("check",function(bool){
			if(bool){
				socket.emit("login", {pseudo: user, avatar: currentAvatar});
				document.getElementById("radio3").checked = false;
				document.getElementById("radio2").checked = true;
			}
			else{
				alert("Nombre maximum de joueur atteint");
			}
		});
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
			socket.emit("message", {from: user, text: message,find : false,temps : tempsTour});
		}
		document.getElementById("monMessage").value = "";
	});
        
	socket.on('createur',function(){
		reset();
		document.getElementById("radio1").checked = true;
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
		var targetWord = "a";
		if(msg.find && msg.from !=null){
			document.getElementById("text").innerHTML += "<p style=\"color : green;\">"+msg.from+" : guessed the word!</p>";
		}else{
			if(msg.from != null){
				document.getElementById("text").innerHTML += "<p>"+msg.from+" : "+msg.text+"</p>";
			}else{
				document.getElementById("text").innerHTML += "<p>"+msg.text+"</p>";
			}
                
		}
	});

	socket.on('trouveSolution',function(nom){
		document.getElementById(nom).className = 'player find';
	});

	socket.on('temps',function(tps){
		tempsTour = tps;
		document.getElementById('gameHeader').firstChild.innerHTML = "Il vous reste : "+tps+ " secondes !";
	});

	socket.on('bloquerChat',function(joueurs){
		document.getElementById('monMessage').disabled = true;
		if(!joueurs.trouveSolution){
			document.getElementById(joueurs.nom).className = 'player lost';
		}
	});

	socket.on('tempsEcoule',function(){
		console.log("fin");
		document.getElementById('monMessage').disabled = false;
	});

	socket.on('dessinateur',function(){
		var afficheSyllabe = document.getElementById("divInformation");
		
		for(var i = 0; i<3 ; i++){
			g = document.createElement('div');
			g.setAttribute("class", "boxChoix");
			g.setAttribute("id", "boxChoix"+1);
			g.innerHTML = "A";
			afficheSyllabe.appendChild(g);
		}
		setTimeout(function(){
			document.getElementById("divInformation").innerHTML ="";
			document.getElementById("divInformation").style.display="none";
			//envoyer start manche ici et envoyer au joueur
			
		},5000);


		dessinateur = true;
		document.getElementById('toolbox').visible = true;
		document.getElementById('toolbox').hidden = false;
		document.getElementById('aide').addEventListener('click',function(){
			console.log("aide demander");
			//ne fonctionne pas
			document.getElementById("helpOK").style.display="block";
		});
		documdocument.getElementById("helpOK").style.display="block";ent.getElementById('monMessage').disabled = true;
		dessin();
	});

	socket.on('joueur',function(){
	

		document.getElementById("helpOK").style.display="none";
		dessinateur = false;
		document.getElementById('toolbox').hidden = true;
		document.getElementById('monMessage').disabled = false;
		enjeu = true;
	});

	socket.on('startManche',function(){
		
		afficheScore.innerHTML = "";
		afficheScore.style.display = 'none';
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
		var dessin = document.getElementById("dessin");
		var ctxBG = dessin.getContext("2d");
		ctxBG.clearRect(0, 0, 500, 500);
		for(var i in joueurs){
			document.getElementById(joueurs[i]).className = 'player';
		}
	});
	socket.on('canvas',function(dataImg){
		if(!dessinateur){
			if (dataImg) {
				var img = new Image();
				img.onload = function() {
					var ctxBG = document.getElementById("dessin").getContext("2d");
					ctxBG.clearRect(0, 0, 500, 500);
					ctxBG.drawImage(img, 0, 0, ctxBG.width, ctxBG.height);
				}
				img.src = "data:image/png;base64," + dataImg;
			}
		}
	});
	
	function envoiCanvas(){
		socket.emit('canvas',document.getElementById('dessin').toDataURL());
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
	function dessin(){
		var dessin = document.getElementById("dessin");
		var overlay = document.getElementById("overlay");
		
		var act = function(f, e) {
			var rect = dessin.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			f.call(currentCommand, x, y);
		}
		
		overlay.addEventListener("mousemove", function(e) {
			act(currentCommand.move, e);
		});
		overlay.addEventListener("mousedown", function(e) {
			act(currentCommand.down, e);
		});
		overlay.addEventListener("mouseup", function(e) {
			act(currentCommand.up, e);
		});
		overlay.addEventListener("mouseout", function(e) {
			act(currentCommand.out, e);
		});
		
		
		var ctxBG = dessin.getContext("2d");
		var ctxFG = overlay.getContext("2d");

		// Tailles des zones
		overlay.width = dessin.width = ctxBG.width = ctxFG.width = 500;
		overlay.height = dessin.height = ctxBG.height = ctxFG.height = 500;
		// Taille du crayon
		ctxBG.lineCap = ctxFG.lineCap = "round";
		
		
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
		}
		tracer.move = function(x, y) {
			// appel classe mère
			this.__proto__.move.call(this, x, y);
			// affichage sur le calque
			this.dessiner(ctxFG, x, y);
			// si bouton cliqué : impression sur la zone de dessin
			if (this.isDown) {
				this.dessiner(ctxBG, x, y);
			}
		}
		tracer.down = function(x, y) {
			// appel classe mère
			this.__proto__.down.call(this, x, y);
			// impression sur la zone de dessin
			this.dessiner(ctxBG, x, y);
		}
		
		
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
		}
		ligne.move = function(x, y) {
			this.__proto__.move.call(this, x, y);
			ctxFG.lineWidth = size.value;
			if (this.isDown) {
				this.dessiner(ctxFG, x, y);
			}
			else tracer.dessiner(ctxFG, x, y);
		}
		ligne.down = function(x, y) {
			this.__proto__.down.call(this, x, y);
			this.startX = x;
			this.startY = y;
		}
		ligne.up = function(x, y) {
			this.__proto__.up.call(this, x, y);
			this.dessiner(ctxBG, x, y);
		}

		
		/**
		 *  Commande pour dessiner un rectangle
		 *      au survol si clic appuyé : ombrage du rectangle entre le point de départ et le point courant.
		 *      au relâchement du clic : tracé du rectangle sur la zone de dessin
		 */
		var rectangle = new Commande();
		rectangle.dessiner = function(ctx, x, y) {
			ctx.lineWidth = size.value;
			ctx.fillRect(this.startX, this.startY, x - this.startX, y - this.startY);
			ctx.strokeRect(this.startX, this.startY, x - this.startX, y - this.startY);
		}
		rectangle.move = function(x, y) {
			this.__proto__.move.call(this, x, y);
			if (this.isDown) {
				this.dessiner(ctxFG, x, y);
			}
			else {
				ctxFG.fillRect(x - size.value/2, y - size.value/2, size.value, size.value);
			}
		}
		rectangle.down = function(x, y) {
			this.__proto__.down.call(this, x, y);
			this.startX = x;
			this.startY = y;
		}
		rectangle.up = function(x, y) {
			this.__proto__.up.call(this, x, y);
			this.dessiner(ctxBG, x, y);
		}
		
		
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
	}
});
