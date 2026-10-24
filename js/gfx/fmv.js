// Original FMV playback: the story's movie ids that have an original video file play it (320x224,
// drawn at 2x on the 640x480 screen); everything else falls back to the real-time cinematics in
// js/gfx/cinema.js. Wraps FF7.cinema.play.
(function () {
  const R = FF7.render, I = FF7.input;
  const DIR = 'assets/movies/';
  // movie id -> file (from references/cutscenes, converted to H.264/AAC)
  FF7.FMV = {
    opening: 'opening.mp4',
    reactor1_blast: 'reactor1_blast.mp4',
    midgar_train: 'midgar_train.mp4',
    shinra_motors_ad: 'shinra_motors_ad.mp4',
    shinra_escape: 'shinra_escape.mp4',
    seto: 'seto.mp4',
    gold_saucer: 'gold_saucer.mp4',
    nibel_fire: 'nibel_fire.mp4',
    aeris_death: 'aeris_death.mp4',
  };

  class FmvScene {
    constructor(id, video, opts, w) {
      this.id = id; this.video = video; this.opts = opts; this.w = w;
      this.t = 0; this.noClock = false; this.isMovie = true; this.ending = false;
      // Start (Tab) asks "Skip this cutscene?" (FF7.qol.MovieSkip): the video holds while it is asked
      this.skip = FF7.qol && FF7.qol.MovieSkip ? new FF7.qol.MovieSkip((on, skipping) => {
        if (on) video.pause(); else if (!skipping) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
      }) : null;
    }
    enter() {
      this.prevMusic = FF7.audio.currentId || null;
      FF7.audio.stop(10);
      const v = this.video;
      v.volume = Math.max(0, Math.min(1, FF7.state && FF7.state.config ? (FF7.state.config.musicVol != null ? FF7.state.config.musicVol : 1) : 1));
      const p = v.play && v.play();
      if (p && p.catch) p.catch(() => this.finish());
      // scripts usually fade to black before a movie; the fader is drawn over every scene, so lift it
      // here or the movie plays unseen (black screen, sound only)
      const S = FF7.sceneMgr;
      if (S.fader && S.fader.alpha > 0) S.run((function* () { yield S.fadeIn(12); })());
    }
    finish() {
      if (this.ending) return;
      this.ending = true;
      const S = FF7.sceneMgr, self = this;
      S.run((function* () {
        yield S.fadeOut(12);
        try { self.video.pause(); self.video.removeAttribute('src'); self.video.load(); } catch (e) {}
        if (S.top() === self) S.pop();
        // give the music back unless the story changes it right away
        if (self.prevMusic && !FF7.audio.currentId && self.opts.resumeMusic !== false) FF7.audio.play(self.prevMusic);
        yield S.fadeIn(12);
        self.w.done = true;
      })());
    }
    update(canInput) {
      const v = this.video;
      if (this.ending) return;
      // FF7's movies can't be skipped; here Start asks to (after a moment), as a convenience
      if (this.skip) {
        const k = this.skip.update(canInput, this.t > 45);
        if (k === 'skip') { this.finish(); return; }
        if (k === 'hold') return;
      } else if (canInput && this.t > 45 && I.pressed('start')) { this.finish(); return; }
      this.t++;
      if (v.ended || v.error || (v.duration && v.currentTime >= v.duration - 0.05)) { this.finish(); return; }
      // stall guard: nothing decoded after 6 s -> give up
      if (this.t > 360 && v.currentTime === 0) this.finish();
    }
    render() {
      const c = R.ctx;
      c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H);
      const v = this.video;
      if (v.readyState >= 2) {
        const vw = v.videoWidth || 320, vh = v.videoHeight || 224;
        const k = Math.min(FF7.W / vw, FF7.H / vh);
        const w = Math.round(vw * k), h = Math.round(vh * k);
        c.save(); c.imageSmoothingEnabled = true;
        c.drawImage(v, Math.round((FF7.W - w) / 2), Math.round((FF7.H - h) / 2), w, h);
        c.restore();
      }
      // the original FMVs have no text: the story's `text` is only for the fallback cinematics
      if (this.skip && !this.ending) this.skip.draw();
    }
  }

  function canPlayVideo() {
    try {
      const v = document.createElement('video');
      return !!(v && typeof v.canPlayType === 'function' && v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'));
    } catch (e) { return false; }
  }

  function playVideo(id, opts) {
    const w = { done: false, result: null };
    const v = document.createElement('video');
    v.preload = 'auto'; v.playsInline = true; v.muted = false;
    v.src = DIR + FF7.FMV[id];
    const scene = new FmvScene(id, v, opts, w);
    FF7.sceneMgr.push(scene);
    return w;
  }

  const base = FF7.cinema && FF7.cinema.play ? FF7.cinema.play.bind(FF7.cinema) : null;
  FF7.cinema = FF7.cinema || {};
  FF7.cinema.play = function (id, opts = {}) {
    // (a copy without the movie files, the public web one: the real-time cinematic instead; FF7.mediaHas, js/core/audio.js)
    const useFmv = FF7.FMV[id] && !(FF7.state && FF7.state.config && FF7.state.config.fmv === false) && canPlayVideo() && FF7.mediaHas('movies', DIR + FF7.FMV[id]);
    if (useFmv) return playVideo(id, opts);
    if (base) return base(id, opts);
    return { done: true, result: null };
  };
  FF7.cinema.hasFmv = (id) => !!FF7.FMV[id] && FF7.mediaHas('movies', DIR + FF7.FMV[id]);
})();
