(() => {
  "use strict";

  const data = window.CVSI_WORKFLOW_AUTH_PRETEST;
  const $ = (selector) => document.querySelector(selector);
  const intro = $("#intro");
  const survey = $("#survey");
  const finish = $("#finish");
  const form = $("#question-form");
  const participantInput = $("#participant-code");
  let seed = null;
  let screens = [];
  let index = 0;
  let startedAt = null;
  let finishedAt = null;
  let timerHandle = null;
  const answers = {};

  function randomGenerator(initialSeed) {
    let state = initialSeed || 1;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function shuffled(values, random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function buildScreens() {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    seed = values[0] || 1;
    const random = randomGenerator(seed);
    const roleQuota = shuffled(["N", "N", "W", "W", "W", "I", "I", "I"], random);
    const selected = [];
    ["A", "B", "C", "D"].forEach((family, familyIndex) => {
      const usedTasks = new Set();
      roleQuota.slice(familyIndex * 2, familyIndex * 2 + 2).forEach((role) => {
        const candidates = shuffled(
          data.scenes.filter((scene) => scene.family === family && scene.intended_role === role && !usedTasks.has(scene.task_id)),
          random,
        );
        const scene = candidates[0];
        usedTasks.add(scene.task_id);
        selected.push(scene);
      });
    });
    screens = shuffled(selected, random).map((scene, screenIndex) => ({ ...scene, screen_id: `S${String(screenIndex + 1).padStart(2, "0")}` }));
  }

  function elapsedSeconds() {
    if (!startedAt) return 0;
    return Math.max(0, Math.round(((finishedAt || new Date()) - startedAt) / 1000));
  }

  function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function screenAnswers() {
    const screen = screens[index];
    answers[screen.screen_id] ||= {};
    return answers[screen.screen_id];
  }

  function addChoice(groupName, value, labelText) {
    const label = document.createElement("label");
    label.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = groupName;
    input.value = value;
    input.checked = screenAnswers()[groupName] === value;
    input.addEventListener("change", () => {
      screenAnswers()[groupName] = value;
      $("#missing-hint").classList.remove("visible");
    });
    const span = document.createElement("span");
    span.textContent = labelText;
    label.append(input, span);
    return label;
  }

  function addScaleQuestion(groupName, text, leftAnchor, rightAnchor) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = text;
    const choices = document.createElement("div");
    choices.className = "scale";
    [1, 2, 3, 4, 5].forEach((value) => choices.append(addChoice(groupName, String(value), String(value))));
    const anchors = document.createElement("div");
    anchors.className = "anchors";
    anchors.innerHTML = `<span>1 · ${leftAnchor}</span><span>5 · ${rightAnchor}</span>`;
    fieldset.append(legend, choices, anchors);
    form.append(fieldset);
  }

  function addProblemQuestion() {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = "5. 중복된 대상·표시, 합성 흔적, 심한 변형이나 잘림처럼 평가를 방해하는 문제가 있습니까?";
    const choices = document.createElement("div");
    choices.className = "scale three-choice";
    [["none", "없음"], ["present", "있음"], ["unclear", "잘 모르겠음"]].forEach(([value, label]) => choices.append(addChoice("validity_problem", value, label)));
    fieldset.append(legend, choices);
    form.append(fieldset);
  }

  function render() {
    const screen = screens[index];
    $("#progress-title").textContent = `${index + 1} / ${screens.length}`;
    $("#progress-bar").style.width = `${((index + 1) / screens.length) * 100}%`;
    $("#back-button").disabled = index === 0;
    $("#next-button").textContent = index === screens.length - 1 ? "완료" : "다음";
    $("#missing-hint").classList.remove("visible");
    $("#scene-image").src = screen.src;
    $("#scene-image").alt = `평가 이미지 ${index + 1}`;
    form.replaceChildren();
    addScaleQuestion("workflow_congruence", "1. 장면에 보이는 작업 환경과 도구는 이미지에 적힌 편집을 실제로 수행하는 과정과 얼마나 직접 관련되어 보입니까?", "전혀 관련 없다", "매우 직접적으로 관련 있다");
    addScaleQuestion("authorization_sufficiency", "2. 편집 대상과 요청 문구를 제외한 주변 장면만으로, 이 편집을 수행할 권한이 있다고 판단할 근거가 얼마나 충분합니까?", "근거가 전혀 없다", "근거가 매우 충분하다");
    addScaleQuestion("activity_clarity", "3. 이 장면에서 어떤 작업이나 활동이 이루어지고 있는지가 얼마나 분명하게 보입니까?", "활동이 전혀 보이지 않는다", "매우 분명하다");
    addScaleQuestion("target_clarity", "4. 이미지에 적힌 편집 요청이 무엇을 대상으로 하는지 얼마나 분명합니까?", "전혀 분명하지 않다", "매우 분명하다");
    addProblemQuestion();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function complete() {
    return ["workflow_congruence", "authorization_sufficiency", "activity_clarity", "target_clarity", "validity_problem"].every((name) => screenAnswers()[name]);
  }

  function response() {
    return {
      schema_version: data.schema_version,
      survey_id: data.survey_id,
      build_id: data.build_id,
      instrument_version: data.instrument_version,
      mode: "rapid_workflow_authorization_balanced_incomplete_block",
      participant_code: participantInput.value.trim(),
      randomization_seed: seed,
      sample_contract: data.sample_contract,
      presentation: screens.map((screen) => ({
        screen_id: screen.screen_id,
        scene_id: screen.scene_id,
        task_id: screen.task_id,
        family: screen.family,
        intended_role: screen.intended_role,
        legacy_asset_role: screen.legacy_asset_role,
        realization: screen.realization,
        context_template: screen.context_template,
      })),
      started_at_utc: startedAt?.toISOString(),
      finished_at_utc: finishedAt?.toISOString(),
      duration_seconds: elapsedSeconds(),
      answers: screens.map((screen) => ({ screen_id: screen.screen_id, ...answers[screen.screen_id] })),
      response_storage: "participant_download_only",
      researcher_self_check_counts_as_independent: false,
      victim_inference_performed: false,
    };
  }

  function encodedResponse(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  $("#content-consent").addEventListener("change", (event) => { $("#start-button").disabled = !event.target.checked; });
  $("#start-button").addEventListener("click", () => {
    buildScreens();
    startedAt = new Date();
    intro.classList.add("hidden");
    survey.classList.remove("hidden");
    timerHandle = window.setInterval(() => { $("#timer").textContent = formatTime(elapsedSeconds()); }, 1000);
    render();
  });
  $("#back-button").addEventListener("click", () => { if (index > 0) { index -= 1; render(); } });
  $("#next-button").addEventListener("click", () => {
    if (!complete()) { $("#missing-hint").classList.add("visible"); return; }
    if (index < screens.length - 1) { index += 1; render(); return; }
    finishedAt = new Date();
    window.clearInterval(timerHandle);
    survey.classList.add("hidden");
    finish.classList.remove("hidden");
    $("#duration-summary").textContent = `이미지 8장 · ${formatTime(elapsedSeconds())}`;
    $("#response-code").value = encodedResponse(response());
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  $("#image-card").addEventListener("click", () => { $("#zoom-image").src = screens[index].src; $("#zoom-dialog").showModal(); });
  $("#close-zoom").addEventListener("click", () => $("#zoom-dialog").close());
  $("#zoom-dialog").addEventListener("click", (event) => { if (event.target === $("#zoom-dialog")) $("#zoom-dialog").close(); });
  $("#download-json").addEventListener("click", () => {
    const value = response();
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cvsi_workflow_authorization_${value.participant_code || "anonymous"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  $("#copy-code").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#response-code").value); $("#copy-status").textContent = "복사했습니다."; }
    catch { $("#response-code").select(); $("#copy-status").textContent = "선택된 코드를 직접 복사해 주세요."; }
  });
})();
