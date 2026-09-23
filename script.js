(function () {
  var stack = document.querySelector(".scene-frames");
  if (!stack) return;

  var frames = Array.prototype.slice.call(stack.querySelectorAll("img"));
  var toggle = document.querySelector(".scene-toggle");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Per-frame hold in ms. The leap (02-05) runs at ~7 fps; the pool and the catch hold longer.
  var holds = [700, 140, 140, 140, 160, 450, 450, 700];
  var stillFrame = 4;
  var current = stillFrame;
  var timer = null;
  var playing = false;

  function show(index) {
    frames[current].classList.remove("is-active");
    frames[index].classList.add("is-active");
    current = index;
  }

  function tick() {
    var next = (current + 1) % frames.length;
    stack.classList.toggle("is-looping", next === 0);
    show(next);
    timer = window.setTimeout(tick, holds[next]);
  }

  function play() {
    if (playing) return;
    playing = true;
    toggle.textContent = "Pause";
    timer = window.setTimeout(tick, holds[current]);
  }

  function pause() {
    playing = false;
    window.clearTimeout(timer);
    stack.classList.remove("is-looping");
    toggle.textContent = "Play";
  }

  function applyMotionPreference() {
    if (reduceMotion.matches) {
      pause();
      show(stillFrame);
      toggle.hidden = true;
    } else {
      toggle.hidden = false;
      show(0);
      play();
    }
  }

  toggle.addEventListener("click", function () {
    if (playing) pause();
    else play();
  });

  var loads = frames.map(function (img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function (resolve) {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  });

  Promise.all(loads).then(function () {
    applyMotionPreference();
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", applyMotionPreference);
    }
  });
})();
