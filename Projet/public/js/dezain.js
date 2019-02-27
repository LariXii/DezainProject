var nombreAvatar = 11;
var currentAvatar = 2;
document.addEventListener('DOMContentLoaded',function(){
    var socket = io.connect("http://localhost:8080/");
	var user = 'unknown';
	var nbJoueur=4;
	var listUser=[];
    	document.getElementById("createGame").addEventListener("click",function(){
    		if(document.getElementById('pseudoCrea').value) {
				user = document.getElementById('pseudoCrea').value;
			}
    		socket.emit("creerPartie",{createur : user,nbJoueur :document.getElementById('btnNombreJoueur').value ,
				nbManche : document.getElementById('btnNombreManche').value,
				tpsTour : document.getElementById('btnDureeTour').value,
				alphabet : document.querySelector("#formulaire input[name=radGlyphe]:checked").value,
				//Le cbs est envoyé au serveur
				cbs :  document.querySelectorAll("#formulaire input[type=checkbox]:checked")
    		});
			listUser.push(user);
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
						listUser.push(user);
						document.getElementById("radio3").checked = false;
						document.getElementById("radio2").checked = true;
					}
					else{
						alert("Nombre maximum de joueur atteind");
					}
				});
    	});
    	
    	document.getElementById("btnNombreJoueur").onchange = afficheNombreJoueur;
    	
    	function afficheNombreJoueur(e){
    		document.getElementById('param').getElementsByTagName('p')[0].innerHTML = "Nombre de joueur : "+e.target.value;
    		nbJoueur=e.target.value;
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
				socket.emit("message", {from: user, text: message});
			}
            document.getElementById("monMessage").value = "";
        });
        
        socket.on('createur',function(){
        	reset();
        	document.getElementById("radio1").checked = true;
        	console.log('La partie commence dans 5 min');
        });
        
        socket.on('invite',function(){
			reset();
        	document.getElementById("radio3").checked = true;
        });

        socket.on("liste",function(client){
            document.getElementById("playerList").innerHTML = "";
			for(var i in client){
				console.log(client[i]);
                var div = document.createElement("div");
                div.className = 'player';
                div.id = client[i].nom;
				var rank = document.createElement("div");
				rank.className ="rank";
				rank.innerHTML = '#'+client[i].rank;
				div.appendChild(rank);
				var divAvt = document.createElement('div');
				divAvt.className ='avatar';
				var avatar = document.createElement("img");
				avatar.src = '../images/avatar'+client[i].avatar+'.png';
				avatar.width='48';
				divAvt.appendChild(avatar);
				div.appendChild(divAvt);
                var name = document.createElement("div");
                name.className = "name";
                name.innerHTML = client[i].nom;
                div.appendChild(name);
                var score = document.createElement("div");
                score.className = "score";
                score.innerHTML = client[i].score;
				div.appendChild(score);
				document.getElementById("playerList").appendChild(div);
            }
        });

        socket.on("message",function(msg){
            var targetWord = "a";
            if(msg.text == targetWord && msg.from !=null){
                document.getElementById("text").innerHTML += "<p style=\"color : green;\">"+msg.from+" : guessed the word!</p>";
            }else{
                if(msg.from != null){
                    document.getElementById("text").innerHTML += "<p>"+msg.from+" : "+msg.text+"</p>";
                }else{
                    document.getElementById("text").innerHTML += "<p>"+msg.text+"</p>";
                }
                
            }
        });

        socket.on('temps',function(tps){
			document.getElementById('gameHeader').firstChild.innerHTML = "Il vous reste : "+tps+ " secondes !";
		});

        socket.on('bloquerChat',function(){
        	document.getElementById('monMessage').disabled = true;
		});

        socket.on('tempsEcoule',function(){
        	console.log("fin");
			document.getElementById('monMessage').disabled = false;
		});

        socket.on('dessinateur',function(){
        	console.log('Hello mec');
        	document.getElementById('toolbox').visible = true;
        	document.getElementById('toolbox').hidden = false;
		});

	socket.on('joueur',function(){
			console.log('Hello mec smeh t\'es qu\'un jouer');
			document.getElementById('toolbox').hidden = true;
		});

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

