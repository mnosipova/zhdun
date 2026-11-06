/* Ждун в Суздале — логика игры. денег нет, но вы держитесь */
(function () {
  "use strict";

  var ROUNDS = 10;
  var SLIDER_MIN = 1000;
  var SLIDER_MAX = 25000;

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    lots: [],
    idx: 0,
    score: 0,
    results: [] // { guess, real, rel, points }
  };

  // ===== утилиты =====
  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0₽";
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    $(id).classList.add("active");
    window.scrollTo(0, 0);
  }

  // ===== балльная система: чем ближе к реальной цене, тем больше баллов =====
  // rel — относительное отклонение твоей цены от реальной (по модулю)
  function pointsFor(rel) {
    var a = Math.abs(rel);
    if (a <= 0.05) return 100; // в яблочко, аффтар жжот
    if (a <= 0.10) return 80;
    if (a <= 0.20) return 60;
    if (a <= 0.35) return 40;
    if (a <= 0.60) return 20;
    return 0; // это фиаско, братан
  }

  var ROUND_MEMES = {
    100: ["аффтар жжот! пробил цену в ноль!", "аффтар, пеши исчо! кек."],
    80:  ["Ну-няка, почти в точку, ня.шки!", "Афтор жжот, но не до конца, лал."],
    60:  ["Ололо, норм! но Ждун бы точнее.", "как-то так... но можно точнее, тыц-тыц."],
    40:  ["Троллейбус ушёл не туда. но живой.", "жиза: угадал настроение, не цену."],
    20:  ["сорян, но это далеко от кассы.", "всё сложно, братан. очень сложно."],
    0:   ["это фиаско, братан 🤷", "Верните мой 2007! щас бы прокатило."]
  };

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ===== старт игры =====
  function startGame() {
    var pool = (window.LISTINGS || []).slice();
    shuffle(pool);
    state.lots = pool.slice(0, ROUNDS);
    state.idx = 0;
    state.score = 0;
    state.results = [];
    showRound();
    show("screen-round");
  }

  function showRound() {
    var lot = state.lots[state.idx];
    $("round-num").textContent = state.idx + 1;
    $("score-now").textContent = state.score;
    $("progress-fill").style.width = (state.idx / ROUNDS * 100) + "%";

    // галерея
    var g = $("gallery");
    g.innerHTML = "";
    lot.imgs.forEach(function (src, i) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Фото лота " + (i + 1);
      img.loading = i === 0 ? "eager" : "lazy";
      img.decoding = "async";
      g.appendChild(img);
    });
    var dots = $("gallery-dots");
    dots.innerHTML = "";
    lot.imgs.forEach(function () {
      var d = document.createElement("div");
      d.className = "dot";
      dots.appendChild(d);
    });
    var imgs = g.querySelectorAll("img");
    function updateDots() {
      var active = Math.round(g.scrollLeft / g.clientWidth);
      dots.querySelectorAll(".dot").forEach(function (d, i) {
        d.classList.toggle("on", i === Math.min(active, imgs.length - 1));
      });
    }
    g.onscroll = updateDots;
    updateDots();

    $("lot-title").textContent = lot.t;
    $("lot-address").textContent = "📍 " + (lot.a || "Суздаль");

    // сброс блока угадывания
    var slider = $("price-slider");
    slider.min = SLIDER_MIN;
    slider.max = SLIDER_MAX;
    slider.value = Math.round((SLIDER_MIN + SLIDER_MAX) / 2 / 100) * 100;
    $("guess-value").textContent = fmt(slider.value);
    $("guess-block").classList.remove("hidden");
    $("reveal-block").classList.add("hidden");
  }

  // ===== бегунок =====
  $("price-slider").addEventListener("input", function () {
    $("guess-value").textContent = fmt(this.value);
  });

  // ===== оценка =====
  $("btn-submit").addEventListener("click", function () {
    var lot = state.lots[state.idx];
    var guess = Number($("price-slider").value);
    var real = lot.p;
    var rel = (guess - real) / real;
    var pts = pointsFor(rel);

    state.score += pts;
    state.results.push({ guess: guess, real: real, rel: rel, points: pts, link: lot.u });

    $("score-now").textContent = state.score;
    $("progress-fill").style.width = ((state.idx + 1) / ROUNDS * 100) + "%";

    $("round-meme").textContent = pick(ROUND_MEMES[pts]);
    $("my-price").textContent = fmt(guess);
    $("real-price").textContent = fmt(real);

    var diff = guess - real;
    var abs = Math.abs(diff);
    var pct = Math.round(Math.abs(rel) * 100);
    if (abs < 50) {
      $("round-diff").textContent = "В яблочко! разница меньше 50 ₽. кек.";
    } else if (diff > 0) {
      $("round-diff").textContent = "Перелёт на " + fmt(abs) + " (+" + pct + "%) — олигарх, детка.";
    } else {
      $("round-diff").textContent = "Недолёт на " + fmt(abs) + " (−" + pct + "%) — Ждун одобряет, но нет.";
    }
    $("round-points").textContent = "+" + pts + " баллов";
    $("lot-link").href = lot.link;

    $("guess-block").classList.add("hidden");
    $("reveal-block").classList.remove("hidden");
  });

  // ===== следующий лот / итоги =====
  $("btn-next").addEventListener("click", function () {
    state.idx++;
    if (state.idx < ROUNDS) {
      showRound();
    } else {
      showResult();
    }
  });

  // ===== итоговый экран =====
  var VERDICTS = {
    cheap: {
      title: "Верните цены 2007-го",
      meme: "Твои цены стабильно ниже реальных, как будто ты только что вылез из диалапа и открываешь «Авито.ру». денег нет, но вы держитесь — Ждун плачет от ваших цен. кек."
    },
    normal: {
      title: "Сын маминой подруги",
      meme: "Цены совпадали, как правило, с тем, что говорит игрок. Идеально ровно, скучно идеально. Мама гордится, соседи завидуют, Ждун аплодирует. ня!"
    },
    rich: {
      title: "Олигарх из 2007-го",
      meme: "Ты всё время называл(а) цены выше реальных — прям как в 2007-м, когда «превед, медвед» писали с Nokia 3310 и не жалели денег. Суздаль такого не потянет, олигарх. Ололо."
    }
  };

  function showResult() {
    var res = state.results;
    var total = state.score;
    var avgRel = res.reduce(function (s, r) { return s + r.rel; }, 0) / res.length;
    var avgErr = res.reduce(function (s, r) { return s + Math.abs(r.rel); }, 0) / res.length;
    var pctErr = Math.round(avgErr * 100);

    var verdict;
    if (avgRel < -0.10) verdict = VERDICTS.cheap;
    else if (avgRel > 0.10) verdict = VERDICTS.rich;
    else verdict = VERDICTS.normal;

    $("result-title").textContent = verdict.title;
    $("result-meme").textContent = verdict.meme;
    $("result-score").textContent = total + " / " + (ROUNDS * 100);
    $("result-err").textContent = "~" + pctErr + "%";
    $("result-bias").textContent = (avgRel >= 0 ? "+" : "−") + Math.round(Math.abs(avgRel) * 100) + "%";

    var details = $("result-details");
    details.innerHTML = "";
    res.forEach(function (r, i) {
      var row = document.createElement("div");
      row.className = "rd-row";
      var l = document.createElement("span");
      l.textContent = "Лот " + (i + 1) + ": " + fmt(r.guess);
      var rr = document.createElement("span");
      rr.textContent = "реал " + fmt(r.real) + " → " + r.points;
      row.appendChild(l);
      row.appendChild(rr);
      details.appendChild(row);
    });

    show("screen-result");
  }

  // ===== кнопки =====
  $("btn-start").addEventListener("click", startGame);
  $("btn-restart").addEventListener("click", startGame);
})();
