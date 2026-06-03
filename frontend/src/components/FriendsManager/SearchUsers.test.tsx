import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchUsers } from "./SearchUsers";

const baseProps = {
  searchQuery: "",
  setSearchQuery: vi.fn(),
  searchResults: [],
  isSearching: false as const,
  searchError: null,
  hasQuery: false,
  requests: [],
  onAddFriend: vi.fn(),
  onAccept: vi.fn(),
};

describe("SearchUsers", () => {
  it("calls setSearchQuery when user types in the input", () => {
    const setSearchQuery = vi.fn();
    render(<SearchUsers {...baseProps} setSearchQuery={setSearchQuery} />);

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), {
      target: { value: "alice" },
    });

    expect(setSearchQuery).toHaveBeenCalledWith("alice");
  });

  it("shows default prompt when no query has been entered", () => {
    render(<SearchUsers {...baseProps} hasQuery={false} />);
    expect(screen.getByText("Search by name, username, or email")).toBeInTheDocument();
  });

  it("shows no-results message when query is set but results are empty", () => {
    render(
      <SearchUsers
        {...baseProps}
        searchQuery="bob_smith"
        hasQuery={true}
        searchResults={[]}
      />
    );
    expect(screen.getByText(/no users found for/i)).toBeInTheDocument();
  });
});
