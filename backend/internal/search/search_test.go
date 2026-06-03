package search

import "testing"

func TestTrieSearchIsCaseInsensitive(t *testing.T) {
	trie := NewTrie()
	trie.Insert("Charlie")

	results := trie.Search("CHA", 10)
	if len(results) != 1 || results[0] != "Charlie" {
		t.Fatalf("unexpected results: %#v", results)
	}
}

func TestIndexLoadsAndSearchesUsernames(t *testing.T) {
	index := NewIndex()
	index.LoadUsernames([]string{"alice", "alistair", "bob"})

	results := index.SearchUsernames("ali", 10)
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %#v", results)
	}
	if !index.UsernameMayExist("alice") {
		t.Fatalf("expected bloom filter to recognize alice")
	}
}
