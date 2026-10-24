// Generator-based coroutines used by field event scripts and battle animations.
//
// A coroutine body is a generator function. It may `yield`:
//   - nothing / undefined : wait one frame
//   - a number N          : wait N frames
//   - a "waitable" object : any object with a boolean `done` property; the coroutine resumes
//                           when it becomes true and receives `obj.result` as the yield value.
//                           If the object has an `update()` method it is called each frame
//                           (for waitables not owned by a UI layer).
//   - a generator         : run it as a sub-coroutine, resume with its return value
//   - an array of the above: wait until all are done (parallel)
// Use `yield* other()` to inline a sub-generator.
(function () {
  class Coroutine {
    constructor(gen, opts = {}) {
      this.stack = [gen];
      this.wait = null;
      this.waitFrames = 0;
      this.done = false;
      this.result = undefined;
      this.onError = opts.onError;
      this.name = opts.name || '';
    }
    // Returns true while running.
    update() {
      if (this.done) return false;
      let sendVal;
      // resolve current wait
      if (this.waitFrames > 0) { this.waitFrames--; if (this.waitFrames > 0) return true; }
      if (this.wait) {
        if (!Coroutine.isDone(this.wait)) { Coroutine.tick(this.wait); if (!Coroutine.isDone(this.wait)) return true; }
        sendVal = Coroutine.resultOf(this.wait);
        this.wait = null;
      }
      // advance
      let guard = 0;
      while (this.stack.length && guard++ < 1000) {
        const top = this.stack[this.stack.length - 1];
        let r;
        try { r = top.next(sendVal); }
        catch (err) {
          console.error('Coroutine error', this.name, err);
          if (this.onError) this.onError(err);
          this.done = true; return false;
        }
        sendVal = undefined;
        if (r.done) {
          this.stack.pop();
          sendVal = r.value;
          if (!this.stack.length) { this.done = true; this.result = r.value; return false; }
          continue;
        }
        const v = r.value;
        if (v === undefined || v === null) { return true; }
        if (typeof v === 'number') { this.waitFrames = Math.max(0, Math.floor(v)); if (this.waitFrames > 0) return true; continue; }
        if (Coroutine.isGen(v)) { this.stack.push(v); continue; }
        // waitable or array (array items may be numbers, generators, null: normalise them)
        const w = Array.isArray(v) ? v.map(Coroutine.norm) : v;
        if (Coroutine.isDone(w)) { sendVal = Coroutine.resultOf(w); continue; }
        this.wait = w;
        Coroutine.tick(w);
        if (Coroutine.isDone(w)) { sendVal = Coroutine.resultOf(w); this.wait = null; continue; }
        return true;
      }
      return !this.done;
    }
    static norm(x) {
      if (x === undefined || x === null) return { done: true };
      if (typeof x === 'number') return x > 0 ? FF7.waitFrames(Math.floor(x)) : { done: true, result: x };
      if (Array.isArray(x)) return x.map(Coroutine.norm);
      if (Coroutine.isGen(x)) return new Coroutine(x);
      return x;
    }
    static isGen(v) { return v && typeof v.next === 'function' && typeof v.throw === 'function'; }
    static isDone(w) {
      if (Array.isArray(w)) return w.every(Coroutine.isDone);
      if (w instanceof Coroutine) return w.done;
      return !!w.done;
    }
    static tick(w) {
      if (Array.isArray(w)) { w.forEach(x => { if (!Coroutine.isDone(x)) Coroutine.tick(x); }); return; }
      if (w instanceof Coroutine) { w.update(); return; }
      if (typeof w.update === 'function' && !w._owned) w.update();
    }
    static resultOf(w) {
      if (Array.isArray(w)) return w.map(Coroutine.resultOf);
      return w.result;
    }
  }
  // Run a generator in parallel (returns a waitable Coroutine that needs update() each frame —
  // when yielded it is ticked by the parent automatically).
  FF7.Coroutine = Coroutine;
  FF7.co = (genFn, ...args) => new Coroutine(genFn(...args));

  // A simple waitable that completes after a condition function returns true.
  FF7.waitUntil = (fn) => ({ done: false, update() { if (fn()) this.done = true; } });
  // A timer waitable (frames).
  FF7.waitFrames = (n) => ({ done: n <= 0, t: n, update() { if (--this.t <= 0) this.done = true; } });
})();
