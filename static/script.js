const API = location.protocol === "file:" ? "http://127.0.0.1:8000" : "";
const $ = (id) => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Loan grade buttons A-G
$("grades").innerHTML = "ABCDEFG".split("").map((g, i) =>
  `<input type="radio" name="loan_grade" id="g_${g}" value="${g}"${i === 2 ? " checked" : ""}><label for="g_${g}">${g}</label>`).join("");

// loan_percent_income = loan amount / income (2 decimals, like the training data)
function updatePct() {
  const inc = +$("person_income").value, amt = +$("loan_amnt").value;
  $("loan_percent_income").value = inc > 0 && amt > 0 ? (amt / inc).toFixed(2) : "";
}
["person_income", "loan_amnt"].forEach((id) => $(id).addEventListener("input", updatePct));

const SAMPLES = {
  low:  { person_age: 30, person_income: 50000, person_home_ownership: "RENT", person_emp_length: 4, cb_person_cred_hist_length: 5, cb_person_default_on_file: "N", loan_intent: "PERSONAL", loan_amnt: 10000, loan_int_rate: 12.5, loan_grade: "C" },
  high: { person_age: 30, person_income: 20000, person_home_ownership: "RENT", person_emp_length: 4, cb_person_cred_hist_length: 5, cb_person_default_on_file: "Y", loan_intent: "PERSONAL", loan_amnt: 15000, loan_int_rate: 20, loan_grade: "F" },
};
document.querySelectorAll("[data-sample]").forEach((b) => b.addEventListener("click", () => {
  const s = SAMPLES[b.dataset.sample];
  for (const [k, v] of Object.entries(s)) {
    if (k === "loan_grade" || k === "cb_person_default_on_file") document.querySelector(`input[name=${k}][value=${v}]`).checked = true;
    else $(k).value = v;
  }
  updatePct(); showMsg("");
}));

function showMsg(t) { const m = $("msg"); m.textContent = t; m.hidden = !t; }

// Colour grade: teal (safe) -> amber -> red (risky)
const STOPS = [[0, [31, 181, 163]], [0.5, [242, 177, 52]], [1, [229, 72, 77]]];
function grade(p) {
  const i = p < 0.5 ? 0 : 1, [a, ca] = STOPS[i], [b, cb] = STOPS[i + 1], t = (p - a) / (b - a);
  return `rgb(${ca.map((c, k) => Math.round(c + (cb[k] - c) * t)).join(",")})`;
}

function countUp(el, to) {
  if (reduce) { el.textContent = to.toFixed(1); return; }
  const t0 = performance.now(), dur = 1400;
  (function step(now) {
    const k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = (to * e).toFixed(1);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

function render(d) {
  const p = d.default_probability, th = d.threshold, color = grade(p), high = d.default_prediction === 1;
  document.documentElement.style.setProperty("--accent", color);
  // threshold tick on the dial
  const a = Math.PI * (1 - th), cx = 120, cy = 120, tk = $("tick");
  tk.setAttribute("x1", cx + 88 * Math.cos(a)); tk.setAttribute("y1", cy - 88 * Math.sin(a));
  tk.setAttribute("x2", cx + 112 * Math.cos(a)); tk.setAttribute("y2", cy - 112 * Math.sin(a));
  tk.setAttribute("opacity", 1);
  $("arc").style.strokeDasharray = `${p * 100} 100`;
  $("needle").style.transform = `rotate(${p * 180 - 90}deg)`;
  countUp($("pct"), p * 100);
  const v = $("verdict");
  v.textContent = high ? "High risk" : "Low risk";
  v.classList.remove("pop"); void v.offsetWidth; v.classList.add("pop");
  $("note").textContent = `Estimated chance of default is ${(p * 100).toFixed(1)}%. Applications at or above ${(th * 100).toFixed(1)}% (the tick on the dial) are marked high risk.`;
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault(); showMsg("");
  const f = e.target;
  if (!f.checkValidity()) { f.reportValidity(); return; }
  if (+$("person_emp_length").value > +$("person_age").value) { showMsg("Years employed can't be higher than age."); return; }
  const radio = (n) => document.querySelector(`input[name=${n}]:checked`).value;
  const body = {
    person_age: parseInt($("person_age").value, 10),
    person_income: +$("person_income").value,
    person_home_ownership: $("person_home_ownership").value,
    person_emp_length: +$("person_emp_length").value,
    loan_intent: $("loan_intent").value,
    loan_grade: radio("loan_grade"),
    loan_amnt: +$("loan_amnt").value,
    loan_int_rate: +$("loan_int_rate").value,
    loan_percent_income: +$("loan_percent_income").value,
    cb_person_default_on_file: radio("cb_person_default_on_file"),
    cb_person_cred_hist_length: parseInt($("cb_person_cred_hist_length").value, 10),
  };
  const btn = $("go"); btn.classList.add("loading");
  try {
    const r = await fetch(`${API}/predict`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 422) {
      const j = await r.json();
      showMsg("Check these fields: " + j.detail.map((x) => `${x.loc[x.loc.length - 1]} (${x.msg})`).join("; "));
    } else if (!r.ok) showMsg(`The server returned an error (${r.status}). Check the terminal running uvicorn.`);
    else render(await r.json());
  } catch {
    showMsg("Can't reach the API. Start it with: uvicorn main:app --reload");
  } finally { btn.classList.remove("loading"); }
});
