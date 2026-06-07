class TrieNode {
  children: Map<string, TrieNode> = new Map();
  terminal: boolean = false;
  value: string = '';
}

export class Trie {
  root: TrieNode = new TrieNode();

  insert(value: string): void {
    let node = this.root;
    for (const char of value.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.terminal = true;
    node.value = value; // Preserve original casing
  }

  search(prefix: string, limit: number = 10): string[] {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }

    const results: string[] = [];
    this.collect(node, results, limit);
    return results;
  }

  private collect(node: TrieNode, results: string[], limit: number): void {
    if (!node || results.length >= limit) {
      return;
    }
    if (node.terminal) {
      results.push(node.value);
    }

    const sortedKeys = Array.from(node.children.keys()).sort();
    for (const key of sortedKeys) {
      this.collect(node.children.get(key)!, results, limit);
      if (results.length >= limit) {
        return;
      }
    }
  }
}
