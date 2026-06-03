package search

import (
	"sort"
	"strings"
	"sync"
)

type trieNode struct {
	children map[rune]*trieNode
	terminal bool
	value    string
}

type Trie struct {
	root *trieNode
	mu   sync.RWMutex
}

func NewTrie() *Trie {
	return &Trie{root: &trieNode{children: make(map[rune]*trieNode)}}
}

func (t *Trie) Insert(value string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	node := t.root
	for _, r := range strings.ToLower(value) {
		if node.children[r] == nil {
			node.children[r] = &trieNode{children: make(map[rune]*trieNode)}
		}
		node = node.children[r]
	}
	if node.terminal {
		return
	}
	node.terminal = true
	node.value = value
}

func (t *Trie) Search(prefix string, limit int) []string {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if limit <= 0 {
		limit = 10
	}

	node := t.root
	for _, r := range strings.ToLower(prefix) {
		next := node.children[r]
		if next == nil {
			return []string{}
		}
		node = next
	}

	results := make([]string, 0, limit)
	t.collect(node, &results, limit)
	return results
}

func (t *Trie) collect(node *trieNode, results *[]string, limit int) {
	if node == nil || len(*results) >= limit {
		return
	}
	if node.terminal {
		*results = append(*results, node.value)
	}

	keys := make([]rune, 0, len(node.children))
	for key := range node.children {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })

	for _, key := range keys {
		t.collect(node.children[key], results, limit)
		if len(*results) >= limit {
			return
		}
	}
}
