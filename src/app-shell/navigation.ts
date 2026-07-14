export const screenIds = ["home", "checkup", "reports", "privacy", "settings"] as const;

export type ScreenId = (typeof screenIds)[number];

export interface ScreenDefinition {
  readonly id: ScreenId;
  readonly label: string;
  readonly title: string;
  readonly body: string;
  readonly state: "FIRST_USE" | "EMPTY" | "OFFLINE";
}

const screens: Readonly<Record<ScreenId, ScreenDefinition>> = {
  home: {
    id: "home",
    label: "Trang chủ",
    title: "Chào mừng đến với EyeMate",
    body: "Bạn có thể bắt đầu checkup survey-only sau khi hoàn tất phần giới thiệu và lựa chọn quyền riêng tư.",
    state: "FIRST_USE"
  },
  checkup: {
    id: "checkup",
    label: "Checkup",
    title: "Checkup cá nhân",
    body: "Luồng survey-only sẽ hoạt động ngay cả khi camera chưa được bật, bị từ chối hoặc không khả dụng.",
    state: "FIRST_USE"
  },
  reports: {
    id: "reports",
    label: "Báo cáo",
    title: "Báo cáo",
    body: "Chưa có báo cáo. Báo cáo sau này sẽ nêu nguồn dữ liệu, độ bao phủ, dữ liệu thiếu và giới hạn.",
    state: "EMPTY"
  },
  privacy: {
    id: "privacy",
    label: "Quyền riêng tư",
    title: "Trung tâm quyền riêng tư",
    body: "EyeMate hoạt động Local Only. Không cần tài khoản, không cloud và không telemetry trong phạm vi M1.",
    state: "OFFLINE"
  },
  settings: {
    id: "settings",
    label: "Cài đặt",
    title: "Cài đặt",
    body: "Camera là tùy chọn. Bạn có thể tiếp tục checkup survey-only mà không bật camera.",
    state: "EMPTY"
  }
};

export function getScreen(screenId: string): ScreenDefinition {
  if ((screenIds as readonly string[]).includes(screenId)) {
    return screens[screenId as ScreenId];
  }
  return screens.home;
}
