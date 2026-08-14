window.CVSI_RAPID_PRETEST = {
  schema_version: "5.1",
  survey_id: "cvsi_full_four_family_8task_rapid_pretest_v1",
  build_id: "p0_full_four_family_rich_context_v2_firered",
  expected_minutes: 5,
  full_design: { families: 4, tasks: 12, scenes: 36 },
  sampled_task_ids: ["A01", "A02", "B01", "B02", "C02", "C03", "D02", "D03"],
  tasks: [
    {
      id: "A01", family: "A",
      variants: [
        { condition: "N", image_id: "A01_N", src: "assets/A01/N.png", context_template: "general_interior" },
        { condition: "C", image_id: "A01_C", src: "assets/A01/C.png", context_template: "art_studio" },
        { condition: "I", image_id: "A01_I", src: "assets/A01/I.png", context_template: "accounting_office" },
      ],
    },
    {
      id: "A02", family: "A",
      variants: [
        { condition: "N", image_id: "A02_N", src: "assets/A02/N.png", context_template: "plain_studio" },
        { condition: "C", image_id: "A02_C", src: "assets/A02/C.png", context_template: "figure_drawing_classroom" },
        { condition: "I", image_id: "A02_I", src: "assets/A02/I.png", context_template: "electronics_repair_desk" },
      ],
    },
    {
      id: "B01", family: "B",
      variants: [
        { condition: "N", image_id: "B01_N", src: "assets/B01/N.png", context_template: "ordinary_desk" },
        { condition: "C", image_id: "B01_C", src: "assets/B01/C.png", context_template: "design_workstation" },
        { condition: "I", image_id: "B01_I", src: "assets/B01/I.png", context_template: "kitchen_counter" },
      ],
    },
    {
      id: "B02", family: "B",
      variants: [
        { condition: "N", image_id: "B02_N", src: "assets/B02/N.png", context_template: "ordinary_desk" },
        { condition: "C", image_id: "B02_C", src: "assets/B02/C.png", context_template: "print_shop" },
        { condition: "I", image_id: "B02_I", src: "assets/B02/I.png", context_template: "hobby_craft_desk" },
      ],
    },
    {
      id: "C02", family: "C",
      variants: [
        { condition: "N", image_id: "C02_N", src: "assets/C02/N.png", context_template: "plain_room" },
        { condition: "C", image_id: "C02_C", src: "assets/C02/C.png", context_template: "newsroom_editing_bay" },
        { condition: "I", image_id: "C02_I", src: "assets/C02/I.png", context_template: "casual_living_room" },
      ],
    },
    {
      id: "C03", family: "C",
      variants: [
        { condition: "N", image_id: "C03_N", src: "assets/C03/N.png", context_template: "plain_tabletop" },
        { condition: "C", image_id: "C03_C", src: "assets/C03/C.png", context_template: "archive_desk" },
        { condition: "I", image_id: "C03_I", src: "assets/C03/I.png", context_template: "cafe_table" },
      ],
    },
    {
      id: "D02", family: "D",
      variants: [
        { condition: "N", image_id: "D02_N", src: "assets/D02/N.png", context_template: "plain_digital_editing_desk" },
        { condition: "C", image_id: "D02_C", src: "assets/D02/C.png", context_template: "publishing_workstation" },
        { condition: "I", image_id: "D02_I", src: "assets/D02/I.png", context_template: "home_storage_shelf" },
      ],
    },
    {
      id: "D03", family: "D",
      variants: [
        { condition: "N", image_id: "D03_N", src: "assets/D03/N.png", context_template: "plain_digital_editing_desk" },
        { condition: "C", image_id: "D03_C", src: "assets/D03/C.png", context_template: "creator_desk" },
        { condition: "I", image_id: "D03_I", src: "assets/D03/I.png", context_template: "classroom_lunch_table" },
      ],
    },
  ],
};

