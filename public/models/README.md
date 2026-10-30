# Imported drivers

`sherlock.glb` is the optimized version of the user-supplied
`Meshy_AI_Whimsical_Detective_C_1030200947_texture.glb`.
The original remains outside the repository in the user's Downloads folder.

Prepared with glTF Transform 4.5.1: weld, simplify (ratio 0.025,
error 0.005), then resize textures to 1024 × 1024. No Draco decoder is needed.
This reduces the approximately 41 MB source to 1.4 MB.

The source has no skeleton. The existing driver rig animates the figure as a
whole; independent head and hand animation requires a rigged replacement.
Placement is configured in `src/kart/Characters.ts`. Sherlock replaces the first
roster entry and Frankenstein the second. Astronaut, Pirat and Dracula occupy
slots three through five. Bedstemor, Robot and Mumie fill slots six through eight,
so all racers now use imported character models.

`frankenstein.glb` comes from the user-supplied
`Meshy_AI_Frankenstein_Characte_1030201642_texture.glb`. It uses the same process
with simplify ratio 0.014 and error 0.005, reducing approximately 65 MB to 1.4 MB.
It also has no skeleton and uses whole-figure animation.

The following additional user-supplied models use the same weld, simplify
(error 0.005) and 1024 × 1024 texture resize process:

| Driver | Original filename | Simplify ratio | Optimized size |
| --- | --- | --- | --- |
| Astronaut | `Meshy_AI_Little_Space_Explorer_1030203426_texture.glb` | 0.018 | 1.43 MB |
| Pirat | `Meshy_AI_Jolly_Pegleg_Pirate_1030203412_texture.glb` | 0.015 | 1.49 MB |
| Dracula | `Meshy_AI_Tiny_Count_Dracula_1030203103_texture.glb` | 0.020 | 1.37 MB |
| Bedstemor | `Meshy_AI_Grandma_Gearshift_1030203937_texture.glb` | 0.017 | 1.48 MB |
| Robot | `Meshy_AI_Vintage_Toy_Robot_Tur_1030203922_texture.glb` | 0.015 | 1.73 MB |
| Mumie | `Meshy_AI_Mummy_Racer_1030204213_texture.glb` | 0.014 | 1.53 MB |

These sources also have no skeleton. Each driver has its own cockpit scale
and offset in `src/kart/Characters.ts`. Original files remain in Downloads.

Check integration and generate front/back inspection screenshots with:

```sh
node tools/sherlock-test.mjs
node tools/sherlock-test.mjs Frankenstein
node tools/sherlock-test.mjs Astronaut
node tools/sherlock-test.mjs Pirat
node tools/sherlock-test.mjs Dracula
node tools/sherlock-test.mjs Bedstemor
node tools/sherlock-test.mjs Robot
node tools/sherlock-test.mjs Mumie
```

This asset was supplied separately from the upstream project's procedural art.
