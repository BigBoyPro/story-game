# EditableStory


### Pour les collegues:

## Setup

Vous devez installer `nodejs` depuis le site officiel: https://nodejs.org/en/download/current

Vous devez lancer le `install client` et le `install server` en haut a droite pour que le code fonctionne 
(que pour les utilisateurs de `IntelliJ IDEA` ou `WebStorm`).  
Sinon si ca ne fonctionne pas, vous pouvez aussi lancer les commandes suivantes:
    
    cd client 
    npm install
    cd ..
    cd server
    npm install


### Pour lancer le client:
Vous pouvez lancer le client en cliquant sur `client dev` en haut a droite.  
Sinon vous pouvez aussi lancer le client avec la commande suivante:

    cd client
    npm run dev

### Pour lancer le serveur:
Vous pouvez lancer le serveur en cliquant sur `server dev` en haut a droite.
Sinon vous pouvez aussi lancer le serveur avec la commande suivante:

    cd server
    npm run dev




### Pour acceder a la base de donnees:
J'ai utilise `Supabase` pour la base de donnees, c'est une BDD `PostgreSQL` en ligne,
pour y acceder, vous pouvez `creer un compte` sur le site suivant: https://supabase.com/dashboard/sign-in.  
Puis donner moi votre `mail` pour que je puisse vous inviter dans l'organisation `BIGSHELL`, pour que vous puissiez acceder a la base de donnees `story`.  


Moi j'utilise l'UI du [site de supabase](https://supabase.com/dashboard/project/nhldzevrwuqvytdltqgi/editor) pour creer les tables et tout...  
Mais si vous voulez utiliser autre chose, pour avoir `l'URL de Connection` a la la base de donnees cliquer sur la bdd `story` pour aller sur le [Dashboard](https://supabase.com/dashboard/project/nhldzevrwuqvytdltqgi), 
puis en haut a droite de la page vous avez un bouton `Connect` qui vas vous donner les differentes URL de connection.



## Taches

### Améliorer le design et l'UI de l'application :
- [ ] Ajouter des validations pour les inputs
- [ ] Faire un croquis de l'application
- [ ] Rendre l'application responsive (mobile, tablette, desktop)
- [ ] Ajouter des couleurs, des images, des animations, etc...
  

### Mieux organiser le code:
- [ ] Ajouter des commentaires
- [ ] Factoriser le code (separer les composants)


### Ameliorer les fonctionnalités:
- [x] ~~Ajouter la logique et l'ui pour quitter le lobby~~
- [ ] Ajouter un timer pour passer au round suivant
(Le serveur ne doit plus attendre que les joueurs envoient leurs `story elements` pour passer au round suivant) `EN COURS`
- [ ] Faire que si le joueur n'envoie pas de `story element` le serveur cree un `story element` vide pour lui. `EN COURS`

  
### Ajouter des fonctionnalités:
- [ ] Faire en sorte d'afficher les `story elements` dans l'ordre ou ils ont ete envoyes pour chaque utilisateur
- [ ] Ajouter la logique et l'ui pour les images et l'audio
- [ ] Ajouter les parametres du lobby:
    - [ ] Voir les histoires des autres joueurs ou seulement le dernier `story element` ou les `story elements` du dernier joueur
    - [ ] Choisir le nombre de `story elements` par `story`
    - [ ] Configurer le timer (Ajouter le mode Dynamic)

- [ ] Ajouter un systeme de personages et de lieux(les lieux sont juste l'image de fond de l'histoire)
- [ ] Ajouter un mode `Solo` pour le joueurs qui veulent juste creer des histoires
- [ ] Commencer l'histoire en choisissant le nom de l'histoire et les differents presonnages avec leurs descriptions
- [x] ~~Modifier le server pour faire un systeme de `Transactions SQL` pour les ecritures dans la base de donnees~~
- [x] ~~Ajouter le nom du joueur de chaque `story element` dans la page des resultats~~
- [ ] Ajouter la fonction de Partager l'histoire sur les reseaux sociaux


- [ ] Ajouter je t'aime