# EditableStory

## Pour les collegues
### Tout d'abord:

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
J'ai utilise `supabase` pour la base de donnees, c'est une BDD `PostgreSQL` en ligne.  
Pour y acceder, vous pouvez vous connecter sur le site suivant: https://supabase.com/dashboard/sign-in?  
Puis vous devez crrer un compte et me demander de vous mettre dans l'organisation `BIGSHELL` pour que vous puissiez acceder a la base de donnees.
Moi j'utilise l'UI du site de `supabase` pour creer les tables et tout, mais vous pouvez utiliser ce que vous voulez.  
Pour avoir l'URL de connection cliquer sur la base de donnees `story` puis en haut a droite de la page vous avez un bouton `Connect` qui vas vous donner les differentes URL de connection.



### Taches a faire:

- Améliorer le design de l'application :
    - Ajouter des couleurs
    - Ajouter des animations
    - Ajouter des transitions
    - Ajouter des effets visuels
    - Ajouter des images
    - Ajouter des icones
    - Ajouter des polices
    - Ajouter des ombres
    - Ajouter des bordures
  

- Mieux organiser le code:
    - Ajouter des commentaires
    - Factoriser le code (Separer les composants)


- Ameliorer les fonctionnalités:
  - Ajouter la logique et l'ui pour quitter le lobby
  - Le serveur ne doit plus attendre que les joueurs envoient leurs `story elements` pour passer au round suivant
  (Ajouter un timer pour passer au round suivant)
  - Ajouter une colonne dans `stories` pour stocker le `last user id` qui a modifié la `story`

  
- Ajouter des fonctionnalités:
    - Ajouter les parametres du lobby
    - Modifier le server pour faire un systeme de `Transactions SQL` pour les ecritures dans la base de donnees
    - Ajouter la logique et l'ui pour les images et l'audio
    - Ajouter le nom du joueur de chaque `story element` dans la page des resultats

    - Ajouter je t'aime