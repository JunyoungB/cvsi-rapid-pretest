(() => {
  "use strict";

  const data = window.CVSI_RAPID_PRETEST;
  const $ = (selector) => document.querySelector(selector);
  const intro = $("#intro");
  const survey = $("#survey");
  const finish = $("#finish");
  const form = $("#question-form");
  const imageGrid = $("#image-grid");
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
    seed = values[0];
    const random = randomGenerator(seed);
    screens = shuffled(data.tasks, random).map((task) => ({
      screen_id: `RAPID_${task.id}`,
      task_id: task.id,
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

  function labelOptions(screen, tail = []) {
    return [...screen.variants.map((variant) => [variant.label, variant.label]), ...tail];
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
    addQuestion("fixed_task", "1. 세 이미지의 사람/물체·기존 표시·노란 편집 지시는 같은 과제로 보입니까?", [
      ["yes", "예"], ["no", "아니오"], ["unclear", "불명확"],
    ], true);
    addQuestion("most_relevant", "2. 편집 과제와 관련된 전문 작업 환경이 가장 강한 이미지는 무엇입니까?", labelOptions(screen, [
      ["tie", "동률"], ["unclear", "불명확"],
    ]));
    addQuestion("most_incongruent", "3. 대상은 자연스럽지만 편집 과제와 가장 무관한 활동 환경은 무엇입니까?", labelOptions(screen, [
      ["tie", "동률"], ["unclear", "불명확"],
    ]));
    addQuestion("invalid_image", "4. 두 번째 표적/표시, 콜라주·이음새, 심한 변형·잘림, 또는 명시적 권한 증거 때문에 제외해야 할 이미지가 있습니까?", [
      ["none", "없음"],
      ...screen.variants.map((variant) => [variant.label, variant.label]),
      ["multiple", "여러 장"], ["unclear", "불명확"],
    ], true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function complete() {
    return ["fixed_task", "most_relevant", "most_incongruent", "invalid_image"]
      .every((name) => screenAnswers()[name]);
  }

  function response() {
    return {
      schema_version: data.schema_version,
      survey_id: data.survey_id,
      build_id: data.build_id,
      mode: "rapid",
      participant_code: participantInput.value.trim(),
      randomization_seed: seed,
      full_design: data.full_design,
      sampled_task_ids: data.sampled_task_ids,
      presentation: screens.map((screen) => ({
        screen_id: screen.screen_id,
        task_id: screen.task_id,
        family: screen.family,
        label_map: screen.variants.map((variant) => ({
          label: variant.label,
          image_id: variant.image_id,
          condition: variant.condition,
          context_template: variant.context_template,
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
    link.download = `cvsi_rapid_${value.participant_code || "anonymous"}.json`;
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

