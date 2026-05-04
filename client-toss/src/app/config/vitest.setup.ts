import "@testing-library/jest-dom/vitest";
import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

// jsdom에 없는 API polyfill
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  closePath: vi.fn(),
  scale: vi.fn(),
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const ConfirmDialogMock = Object.assign(
  ({
    open,
    children,
    confirmButton,
    cancelButton,
    ...props
  }: Record<string, unknown> & {
    open?: boolean;
    children?: ReactNode;
    confirmButton?: ReactNode;
    cancelButton?: ReactNode;
  }) => {
    if (!open) return null;
    return createElement("div", props, children, confirmButton, cancelButton);
  },
  {
    ConfirmButton: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      createElement("button", props, children),
    CancelButton: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      createElement("button", props, children),
  },
);

const TopMock = Object.assign(
  ({
    title,
    subtitleBottom,
    ...props
  }: Record<string, unknown> & {
    title?: ReactNode;
    subtitleBottom?: ReactNode;
  }) => createElement("div", props, title, subtitleBottom),
  {
    TitleParagraph: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      createElement("h2", props, children),
    SubtitleParagraph: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      createElement("p", props, children),
  },
);

vi.mock("@toss/tds-mobile", () => ({
  Top: TopMock,
  TextButton: ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) =>
    createElement("button", props, children),
  Border: () => createElement("hr"),
  ProgressBar: (props: Record<string, unknown>) =>
    createElement("div", {
      role: "progressbar",
      "aria-valuenow": props.progress,
      ...props,
    }),
  Paragraph: Object.assign(
    ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      createElement("p", props, children),
    {
      Text: ({
        children,
        ...props
      }: Record<string, unknown> & { children?: ReactNode }) =>
        createElement("span", props, children),
    },
  ),
  Button: ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) =>
    createElement("button", props, children),
  BottomCTA: {
    Double: ({
      leftButton,
      rightButton,
      topAccessory,
      ...props
    }: Record<string, unknown> & {
      leftButton?: ReactNode;
      rightButton?: ReactNode;
      topAccessory?: ReactNode;
    }) => createElement("div", props, topAccessory, leftButton, rightButton),
    Single: ({
      children,
      topAccessory,
      ...props
    }: Record<string, unknown> & {
      children?: ReactNode;
      topAccessory?: ReactNode;
    }) => createElement("div", props, topAccessory, children),
  },
  CTAButton: ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) =>
    createElement("button", props, children),
  ConfirmDialog: ConfirmDialogMock,
  Toast: Object.assign(
    ({
      open,
      text,
      leftAddon,
      ...props
    }: Record<string, unknown> & {
      open?: boolean;
      text?: ReactNode;
      leftAddon?: ReactNode;
    }) => {
      if (!open) return null;
      return createElement("div", props, leftAddon, text);
    },
    {
      Icon: (props: Record<string, unknown>) =>
        createElement("span", { "aria-hidden": true, ...props }),
    },
  ),
}));

vi.mock("@toss/tds-mobile-ait", () => ({
  TDSMobileAITProvider: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  appLogin: vi.fn().mockResolvedValue({
    authorizationCode: "test-code",
    referrer: "SANDBOX" as const,
  }),
  closeView: vi.fn().mockResolvedValue(undefined),
  getDeviceId: vi.fn().mockResolvedValue({
    deviceId: "test-device-id",
  }),
  graniteEvent: {
    addEventListener: vi.fn().mockReturnValue(vi.fn()),
  },
  setIosSwipeGestureEnabled: vi.fn(),
  generateHapticFeedback: vi.fn().mockResolvedValue(undefined),
  loadFullScreenAd: Object.assign(vi.fn().mockReturnValue(vi.fn()), {
    isSupported: vi.fn().mockReturnValue(false),
  }),
  showFullScreenAd: vi.fn(),
  TossAds: {
    init: vi.fn(),
    BannerAd: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: ReactNode }) =>
      createElement("div", props, children),
  },
}));
