package search

import (
	"encoding/binary"
	"hash/fnv"
	"math"
	"strings"
	"sync"
)

type BloomFilter struct {
	bitset []byte
	size   uint
	hashes uint
	mu     sync.RWMutex
}

func NewBloomFilter(expectedItems int, falsePositiveRate float64) *BloomFilter {
	if expectedItems <= 0 {
		expectedItems = 10_000
	}
	if falsePositiveRate <= 0 || falsePositiveRate >= 1 {
		falsePositiveRate = 0.01
	}

	size := optimalSize(float64(expectedItems), falsePositiveRate)
	hashes := optimalHashes(size, float64(expectedItems))
	byteSize := int((size + 7) / 8)

	return &BloomFilter{
		bitset: make([]byte, byteSize),
		size:   uint(size),
		hashes: uint(hashes),
	}
}

func (b *BloomFilter) Add(value string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, index := range b.hashIndices(value) {
		b.bitset[index/8] |= 1 << (index % 8)
	}
}

func (b *BloomFilter) MightContain(value string) bool {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, index := range b.hashIndices(value) {
		if b.bitset[index/8]&(1<<(index%8)) == 0 {
			return false
		}
	}
	return true
}

func (b *BloomFilter) hashIndices(value string) []uint {
	normalized := strings.ToLower(strings.TrimSpace(value))
	h1 := fnv.New64a()
	_, _ = h1.Write([]byte(normalized))
	sum1 := h1.Sum64()

	h2 := fnv.New64()
	_, _ = h2.Write([]byte(normalized))
	sum2 := h2.Sum64()
	if sum2 == 0 {
		sum2 = binary.LittleEndian.Uint64([]byte{1, 0, 0, 0, 0, 0, 0, 0})
	}

	indices := make([]uint, 0, b.hashes)
	for i := uint(0); i < b.hashes; i++ {
		indices = append(indices, uint((sum1+uint64(i)*sum2)%uint64(b.size)))
	}
	return indices
}

func optimalSize(n float64, p float64) uint {
	return uint(math.Ceil(-(n * math.Log(p)) / (math.Ln2 * math.Ln2)))
}

func optimalHashes(m uint, n float64) uint {
	return uint(math.Max(1, math.Round((float64(m)/n)*math.Ln2)))
}
