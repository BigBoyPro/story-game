# EditableStory


### Pour les collegues:

## Setup

Vous devez installer `nodejs` depuis le site officiel: https://nodejs.org/en/download/current

Vous devez lancer le `install client` et le `install server` en haut à droite pour que le code fonctionne 
(que pour les utilisateurs de `IntelliJ IDEA` ou `WebStorm`).  
Sinon si ça ne fonctionne pas, vous pouvez aussi lancer les commandes suivantes:
    
    cd client 
    npm install
    cd ..
    cd server
    npm install


### Pour lancer le client:
Vous pouvez lancer le client en cliquant sur `client dev` en haut à droite.  
Sinon, vous pouvez aussi lancer le client avec la commande suivante:

    cd client
    npm run dev

### Pour lancer le serveur:
Vous pouvez lancer le serveur en cliquant sur `server dev` en haut à droite.
Sinon, vous pouvez aussi lancer le serveur avec la commande suivante:

    cd server
    npm run dev



### Pour acceder a la base de donnees:
J'ai utilisé `Supabase` pour la base de donnees, c'est une BDD `PostgreSQL` en ligne,
pour y acceder, vous pouvez `creer un compte` sur le site suivant: https://supabase.com/dashboard/sign-in.  
Puis donnez-moi votre `mail` pour que je puisse vous inviter dans l'organisation `BIGSHELL`, pour que vous puissiez acceder a la base de donnees `story`.  


Moi, j'utilise l'UI du [site de supabase](https://supabase.com/dashboard/project/nhldzevrwuqvytdltqgi/editor) pour creer les tables et tout...  
Mais si vous voulez utiliser autre chose, pour avoir `l'URL de Connection` a la base de donnees cliquer sur la bdd `story` pour aller sur le [Dashboard](https://supabase.com/dashboard/project/nhldzevrwuqvytdltqgi), 
puis en haut à droite de la page, vous avez un bouton `Connect` qui va vous donner les differentes URL de connection.



## Taches

### Améliorer le design et l'UI de l'application :
- [ ] Ajouter des validations pour les inputs
- [ ] Faire un croquis de l'application
- [ ] Rendre l'application responsive (mobile, tablette, desktop)
- [ ] Ajouter des couleurs, des images
- [ ] Ajouter des animations
- [x] ~~Faire en sorte d'afficher les `story elements` un par un~~


### Mieux organiser le code:
- [ ] Ajouter des commentaires
- [ ] Factoriser le code (separer les composants)

  
### Ajouter des fonctionnalités:
- [ ] Securiser le server
- [ ] Ajouter un moment avant chaque `round` pour que les utilisateurs puissent voir les `story elements` des joueurs precedents
- [x] ~~Ajouter la logique et l'ui pour les images et l'audio `RADIA`~~
- [x] ~~Ajouter la fonction de dessiner des images pour les `story elements` `DARYL`~~
- [ ] Ajouter les parametres du lobby: 
  - [ ] Voir toute l'histoire d'avant ou ne voir que le dernier `story element` ou les `story elements` du dernier utilisateur
  - [ ] Choisir le nombre de `story elements` par `story` le nombre de textes, d'images et d'audio
  - [ ] Configurer le timer (Ajouter le mode Dynamic)
  - [ ] Commencer l'histoire en choisissant le nom de l'histoire et les differents personages avec leurs descriptions et le theme

- [ ] Ajouter des modes de jeu
  - [ ] Ajouter un mode `Solo` pour les joueurs qui veulent juste creer des histoires
  
- [ ] Ajouter les liens d'invite

- [ ] Ajouter un systeme de personages 

- [ ] Ajouter un systeme de lieux (les lieux sont juste l'image de fond de l'histoire)

- [ ] Ajouter le text to speech pour les `story elements` et plusieurs voix

- [ ] Ajouter la fonction de Partager l'histoire sur les réseaux sociaux
- [ ] Ajouter un systeme de vote pour le `MVP` de l'histoire
- [ ] Ajouter un systeme de vote pour la meilleure `story`

- [ ] Ajouter un systeme de defis
  - [ ] Utiser un mot specifique dans l'histoire
  - [ ] Possibilite de defier les autres joueurs

- [ ] Ajouter un systeme de joueur rogue qui s'incruste dans les histoires des autres joueurs

- [ ] Ajouter un systeme de login

- [ ] Ajouter je t'aime
