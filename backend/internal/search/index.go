package search

type Index struct {
	usernameTrie *Trie
	problemTrie  *Trie
	usernameBF   *BloomFilter
}

func NewIndex() *Index {
	return &Index{
		usernameTrie: NewTrie(),
		problemTrie:  NewTrie(),
		usernameBF:   NewBloomFilter(10_000, 0.01),
	}
}

func (i *Index) LoadUsernames(usernames []string) {
	i.usernameTrie = NewTrie()
	i.usernameBF = NewBloomFilter(max(10_000, len(usernames)*2), 0.01)
	for _, username := range usernames {
		i.AddUsername(username)
	}
}

func (i *Index) AddUsername(username string) {
	i.usernameTrie.Insert(username)
	i.usernameBF.Add(username)
}

func (i *Index) SearchUsernames(prefix string, limit int) []string {
	return i.usernameTrie.Search(prefix, limit)
}

func (i *Index) UsernameMayExist(username string) bool {
	return i.usernameBF.MightContain(username)
}

func (i *Index) LoadProblemTitles(titles []string) {
	i.problemTrie = NewTrie()
	for _, title := range titles {
		i.problemTrie.Insert(title)
	}
}

func (i *Index) AddProblemTitle(title string) {
	i.problemTrie.Insert(title)
}

func (i *Index) SearchProblems(prefix string, limit int) []string {
	return i.problemTrie.Search(prefix, limit)
}

func max(a int, b int) int {
	if a > b {
		return a
	}
	return b
}
