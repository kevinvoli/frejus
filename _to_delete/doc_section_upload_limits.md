## Mise à jour du 29 août 2026 — augmentation des limites de taille des fichiers uploadés

Demande client : augmenter le poids maximal des fichiers uploadables — 50 Mo pour une photo,
2 Go pour une vidéo. S'applique à toutes les surfaces d'upload de photos du projet (image
générique du panneau des réglages — favicon, logo, image "à propos", images du carousel
d'accueil —, catalogue de photos d'une spécialité, médiathèque cliente) ; la limite vidéo ne
concerne que la médiathèque cliente, seul endroit du projet où des vidéos peuvent être envoyées.

- **Backend** — plafond relevé de 8 Mo à 50 Mo dans `backend/src/upload/upload.controller.ts`
  (upload générique d'image) et `backend/src/specialties/specialties.controller.ts` (catalogue
  de photos), tous deux uniquement des photos. Pour la médiathèque cliente
  (`backend/src/galleries/`), qui accepte à la fois photos et vidéos, deux plafonds distincts
  sont nécessaires (`MAX_PHOTO_SIZE_BYTES` = 50 Mo, `MAX_VIDEO_SIZE_BYTES` = 2 Go, définis dans
  `galleries.service.ts`) — or multer n'applique qu'une seule limite de taille par interceptor
  (`limits.fileSize`). Celle-ci est donc réglée sur le plafond le plus haut (vidéo, 2 Go) dans
  `galleries.controller.ts` pour ne jamais couper un upload vidéo légitime en cours de flux, puis
  chaque fichier est revérifié selon son propre type une fois écrit sur le disque, dans
  `GalleriesService.addMedia()` : une photo qui dépasse 50 Mo est rejetée (erreur 400 explicite)
  et le fichier fraîchement écrit est supprimé avant de renvoyer l'erreur — même principe déjà en
  place pour le contrôle du quota de stockage du projet (`assertWithinMediaQuota`, mise à jour du
  27/08), factorisé dans une même méthode `cleanupUploadedFiles()` pour ne jamais laisser de
  fichier orphelin sur le disque. Le quota global de stockage du projet
  (`MEDIA_STORAGE_QUOTA_GB`, 100 Go par défaut) reste indépendant de ces plafonds par fichier et
  n'a pas été modifié.
- **Délai serveur** — le délai par défaut de Node.js pour une requête HTTP (5 minutes) pouvait
  couper l'envoi d'une vidéo de 2 Go sur une connexion lente avant qu'il ne se termine ; relevé à
  30 minutes dans `backend/src/main.ts` (`server.requestTimeout`). Vérifié par ailleurs que le
  filtrage multipart (multer/busboy) écrit directement les fichiers sur le disque au fil de l'eau
  sans jamais charger la requête entière en mémoire : aucune limite globale de taille de requête
  (body-parser JSON/urlencoded) ne s'applique donc à ces routes d'upload.
- **Panneau admin** — plafonds côté client (`Dropzone` Mantine, simple confort immédiat, le
  serveur restant la seule source de vérité) alignés sur les nouvelles valeurs serveur :
  `ImageUploadField.tsx` (favicon, logo, image "à propos", images du carousel d'accueil) et
  `SpecialtyDetailPage.tsx` passent de 8 à 50 Mo. Pour la médiathèque cliente
  (`GalleryDetailPage.tsx`), même contrainte que côté backend : le composant `Dropzone` ne peut
  exprimer qu'une seule valeur de `maxSize`, réglée sur le plafond vidéo (2 Go) ; le plafond photo
  (50 Mo) est donc revérifié à la main dans le gestionnaire de dépôt, qui affiche une notification
  de refus nommant les fichiers concernés sans même solliciter le serveur pour ceux-ci. L'affichage
  de la taille de chaque média de la médiathèque réutilise désormais l'utilitaire partagé
  `formatBytes()` (déjà utilisé par le tableau de bord Stockage) plutôt qu'un formatage local
  limité au Ko/Mo, une vidéo pouvant désormais peser plusieurs centaines de Mo voire atteindre le
  Go.

**Vérification effectuée** : build et lint backend + admin sans erreur ni nouvel avertissement.
Testé au niveau API (contournant l'interface pour des fichiers de test volumineux) : image de
40 Mo acceptée et de 60 Mo refusée (413) sur l'upload générique et sur le catalogue d'une
spécialité ; sur la médiathèque, photo de 40 Mo acceptée, photo de 60 Mo refusée avec le message
dédié ("50 Mo maximum pour une photo") et fichier bien supprimé du disque après refus (pas
d'orphelin), vidéo de 300 Mo acceptée (confirme qu'une vidéo n'est pas soumise au plafond photo),
et vidéo de 2,1 Go refusée par la limite multer elle-même (413), sans fichier partiel laissé sur
le disque. Testé en navigateur (Playwright) : les nouveaux textes d'aide (50 Mo / 2 Go) sont bien
affichés sur les trois écrans concernés du panneau admin, et le dépôt direct d'une photo de 60 Mo
dans la médiathèque déclenche bien le refus côté client, sans appel réseau.

