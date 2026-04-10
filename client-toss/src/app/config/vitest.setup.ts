import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { createElement, type ReactNode } from "react";

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

vi.mock("@toss/tds-mobile", () => ({
  ProgressBar: (props: Record<string, unknown>) =>
    createElement("div", {
      role: "progressbar",
      "aria-valuenow": props.progress,
      ...props,
    }),
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
  },
  ConfirmDialog: ConfirmDialogMock,
}));

vi.mock("@toss/tds-mobile-ait", () => ({
  TDSMobileAITProvider: ({ children }: { children?: ReactNode }) => children,
}));
