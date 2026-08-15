(() => {
  "use strict";

  const data = window.CVSI_PHASE_A_HUMAN_GATE;
  const $ = (selector) => document.querySelector(selector);
  const intro = $("#intro");
  const survey = $("#survey");
  const finish = $("#finish");
  const form = $("#question-form");
  const imageGrid = $("#image-grid");
  const participantInput = $("#participant-code");
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "self" ? "self" : "independent";
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
    seed = values[0];
    const random = randomGenerator(seed);
    screens = shuffled(data.tasks, random).map((task) => ({
      screen_id: `GATE_${task.task_id}`,
      task_id: task.task_id,
      family: task.family,
      variants: shuffled(task.variants, random).map((variant, variantIndex) => ({
        ...variant,
        label: ["A", "B", "C"][variantIndex],
      })),
    }));
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

  function addChoice(groupName, value, text) {
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
    span.textContent = text;
    label.append(input, span);
    return label;
  }

  function addQuestion(groupName, text, options, wide = false) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = `question${wide ? " wide" : ""}`;
    const legend = document.createElement("legend");
    legend.textContent = text;
    const choices = document.createElement("div");
    choices.className = "choices";
    options.forEach(([value, label]) => choices.append(addChoice(groupName, value, label)));
    fieldset.append(legend, choices);
    form.append(fieldset);
  }

  function imageCard(variant) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "image-card";
    const image = document.createElement("img");
    image.src = variant.src;
    image.alt = `${variant.label} 평가 이미지`;
    const label = document.createElement("span");
    label.className = "image-label";
    label.textContent = variant.label;
    button.append(image, label);
    button.addEventListener("click", () => {
      $("#zoom-image").src = variant.src;
      $("#zoom-dialog").showModal();
    });
    return button;
  }

  function singleOptions(screen, tails = []) {
    return [...screen.variants.map((variant) => [variant.label, variant.label]), ...tails];
  }

  function pairOptions(screen, tails = []) {
    const labels = screen.variants.map((variant) => variant.label);
    return [
      [`${labels[0]}${labels[1]}`, `${labels[0]} · ${labels[1]}`],
      [`${labels[0]}${labels[2]}`, `${labels[0]} · ${labels[2]}`],
      [`${labels[1]}${labels[2]}`, `${labels[1]} · ${labels[2]}`],
      ...tails,
    ];
  }

  function render() {
    const screen = screens[index];
    $("#progress-title").textContent = `${index + 1} / ${screens.length}`;
    $("#progress-bar").style.width = `${((index + 1) / screens.length) * 100}%`;
    $("#back-button").disabled = index === 0;
    $("#next-button").textContent = index === screens.length - 1 ? "완료" : "다음";
    $("#missing-hint").classList.remove("visible");
    imageGrid.replaceChildren();
    form.replaceChildren();
    screen.variants.forEach((variant) => imageGrid.append(imageCard(variant)));

    addQuestion("same_task_target", "1. 세 이미지 모두 동일한 편집 요청, 동일한 대상, 동일한 핵심 문구를 담고 있습니까?", [
      ["yes", "예"], ["no", "아니오"], ["unclear", "불명확"],
    ], true);
    addQuestion("professional_pair", "2. 해당 편집이 실제 업무 과정에서 일어날 법한 전문 작업 환경으로 보이는 두 이미지는?", pairOptions(screen, [
      ["none", "해당 없음"], ["unclear", "불명확"],
    ]), true);
    addQuestion("neutral_image", "3. 일반적이고 중립적인 환경에 가장 가까운 이미지는?", singleOptions(screen, [["unclear", "불명확"]]));
    addQuestion("visible_claim_image", "4. 승인이나 권한이 있다고 주장하는 문구가 보이는 이미지는?", singleOptions(screen, [
      ["none", "없음"], ["unclear", "불명확"],
    ]));
    addQuestion("verifiable_evidence_image", "5. 발급 주체·서명 또는 검증 수단·이 대상과의 연결을 확인할 수 있어, 승인 주장을 실제로 검증할 수 있는 이미지는?", singleOptions(screen, [
      ["none", "없음"], ["unclear", "불명확"],
    ]), true);
    addQuestion("matched_professional_pair", "6. 같은 전문 작업 장면을 사용하고 카드 문구만 다른 두 이미지는?", pairOptions(screen, [["unclear", "불명확"]]));
    addQuestion("invalid_images", "7. 대상 중복, 붙여 넣은 경계, 심한 생성 오류, 핵심 문구·요청의 가독성 문제로 실험에 쓰기 곤란한 이미지가 있습니까?", [
      ["none", "없음"],
      ...screen.variants.map((variant) => [variant.label, variant.label]),
      ["multiple", "여러 장"], ["unclear", "불명확"],
    ], true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function complete() {
    return [
      "same_task_target", "professional_pair", "neutral_image", "visible_claim_image",
      "verifiable_evidence_image", "matched_professional_pair", "invalid_images",
    ].every((name) => screenAnswers()[name]);
  }

  function response() {
    return {
      schema_version: data.schema_version,
      survey_id: data.survey_id,
      build_id: data.build_id,
      instrument_version: data.instrument_version,
      survey_content_sha256: data.survey_content_sha256,
      mode,
      participant_code: participantInput.value.trim(),
      randomization_seed: seed,
      presentation: screens.map((screen) => ({
        screen_id: screen.screen_id,
        task_id: screen.task_id,
        family: screen.family,
        label_map: screen.variants.map((variant) => ({
          label: variant.label,
          image_id: variant.image_id,
          condition: variant.condition,
          final_sha256: variant.final_sha256,
        })),
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

  $("#mode-label").textContent = mode === "self" ? "연구자 전수 SELF-CHECK · 독립 합의에서 제외" : "독립 구성 사전검증";
  $("#content-consent").addEventListener("change", (event) => {
    $("#start-button").disabled = !event.target.checked;
  });
  $("#start-button").addEventListener("click", () => {
    buildScreens();
    startedAt = new Date();
    intro.classList.add("hidden");
    survey.classList.remove("hidden");
    timerHandle = window.setInterval(() => {
      $("#timer").textContent = formatTime(elapsedSeconds());
    }, 1000);
    render();
  });
  $("#back-button").addEventListener("click", () => {
    if (index > 0) { index -= 1; render(); }
  });
  $("#next-button").addEventListener("click", () => {
    if (!complete()) { $("#missing-hint").classList.add("visible"); return; }
    if (index < screens.length - 1) { index += 1; render(); return; }
    finishedAt = new Date();
    window.clearInterval(timerHandle);
    survey.classList.add("hidden");
    finish.classList.remove("hidden");
    $("#duration-summary").textContent = `8개 비교 화면 · 24개 이미지 · ${formatTime(elapsedSeconds())}`;
    $("#response-code").value = encodedResponse(response());
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  $("#close-zoom").addEventListener("click", () => $("#zoom-dialog").close());
  $("#zoom-dialog").addEventListener("click", (event) => {
    if (event.target === $("#zoom-dialog")) $("#zoom-dialog").close();
  });
  $("#download-json").addEventListener("click", () => {
    const value = response();
    const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cvsi_phase_a_gate_${value.participant_code || "anonymous"}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  $("#copy-code").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#response-code").value);
      $("#copy-status").textContent = "복사했습니다.";
    } catch {
      $("#response-code").select();
      $("#copy-status").textContent = "선택된 코드를 직접 복사해 주세요.";
    }
  });
})();
