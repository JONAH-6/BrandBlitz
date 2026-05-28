import "@testing-library/jest-dom/vitest";
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const { apiGetMock, toastErrorMock, pushMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  toastErrorMock: vi.fn(),
  pushMock: vi.fn(),
}));

const sessionData = {
  apiToken: "test-token",
};

const routerMock = {
  push: pushMock,
};

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : undefined} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) => (
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: sessionData,
    status: "authenticated",
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    createApiClient: () => ({
      get: apiGetMock,
      delete: vi.fn(),
    }),
  };
});

describe("DashboardPage", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    toastErrorMock.mockReset();
    pushMock.mockReset();
  });

  it("shows a toast once and renders a retry state when brands fail to load", async () => {
    apiGetMock.mockRejectedValueOnce(new Error("network down"));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });

    expect(toastErrorMock).toHaveBeenCalledWith("Couldn't load brands. Please try again.");
    expect(screen.getByRole("heading", { name: "Couldn't load brands" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  it("does not fire an error toast when brands load successfully", async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        brands: [
          {
            id: "brand-1",
            name: "Nova Reach",
            challenges: [],
          },
        ],
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Nova Reach")).toBeInTheDocument();
    });

    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Couldn't load brands" })).not.toBeInTheDocument();
  });
});
