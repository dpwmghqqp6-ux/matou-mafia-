# Dusk Fox — brief Spine (mascotte)

Référence visuelle : `public/fox-reference.jpg` (même perso, ne pas changer de design).

Cible : Stake Engine web-sdk (Svelte 5 + PixiJS 8 + Spine). Pas de JPEG animé, pas de Lottie, pas d’After Effects en livrable final.

Référence de qualité : Le Bandit (Hacksaw) — raton squeletté, idle vivant, interactions avec la grille. On copie la **méthode**, pas le perso.

---

## 1. Personnage (bible)

- Renard anthropomorphe slim, 3D / ciné, pas cartoon enfant.
- Fourrure orange-roux, poitrine et museau crème, oreilles et bout de queue noirs.
- Yeux ambre, petit anneau or à l’oreille gauche.
- Gilet noir cintré, liseré or, chaîne de gousset or.
- Gants cuir noirs, pantalon noir, pieds nus (pads crème, griffes noires).
- Clé or ouvragée (scatter du jeu). Elle vit dans un **slot Spine** `slot_key`, pas collée dans la main.
- Attitude : voleur sûr de lui, regard vers la **gauche** (vers la grille).

Interdit : nouveau costume, autre animal, fond, sol, ombre peinte, texte, logo Stake.

---

## 2. Fichiers à livrer (illustrateur)

Un PSD / AI en calques, fond **100% transparent**, perso debout 3/4 face gauche.

Canvas conseillé : **2048 × 3072 px** (ratio 2:3). Zone utile du perso ~1800 px de haut. Résolution finale atlas Spine : 2048 ou 4096.

### Naming des calques (exact)

```
head
  ear_L
  ear_R
  eye_L
  eye_R
  brow_L
  brow_R
  muzzle
  nose
head_shade          (optionnel)
torso
vest
chain
arm_L_upper
arm_L_lower
hand_L
arm_R_upper
arm_R_lower
hand_R
hips
leg_L_upper
leg_L_lower
foot_L
leg_R_upper
leg_R_lower
foot_R
tail_01
tail_02
tail_03
```

Règles de cut :

- Chaque pièce a de la **marge** (20–30 px) pour les rotations.
- Les articulations se **chevauchent** (épaule / coude / hanche).
- Queue en 3 segments, pas un seul sprite.
- Yeux et sourcils séparés = clignement.
- Main droite assez grande pour cacher la clé dans le slot.
- Pas de fond noir autour des pièces (le gilet est noir : détourer proprement, alpha réel).

Livrer aussi : 1 turnaround simple (face / 3-4 / dos) en plus du PSD, pour le rigger.

---

## 3. Rig Spine

Skeleton name : `dusk_fox`  
Skin unique : `default`  
Root aux **pieds**, scale 1 = hauteur perso ~720 px à l’écran proto (ajuster dans Pixi).

Os minimum :

```
root
  hip
    spine
      torso
        neck
          head
            ear_L
            ear_R
            jaw
        arm_L_upper
          arm_L_lower
            hand_L
        arm_R_upper
          arm_R_lower
            hand_R
              key          ← bone + slot_key
    leg_L_upper
      leg_L_lower
        foot_L
    leg_R_upper
      leg_R_lower
        foot_R
    tail_01
      tail_02
        tail_03
```

IK : jambe L, jambe R, éventuellement bras R pour `drop`.  
Contraintes : queue en FK souple, oreilles légèrement secondaires.

Slot `slot_key` :

- Attachment `key_gold` (la clé du jeu).
- Visible seulement pendant `drop` et éventuellement `tease`.
- Event Spine `plant_key` au frame où la clé touche le reel 5.

---

## 4. Anims (noms figés — le jeu les appelle comme ça)

| Nom | Durée | Loop | Quand |
|---|---|---|---|
| `idle` | 3.0–4.0 s | oui | base, toujours |
| `tease` | 0.8–1.2 s | oui | 2 keys, anticipation reel 4–5 |
| `drop` | 0.9–1.2 s | non | fox pose la 3e clé |
| `win` | 1.2 s | non (x2–3) | NICE / SMALL |
| `big` | 1.4 s | non | BIG |
| `mega` | 1.8 s | non | MEGA / FULL VAULT |
| `vault` | 3.0 s | oui | idle Heist, plus froid |
| `hide` | 0.2 s | non | on le retire de l’écran |

### idle
Respiration poitrine, poids qui bascule, queue lente, 1 clignement vers 1.6 s, regard micro vers la grille. Rien de bounce global.

### tease
Penche vers la **gauche**, patte gauche sur un cadre imaginaire (haut du gizmo = bord droit de la box). Oreilles en avant. Clé optionnelle près de la poitrine.

### drop (la feature)
0.00–0.25 : depuis tease, s’enfonce vers le reel 5.  
0.25–0.70 : bras R + `slot_key` sortent vers la gauche, clé s’aligne sur la case milieu du reel 5.  
**0.70 : event `plant_key`.**  
0.70–1.10 : recul, clé disparaît (attachment off).  
Le jeu plante le symbole S à l’event, pas avant.

### win / big / mega
Hop, oreilles, clé levée sur big/mega seulement. Pas de loop infini.

### vault
Même idle, amplitude plus basse, teinte gérée en jeu (filter teal), pas un recolor dans Spine.

---

## 5. Placement dans la machine

- Ancré à **droite** de la grille centrée, pieds au niveau du bas de box.
- Il **chevauche le cadre** (z-index au-dessus des reels, sous les cartes HEIST / WIN).
- Largeur à l’écran ~22% du stage. Pas un mur 90%.
- Pendant `drop`, le bras peut entrer de 40–80 px dans la box. La grille ne clippe pas le perso (overflow visible sur le stage, pas sur le wrap).

Proto actuel : la mascotte est **cachée** (`display:none`). Le gameplay FORCE FOX / drop reste en code, sans visuel, jusqu’au Spine.

---

## 6. Export (animateur → dev)

Depuis Spine :

- Export **JSON** (ou binary `.skel`) + **atlas** + PNG.
- Atlas max 2048² pour proto, 4096² OK si besoin.
- PMA : non (premultiplied alpha off), sauf si le runtime Pixi du web-sdk l’exige — vérifier au branchement.
- Pack : rotation ON, whitespace strip ON.

Livrables dossier :

```
dusk_fox/dusk_fox.json
dusk_fox/dusk_fox.atlas
dusk_fox/dusk_fox.png
```

Runtime : `@esotericsoftware/spine-pixi-v8` (web-sdk Stake). Mix : `idle` en track 0, `tease`/`drop`/`win` en track 1.

---

## 7. Events jeu (contrat)

- `plant_key` → JS pose `S` sur reel 5 row 1, slam, puis Heist si 3 keys.
- `footstep` (optionnel) pour SFX slam.
- `win_hit` (optionnel) pour SFX coin.

Chance proto actuelle : ~12% des teases 2 keys déclenchent `drop`. FORCE FOX force le flux. FORCE TEASE = miss sans drop.

---

## 8. Ordre de travail

1. Détourer / redessiner le perso du JPG en calques (section 2).
2. Rig + `idle` seulement. On réaffiche la mascotte dès que `idle` tourne dans Pixi / proto.
3. `tease` + `drop` + event `plant_key`.
4. `win` / `big` / `mega` / `vault`.
5. Branchement web-sdk quand on quitte le proto HTML.

Logiciel : Spine Essential suffit. Illustrator / Photoshop / Affinity pour le cut. Pas After Effects comme cible.

---

## 9. Contacts fichiers

- Référence : `public/fox-reference.jpg`
- Ce brief : `public/FOX-SPINE-BRIEF.md`
- Proto machine : `preview/index.html` (renard masqué)
