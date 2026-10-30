MATOU MAFIA — export mascotte Spine 2D

1. Ouvre Spine (4.1+).
2. New Project, Images path = dossier parts/
3. Import Data -> matou_setup.json  OU  Import Image pour chaque PNG de parts/
4. Place les bones / pivots aux articulations (epaule, coude, hanche, queue).
5. Les noms auto provenant de la planche peuvent etre a renommer : ouvre parts_preview.png
   et renomme dans Spine selon ce que tu vois (le heuristic n'est pas parfait).

Ordre de calques suggere (arriere -> avant):
  tail_03, tail_02, tail_01, leg_R, foot_R, leg_L, foot_L,
  torso, shorts, strap_L, strap_R,
  arm_R_upper, arm_R_lower, hand_R,
  arm_L_upper, arm_L_lower, hand_L,
  head, ear_L, ear_R, cap, eye_L, eye_R, pupil_L, pupil_R,
  brow_L, brow_R, muzzle, mouth, nose, cigarette

Fichiers:
  cat_full.png      — perso entier HD fond transparent (~2048px)
  parts/*.png       — pieces detachees
  parts_preview.png — planche annotee
  matou_setup.json  — squelette de depart (root + 1 bone/slot par piece)
  README.txt        — ce fichier

Pieces: arm_L_lower, arm_L_upper, arm_R_lower, arm_R_upper, brow_L, brow_R, cap, cigarette, ear_L, ear_R, eye_L, eye_R, foot_L, foot_R, hand_L, hand_R, head, leg_L, leg_R, mouth, muzzle, nose, pupil_L, pupil_R, shorts, strap_L, strap_R, tail_01, tail_02, tail_03, torso
