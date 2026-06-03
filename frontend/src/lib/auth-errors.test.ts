import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { getAuthErrorContent } from "@/lib/auth-errors";

describe("getAuthErrorContent", () => {
  it("returns actionable login guidance for invalid credentials", () => {
    const error = new ApiError("Invalid email, username, or password.", { status: 401 });

    expect(getAuthErrorContent(error, "login")).toEqual({
      title: "Wrong email or password",
      description: "",
    });
  });

  it("returns actionable network guidance when the backend cannot be reached", () => {
    const error = new ApiError("Network down", { status: 0 });

    expect(getAuthErrorContent(error, "login")).toEqual({
      title: "Can't reach AlgoSphere",
      description: "Check connection or backend.",
    });
  });

  it("maps validation issues to field-specific signup guidance", () => {
    const error = new ApiError("value is not a valid email address: An email address must have an @-sign.", {
      status: 422,
      issues: [{ path: ["body", "email"], message: "value is not a valid email address" }],
    });

    expect(getAuthErrorContent(error, "register")).toEqual({
      title: "Invalid email",
      description: "value is not a valid email address",
    });
  });
});
