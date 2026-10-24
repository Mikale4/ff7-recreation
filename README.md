# Final Fantasy VII: study recreation

A non-commercial, personal-study recreation of **Final Fantasy VII (PS1, 1997)** in the browser.
It uses a custom WebGL engine with low-poly procedural 3D models, 3D field maps, ATB battles with
FF7's own formulas, materia, limits, the world map, vehicles and minigames. Dialogue is paraphrased,
not the original script. This project is not affiliated with Square Enix.

## Play online
**https://mikale4.github.io/ff7-recreation/** (any browser with WebGL, phones included).

The online copy holds only this recreation's own work: the code, the 3D models and the portraits rendered from them.
It has none of the original game's music, sound effects or movies; the story's movies play as their real-time
cinematics, and the game is silent apart from that. Its saves live in that browser's storage.

## Running
Serve the folder over HTTP and open `index.html`:

```
python tools/serve.py 8777
```

Then browse to http://localhost:8777/. `tools/serve.py` serves the folder and also keeps **every save on disk**,
in `saves/` next to the game (one `.json` file per save: the 15 files, the Autosave, the Demo files, Kupomon's Demo
file, Config, key bindings, achievements). The browser's own storage can be lost (a private window, cleared site data,
a preview pane that keeps its storage in memory only); when it is, the game puts every save back from `saves/` the next
time it loads. Before a save is overwritten, its old copy goes to `saves/backups/<save>/` (at most one every 10
minutes, the newest 40 kept): to undo a bad save, stop the server and copy a backup over the file in `saves/`.

`python -m http.server 8777` or opening `index.html` directly from disk (file://) also run the game, but then the saves
live only in the browser's storage. Music loads more reliably over HTTP.

## Controls (keyboard / gamepad)
| Keyboard | PlayStation | Use |
|---|---|---|
| Arrow keys | D-pad | Walk; move cursors |
| Z (Space) | ○ | Confirm / talk |
| X (Backspace) | × | Cancel; in a dialogue choice it answers No (Not now, Leave it, Never mind...) |
| Enter | △ | Party menu (open / close); confirm a character's name; the △ action in menus (e.g. remove one materia) |
| C (Shift), held | | Run. Config > Field > Run: Always makes running the default (then holding C walks) |
| Esc | | Demo mode on / off (the runner plays the game from where you are) |
| ` (backquote) | | Fast-forward (1× / 2× / 4× / 8×), in the Demo and in normal play (Config > System > Fast-Forward) |
| Q, held (battle) | L1 + R1 held | Run away |
| W (battle) | Select | Auto battle on / off |
| D | Square | Extra action: target All in battle, Remove all materia, submarine dive, enter the airship |
| A / S (PgUp / PgDn) | L1 / R1 | Switch character / page in menus; rotate the world camera |
| 1 / 2 | L2 / R2 | Minigame and vehicle extras |
| Tab | Start | Pause; skip movies (a "Skip this cutscene?" prompt; the corner notice reminds you) |
| M | Select | Show exits (field); minimap mode (world) |

These are the defaults: every one can be rebound in **Config > Controls**. Each button has two keyboard keys and a
gamepad button; OK on a cell waits for the key (5 seconds), Square clears it, and the last row resets everything. A
key taken from another button moves over (that button gets the old key back). The bindings are kept per browser, for
every save file, and the game's hints (movie skip, minigame help, the Save screen) name your keys.

The Config screen is in tabs: **Battle**, **Field**, **System** (volumes, window color, fast-forward, autosave),
**Extras** (the story extras below) and **Controls**. It is on the title screen too, and the settings are shared by
every save file (kept per browser): new games start with them and loading a file applies them. L1 / R1 (A / S) switch tabs, or Left / Right on the tab
bar; a line at the bottom explains the option under the cursor.

## Quality of life (not in the PS1 game)
- **Theater** (title screen): the story's 33 cutscenes to watch again, in story order. Each is **????** until your
  own game has reached it (watched or skipped; the Demo doesn't count) or one of your save files is past it.
- **Achievements** (title screen): 46 milestones of the story, the party, battles, the WEAPONs, the side quests,
  Cait Sith's workshop and Kupomon; a toast slides in when one unlocks. They're yours, not a save file's; test games
  and the Demo don't earn them (`js/systems/achievements.js`).
Each is a Config option, on by default (`js/ui/qol.js`):
- **Fast-Forward**: ` cycles 1× / 2× / 4× / 8×; the speed shows in the top-right corner.
- **Autosave**: once you have control on each new map (on the world map, on foot), the game writes an
  **Autosave** file of its own, never one of the 15. The Load screen lists it first, with the cursor on it
  when it is newer than your last save. It is included in the memory-card export.
- **Deleting a file** (always on): on the Save or Load screen, D (the Square button) on a file, then Yes, deletes it (the
  Autosave file too).
- **Hints**: the main menu's bottom-left box shows the story's next objective (the runner's route) and
  the treasure still to be picked up on the current map.
- **Limit Progress**: the Limit screen shows how close each unlearned Limit Break is (kills, uses of
  the level's first limit, or its manual), without naming it.
- **Sense Details**: Sense also shows the enemy's weaknesses, halved, voided and absorbed elements.
- **Chocobo Details** (off by default): what FF7 keeps hidden about chocobos, shown where you need it.
  - A stall card gets a second page: the bird's top speed and how much greens can still add, a restless streak and
    the Pahsana Greens left to settle it, when it can mate again, and the wins to its next class.
  - It also says what colour the bird can lead to next: the partner, the nut, and the race wins that make it certain.
  - After a wild chocobo fight, it names the quality the monsters gave away and the odds the greens made.
  - Mating a Black second with a Zeio Nut asks first, since only the Black picked first can make a Gold.
- **AVALANCHE Scenes**: Jessie joins as a guest party member when she opens the Reactor 1 door and stays until
  the group splits in Sector 8; and at the Sector 7 pillar a playable "meanwhile" scene shows Biggs, Wedge and
  Jessie's last stand on the stairs (three battles; it ends where Cloud later finds each of them). Guests level
  with the party, keep their own gear and spells (Equip / Materia are locked for them) and earn no EXP.
- **Turks Join**: Reno, Rude and Elena can become permanent party members in Disc 3 - only if you chose
  "Let's settle this" and beat them in the Sector 8 underground (skipping them closes it). They're back at
  Wutai's Turtle's Paradise asking for help with a medevac wreck on Da-chao (Shinra holdouts, a boss); then
  Barret confronts Reno aboard the Highwind before they join. Each has four Limit Breaks (learned by kills), a
  weapon line (starters, two for sale in Wutai afterwards, and an ultimate from Tseng's case), and a place in
  the final dungeon's scenes. Their weapons and Limits are outside FF7's own 100%.
- **Playable Flashbacks**: at Corel Prison, young Barret and Dyne (guests, with miners' rifles) fight their way
  through burning Corel before the cliff; and the Shinra Mansion basement's memory (Disc 3) goes on as Zack's
  last stand - Zack crosses the rainy wasteland outside Midgar (Midgar on the horizon) through two Shinra
  patrols to the cliff, where the Shinra army overwhelms him (a fight you're meant to lose) and Cloud takes the
  Buster Sword. The fights never end the game.
- **Cait Sith's Hideout** (`js/maps/extra/cait_hideout.js`), a sidequest:
  - With Cait Sith in the party, pay Wonder Square's Crystal Fortune ten times in a row and it breaks. Cait Sith
    jumps out, scolds Cloud, and shoves the booth aside, showing the door to his secret workshop. He goes in for his
    tools and leaves the party (he's away: off the party and the PHS until the quest is done).
  - Walk in after him and he shoos you out, until the third time, when he gives up and lets you stay. The workshop is
    built on what the games say about him: the robot moogle's spare body in its charging bay, three spare Cait
    Siths, shelves of toy moogles, a radio stamped by Shinra's Urban Development, and a model of Midgar.
  - Look at everything and he loses his temper with the machine: he needs a Grangalan Mainspring, a Needle Kiss
    Stinger and a Cokatolis Eye (the hills round North Corel) and a Lucky Joker Card (the grassland south of
    the Corel desert, reached by buggy after Corel Prison), one from each monster while the quest is on (key items).
  - With all four, the party's first steps out on the world map cut to a silly scene in a clearing (grassland, or
    the hills round North Corel): MOG Mk.II, a giant robot moogle, stomps up, beeps, demands the parts, swears "NO
    CAT SENT ME", deletes that sentence, and attacks. It's pitched at a party near the end of the disc you fight it
    on (Disc 1: level 38, 8,000 HP; Disc 2: level 48, 22,000 HP; Disc 3: level 60, 45,000 HP), and it's weak to
    lightning. Beaten, it reboots, walks into a rock and waddles off toward the Gold Saucer.
  - Back at the workshop Cloud hands the parts over with a cold stare, Cait Sith insists it wasn't him (Shinra,
    surely!), makes the spare parts and rejoins the party. Outside he mends the booth and slides it back over the
    door. From then on a hidden switch on the booth's left side opens the way in, and it closes behind you.
  - Part two, the next time you go in: Cait Sith hops out of the party to look MOG Mk.II over ("She's no' a COMBAT
    model! She's an ARCADE model!"), mutters about who dented her, and stays to mend her (away again). Meanwhile, for
    his "market research", play every game in Wonder Square at least once: Super Dunk, G-Bike, Wonder Catcher, Mog's
    House, 3-D Battler, Arm Wrestling, Condor Command, and Snowboard and Torpedo Attack once their cabinets run (talk to
    him for what's left). Back in, he shows off his newest invention, the **MogBoy**, a handheld game machine (a key
    item: Item > Key Items > MogBoy, anywhere off the battlefield), and rejoins.
  - MOG Mk.II is now the **Arcade Library**, a GP shop of MogBoy cartridges: G-Bike and 3-D Battler (50 GP), Mog's House
    (80), Condor Command (100), and Snowboard and Torpedo Attack (100, once they're out). The MogBoy plays them for fun:
    the gil, GP and prizes stay with the cabinets in Wonder Square.
  - The Demo plays all of it on the Disc 1 visit for the Keystone, before the ropeway breaks down (the runner's
    `c8_cait` checkpoint is in Wonder Square with the booth still whole).

**The last battle** is fought as in FF7. Whoever you talk to at the bottom of the Northern Crater follows you down,
and against Bizarro·Sephiroth they form a second party (and a third, which you arrange, if four or more came along).
When the party on the field falls, the next takes over and Bizarro keeps its wounds; the party left standing goes on
to face Safer·Sephiroth. Talk to nobody and it is the single-party fight.

**Wonder Square** is laid out like a real arcade hall: paired cabinets along the walls (each pair's twin usually
taken by a player), back-to-back islands, a bank of six claw machines, arm wrestling with its fans, the prize
counter; the **Wonder Cafe** (a counter of burgers, fries and shakes, tables of diners, free samples from the
cooks); and **Wonder Lanes**, a four-lane bowling alley where league night is on - the bowlers bowl, the ball rolls
down the lane and the pins fall. Some forty people play, watch, walk, eat and bowl, each with something to say.
Every arcade machine has its own cabinet, so the row reads at a glance: Super
Dunk's hoop, a ride-on G-Bike (tall cabinet, sports bike on a checkered platform), the Wonder Catcher claw case,
Mog's little house (the back wall's last pair, past the Fortune booth), the 3-D Battler, the Fortune booth's crystal ball,
Snowboard (opens on Disc 2) and Torpedo
Attack's periscope (opens with the submarine), each with a lit sign (`js/field/tiles.js` P.arcade).
**Mog's House** is a visual novel (`js/minigames/mog_house.js`): Mog's week before the Festival of Stars, in a 3D
storybook Moogle Hollow with Mog, Mog-Mog, Grandpa Kupo and the dashing Moglin. Each day, choose what Mog does (a
Kupo Nut: wings and belly; flying practice: wings, and it burns the belly off; a visit to Mog-Mog: heart; Grandpa's
advice is free). Five endings (Wings of Love, Kupo Forever, Splash!, Grounded, Tongue-Tied); the machine counts the
ones you've found. OK advances, hold ✕ to fast-forward.
Three more of its games are real games now (`js/minigames/wonder_games.js`):
- **Arm Wrestling** (the Wrestler's table): alternate ○ and □ to force his fist down; he surges now and then. The
  Sumo Wrestler is easy, the Wrestler himself needs a brisk pace.
- **Wonder Catcher**: steer the claw over a plush (a ring and a guide line show where it lands) and drop it. The
  plush is the prize (Moogle: Potion, Cactuar: 1 GP, Chocobo: 3 GP, Cait Sith: Phoenix Down, Tonberry: Megalixir,
  Gold Chocobo: 80 GP); the heavy ones need a near-perfect centre and can still slip.
- **3-D Battler**: five fighters, one round each. Each attack shows its height (HIGH / MID / LOW) as it winds up:
  hold ✕ with ↑ / ↓ to guard it, then hit back with ○. 3, 30, 100 GP for three, four... and 300 for all five.

**Crystal Fortune** (50 gil): the ball's glow is your fortune's rank (a Great Blessing or a Blessing leaves an item
in the tray), the reading changes every time, and it ends in a vision of something real - treasure still lying on
a map you've been to and can get back to, the road ahead, or a Gold Saucer secret.

**Condor Command** (not in the PS1 game), the island of four cabinets with condors on top, by the cafe: Fort Condor's
battles as an arcade game, 200 gil a play. Ten stages in order, each with its own troop budget (your own Gil is
never spent on troops) and a twist: a Beast stampede, a Barbarian shield wall, Wyvern skies, only seven troops,
artillery only, a rush, twin commanders, veterans, and Grand Horn's whole army. GP for every clear (replays pay
half), Turbo Ethers for stage 5 and a Megalixir for stage 10 the first time, then **Endless**: rounds that keep
growing, the budget topped up between them, your best kept on the cabinet. (`js/minigames/fort_condor.js`
'condor_command'; the story's Fort Condor battles keep their own rules.)

The troops, in both Fort Condor and Condor Command: choosing one from the hire list opens its card (what it does,
HP, range, damage against each enemy, cost), then **Place it here** or **Back**. The **Repairer** is a medic: it walks
to the most hurt troop near its post and heals it (and repairs catapults), 25 HP a time with a green stream and a
"+25"; it only fights when nobody needs it. The **Worker** is a sapper: it holds its ground behind a bomb on the
square in front of it; the first Beast, Barbarian or Commander to step there blows up, with everything beside it
(60 damage, 30 to a Commander; Wyverns fly over). Every hit drains a white chunk from the HP bar, and units stay
on their squares at any game speed.

**Action scenes** are played, as in the PS1 game, not picked from menus:
- **Gaea's Cliff**: three climbs up forking cracks, some of which run out in ice. Rub your hands warm (○ and □ in
  turn) or you pass out below 26° and wake up at Holzoff's (`js/minigames/misc_games.js` 'wall_climb').
- **Rufus's send-off in Junon**: when the captain calls an order, do it on the beat with the men beside you, and
  finish with a victory pose ('sendoff'). Your score decides the prize.
- **Shinra HQ, 60th floor**: crouch behind the golden statues when a guard stops to look, and signal Barret and Tifa
  to run to you when it's safe ('shinra_sneak'). Getting caught means a fight and a fresh try.
- **The Train Graveyard**: the way to Sector 7 runs through a gap in a pile of wrecks, and an old engine's car
  stands in it. Board the brown engine parked nose to nose with it and back it off, then the old engine can haul
  its car out of the gap. Both trains roll along the line.
- **The Ancient Forest**: catch the insects and carry them overhead. Feed them to the pitcher flowers, which snap
  shut into steps across a ravine or a stream, or set one down by a hollow tree for its frog. A frog sitting in a
  pitcher flower is a catapult. A beehive lobbed into a Large Flytrap keeps it shut. Every catch, throw and snap is
  shown (`js/field/props_forest.js`).

**FF7's own rules and quirks:**
- **W-Item**: an item leaves the bag the moment it's picked, and comes back if the pick is cancelled or never
  used. The famous duplication works as in FF7: pick the item to copy first, then pick any other item and cancel
  its target. Each cancel adds one more of the first item.
- **Guard Scorpion's tail**: when it first raises its tail, Cloud calls out to hit it while the tail's up. That's
  FF7's famously backwards advice, kept as is: attacking it then brings the Tail Laser counter down on you.
- **Battle Square handicaps**: a real reel of three handicaps turns before each battle. Your OK stops it one
  symbol past the one showing, and holding □ holds it still (the FAQ's trick). The handicaps already in force
  are listed beside it.
- **Chocobo raising** uses FF7's numbers:
  - Starting stats per rating.
  - Greens raise the hidden raw stats (34 Dash = 1 km/h), so cheap greens barely move Speed, and Reagan and
    Sylkis give a share of what the bird has.
  - Each nut has its own breeding formula, and the Black and Gold babies get their speed floors.
  - Pahsana Greens settle a restless bird.
  - A Gold only hatches when the Black is the first pick (FF7's slip).
  - In battle, greens keep a wild chocobo eating for some turns or make it less likely to run.
- **The Temple of the Ancients**: Aeris sets off in the party with whichever of Tifa, Yuffie and Barret likes
  Cloud best, and stays in it until the Temple is over.
- **The ending** runs Holy, then the staff roll (the length of its song: the cast, the places, the adversaries,
  the soundtrack, your journey), then "500 years later".
- **Palmer** runs straight into a Shinra truck reversing into Cid's yard. The Tiny Bronco's escape is a
  real-time movie (in the Theater too).

Menu portraits are rendered from the game's own 3D models: `tools/render_portraits.js`, run in the page that
`tools/portrait_sink.py` serves (Code launch config "portrait-sink"), rewrites `assets/portraits/<id>.png`.

## Demo
Title > **Demo** starts a new game that plays itself (the runner, `js/runner/`); **Esc** in any game turns
Demo mode on or off, and ` fast-forwards it. The Demo saves into a real file of its own (tagged "Demo" on
the Save / Load screens: its earlier file, else the first empty one), so you can continue it any time.
See `docs/RUNNER.md`.

## Developer shortcuts
- `index.html?debug`: F2 opens the debug menu (warp to any map or world location, battle and
  encounter tests, movies, minigames, party levels, items).
- `?map=<mapId>&entry=<name>`, `?world=<locationId>`, `?battle=<enemy,enemy>&bg=<bg>`
- `?kpdemo`: the Kupomon Demo carried on from its own Demo file on load (the Autosave's game around it), so a page
  reloaded right after a Demo save goes straight back to where the Demo was.
- Headless tools (Node.js):
  - `node tools/validate.js` checks every map and script.
  - `node tools/sim.js battle mp,guard_hound` simulates a battle.
  - `node tools/sim.js map md1_platform` runs a map's opening script.
  - `node tools/render_model.js cloud --views field,side` renders a model preview.
  - `node tools/run_runner.js --plan c1` plays Chapter 1 with the runner at full speed (`docs/RUNNER.md`).

## Layout
- `js/core` holds the engine basics (input, audio, render, scenes, save).
- `js/gl` holds the renderer and the procedural models (characters, enemies, summons, vehicles).
- `js/field`, `js/battle`, `js/world`, `js/ui`, `js/minigames` and `js/gfx` hold the game systems.
- `js/data` holds the game data tables.
- `js/maps/<chapter>/` holds the field maps and story scripts, one folder per chapter.
- `js/runner/` holds the runner (Demo mode) and its per-chapter plans.
- The authoring docs are `docs/SCRIPTING.md`, `docs/STORY_PLAN.md`, `docs/DATA_SCHEMA.md`, `docs/MODELS.md` and `docs/RUNNER.md`.
