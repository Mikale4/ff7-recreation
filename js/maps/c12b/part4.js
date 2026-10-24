// Chapter 12b, part 4 — Disc 2/3 changes in earlier towns and the treasures the story chapters leave out.
//  * The Sleeping Man's cave (west of the Mythril Mine; world step hook — the world map has no location
//    for it): Mythril (-> the Weapon Seller's boxes, C8) or a Bolt Ring when the battle count's last two
//    digits match.
//  * Midgar revisited (Disc 2/3): the locked Sector 5 gate outside the city, its careless owner, the Key
//    to Sector 5 (dug up at Bone Village), Wall Market's vending machine (Premium Heart) and the battery
//    seller's new bargain (Sneak Glove, 129,000 gil), a moment in the church.
//  * Cosmo Canyon: the store's back corner (Full Cure, Elixir), Bugenhagen's gift to Nanaki (Limited Moon).
//  * NPCs who talk about Meteor in Costa del Sol, Gongaga, Cosmo Canyon and Lower Junon.
//  * Fallbacks, added at load time only if no other chapter already hands the item out: Tifa's piano and
//    Zangan's letter in Nibelheim (Final Heaven), the old rocket fan in Rocket Town (Venus Gospel),
//    the Key to Sector 5 at Bone Village.
// Flags: c12b_sleeper_*, c12b_gate_man, c12b_midgar_open, c12b_key5, c12b_premium_heart, c12b_sneak_glove,
// c12b_church, c12b_cosmo_stash, c12b_limited_moon, c12b_final_heaven, c12b_venus_gospel.
// (Dialogue paraphrased in our own words; see docs/SCRIPTING.md.)
(function () {
  const WM = FF7.world;
  const F = (n) => !!(FF7.state && FF7.state.flags[n]);

  // ------------------------------------------------------------------ load-time helpers
  // Does any script already loaded (other chapters' maps, patches, shared story scripts) hand out `token`?
  // (Checked before this file adds its own patches, so only other chapters count.)
  // With `mapRe`, only the maps whose id matches are searched.
  function mentioned(token, mapRe) {
    const hit = (fn) => typeof fn === 'function' && String(fn).includes(token);
    for (const id in FF7.maps) {
      const m = FF7.maps[id];
      if (/^side_(lucrecia|gelnika|forest|cave|goblin|sleeping|midgar)/.test(id) || (mapRe && !mapRe.test(id))) continue;
      if ((m.items || []).concat(m.chests || []).some(it => it.item === token || it.materia === token)) return true;
      const fns = [m.onEnter, m.onLoad].concat((m.npcs || []).map(n => n.talk), (m.triggers || []).map(t => t.run),
        (m.objects || []).map(o => o.talk), (m.exits || []).map(e => e.run));
      if (fns.some(hit)) return true;
    }
    if (mapRe) return false;
    for (const k in FF7.story) if (!/^c12b/.test(k) && hit(FF7.story[k])) return true;
    for (const loc in (WM._links || {})) if ((WM._links[loc] || []).some(l => hit(l.run))) return true;
    return false;
  }
  const ALREADY = {};
  ['final_heaven', 'venus_gospel', 'limited_moon', 'key_to_sector_5', 'premium_heart', 'sneak_glove'].forEach(t => { ALREADY[t] = mentioned(t); });
  // The field map a world location normally leads to (its unconditional link).
  function linkedMap(loc) {
    const plain = ((WM._links || {})[loc] || []).find(l => l.map && !l.if);
    return plain && FF7.maps[plain.map] ? plain : null;
  }
  // A world link that only applies while no other chapter's link for `loc` would be used.
  function fallbackLink(loc, def) {
    WM.link(loc, Object.assign({}, def, {
      c12bFallback: true,
      if: function (s) {
        if (def.when && !def.when(s)) return false;
        const list = (WM._links || {})[loc] || [];
        return !list.some(l => !l.c12bFallback && (typeof l.if !== 'function' || (function () { try { return l.if(s); } catch (e) { return false; } })()));
      },
    }));
  }
  // A free walkable tile near (x, y): not an entry, exit, NPC, object or chest tile.
  function freeTile(map, x0, y0, minDist) {
    const P = FF7.field.parseMap(map);
    const busy = new Set();
    const mark = (x, y) => busy.add(x + ',' + y);
    (map.npcs || []).forEach(n => n.at && mark(n.at[0], n.at[1]));
    (map.objects || []).concat(map.chests || [], map.items || []).forEach(o => o.at && mark(o.at[0], o.at[1]));
    Object.values(map.entries || {}).forEach(e => mark(e[0], e[1]));
    (map.exits || []).forEach(e => { const [x, y, w = 1, h = 1] = e.at; for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) mark(xx, yy); });
    const seen = new Set([x0 + ',' + y0]), q = [[x0, y0, 0]];
    while (q.length) {
      const [x, y, d] = q.shift();
      if (d >= (minDist || 2) && !busy.has(x + ',' + y) && P.walkable(x, y)) return [x, y];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || !P.walkable(nx, ny)) continue;
        seen.add(k); q.push([nx, ny, d + 1]);
      }
    }
    return null;
  }
  const entryOf = (map, name) => (map.entries || {})[name] || Object.values(map.entries || {})[0];

  // ================================================================== THE SLEEPING MAN
  const SLEEPER_TILE = [263, 187];   // hillside west of the Mythril Mine (Junon side)
  FF7.story.c12b_sleeperCave = function* (s) {
    const c = yield s.ask(null, 'A narrow cave opens in the hillside.', ['Go inside', 'Leave it']);
    if (c !== 0) return;
    yield s.goto('side_sleeping_man', 'from_world');
  };
  let sleeperArmed = true;
  WM.stepHooks = WM.stepHooks || [];
  WM.stepHooks.push(function c12bSleeper(ctx) {
    if (!ctx || ctx.x == null) return null;
    const on = ctx.x === SLEEPER_TILE[0] && ctx.y === SLEEPER_TILE[1];
    if (!on) { sleeperArmed = true; return null; }
    if (!sleeperArmed || ctx.vehicle === 'highwind' || ctx.vehicle === 'submarine' || ctx.vehicle === 'bronco') return null;
    sleeperArmed = false;
    return FF7.story.c12b_sleeperCave;
  });
  function* sleeper(s) {
    const st = FF7.state || {}, n = st.battles || 0, last2 = n % 100;
    const same = last2 >= 11 && last2 % 11 === 0;
    if (same && last2 % 2 === 1) {
      if (s.has('mythril')) { yield s.say('Sleeping Man', '...Zzz... You already... have one... Zzz...'); return; }
      yield s.say('Sleeping Man', '...Mm? Oh... what a lucky number you are...\fHere... take this... Zzz...');
      s.set('c12b_sleeper_mythril');
      yield s.give('mythril');
      return;
    }
    if (same && !s.flag('c12b_sleeper_ring')) {
      yield s.say('Sleeping Man', '...Mm...? Such a nice, even number... Here... a present... Zzz...');
      s.set('c12b_sleeper_ring');
      yield s.give('bolt_ring');
      return;
    }
    const k = (s.get('c12b_sleeper_talks') || 0) % 3;
    s.inc('c12b_sleeper_talks');
    if (k === 0) yield s.say('Sleeping Man', `...Zzz... ${n} battles... you've fought ${n} battles... Zzz...`);
    else if (k === 1) yield s.say('Sleeping Man', `...Zzz... ran away ${st.escapes || 0} times... Zzz...`);
    else yield s.say('Sleeping Man', '...Zzz... big materia... wants materia that has grown all the way... Zzz...');
  }
  FF7.defineMap('side_sleeping_man', {
    name: 'Cave', area: 'Mythril Mine region', theme: 'cave', music: 'lurking',
    grid: [
      "####################",
      "####RRRRRRRRRRRR####",
      "###RR..........RR###",
      "##RR..o.........RR##",
      "##R......b.......R##",
      "##R..............R##",
      "##RR...........jRR##",
      "###RR..........RR###",
      "#####RRR....RRR#####",
      "########....########",
    ],
    entries: { from_world: [9, 8, 'up'] },
    exits: [{ at: [8, 9, 4, 1], run: function* (s) { yield s.world({ resume: true }); } }],
    npcs: [{ id: 'sleeper', name: 'Sleeping Man', model: { base: 'man', top: '#6a5a44', bottom: '#4a4034', hair: '#5a4030', extras: ['beard'] }, at: [9, 5], dir: 'down', anim: 'lie', faceOnTalk: false, talk: sleeper }],
    onEnter: function* (s) {
      if (s.flag('c12b_sleeper_seen')) return;
      s.set('c12b_sleeper_seen');
      yield s.msg('Someone is snoring in the dark...');
    },
  });

  // ================================================================== MIDGAR, DISC 2/3
  // The Sector 5 gate outside the city walls. Only used when no other chapter claims Midgar right now.
  fallbackLink('midgar', { map: 'side_midgar_gate', entry: 'from_world', when: () => F('disc2') });
  const GATE_MAN = { base: 'man', top: '#7a6a4a', bottom: '#4a4a3a', hair: '#3a2a1a', hairStyle: 'cap', extras: ['vest'] };
  FF7.defineMap('side_midgar_gate', {
    name: 'Midgar - Sector 5 Gate', area: 'Midgar', theme: 'midgar', music: 'oppressed',
    look: { sky: ['#2a2830', '#6a6070'], fog: { color: [0.3, 0.28, 0.32], near: 10, far: 28 } },
    grid: [
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "XXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "hhhPPPhhhhhhh++hhhhhhPPPhhhh",
      "dddxddddddddd..ddddddddxdddd",
      "ddddddddddddd..ddddddddddddd",
      "dddddRddddddddddddddddddRddd",
      "dddddddddddddddddddddddddddd",
      "ddxddddddddddddddddddddddddd",
      "dddddddddddddddddddRdddddddd",
      "dddddddddddd....dddddddddddd",
      "dddddddddddd....dddddddddddd",
    ],
    entries: { from_world: [13, 9, 'up'], from_city: [13, 3, 'down'] },
    exits: [
      { at: [13, 2, 2, 1], run: function* (s) {
          if (!s.flag('c12b_midgar_open')) {
            if (!s.has('key_to_sector_5')) { yield s.msg('A heavy steel door into the Sector 5 slums. It is locked tight.'); return; }
            yield s.msg('You fit the Key to Sector 5 into the rusty lock...\nWith a groan, the gate swings open.');
            s.set('c12b_midgar_open');
          }
          s.sfx('door');
          yield s.goto('s5_town', [36, 2, 'down']);
        } },
      { at: [12, 10, 4, 1], run: function* (s) { yield s.world({ resume: true }); } },
    ],
    npcs: [
      { id: 'gateman', name: 'Man', model: GATE_MAN, at: [16, 3], dir: 'left',
        talk: function* (s) {
          s.set('c12b_gate_man');
          if (s.flag('c12b_midgar_open')) { yield s.say('Man', "You found my key? At Bone Village? ...Well, keep it. After all that, I don't think I want to go back in there anyway."); return; }
          yield s.say('Man', "This door leads into the Sector 5 slums. I'm the one who's supposed to keep the key...\fThing is, I went on one of those excavation tours at Bone Village, and somewhere in all that digging... I lost it.");
          yield s.say('Man', "If anybody ever digs up a key with a Sector 5 tag on it... that'd be mine.");
        } },
    ],
    triggers: [
      { at: [3, 2, 3, 1], on: 'talk', run: function* (s) { yield s.msg('The plate towers overhead, blotting out the sky.\nSomewhere up there, Shinra is still running the show.'); } },
    ],
  });
  // the way back out, from the Sector 5 slums
  FF7.patchMap('s5_town', {
    triggers: [{ at: [36, 0, 1, 1], on: 'talk', if: s => s.flag('c12b_midgar_open'),
      run: function* (s) {
        const c = yield s.ask(null, 'A narrow passage leads out to the Sector 5 gate.', ['Leave Midgar', 'Stay']);
        if (c === 0) yield s.goto('side_midgar_gate', 'from_city');
      } }],
  });

  // Wall Market: the old vending machine (Tifa's Premium Heart)
  if (!ALREADY.premium_heart) FF7.patchMap('wall_pharmacy', {
    triggers: [{ at: [13, 0, 3, 2], on: 'talk', if: s => s.flag('disc2'),
      run: function* (s) {
        if (s.flag('c12b_premium_heart')) { yield s.msg('The old vending machine. Its lights have finally gone out for good.'); return; }
        yield s.msg('Squeezed in beside the shelves stands a battered old vending machine.\nThe buttons are stuck... something is jammed in the slot.');
        const tifa = s.inParty('tifa'), cid = s.inParty('cid');
        if (tifa && cid) {
          yield s.say('cid', "Out of the way. I'll show this piece of junk how a real mechanic fixes things.");
          yield s.msg('Cid gives the machine a kick. Then another. Then a few more.\nNothing happens.');
          yield s.say('cid', "......Dammit! Stupid, worthless, #@&%!");
          yield s.say('tifa', "My turn.");
          s.shake(3, 16);
          s.sfx('hit');
          yield s.msg('Tifa plants one clean punch right in the middle of the panel. CLANG!');
          yield s.say('cid', "......Remind me never to get on your bad side.");
        } else if (tifa) {
          s.shake(3, 16);
          s.sfx('hit');
          yield s.say('tifa', "Hmph. Let me try.");
          yield s.msg('Tifa gives the machine a solid punch. CLANG!');
        } else {
          s.shake(2, 12);
          s.sfx('hit');
          yield s.msg('You give it a good whack. CLANG!');
        }
        yield s.msg('Something heavy clatters into the tray...');
        s.set('c12b_premium_heart');
        yield s.give('premium_heart');
        if (tifa) yield s.say('tifa', "A fighting glove? ...It fits like it was made for me.");
      } }],
  });

  // Wall Market: the battery seller's new bargain (Sneak Glove)
  let sneakAsked = false;
  if (!ALREADY.sneak_glove) FF7.patchMap('wall_weapons', {
    onLoad: function () { sneakAsked = false; },
    onEnter: function* (s) {
      if (!s.flag('disc2') || s.flag('c12b_sneak_glove') || sneakAsked) return;
      sneakAsked = true;
      yield s.say('Tinkerer', "Hey! I remember you! The battery buyers!\fListen, I've got something special. A glove so light, you could lift the wallet off a Shinra executive and he'd never feel a thing.");
      const c = yield s.ask('Tinkerer', "For you... 129,000 gil. What do you say?", ['Buy it', 'No way']);
      if (c !== 0) { yield s.say('Tinkerer', "Suit yourself. It'll be right here if you change your mind."); return; }
      if (!s.takeGil(129000)) { yield s.say('Tinkerer', "Come back when you've got the gil, friend. Quality like this doesn't come cheap."); return; }
      s.set('c12b_sneak_glove');
      yield s.give('sneak_glove');
      yield s.say('Tinkerer', "Pleasure doing business! Heh... a real pleasure.");
    },
  });

  // The church: a fleeting glimpse among the flowers
  FF7.patchMap('s5_church', {
    onEnter: function* (s) {
      if (!s.flag('disc2') || !s.flag('aeris_dead') || s.flag('c12b_church')) return;
      s.set('c12b_church');
      yield s.cam(12, 4, 60);
      yield s.wait(40);
      yield s.msg("For a heartbeat, among the flowers, you think you see a girl in pink, kneeling to tend them...\n...and then there's only sunlight on the petals.");
      yield s.say('cloud', '(......)');
      yield s.camFollow(40);
    },
  });

  // The Key to Sector 5 is dug up at Bone Village (C8's "Normal Treasure" dig). Only when no chapter
  // provides a Bone Village map at all does a digger hand it over at the world location instead.
  if (!ALREADY.key_to_sector_5 && !linkedMap('bone_village')) {
    fallbackLink('bone_village', { when: () => F('disc2') && F('has_highwind') && !F('c12b_key5'), run: function* (s) {
      if (s.has('key_to_sector_5')) return;
      s.set('c12b_key5');
      yield s.say('Digger', "Hey, you there! One of my boys turned this up in the northern pit this morning.\fGot a tag on it: \"SECTOR 5\". Some tourist must've dropped it on a dig tour. Want it? Finders keepers!");
      yield s.give('key_to_sector_5');
    } });
  }

  // ================================================================== COSMO CANYON
  // The general store's back corner (FF7: open once the Highwind flies).
  FF7.patchMap('cosmo_itemshop', {
    triggers: [{ at: [13, 1, 2, 1], on: 'talk', if: s => s.flag('has_highwind') && !s.flag('c12b_cosmo_stash'),
      run: function* (s) {
        s.set('c12b_cosmo_stash');
        yield s.msg('Squeezing behind the crates, you find a dusty little stash nobody has touched in years.');
        yield s.giveMateria('full_cure');
        yield s.give('elixir');
      } }],
  });
  // Bugenhagen's gift to Nanaki (after he has seen the Forgotten Capital, or on Disc 3)
  if (!ALREADY.limited_moon) FF7.patchMap('cosmo_observatory', {
    onEnter: function* (s) {
      if (s.flag('c12b_limited_moon') || !s.inParty('redxiii') || !(s.flag('c11a_capital_done') || s.flag('disc3'))) return;
      s.set('c12b_limited_moon');
      const red = s.leader() === 'redxiii' ? 'player' : 'red12b';
      if (red !== 'player') s.spawn('red12b', 'redxiii', 9, 13, 'up', { name: s.name('redxiii') });
      s.hide('redxiii_home');
      s.show('bugen', 7, 11, 'down');
      s.anim('bugen', 'sit');
      yield s.move(red, 7, 12);
      yield s.say('redxiii', 'Grandfather...? You look tired.');
      yield s.say('Bugenhagen', "Ho ho... Nanaki. I've been listening to the Planet for a very long time.\fLately its voice has grown so close... I think it will not be long before I go to join it.");
      yield s.say('redxiii', "Don't say that! After all of this is over, there's still so much I want to learn from you.");
      yield s.say('Bugenhagen', "You've already learned the most important thing, child. You found your father's pride... and your own.\fHere. The warriors of this canyon passed this down for generations. I've been keeping it for the day you were ready.");
      s.stopAnim('bugen');
      yield s.give('limited_moon');
      yield s.say('Bugenhagen', "Go on, now. Your friends are waiting. Protect the Planet... and each other.\fHo ho hoooo...");
      yield s.say('redxiii', '......Thank you, Grandfather.');
      if (red !== 'player') s.remove('red12b');
    },
  });

  // ================================================================== METEOR IN THE SKY (Disc 2/3 NPCs)
  const met = (s) => s.flag('meteor');
  FF7.patchMap('costa_town', {
    npcs: [{ id: 'c12b_costa_tourist', name: 'Tourist', model: 'woman6', at: [22, 6], dir: 'down', show: met,
      talk: function* (s) { yield s.say('Tourist', "Everyone's saying that red thing in the sky is going to fall on us.\fWell, if the world's ending, I'm spending my last days right here on the beach. Sun, sand, and cold drinks!"); } }],
  });
  FF7.patchMap('gongaga_village', {
    npcs: [{ id: 'c12b_gongaga_man', name: 'Villager', model: 'man9', at: [8, 13], dir: 'right', show: met,
      talk: function* (s) { yield s.say('Villager', "First the reactor blew up, and now there's a rock the size of a mountain hanging over our heads.\fSometimes I wonder if the Planet's just tired of all of us."); } }],
  });
  FF7.patchMap('cosmo_plaza', {
    npcs: [{ id: 'c12b_cosmo_stargazer', name: 'Scholar', model: 'oldman4', at: [26, 11], dir: 'up', show: met,
      talk: function* (s) {
        yield s.say('Scholar', "I've studied these skies for forty years. There was never a star like that one.\fIt isn't shining... it's burning. And every night it grows a little larger.");
        if (s.inParty('redxiii')) yield s.say('redxiii', '......The Planet is crying out. Even here, I can hear it.');
      } }],
  });
  FF7.patchMap('junon_lower', {
    npcs: [{ id: 'c12b_junon_fisher', name: 'Fisherman', model: 'man12', at: [16, 17], dir: 'down', show: met,
      talk: function* (s) { yield s.say('Fisherman', "They pulled that giant cannon off the top of Junon and hauled it off to Midgar.\fThe fish have come back a little since. Funny... it took the sky falling for the sea to get some peace."); } }],
  });

  // ================================================================== FALLBACKS FOR OTHER CHAPTERS
  // Tifa's piano (Final Heaven): after Meteor, playing the flashback melody with Tifa in the party turns
  // up Zangan's letter. C7 exposes its piano as FF7.story.c7_tifaPiano (and sets c7_piano_tune when the
  // melody is right); we wrap it. Without C7, Tifa's house (if any) gets its own piano prompt.
  const NOTES = ['Do', 'Re', 'Mi', 'Fa', 'So', 'La', 'Ti', 'Do (high)'];
  const TUNE = [0, 1, 2, 6, 5, 0, 1, 2, 4, 3, 0, 1, 0];   // Do Re Mi Ti La / Do Re Mi So Fa / Do Re Do
  const pianoEligible = (s) => s.flag('meteor') && s.inParty('tifa') && !s.flag('c12b_final_heaven');
  FF7.story.c12b_tifaPiano = function* (s) {
    const c = yield s.ask(null, "Tifa's old piano. Dust lies thick on the lid.", ['Play it', 'Leave it']);
    if (c !== 0) return;
    const played = [];
    for (let i = 0; i < 24; i++) {
      const n = yield s.ask(null, played.length ? played.map(k => NOTES[k].replace(' (high)', "'")).join(' ') : 'Play a note...', NOTES.concat(['Stop']), { pos: 'top' });
      if (n === NOTES.length || n == null) break;
      s.sfx('piano' + (n + 1));
      played.push(n);
    }
    const ok = played.length >= TUNE.length && played.slice(-TUNE.length).every((v, i) => v === TUNE[i]);
    if (!ok) { if (played.length) yield s.say('tifa', "Ha ha... that takes me back. Not quite the right tune, though."); return; }
    yield* FF7.story.c12b_zanganLetter(s);
  };
  FF7.story.c12b_zanganLetter = function* (s) {
    s.set('c12b_final_heaven');
    yield s.say('tifa', "That melody... Wait. There's something else in there. Paper?");
    yield s.msg('Tucked between the strings is a letter, folded many times. It is addressed to Tifa.');
    yield s.say('Zangan', "\"Tifa. I still can't say whether that night was real. The village in flames... I pulled out whoever I could, then climbed to the reactor to find Sephiroth.\f\"He was gone. You were lying there instead. Getting you out mattered more to me than any revenge.\f\"Shinra's soldiers were arriving as I left, a scientist named Hojo giving the orders to round up the survivors for some experiment. I would not let them have my best student.\f\"I carried you down the mountain and all the way to Midgar to find a doctor, though I hate that city. I can't stay anywhere for long... but I hope you've healed, and that you're well.\"", { pos: 'middle' });
    yield s.say('tifa', "Master Zangan... So that's how I ended up in Midgar.\fHe left something else, too. His final technique.");
    yield s.give('final_heaven');
  };
  if (!ALREADY.final_heaven) {
    const c7Piano = FF7.story.c7_tifaPiano;
    if (typeof c7Piano === 'function') {
      FF7.story.c7_tifaPiano = function* (s) {
        const eligible = pianoEligible(s), had = s.flag('c7_piano_tune');
        if (eligible) s.unset('c7_piano_tune');
        yield* c7Piano(s);
        const ok = s.flag('c7_piano_tune');
        if (had) s.set('c7_piano_tune');
        if (eligible && ok) yield* FF7.story.c12b_zanganLetter(s);
      };
    } else {
      const house = Object.keys(FF7.maps).find(id => /^nibel_/.test(id) && /tifa/i.test(id + ' ' + (FF7.maps[id].name || '')));
      if (house) FF7.patchMap(house, {
        onEnter: function* (s) { if (pianoEligible(s)) yield* FF7.story.c12b_tifaPiano(s); },
      });
    }
  }

  // Shinra Mansion: once Cloud knows the truth, the basement library shows him the night he and Zack
  // broke out (FF7's hidden scene).
  FF7.patchMap('mansion_basement', {
    triggers: [{ id: 'c12b_memory', at: [22, 8, 2, 2], if: s => s.flag('cloud_returned') && s.flag('c7_seph_library'),
      run: function* (s) {
        yield s.say('cloud', "(This place... I've been down here before. Not with Sephiroth... after.)");
        yield s.fadeOut(40);
        yield s.caption('Five years ago. The basement of the Shinra Mansion.', { hold: 140, bg: '#000' });
        yield s.caption('Two glass tanks glow with Mako. In one of them, a young man in a SOLDIER uniform opens his eyes.', { hold: 170, bg: '#000' });
        yield s.caption('The glass shatters. Zack drops to the floor, soaked and shaking...\nand when the guard comes running, Zack is faster.', { hold: 180, bg: '#000' });
        yield s.say('Zack', "Cloud! Hey, Cloud... C'mon, wake up. We're getting out of here.", { pos: 'middle' });
        yield s.caption('He hauls the other prisoner out of his tank. Cloud can barely lift his head, his eyes glowing and empty.', { hold: 180, bg: '#000' });
        yield s.say('Zack', "Hang in there, buddy. Next stop... Midgar.", { pos: 'middle' });
        yield s.caption('Carrying his friend on his back, Zack slips out into the night.', { hold: 150, bg: '#000' });
        // (Config > Playable Flashbacks: Zack's last stand, played - js/maps/extra/flashbacks.js)
        if (FF7.story.zk_playable && FF7.story.zk_playable() && !s.flag('zk_done')) { yield* FF7.story.zk_start(s); return; }
        yield s.fadeIn(40);
        yield s.say('cloud', "(Zack... You carried me the whole way. And I never even said thank you.)");
      } }],
  });

  // Treasures in Rocket Town and at Da-chao (C7's towns) if nobody placed them: Fourth Bracelet in the
  // weapon shop's back room and a Guard Source in the item shop's (once the Highwind flies); Oritsuru and
  // Steal as Well behind the Da-chao flames (with the Leviathan Scales).
  function treasureFallback(token, re, def) {
    if (mentioned(token, re)) return;
    const id = Object.keys(FF7.maps).find(k => re.test(k));
    if (!id) return;
    const map = FF7.maps[id], e = Object.values(map.entries || {})[0];
    const spot = e && freeTile(map, e[0], e[1], 3);
    if (spot) FF7.patchMap(id, { items: [Object.assign({ at: spot }, def)] });
  }
  treasureFallback('fourth_bracelet', /^rocket_.*weapon/, { item: 'fourth_bracelet', id: 'c12b_rocket_bracelet', if: s => s.flag('has_highwind') });
  treasureFallback('guard_source', /^rocket_.*item/, { item: 'guard_source', id: 'c12b_rocket_guard_source', if: s => s.flag('has_highwind') });
  treasureFallback('oritsuru', /^(wutai|dachao|da_chao)_?.*(dachao|da_chao|fire|cave)/, { item: 'oritsuru', id: 'c12b_dachao_oritsuru', if: s => s.has('leviathan_scales') });
  treasureFallback('steal_as_well', /^(wutai|dachao|da_chao)_?.*(dachao|da_chao|fire|cave)/, { materia: 'steal_as_well', id: 'c12b_dachao_steal', if: s => s.has('leviathan_scales') });

  // The old man who watched the rocket every day (Venus Gospel): after Shinra No. 26 has flown, talk to
  // him a few times. C7 exposes him as FF7.story.c7_rocketOldman; we wrap it. Without C7's hook, an old
  // man is added near Rocket Town's entrance instead.
  const rocketGone = (s) => s.flag('huge_materia_rocket') || s.flag('huge_materia_done');
  FF7.story.c12b_rocketFan = function* (s) {
    if (s.flag('c12b_venus_gospel')) { yield s.say('Old Man', "Every night I look up and think of her, sailing out there among the stars. Take good care of that spear."); return; }
    const n = s.inc('c12b_rocket_fan');
    if (n === 1) { yield s.say('Old Man', "I used to sit here every day, just looking at that rocket. Now there's nothing but sky.\f...Aah, but what a sight she was, going up!"); return; }
    if (n === 2) { yield s.say('Old Man', "You were up there with her, weren't you? I could tell the moment I saw you. Heh heh..."); return; }
    yield s.say('Old Man', "I've got something I've been saving. A spear, from back when I was young and foolish enough to dream of flying.\fI've no use for it now. You fly with it... for me.");
    s.set('c12b_venus_gospel');
    yield s.give('venus_gospel');
    if (s.inParty('cid')) yield s.say('cid', "...Heh. Thanks, old-timer. I'll make it sing.");
  };
  if (!ALREADY.venus_gospel) {
    const c7Old = FF7.story.c7_rocketOldman;
    if (typeof c7Old === 'function') {
      FF7.story.c7_rocketOldman = function* (s) {
        if (rocketGone(s)) { yield* FF7.story.c12b_rocketFan(s); return; }
        yield* c7Old(s);
      };
    } else {
      const rt = linkedMap('rocket_town');
      const map = rt && FF7.maps[rt.map], e = map && entryOf(map, rt.entry);
      const spot = e && freeTile(map, e[0], e[1], 3);
      if (spot) FF7.patchMap(rt.map, {
        npcs: [{ id: 'c12b_rocket_fan', name: 'Old Man', model: 'oldman2', at: spot, dir: 'up', show: rocketGone,
          talk: function* (s) { yield* FF7.story.c12b_rocketFan(s); } }],
      });
    }
  }
})();
