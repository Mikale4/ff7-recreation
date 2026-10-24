// Game Over: "GAME OVER" over the dark Lifestream, music "Continue", then back to the title.
(function () {
  const R = FF7.render, I = FF7.input, U = FF7.util;
  class GameOver {
    constructor() { this.t = 0; this.noClock = true; this.leaving = false; }
    enter() { FF7.state.timer = null; FF7.audio.play('continue', { loop: false }); }
    update(canInput) {
      this.t++;
      if (this.leaving || this.t < 120 || !canInput) return;
      if (I.pressed('ok') || I.pressed('start') || I.pressed('cancel') || this.t > 60 * 60) {
        this.leaving = true;
        const S = FF7.sceneMgr;
        S.run((function* () { yield S.fadeOut(60); S.set(new FF7.scenes.Title()); yield S.fadeIn(30); })());
      }
    }
    render() {
      const c = R.ctx;
      c.fillStyle = '#000'; c.fillRect(0, 0, FF7.W, FF7.H);
      // slow rising green motes (the Lifestream)
      for (let i = 0; i < 90; i++) {
        const x = U.hash(i, 1) * FF7.W + Math.sin(this.t * 0.01 + i) * 12;
        const y = (FF7.H - ((this.t * (0.3 + U.hash(i, 2) * 0.6) + U.hash(i, 3) * FF7.H) % (FF7.H + 20)));
        c.fillStyle = `rgba(90,255,170,${0.08 + 0.2 * U.hash(i, 4)})`;
        c.beginPath(); c.arc(x, y, 1 + U.hash(i, 5) * 2.5, 0, Math.PI * 2); c.fill();
      }
      const a = Math.min(1, this.t / 120);
      c.save(); c.globalAlpha = a;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `600 40px "Times New Roman", Georgia, serif`;
      c.fillStyle = '#e8e8f0'; c.shadowColor = 'rgba(80,255,170,0.5)'; c.shadowBlur = 14;
      c.fillText('GAME OVER', FF7.W / 2, FF7.H / 2 - 10);
      c.restore();
    }
  }
  FF7.scenes.GameOver = GameOver;
  FF7.scenes.gameOver = function () {
    const S = FF7.sceneMgr;
    if (S.top() instanceof GameOver || FF7._gameOverPending) return;
    FF7._gameOverPending = true;
    S.run((function* () { yield S.fadeOut(40); FF7._gameOverPending = false; S.set(new GameOver()); yield S.fadeIn(40); })());
  };
})();
