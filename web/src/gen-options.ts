/**
 * The generation choices more than one screen offers — the studio's settings and the
 * LoRA comparison — kept in one place so they cannot drift apart.
 */

// Resolution presets. SD 1.x models train at ~512, SDXL at ~1024 — offering both
// families beats making people type pixel counts.
export const RESOLUTIONS: { label: string; hint: string; w: number; h: number }[] = [
  { label: "Portrait", hint: "512×768", w: 512, h: 768 },
  { label: "Square", hint: "512×512", w: 512, h: 512 },
  { label: "Landscape", hint: "768×512", w: 768, h: 512 },
  { label: "Tall", hint: "640×960", w: 640, h: 960 },
  { label: "XL Portrait", hint: "832×1216", w: 832, h: 1216 },
  { label: "XL Square", hint: "1024×1024", w: 1024, h: 1024 },
  { label: "XL Landscape", hint: "1216×832", w: 1216, h: 832 },
];

// Schedulers offered under Model settings. The server maps A1111-style names onto
// InvokeAI ids, so the same values work against either backend.
export const SCHEDULERS: { id: string; label: string }[] = [
  { id: "", label: "Default (Euler a)" },
  ...[
    ["ddim", "DDIM"], ["ddpm", "DDPM"], ["deis", "DEIS"], ["deis_k", "DEIS Karras"],
    ["dpmpp_2s", "DPM++ 2S"], ["dpmpp_2s_k", "DPM++ 2S Karras"],
    ["dpmpp_2m", "DPM++ 2M"], ["dpmpp_2m_k", "DPM++ 2M Karras"],
    ["dpmpp_2m_sde", "DPM++ 2M SDE"], ["dpmpp_2m_sde_k", "DPM++ 2M SDE Karras"],
    ["dpmpp_3m", "DPM++ 3M"], ["dpmpp_3m_k", "DPM++ 3M Karras"],
    ["dpmpp_sde", "DPM++ SDE"], ["dpmpp_sde_k", "DPM++ SDE Karras"],
    ["er_sde", "ER-SDE"], ["euler", "Euler"], ["euler_k", "Euler Karras"],
    ["euler_a", "Euler Ancestral"], ["heun", "Heun"], ["heun_k", "Heun Karras"],
    ["kdpm_2", "KDPM 2"], ["kdpm_2_k", "KDPM 2 Karras"],
    ["kdpm_2_a", "KDPM 2 Ancestral"], ["kdpm_2_a_k", "KDPM 2 Ancestral Karras"],
    ["lcm", "LCM"], ["lms", "LMS"], ["lms_k", "LMS Karras"],
    ["pndm", "PNDM"], ["tcd", "TCD"], ["unipc", "UniPC"], ["unipc_k", "UniPC Karras"],
  ].map(([id, label]) => ({ id, label })),
];
