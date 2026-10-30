# Moon Tower driving prototype

Local-only first pass based on the user's overhead reference. No changes to
Sunset Bay's layout, geometry or scenery. The title has two course buttons;
choosing another course reloads the world while retaining language/music prefs.

- Default: `http://localhost:5173/kart-royale/` (original Sunset Bay).
- Prototype: `http://localhost:5173/kart-royale/?track=moon`.
- Approximately 1,974 m per lap, three laps, eight drivers.
- Four complete ascending circuits around a 30 m radius tower, rising 12 m
  per revolution, from 3 m to 51 m road elevation.
- High outbound bridge, sweeping return hairpin, descending diagonal and
  ground-level esses, with continuous barriers.
- Existing arcade gravity and handling, deliberately retained to isolate the
  layout test. No low-gravity mechanic in this version.
- Simple lunar surface, star field, Earth marker, craters and tower labels.
  These are layout placeholders rather than final art.

`MoonTrack` implements the existing ITrack contract independently. Road sampling
uses a progress-local, height-aware segment search so stacked spiral floors
cannot steal wheel contacts or progress from one another. Rendering and physics
share the same uniformly spaced centreline. The prototype has no banking or
ramps for jumps. Sunset Bay's special tunnel audio is disabled on the Moon.

Validation:

```sh
npm run build
node tools/moon-test.mjs
node tools/moon-support-test.mjs
node tools/course-select-test.mjs
```

The lunar harness checks surface/progress projection around the complete loop,
then drives all eight racers through three laps with synthetic 60 Hz physics.
It checks finish outcomes, lap count, floor-four elevation, finite positions and
page errors. Inspection screenshots are written to `/tmp/moon-*.png`.
Software-rendered screenshots are used only for correctness, never performance.

Supports sit outside the full deck/rail width and connect back with short brackets.
Each ground-to-deck column is checked against all lower road segments, including
other spiral floors. Unsafe placements are omitted. The support test independently
raycasts the rendered road to catch columns that penetrate a lower driving surface.
