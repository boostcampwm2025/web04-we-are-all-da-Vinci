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
