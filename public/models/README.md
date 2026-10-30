# Sherlock driver

`sherlock.glb` is the optimized version of the user-supplied
`Meshy_AI_Whimsical_Detective_C_1030200947_texture.glb`.
The original remains outside the repository in the user's Downloads folder.

Prepared with glTF Transform 4.5.1: weld, simplify (ratio 0.025,
error 0.005), then resize textures to 1024 × 1024. No Draco decoder is needed.
This reduces the approximately 41 MB source to 1.4 MB.

The source has no skeleton. The existing driver rig animates the figure as a
whole; independent head and hand animation requires a rigged replacement.
Placement is configured in `src/kart/Sherlock.ts`. Sherlock replaces the first
roster entry; all seven other drivers retain their procedural models.

Check integration and generate front/back inspection screenshots with:

```sh
node tools/sherlock-test.mjs
```

This asset was supplied separately from the upstream project's procedural art.
