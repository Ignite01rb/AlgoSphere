export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Category = {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export type TopicContent = {
  overview: string;
  keyPoints: string[];
  explanation: string;
  codeExample?: { title: string; code: string };
  pros?: string[];
  cons?: string[];
  realWorld?: string[];
};

export type Topic = {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  icon: string;
  content: TopicContent;
};

export const categories: Category[] = [
  { id: "fundamentals", label: "Fundamentals", icon: "📐", color: "blue", description: "Core concepts every engineer should know" },
  { id: "scalability", label: "Scalability", icon: "📈", color: "emerald", description: "Techniques to handle growing traffic" },
  { id: "load-balancing", label: "Load Balancing", icon: "⚖️", color: "purple", description: "Distributing traffic across servers" },
  { id: "databases", label: "Databases", icon: "🗄️", color: "orange", description: "Storage, querying, and data management" },
  { id: "caching", label: "Caching", icon: "⚡", color: "yellow", description: "Speed up reads with in-memory storage" },
  { id: "networking", label: "Networking & CDN", icon: "🌐", color: "cyan", description: "Content delivery and network protocols" },
  { id: "messaging", label: "Messaging", icon: "📨", color: "pink", description: "Asynchronous communication between services" },
  { id: "distributed", label: "Distributed Systems", icon: "🔗", color: "red", description: "Coordination across multiple machines" },
  { id: "patterns", label: "Design Patterns", icon: "🧩", color: "indigo", description: "Proven architectural solutions" },
  { id: "real-world", label: "Real-World Systems", icon: "🏢", color: "violet", description: "Design famous large-scale systems" },
];

export const topics: Topic[] = [
  // ── Fundamentals ──────────────────────────────────────────
  {
    slug: "dns",
    title: "DNS (Domain Name System)",
    description: "How domain names are translated to IP addresses across the internet",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "🌍",
    content: {
      overview: "DNS is the internet's phonebook. It translates human-readable domain names like google.com into machine-readable IP addresses like 142.250.80.46, enabling browsers to locate and connect to web servers.",
      keyPoints: [
        "DNS uses a hierarchical structure: Root servers → TLD servers (.com, .org) → Authoritative name servers",
        "Results are cached at multiple levels: browser, OS, ISP resolver, and recursive resolvers",
        "TTL (Time to Live) controls how long DNS records are cached before re-querying",
        "Common record types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), NS (nameserver)",
        "DNS resolution typically takes 20-120ms for uncached lookups",
      ],
      explanation: "When you type a URL into your browser, a DNS lookup is the first step. The browser checks its own cache, then the OS cache, then queries a recursive DNS resolver (usually your ISP's).\n\nThe recursive resolver walks the DNS hierarchy: it asks a root server which TLD server handles .com, then asks the TLD server which authoritative server handles google.com, and finally gets the IP address from the authoritative server.\n\nTo reduce latency, DNS responses are aggressively cached. Most sites set TTLs between 60 seconds and 24 hours. Services like Cloudflare and AWS Route 53 also support GeoDNS, which returns different IP addresses based on the user's geographic location.",
      codeExample: {
        title: "DNS Lookup in Node.js",
        code: `const dns = require('dns');

// Resolve a domain to its IP addresses
dns.resolve4('google.com', (err, addresses) => {
  console.log('IP addresses:', addresses);
  // ['142.250.80.46']
});

// Reverse lookup: IP → hostname
dns.reverse('8.8.8.8', (err, hostnames) => {
  console.log('Hostnames:', hostnames);
  // ['dns.google']
});`,
      },
      pros: ["Decentralized and fault-tolerant by design", "Cached at multiple levels for speed", "Supports geographic routing via GeoDNS"],
      cons: ["DNS propagation can take up to 48 hours", "Vulnerable to DNS spoofing and cache poisoning", "Single point of failure if DNS provider goes down"],
      realWorld: ["Every web application relies on DNS", "CDNs use GeoDNS to route users to nearest edge", "Email routing uses MX records"],
    },
  },
  {
    slug: "latency-throughput",
    title: "Latency & Throughput",
    description: "Two fundamental performance metrics for measuring system speed and capacity",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "⏱️",
    content: {
      overview: "Latency is the time it takes for a single request to travel from client to server and back. Throughput is the number of requests a system can handle per unit of time. Together they define a system's performance characteristics.",
      keyPoints: [
        "Latency = time for one operation (measured in ms). Lower is better",
        "Throughput = operations per second (measured in RPS/QPS). Higher is better",
        "They are related but not inversely proportional — optimizing one doesn't always improve the other",
        "P99 latency (99th percentile) matters more than average latency in production",
        "Network latency dominates in distributed systems: same datacenter ~0.5ms, cross-continent ~150ms",
      ],
      explanation: "Think of a highway: latency is how long it takes one car to drive from point A to point B. Throughput is how many cars pass per hour. A wider highway (more lanes) increases throughput but doesn't change the drive time (latency).\n\nIn system design, you must consider both. A system with low latency but low throughput can handle individual requests fast but collapses under load. A system with high throughput but high latency can serve many users but each one waits a long time.\n\nCommon latency numbers every engineer should know: L1 cache reference (~0.5ns), RAM access (~100ns), SSD read (~150μs), HDD seek (~10ms), round trip within same datacenter (~0.5ms), California to Netherlands round trip (~150ms).",
      codeExample: {
        title: "Measuring Latency in JavaScript",
        code: `// Measure API latency
async function measureLatency(url) {
  const start = performance.now();
  await fetch(url);
  const end = performance.now();

  const latencyMs = end - start;
  console.log(\`Latency: \${latencyMs.toFixed(2)}ms\`);
  return latencyMs;
}

// Track P99 latency
class LatencyTracker {
  constructor() { this.samples = []; }

  record(ms) { this.samples.push(ms); }

  getP99() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.99);
    return sorted[idx];
  }
}`,
      },
      pros: ["Easy to measure and monitor", "Clear optimization targets", "Universally understood metrics"],
      cons: ["Averages can hide tail latency issues", "Throughput can be misleading under low load", "Trade-offs often exist between the two"],
      realWorld: ["Google aims for <200ms search latency", "Amazon found every 100ms latency costs 1% sales", "Trading systems optimize for microsecond latency"],
    },
  },
  {
    slug: "cap-theorem",
    title: "CAP Theorem",
    description: "The fundamental trade-off between consistency, availability, and partition tolerance",
    category: "fundamentals",
    difficulty: "Intermediate",
    icon: "🔺",
    content: {
      overview: "The CAP theorem states that a distributed system can provide at most two of three guarantees simultaneously: Consistency (every read gets the most recent write), Availability (every request gets a response), and Partition Tolerance (the system continues to operate despite network failures).",
      keyPoints: [
        "In practice, network partitions are inevitable, so the real choice is between CP and AP",
        "CP systems (e.g., HBase, MongoDB) sacrifice availability during partitions to maintain consistency",
        "AP systems (e.g., Cassandra, DynamoDB) sacrifice consistency during partitions to stay available",
        "Many real systems offer tunable consistency — you choose per query or per table",
        "PACELC extends CAP: when no Partition, do you optimize for Latency or Consistency?",
      ],
      explanation: "Imagine a distributed database replicated across two data centers. If the network link between them breaks (partition), you have two choices:\n\n1. CP: Reject writes to one side to keep data consistent. Both sides always return the same data, but one side becomes unavailable for writes.\n\n2. AP: Accept writes on both sides independently. Both sides remain available, but they may return different (inconsistent) data until the partition heals.\n\nMost modern systems don't fall neatly into CP or AP. They offer tunable consistency levels. For example, Cassandra lets you choose QUORUM reads (more consistent) or ONE reads (more available) per query.",
      realWorld: ["Banking systems are typically CP — consistency of balances is critical", "Social media feeds are typically AP — a slightly stale feed is acceptable", "DNS is AP — cached records may be stale but the system stays available"],
    },
  },
  {
    slug: "acid-properties",
    title: "ACID Properties",
    description: "Four guarantees that ensure reliable database transactions",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "🧪",
    content: {
      overview: "ACID stands for Atomicity, Consistency, Isolation, and Durability — four properties that guarantee database transactions are processed reliably, even in the face of errors, power failures, or concurrent access.",
      keyPoints: [
        "Atomicity: A transaction is all-or-nothing. If any part fails, the entire transaction rolls back",
        "Consistency: A transaction moves the database from one valid state to another, enforcing all rules and constraints",
        "Isolation: Concurrent transactions execute as if they were sequential — each is unaware of others",
        "Durability: Once a transaction is committed, the data persists even if the system crashes",
        "Isolation levels trade off between correctness and performance: READ UNCOMMITTED → READ COMMITTED → REPEATABLE READ → SERIALIZABLE",
      ],
      explanation: "Consider a bank transfer of $100 from Account A to Account B. Without ACID:\n- Without Atomicity: A is debited but B is never credited — money vanishes.\n- Without Consistency: The total balance across accounts changes — invariants break.\n- Without Isolation: A concurrent read sees A debited but B not yet credited.\n- Without Durability: After a crash, the successful transfer is lost.\n\nRelational databases like PostgreSQL and MySQL provide full ACID compliance. NoSQL databases often relax one or more properties for better performance or scalability — this is known as BASE (Basically Available, Soft state, Eventual consistency).",
      codeExample: {
        title: "ACID Transaction in SQL",
        code: `-- Transfer $100 from account A to account B
BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100
  WHERE id = 'A' AND balance >= 100;

-- If the debit failed (insufficient funds), roll back
-- Otherwise credit account B
UPDATE accounts SET balance = balance + 100
  WHERE id = 'B';

-- Both updates succeed or neither does (Atomicity)
COMMIT;`,
      },
      pros: ["Guarantees data correctness", "Prevents partial updates and data corruption", "Well-understood model with decades of tooling"],
      cons: ["Strict isolation reduces concurrency and throughput", "Distributed ACID (2PC) is expensive and slow", "Can cause deadlocks under heavy contention"],
      realWorld: ["Banking and financial systems", "E-commerce order processing", "Inventory management systems"],
    },
  },
  {
    slug: "back-of-envelope",
    title: "Back-of-the-Envelope Estimation",
    description: "Quick calculations to estimate system capacity and resource requirements",
    category: "fundamentals",
    difficulty: "Intermediate",
    icon: "🧮",
    content: {
      overview: "Back-of-the-envelope estimation is a technique to quickly calculate system requirements using rough approximations. It helps engineers make informed decisions about architecture, capacity planning, and feasibility without exact measurements.",
      keyPoints: [
        "Key numbers: 1 day = 86,400s ≈ 100K seconds. 1 year ≈ 30 million seconds",
        "Storage: 1 char = 1 byte, 1 int = 4 bytes, a typical tweet ≈ 300 bytes, a photo ≈ 200KB, a video ≈ 5MB/min",
        "QPS estimation: DAU × actions/user/day ÷ 86,400 = average QPS. Peak = 2-5× average",
        "The power of 2: 2^10 = 1K, 2^20 = 1M, 2^30 = 1G, 2^40 = 1T",
        "A single server can typically handle 1K-10K concurrent connections",
      ],
      explanation: "Example: Estimate storage for a Twitter-like service.\n\nAssumptions: 300M MAU, 50% DAU = 150M, each user tweets 2x/day, 10% have media.\nDaily tweets: 150M × 2 = 300M tweets/day\nText storage: 300M × 300 bytes = 90GB/day\nMedia storage: 30M × 200KB = 6TB/day\nTotal: ~6TB/day, ~2PB/year\n\nExample: Estimate QPS for the same service.\nDaily tweets: 300M. QPS = 300M / 86400 ≈ 3,500 write QPS\nReads are typically 100× writes: ~350K read QPS\nPeak (3× average): ~1M read QPS → need significant caching and load balancing.",
      realWorld: ["System design interviews always involve estimation", "Capacity planning for new features", "Cost estimation for cloud infrastructure"],
    },
  },
  {
    slug: "rest-api-design",
    title: "REST API Design",
    description: "Principles for designing clean, predictable, and scalable HTTP APIs",
    category: "fundamentals",
    difficulty: "Beginner",
    icon: "🔌",
    content: {
      overview: "REST (Representational State Transfer) is an architectural style for designing networked applications. It uses standard HTTP methods to perform CRUD operations on resources identified by URLs, making APIs intuitive, stateless, and cacheable.",
      keyPoints: [
        "Use nouns for resources, not verbs: /users, /orders — not /getUsers, /createOrder",
        "HTTP methods map to CRUD: GET (read), POST (create), PUT (update), PATCH (partial update), DELETE (remove)",
        "Use proper status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Server Error)",
        "APIs should be stateless — each request contains all information needed to process it",
        "Version your API: /api/v1/users — breaking changes go in a new version",
      ],
      explanation: "A well-designed REST API treats URLs as resource identifiers and HTTP methods as actions. Instead of creating custom endpoints like /getUserById?id=5 or /deleteUser?id=5, use the same URL /users/5 with different HTTP methods: GET to read, DELETE to remove.\n\nPagination, filtering, and sorting should use query parameters: /users?page=2&limit=20&sort=name. Nested resources model relationships: /users/5/orders returns orders for user 5.\n\nFor error responses, always include a structured body with an error code and human-readable message. This makes debugging easier for API consumers.",
      codeExample: {
        title: "Express.js REST API",
        code: `const express = require('express');
const app = express();

// GET /api/users - List all users
app.get('/api/users', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = db.users.paginate(page, limit);
  res.json({ data: users, page, limit });
});

// GET /api/users/:id - Get single user
app.get('/api/users/:id', (req, res) => {
  const user = db.users.findById(req.params.id);
  if (!user) return res.status(404).json({
    error: 'User not found'
  });
  res.json(user);
});

// POST /api/users - Create user
app.post('/api/users', (req, res) => {
  const user = db.users.create(req.body);
  res.status(201).json(user);
});`,
      },
      pros: ["Simple and universally understood", "Stateless — easy to scale horizontally", "Cacheable with HTTP standards"],
      cons: ["Over-fetching: endpoints return fixed data shapes", "Under-fetching: may need multiple requests for related data", "No built-in real-time support"],
      realWorld: ["GitHub API", "Stripe Payments API", "Twitter/X API"],
    },
  },
  // ── Scalability ───────────────────────────────────────────
  {
    slug: "vertical-scaling",
    title: "Vertical Scaling (Scale Up)",
    description: "Adding more power to a single machine — more CPU, RAM, or storage",
    category: "scalability",
    difficulty: "Beginner",
    icon: "⬆️",
    content: {
      overview: "Vertical scaling means upgrading a single server's hardware — adding more CPU cores, RAM, faster SSDs, or better network cards. It's the simplest way to handle increased load but has hard upper limits.",
      keyPoints: [
        "Simplest approach: no code changes needed, just upgrade the hardware",
        "Hard ceiling: even the most powerful single server has physical limits",
        "Single point of failure: one server going down means complete outage",
        "Cost scales non-linearly: doubling specs often more than doubles cost",
        "Good for databases and stateful workloads that are hard to distribute",
      ],
      explanation: "Vertical scaling is often the first approach because it requires zero architectural changes. If your PostgreSQL database is slow, upgrading from 16GB to 64GB of RAM and adding faster SSDs can provide immediate relief.\n\nHowever, vertical scaling hits a wall. The most powerful single AWS instance (u-24tb1.metal) has 448 vCPUs and 24TB RAM. Beyond that, you must go horizontal. More importantly, a single machine is a single point of failure — no matter how powerful it is, hardware eventually fails.\n\nVertical scaling makes sense early on (startups, MVPs) and for workloads that are inherently hard to distribute, like relational databases with complex joins.",
      pros: ["No code changes required", "No distributed system complexity", "Lower operational overhead"],
      cons: ["Hard upper limit on hardware specs", "Single point of failure", "Non-linear cost increase", "Requires downtime for upgrades"],
      realWorld: ["Upgrading a database server's RAM", "Moving to a larger EC2 instance", "Adding GPUs for ML workloads"],
    },
  },
  {
    slug: "horizontal-scaling",
    title: "Horizontal Scaling (Scale Out)",
    description: "Adding more machines to distribute load across a fleet of servers",
    category: "scalability",
    difficulty: "Beginner",
    icon: "➡️",
    content: {
      overview: "Horizontal scaling means adding more machines to your pool of resources rather than upgrading a single machine. It provides virtually unlimited scaling capacity, built-in redundancy, and is the foundation of modern cloud-native architectures.",
      keyPoints: [
        "Add more servers behind a load balancer to handle more traffic",
        "No hard ceiling — you can keep adding machines as needed",
        "Built-in redundancy: if one server fails, others continue serving",
        "Requires stateless application design or externalized state (Redis, database)",
        "Cloud auto-scaling makes horizontal scaling dynamic and cost-efficient",
      ],
      explanation: "With horizontal scaling, instead of one powerful server, you run many smaller servers behind a load balancer. When traffic increases, you add more servers. When it decreases, you remove them.\n\nThe key requirement is stateless design — individual servers should not store user sessions or application state locally. Instead, externalize state to shared stores like Redis (sessions), S3 (files), or a database (persistent data). This way, any server can handle any request.\n\nCloud platforms make horizontal scaling nearly effortless with auto-scaling groups that add/remove instances based on CPU usage, memory, or custom metrics. Kubernetes takes this further with pod auto-scaling.",
      codeExample: {
        title: "Stateless Express Server (Scaling-Ready)",
        code: `const express = require('express');
const Redis = require('ioredis');
const app = express();

// Externalize session state to Redis
// Any server instance can serve any user
const redis = new Redis(process.env.REDIS_URL);

app.post('/api/login', async (req, res) => {
  const user = await authenticate(req.body);
  const token = generateToken(user);

  // Store session in Redis, not in server memory
  await redis.set(\`session:\${token}\`, JSON.stringify(user),
    'EX', 3600);

  res.json({ token });
});

app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization;
  // Any server can retrieve this session
  const user = JSON.parse(
    await redis.get(\`session:\${token}\`)
  );
  res.json(user);
});`,
      },
      pros: ["Near-unlimited scaling capacity", "Built-in fault tolerance and redundancy", "Cost-efficient with auto-scaling"],
      cons: ["Requires stateless application design", "Adds complexity: load balancers, service discovery", "Data consistency is harder across multiple nodes"],
      realWorld: ["Netflix scales to 200M+ users with thousands of instances", "Auto-scaling groups in AWS/GCP/Azure", "Kubernetes pod auto-scaling"],
    },
  },
  {
    slug: "microservices",
    title: "Microservices Architecture",
    description: "Breaking a monolith into independently deployable services with clear boundaries",
    category: "scalability",
    difficulty: "Intermediate",
    icon: "🧱",
    content: {
      overview: "Microservices architecture decomposes an application into small, independently deployable services, each owning a specific business capability. Services communicate via APIs and can be developed, deployed, and scaled independently.",
      keyPoints: [
        "Each service owns its data and business logic — no shared databases",
        "Services communicate via REST, gRPC, or message queues",
        "Independent deployment: update one service without redeploying the entire app",
        "Scale individually: scale the payment service differently from the user service",
        "Organizational alignment: each team owns one or more services end-to-end",
      ],
      explanation: "In a monolith, all code lives in one deployable unit. Changing the payment logic requires redeploying the entire application, including user management, notifications, and search. In microservices, each concern is a separate service.\n\nThe key design principle is bounded contexts from Domain-Driven Design. Each service has clear boundaries and owns its own database. The user service has a user DB, the order service has an orders DB. They communicate through well-defined APIs, not shared database tables.\n\nThis independence comes at a cost: network calls replace function calls, distributed transactions are hard, and you need infrastructure for service discovery, load balancing, monitoring, and tracing.",
      pros: ["Independent scaling and deployment per service", "Technology flexibility — each service can use different tech", "Teams can work independently without code conflicts"],
      cons: ["Distributed system complexity (networking, consistency)", "Operational overhead: monitoring, tracing, deployment pipelines", "Inter-service communication latency"],
      realWorld: ["Netflix has 700+ microservices", "Amazon migrated from monolith to microservices in the 2000s", "Uber's architecture spans thousands of microservices"],
    },
  },
  {
    slug: "stateless-architecture",
    title: "Stateless Architecture",
    description: "Designing servers that don't store session state, enabling easy horizontal scaling",
    category: "scalability",
    difficulty: "Intermediate",
    icon: "🔄",
    content: {
      overview: "A stateless architecture ensures no individual server stores user session data. Instead, state is externalized to shared datastores like Redis or databases. This allows any server to handle any request, making horizontal scaling trivial.",
      keyPoints: [
        "Servers are interchangeable — any server can handle any request from any user",
        "Session data stored in Redis, database, or encoded in JWT tokens",
        "Load balancers don't need sticky sessions — requests can go to any server",
        "Servers can be added/removed freely without migrating state",
        "Simplifies deployment: rolling updates just swap servers in and out",
      ],
      explanation: "In a stateful design, if User A logs in on Server 1, their session lives in Server 1's memory. All subsequent requests from User A must go to Server 1 (sticky sessions). If Server 1 crashes, User A's session is lost.\n\nIn a stateless design, User A's session is stored in Redis. Any server can look up the session by token. Servers become commodity — you can spin up 10 more or shut down 5, and nothing breaks.\n\nTwo common approaches: (1) Server-side sessions in Redis — simple, flexible, supports revocation. (2) JWT tokens — no server-side storage needed, but harder to revoke and tokens can grow large.",
      pros: ["Trivial horizontal scaling", "No sticky sessions needed", "Server failures don't lose user state"],
      cons: ["External state store becomes a dependency", "Slight latency overhead for external lookups", "JWT tokens can become large with many claims"],
      realWorld: ["AWS Lambda functions are inherently stateless", "Kubernetes pods are designed to be stateless", "12-Factor App methodology mandates stateless processes"],
    },
  },
  // ── Load Balancing ────────────────────────────────────────
  {
    slug: "load-balancer",
    title: "Load Balancer Fundamentals",
    description: "Distributing traffic across multiple servers for reliability and performance",
    category: "load-balancing",
    difficulty: "Beginner",
    icon: "⚖️",
    content: {
      overview: "A load balancer sits between clients and a pool of backend servers, distributing incoming requests to ensure no single server is overwhelmed. It improves availability, reliability, and enables horizontal scaling.",
      keyPoints: [
        "Distributes traffic using algorithms: Round Robin, Least Connections, IP Hash, Weighted",
        "Health checks detect unhealthy servers and stop routing traffic to them",
        "L4 (Transport layer) balancers route based on IP/port; L7 (Application layer) can inspect HTTP headers and URLs",
        "Can terminate TLS/SSL, offloading encryption from backend servers",
        "Common solutions: Nginx, HAProxy, AWS ALB/NLB, Cloudflare",
      ],
      explanation: "Without a load balancer, all traffic hits a single server. That server becomes both a performance bottleneck and a single point of failure. A load balancer solves both problems by distributing requests across multiple servers.\n\nL4 load balancers operate at the TCP/UDP level — they're fast but can only route based on IP addresses and ports. L7 load balancers understand HTTP — they can route based on URL paths (/api/* → API servers, /static/* → CDN), headers, or cookies.\n\nHealth checks are critical. The load balancer periodically pings each backend server (e.g., GET /health). If a server doesn't respond, it's removed from the pool. When it recovers, it's added back.",
      codeExample: {
        title: "Nginx Load Balancer Configuration",
        code: `# /etc/nginx/nginx.conf
upstream backend {
    # Weighted round-robin
    server 10.0.0.1:8080 weight=3;
    server 10.0.0.2:8080 weight=2;
    server 10.0.0.3:8080 weight=1;

    # Health check: mark down after 3 failures
    # retry after 30 seconds
    server 10.0.0.4:8080 max_fails=3
                          fail_timeout=30s;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        return 200 'OK';
    }
}`,
      },
      pros: ["Eliminates single points of failure", "Enables horizontal scaling", "Provides SSL termination and request routing"],
      cons: ["Adds latency (extra network hop)", "Load balancer itself can become a bottleneck", "Configuration complexity for L7 routing"],
      realWorld: ["AWS ALB for web applications", "Nginx as a reverse proxy", "Cloudflare for global load balancing"],
    },
  },
  {
    slug: "lb-algorithms",
    title: "Load Balancing Algorithms",
    description: "Strategies for deciding which server receives each incoming request",
    category: "load-balancing",
    difficulty: "Intermediate",
    icon: "🎯",
    content: {
      overview: "Load balancing algorithms determine how incoming requests are distributed across servers. The choice of algorithm impacts performance, resource utilization, and user experience. Different workloads benefit from different strategies.",
      keyPoints: [
        "Round Robin: requests go to servers in sequential rotation — simple but ignores server load",
        "Weighted Round Robin: assigns more requests to more powerful servers",
        "Least Connections: sends traffic to the server with fewest active connections",
        "IP Hash: same client IP always goes to same server — good for session affinity",
        "Least Response Time: routes to the server responding fastest",
      ],
      explanation: "Round Robin is the simplest: Server 1, Server 2, Server 3, Server 1, Server 2... It works well when servers are identical and requests are similar in cost. But if one server is handling a long query, it still gets the next request.\n\nLeast Connections is smarter for variable workloads. If Server 1 has 50 active connections and Server 2 has 10, the next request goes to Server 2. This naturally adapts to servers with different capacities or workloads.\n\nIP Hash uses a hash of the client's IP to deterministically assign them to a server. This provides session affinity without sticky sessions, but causes imbalanced distribution if many clients share an IP (e.g., behind corporate NAT).",
      pros: ["Right algorithm dramatically improves resource utilization", "Can be tuned for specific workload patterns", "Most load balancers support multiple algorithms"],
      cons: ["No single algorithm is optimal for all workloads", "Some algorithms require tracking server state (connections, response times)", "Hash-based algorithms can create hotspots"],
      realWorld: ["CDNs use geographic + least connections", "API gateways often use round robin", "Database proxies use least connections"],
    },
  },
  {
    slug: "health-checks",
    title: "Health Checks & Failover",
    description: "Detecting unhealthy servers and automatically rerouting traffic",
    category: "load-balancing",
    difficulty: "Beginner",
    icon: "💓",
    content: {
      overview: "Health checks are periodic probes sent by load balancers to backend servers to verify they're functioning correctly. Unhealthy servers are automatically removed from the pool, and traffic is rerouted to healthy ones — this is failover.",
      keyPoints: [
        "Active health checks: load balancer pings servers periodically (GET /health)",
        "Passive health checks: monitor actual request failures to detect issues",
        "Health endpoints should check dependencies: database, cache, external APIs",
        "Grace periods prevent flapping: don't remove a server for one failed check",
        "Readiness vs liveness: 'ready to serve' vs 'process is alive' are different checks",
      ],
      explanation: "A basic health check is an HTTP endpoint that returns 200 OK when the server is healthy. But a smart health check also verifies dependencies — if the database connection is down, the server should report unhealthy even though the process is running.\n\nKubernetes distinguishes between liveness probes (is the process alive? restart if not) and readiness probes (is it ready to serve traffic? remove from service if not). A server can be alive but not ready — for example, during startup while loading data into memory.\n\nFailover strategies: Active-passive (standby server takes over on failure) and Active-active (all servers handle traffic, load redistributed on failure).",
      codeExample: {
        title: "Health Check Endpoint",
        code: `app.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    await db.query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks)
    .every(s => s === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});`,
      },
      realWorld: ["Kubernetes liveness/readiness probes", "AWS ALB target group health checks", "Docker HEALTHCHECK instruction"],
    },
  },
  // ── Databases ─────────────────────────────────────────────
  {
    slug: "sql-vs-nosql",
    title: "SQL vs NoSQL Databases",
    description: "Choosing between relational and non-relational databases based on your use case",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📊",
    content: {
      overview: "SQL databases (PostgreSQL, MySQL) store data in structured tables with predefined schemas and support complex queries with joins. NoSQL databases (MongoDB, Cassandra, Redis) offer flexible schemas, horizontal scalability, and are optimized for specific access patterns.",
      keyPoints: [
        "SQL: structured schema, ACID transactions, powerful joins, vertical scaling",
        "NoSQL types: Document (MongoDB), Key-Value (Redis), Column-Family (Cassandra), Graph (Neo4j)",
        "Choose SQL when you need complex queries, transactions, and data integrity",
        "Choose NoSQL when you need flexible schemas, massive scale, or specific data models",
        "Many modern systems use both (polyglot persistence) — SQL for transactions, NoSQL for caching/search",
      ],
      explanation: "SQL databases enforce a rigid schema: every row in a table has the same columns. This makes queries powerful (JOIN users ON orders.user_id = users.id) but schema changes require migrations. They excel at complex queries and ACID transactions.\n\nNoSQL databases trade structure for flexibility. MongoDB stores JSON documents — each document can have different fields. Cassandra distributes data across nodes for massive write throughput. Redis keeps everything in memory for sub-millisecond reads.\n\nThe choice depends on your access patterns. If you're building an e-commerce site with complex inventory queries, SQL is likely better. If you're building a chat app that needs to store billions of messages and scale horizontally, a NoSQL database like Cassandra may be more appropriate.",
      pros: ["SQL: mature tooling, ACID, complex queries", "NoSQL: flexible schema, horizontal scale, high throughput"],
      cons: ["SQL: harder to scale horizontally, rigid schema", "NoSQL: limited joins, eventual consistency, less tooling"],
      realWorld: ["PostgreSQL for transactional workloads", "MongoDB for content management", "Redis for caching and sessions", "Cassandra for time-series data at scale"],
    },
  },
  {
    slug: "database-indexing",
    title: "Database Indexing",
    description: "Using data structures to speed up query performance at the cost of write overhead",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📇",
    content: {
      overview: "A database index is a data structure (typically a B-tree or hash table) that speeds up data retrieval operations. Without an index, the database must scan every row in a table (full table scan). With an index, it can jump directly to the matching rows.",
      keyPoints: [
        "B-tree indexes: ordered, support range queries (WHERE age > 25), most common type",
        "Hash indexes: exact match only (WHERE email = 'x'), faster for equality but no ranges",
        "Composite indexes: multiple columns (name, age) — column order matters for query optimization",
        "Trade-off: indexes speed up reads but slow down writes (index must be updated on every insert/update)",
        "EXPLAIN ANALYZE reveals whether queries use indexes or full table scans",
      ],
      explanation: "Think of an index like a book's index. Without it, finding a topic requires reading every page. With it, you look up the term and jump directly to the right page.\n\nA B-tree index keeps data sorted in a balanced tree structure. Finding a value in a table of 1 million rows takes ~20 comparisons (log2(1M)) instead of scanning all 1M rows. This is the difference between a 1ms query and a 1-second query.\n\nBe strategic about indexing. Every index consumes storage and slows down writes. Index columns that appear in WHERE clauses, JOIN conditions, and ORDER BY. Don't index columns with low cardinality (e.g., a boolean 'active' column with only 2 values).",
      codeExample: {
        title: "Creating and Using Indexes",
        code: `-- Create an index on the email column
CREATE INDEX idx_users_email ON users(email);

-- Composite index for common query pattern
CREATE INDEX idx_orders_user_date
  ON orders(user_id, created_at DESC);

-- Check if a query uses the index
EXPLAIN ANALYZE
  SELECT * FROM users WHERE email = 'user@test.com';
-- Output: Index Scan using idx_users_email
--         (cost=0.29..8.31 rows=1)

-- Partial index: only index active users
CREATE INDEX idx_active_users
  ON users(email) WHERE active = true;`,
      },
      pros: ["Dramatically speeds up read queries (100-1000x)", "Enables efficient sorting and range queries", "Partial indexes reduce storage overhead"],
      cons: ["Slows down INSERT/UPDATE/DELETE operations", "Consumes additional storage space", "Too many indexes can hurt overall performance"],
      realWorld: ["Every production database uses indexes", "Full-text search indexes (Elasticsearch, PostgreSQL tsvector)", "Geospatial indexes for location queries"],
    },
  },
  {
    slug: "database-replication",
    title: "Database Replication",
    description: "Copying data across multiple servers for availability, redundancy, and read scaling",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📋",
    content: {
      overview: "Database replication copies data from a primary (master) database to one or more replicas (slaves). The primary handles all writes, while replicas serve read queries. This improves read performance, provides redundancy, and enables geographic distribution.",
      keyPoints: [
        "Master-slave: one primary handles writes, replicas handle reads",
        "Synchronous replication: replica confirms write before primary responds — consistent but slower",
        "Asynchronous replication: primary responds immediately, replica catches up later — faster but may have stale reads",
        "Failover: if master dies, a replica is promoted to master (automatic or manual)",
        "Replication lag: the delay between a write on master and its appearance on replicas",
      ],
      explanation: "Most applications are read-heavy (90-99% reads). With a single database, the server handles both reads and writes. Replication lets you add read replicas to distribute the read load.\n\nWith 1 master and 3 replicas, your read capacity roughly quadruples. The master handles all writes and replicates changes to replicas asynchronously. Reads are distributed across replicas by a load balancer.\n\nThe main challenge is replication lag. If a user writes data and immediately reads it, the read might hit a replica that hasn't received the write yet. Solutions include reading from master after writes, using synchronous replication (at a performance cost), or using session-aware routing.",
      pros: ["Scales read capacity linearly with replicas", "High availability — replica can be promoted on master failure", "Geographic distribution reduces latency for global users"],
      cons: ["Replication lag causes stale reads", "Write capacity is still limited to the master", "Failover can cause brief data loss with async replication"],
      realWorld: ["Amazon RDS Multi-AZ uses synchronous replication for failover", "MySQL read replicas for read-heavy workloads", "PostgreSQL streaming replication"],
    },
  },
  {
    slug: "database-sharding",
    title: "Database Sharding",
    description: "Splitting data across multiple database instances using a shard key",
    category: "databases",
    difficulty: "Advanced",
    icon: "🔀",
    content: {
      overview: "Sharding horizontally partitions data across multiple database instances (shards). Each shard holds a subset of the data, determined by a shard key. This enables near-unlimited write and storage scaling, but adds significant complexity.",
      keyPoints: [
        "Each shard is an independent database holding a subset of data",
        "Shard key determines which shard holds each row: hash(user_id) % num_shards",
        "Range-based sharding: user IDs 1-1M → Shard 1, 1M-2M → Shard 2",
        "Hash-based sharding: hash(key) % N distributes evenly but makes range queries hard",
        "Resharding is painful: adding/removing shards requires data migration",
      ],
      explanation: "When a single database can't handle the write volume or data size, sharding splits the data across multiple databases. A user with ID 12345 might go to shard hash(12345) % 4 = Shard 1.\n\nThe critical decision is choosing the shard key. A good shard key distributes data evenly and allows most queries to target a single shard. For a social app, user_id is often a good shard key — most queries are about a specific user's data.\n\nBad shard keys create hotspots. Sharding by country puts 90% of data on one shard if most users are in one country. Celebrity problems also arise: sharding by user_id puts all of a celebrity's millions of followers' interactions on one shard.\n\nCross-shard queries (e.g., join data from two shards) are expensive and should be avoided through denormalization.",
      codeExample: {
        title: "Simple Sharding Logic",
        code: `class ShardRouter {
  constructor(shardCount) {
    this.shards = new Array(shardCount)
      .fill(null)
      .map((_, i) => new Database(\`shard_\${i}\`));
  }

  // Determine which shard owns this key
  getShard(userId) {
    const shardId = this.hash(userId)
      % this.shards.length;
    return this.shards[shardId];
  }

  async getUser(userId) {
    const shard = this.getShard(userId);
    return shard.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
  }

  hash(key) {
    // Consistent hash for better resharding
    let hash = 0;
    const str = String(key);
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}`,
      },
      pros: ["Virtually unlimited write and storage scaling", "Each shard can be on different hardware or regions", "Failure of one shard doesn't affect others"],
      cons: ["Resharding is extremely complex and risky", "Cross-shard queries are slow and complicated", "Application must be shard-aware", "Hotspot/celebrity problem with poor key choice"],
      realWorld: ["Instagram shards PostgreSQL by user ID", "Discord shards messages by channel ID", "Vitess provides sharding for MySQL (used by YouTube)"],
    },
  },
  {
    slug: "database-normalization",
    title: "Normalization vs Denormalization",
    description: "Organizing data to reduce redundancy vs duplicating data for read performance",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📐",
    content: {
      overview: "Normalization organizes data to eliminate redundancy by splitting it into related tables (1NF, 2NF, 3NF). Denormalization intentionally introduces redundancy by duplicating data to avoid expensive joins and improve read performance.",
      keyPoints: [
        "Normalization: reduces data duplication, ensures consistency, requires joins for queries",
        "Denormalization: duplicates data for faster reads, risks data inconsistency",
        "Normalize for write-heavy, consistency-critical systems (banking, inventory)",
        "Denormalize for read-heavy, performance-critical systems (feeds, dashboards)",
        "Many systems start normalized and denormalize specific hot paths as needed",
      ],
      explanation: "In a normalized schema, a user's city is stored once in a cities table and referenced by city_id. Changing the city name updates one row. But querying a user with their city requires a JOIN.\n\nIn a denormalized schema, the city name is stored directly in the users table. No join needed for reads, but changing a city name requires updating every user in that city. This is the fundamental trade-off: write complexity vs read performance.\n\nThe rule of thumb: start normalized, then selectively denormalize the queries that are too slow. Use materialized views to denormalize automatically — the database maintains the denormalized view when source data changes.",
      pros: ["Normalized: single source of truth, easy updates, smaller storage", "Denormalized: faster reads, simpler queries, fewer joins"],
      cons: ["Normalized: slow reads with many joins, complex queries", "Denormalized: data inconsistency risk, larger storage, complex writes"],
      realWorld: ["E-commerce product catalogs (denormalized for read speed)", "Financial ledgers (normalized for accuracy)", "Social media feeds (denormalized for display speed)"],
    },
  },
  // ── Caching ───────────────────────────────────────────────
  {
    slug: "caching-fundamentals",
    title: "Caching Fundamentals",
    description: "Storing frequently accessed data in fast storage to reduce latency and database load",
    category: "caching",
    difficulty: "Beginner",
    icon: "💾",
    content: {
      overview: "Caching stores copies of frequently accessed data in a faster storage layer (typically RAM) so that future requests can be served without hitting the slower primary store (database, API). A well-implemented cache can reduce latency by 10-100x and cut database load by 80-90%.",
      keyPoints: [
        "Cache hit: data found in cache → fast response. Cache miss: data not in cache → query source, then store in cache",
        "Cache layers: browser → CDN → application cache (Redis) → database query cache",
        "Cache hit ratio: the percentage of requests served from cache. Target: 90%+ for hot data",
        "TTL (Time to Live): how long cached data remains valid before expiration",
        "The two hardest problems in CS: cache invalidation and naming things",
      ],
      explanation: "The principle is simple: keep hot data close and fast. RAM access is ~100ns, SSD is ~150μs, network round trip is ~0.5ms. Serving data from an in-memory cache like Redis (~0.1ms) is dramatically faster than a database query (~5-50ms).\n\nA typical caching flow: (1) Check cache for key. (2) If hit, return cached data. (3) If miss, query database, store result in cache with TTL, return data.\n\nThe hard part is cache invalidation — when the source data changes, the cache becomes stale. Strategies include: TTL-based expiration (simple, eventually consistent), write-through (update cache on every write), and event-driven invalidation (publish events when data changes).",
      codeExample: {
        title: "Cache-Aside Pattern with Redis",
        code: `async function getUser(userId) {
  const cacheKey = \`user:\${userId}\`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached); // Cache hit
  }

  // 2. Cache miss — query database
  const user = await db.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  // 3. Store in cache with 1-hour TTL
  await redis.set(cacheKey, JSON.stringify(user),
    'EX', 3600);

  return user;
}

// Invalidate on update
async function updateUser(userId, data) {
  await db.query('UPDATE users SET ...', data);
  await redis.del(\`user:\${userId}\`); // Bust cache
}`,
      },
      pros: ["10-100x latency reduction", "Reduces database load by 80-90%", "Improves application throughput"],
      cons: ["Cache invalidation is complex", "Stale data is possible", "Additional infrastructure to manage (Redis cluster)"],
      realWorld: ["Facebook caches billions of objects in Memcached", "Every CDN is a distributed cache", "Browser caching of static assets"],
    },
  },
  {
    slug: "cache-strategies",
    title: "Caching Strategies",
    description: "Patterns for reading and writing data through the cache layer",
    category: "caching",
    difficulty: "Intermediate",
    icon: "🔁",
    content: {
      overview: "Caching strategies define how data flows between the application, cache, and database. The right strategy depends on your read/write ratio, consistency requirements, and whether you can tolerate stale data.",
      keyPoints: [
        "Cache-Aside (Lazy Loading): app manages cache — read from cache, fall back to DB, populate cache on miss",
        "Read-Through: cache itself fetches from DB on miss — app always talks to cache",
        "Write-Through: writes go to cache first, cache synchronously writes to DB — consistent but slower writes",
        "Write-Behind (Write-Back): writes go to cache, cache asynchronously writes to DB — fast writes, risk of data loss",
        "Write-Around: writes go directly to DB, cache is populated only on reads — avoids caching rarely-read data",
      ],
      explanation: "Cache-Aside is the most common pattern. The application is responsible for reading from cache, handling misses by querying the database, and updating the cache. It's simple and gives the app full control.\n\nWrite-Through ensures the cache is always consistent with the database by writing to both on every update. The downside is higher write latency (two writes per operation).\n\nWrite-Behind (Write-Back) is the fastest for writes — data goes to cache immediately and is written to the database asynchronously in batches. This is great for write-heavy workloads but risks data loss if the cache fails before flushing to the database.\n\nIn practice, many systems combine strategies: Cache-Aside for reads with Write-Around for writes that are rarely read back.",
      pros: ["Cache-Aside: simple, handles failures gracefully", "Write-Through: cache always consistent", "Write-Behind: fastest write performance"],
      cons: ["Cache-Aside: initial requests always miss", "Write-Through: higher write latency", "Write-Behind: risk of data loss on cache failure"],
      realWorld: ["DynamoDB DAX uses read-through + write-through", "CPU caches use write-back strategy", "Application-level caching typically uses cache-aside"],
    },
  },
  {
    slug: "cache-eviction",
    title: "Cache Eviction Policies",
    description: "Strategies for deciding which cached data to remove when the cache is full",
    category: "caching",
    difficulty: "Intermediate",
    icon: "🗑️",
    content: {
      overview: "Cache eviction policies determine which entries to remove when the cache reaches its memory limit. The goal is to keep the most useful data cached while evicting data that's least likely to be requested again.",
      keyPoints: [
        "LRU (Least Recently Used): evicts the entry that hasn't been accessed for the longest time — most common",
        "LFU (Least Frequently Used): evicts the entry accessed the fewest times — good for stable hot sets",
        "FIFO (First In, First Out): evicts the oldest entry regardless of access pattern",
        "TTL-based: entries expire after a set time regardless of access — ensures freshness",
        "Random eviction: randomly selects an entry to remove — surprisingly effective and O(1)",
      ],
      explanation: "LRU is the default choice for most caching scenarios. It assumes recently accessed data is likely to be accessed again (temporal locality). Redis uses an approximated LRU by sampling random keys and evicting the least recently used among the sample.\n\nLFU is better when some items are consistently popular. A viral video should stay cached even if it wasn't accessed in the last minute. LFU tracks access counts and evicts the least popular item.\n\nIn practice, most systems use LRU with TTL. Every entry gets a maximum lifespan (TTL) for freshness, and LRU handles capacity limits. Redis supports multiple eviction policies configurable per instance.",
      codeExample: {
        title: "LRU Cache Implementation",
        code: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // Map preserves insertion order
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    // Evict oldest if over capacity
    if (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
  }
}`,
      },
      realWorld: ["Redis supports 8 eviction policies", "CPU L1/L2/L3 caches use variants of LRU", "CDNs use LRU + TTL for static assets"],
    },
  },
  {
    slug: "redis",
    title: "Redis",
    description: "In-memory data store used for caching, sessions, queues, and real-time features",
    category: "caching",
    difficulty: "Intermediate",
    icon: "🔴",
    content: {
      overview: "Redis is an in-memory data structure store that supports strings, hashes, lists, sets, sorted sets, streams, and more. It's used for caching, session management, real-time leaderboards, rate limiting, pub/sub messaging, and queues. With sub-millisecond latency, Redis handles millions of operations per second.",
      keyPoints: [
        "Data structures: Strings, Hashes, Lists, Sets, Sorted Sets, Streams, HyperLogLog",
        "Persistence options: RDB snapshots and AOF (Append Only File) for durability",
        "Pub/Sub for real-time messaging between services",
        "Lua scripting for atomic multi-step operations",
        "Redis Cluster provides horizontal scaling with automatic sharding",
      ],
      explanation: "Redis shines because it's more than a simple key-value store. Its data structures enable powerful patterns:\n\n- Sorted Sets for leaderboards: ZADD leaderboard 1500 'player1' — O(log N) insert and O(log N) ranking.\n- Lists for queues: LPUSH to enqueue, BRPOP to dequeue with blocking.\n- Sets for unique tracking: SADD to track unique visitors, SCARD to count them.\n- HyperLogLog for cardinality estimation: counts unique items with ~0.81% error using only 12KB of memory.\n\nRedis processes commands single-threaded, which eliminates race conditions for individual commands. For atomic multi-step operations, use Lua scripts or MULTI/EXEC transactions.",
      codeExample: {
        title: "Redis Patterns in Node.js",
        code: `const Redis = require('ioredis');
const redis = new Redis();

// Caching with TTL
await redis.set('user:123', JSON.stringify(user),
  'EX', 3600);
const cached = JSON.parse(await redis.get('user:123'));

// Leaderboard with Sorted Sets
await redis.zadd('leaderboard', 1500, 'alice');
await redis.zadd('leaderboard', 2200, 'bob');
// Top 10 players with scores
const top10 = await redis.zrevrange(
  'leaderboard', 0, 9, 'WITHSCORES'
);

// Rate limiter with sliding window
async function isRateLimited(userId, limit = 100) {
  const key = \`rate:\${userId}\`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  return count > limit;
}`,
      },
      pros: ["Sub-millisecond latency", "Rich data structures beyond key-value", "Pub/Sub for real-time features"],
      cons: ["Limited by available RAM", "Single-threaded for commands (CPU bound for complex ops)", "Data loss risk without persistence configured"],
      realWorld: ["Twitter uses Redis for timeline caching", "GitHub uses Redis for job queues (Resque)", "Snapchat uses Redis for stories"],
    },
  },
  // ── Networking & CDN ──────────────────────────────────────
  {
    slug: "cdn",
    title: "Content Delivery Network (CDN)",
    description: "Geographically distributed servers that cache and serve content close to users",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🌐",
    content: {
      overview: "A CDN is a network of edge servers deployed across the globe that cache and serve static content (images, CSS, JS, videos) from locations close to users. This dramatically reduces latency and offloads traffic from your origin servers.",
      keyPoints: [
        "Edge servers cache static content close to users — a user in Tokyo gets content from a Tokyo edge server, not a US origin",
        "Pull CDN: edge fetches from origin on first request, caches for subsequent ones",
        "Push CDN: you upload content to the CDN proactively",
        "Cache-Control headers and TTL control how long edges cache content",
        "CDN invalidation: purge cached content when it changes (takes seconds to minutes globally)",
      ],
      explanation: "Without a CDN, every user request travels to your origin server, which might be in a single region. A user in Australia loading assets from a US server experiences ~200ms latency per request.\n\nWith a CDN, static assets are cached at 200+ edge locations worldwide. The Australian user gets assets from a Sydney edge server with ~20ms latency — a 10x improvement.\n\nModern CDNs go beyond static caching: Cloudflare Workers and AWS CloudFront Functions run serverless code at the edge. They can handle authentication, A/B testing, redirects, and API caching without going to the origin server.",
      pros: ["10x latency reduction for global users", "Offloads 60-90% of traffic from origin", "DDoS protection and SSL termination included"],
      cons: ["Stale content if invalidation is slow", "Cost per GB of bandwidth", "Complex cache key management for dynamic content"],
      realWorld: ["Netflix serves 90% of traffic through its Open Connect CDN", "Cloudflare, AWS CloudFront, Akamai, Fastly", "GitHub Pages uses Fastly CDN"],
    },
  },
  {
    slug: "websockets",
    title: "WebSockets",
    description: "Full-duplex communication channel for real-time data between client and server",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🔌",
    content: {
      overview: "WebSockets provide a persistent, full-duplex communication channel over a single TCP connection. Unlike HTTP's request-response model, WebSockets allow both client and server to send messages at any time, making them ideal for real-time applications.",
      keyPoints: [
        "Full-duplex: both sides can send messages independently without waiting for a response",
        "Persistent connection: the connection stays open, eliminating the overhead of repeated HTTP handshakes",
        "Starts as HTTP upgrade request, then switches to WebSocket protocol (ws:// or wss://)",
        "Low overhead: 2-byte frame header vs HTTP's ~700 bytes of headers per request",
        "Scaling challenge: each connection consumes server memory; a single server can handle ~50K-100K connections",
      ],
      explanation: "HTTP is a request-response protocol. The client asks, the server answers. For real-time features like chat, live notifications, or collaborative editing, the server needs to push updates to the client without being asked. Polling (repeated HTTP requests) wastes bandwidth and adds latency.\n\nWebSockets solve this with a persistent connection. After the initial HTTP handshake, the connection upgrades to WebSocket. Both sides can send messages freely with minimal overhead.\n\nScaling WebSockets requires sticky sessions (a client must stay connected to the same server) or a pub/sub layer like Redis. When Server 1 receives a message for a user connected to Server 2, it publishes to Redis, and Server 2 delivers it.",
      codeExample: {
        title: "WebSocket Server & Client",
        code: `// Server (Node.js with 'ws' library)
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });
});

// Client (Browser)
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  console.log('Received:', event.data);
};
ws.send('Hello from client!');`,
      },
      pros: ["True real-time bidirectional communication", "Low latency and overhead after connection", "Efficient for high-frequency updates"],
      cons: ["Stateful connections are harder to scale", "Connection drops require reconnection logic", "Not all proxies/firewalls support WebSockets"],
      realWorld: ["Slack, Discord for real-time messaging", "Google Docs collaborative editing", "Live sports scores and stock tickers"],
    },
  },
  {
    slug: "api-gateway",
    title: "API Gateway",
    description: "A single entry point that routes, authenticates, and manages API traffic",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🚪",
    content: {
      overview: "An API Gateway is a server that acts as the single entry point for all client requests. It handles cross-cutting concerns like authentication, rate limiting, request routing, response transformation, and monitoring — so individual services don't have to.",
      keyPoints: [
        "Single entry point: clients call one URL, the gateway routes to the right microservice",
        "Cross-cutting concerns: authentication, rate limiting, logging, CORS, TLS termination",
        "Request aggregation: combine responses from multiple services into a single API response",
        "Protocol translation: accept REST from clients, call gRPC internally",
        "Popular options: Kong, AWS API Gateway, Nginx, Envoy, Traefik",
      ],
      explanation: "In a microservices architecture, clients shouldn't need to know which service handles each request. Instead of calling user-service:3000/profile and order-service:3001/orders, the client calls api.example.com/profile and api.example.com/orders. The gateway routes each request to the correct service.\n\nThe gateway also centralizes authentication — verify the JWT token once at the gateway instead of in every service. Same for rate limiting: enforce rate limits at the edge before requests reach your services.\n\nThe Backend for Frontend (BFF) pattern takes this further: create separate gateways for web, mobile, and third-party clients, each aggregating data differently.",
      pros: ["Simplifies client code — one endpoint to call", "Centralizes auth, rate limiting, logging", "Enables protocol translation and response aggregation"],
      cons: ["Single point of failure if not highly available", "Adds latency (extra network hop)", "Can become a development bottleneck"],
      realWorld: ["AWS API Gateway for serverless APIs", "Netflix Zuul / Spring Cloud Gateway", "Kong for API management at scale"],
    },
  },
  // ── Messaging ─────────────────────────────────────────────
  {
    slug: "message-queues",
    title: "Message Queues",
    description: "Asynchronous communication between services using producer-consumer pattern",
    category: "messaging",
    difficulty: "Intermediate",
    icon: "📬",
    content: {
      overview: "A message queue is a form of asynchronous service-to-service communication. Messages are stored in a queue until they're processed by a consumer. This decouples producers from consumers, enables independent scaling, and provides built-in buffering for traffic spikes.",
      keyPoints: [
        "Producer sends message to queue → Consumer reads and processes it asynchronously",
        "Decoupling: producer doesn't need to know about the consumer or wait for processing",
        "Buffering: the queue absorbs traffic spikes that would overwhelm downstream services",
        "Guaranteed delivery: messages persist in the queue until acknowledged by the consumer",
        "Popular options: RabbitMQ, AWS SQS, Redis (with lists or streams)",
      ],
      explanation: "Consider an e-commerce order flow. When a user places an order, you need to: process payment, update inventory, send confirmation email, notify the warehouse. Without a queue, the API handler does all of this synchronously — the user waits 5+ seconds.\n\nWith a queue, the API handler saves the order and publishes an 'order.created' message. The user gets an immediate response. Separate consumer services pick up the message and handle payment, inventory, email, and notifications in parallel.\n\nIf the email service is down, the message stays in the queue. When the service recovers, it processes the backlog. No messages are lost.",
      codeExample: {
        title: "Message Queue with BullMQ (Redis)",
        code: `import { Queue, Worker } from 'bullmq';

// Producer: enqueue a job
const emailQueue = new Queue('emails');

await emailQueue.add('welcome', {
  to: 'user@example.com',
  subject: 'Welcome!',
  template: 'welcome',
});

// Consumer: process jobs
const worker = new Worker('emails', async (job) => {
  console.log(\`Sending \${job.name} to \${job.data.to}\`);
  await sendEmail(job.data);
}, {
  concurrency: 5,  // Process 5 emails in parallel
});

worker.on('completed', (job) => {
  console.log(\`Job \${job.id} completed\`);
});

worker.on('failed', (job, err) => {
  console.log(\`Job \${job.id} failed: \${err.message}\`);
  // BullMQ retries automatically
});`,
      },
      pros: ["Decouples services for independent scaling", "Buffers traffic spikes", "Guaranteed delivery with persistence"],
      cons: ["Adds complexity and latency (async processing)", "Message ordering can be tricky", "Requires monitoring for queue depth and consumer lag"],
      realWorld: ["Email/notification delivery pipelines", "Order processing in e-commerce", "Video transcoding pipelines (YouTube, TikTok)"],
    },
  },
  {
    slug: "kafka",
    title: "Apache Kafka",
    description: "Distributed event streaming platform for high-throughput real-time data pipelines",
    category: "messaging",
    difficulty: "Advanced",
    icon: "📡",
    content: {
      overview: "Apache Kafka is a distributed event streaming platform designed for high-throughput, low-latency, and durable message processing. Unlike traditional message queues where messages are deleted after consumption, Kafka retains messages for a configurable period, allowing multiple consumers to read the same data independently.",
      keyPoints: [
        "Topics are split into partitions — each partition is an ordered, append-only log",
        "Consumer groups enable parallel processing: each partition is consumed by one consumer in the group",
        "Messages are retained for days/weeks, not deleted after reading — enables replay and reprocessing",
        "Producers choose partition by key: same key always goes to same partition (ordering guarantee)",
        "Throughput: a single Kafka cluster can handle millions of messages per second",
      ],
      explanation: "Kafka's architecture is fundamentally different from traditional queues. A topic is divided into partitions, each stored on different brokers. Producers append messages to partitions, and consumers read from them at their own pace.\n\nConsumer groups enable parallelism: if a topic has 6 partitions and a consumer group has 3 consumers, each consumer reads from 2 partitions. Adding a 4th consumer would rebalance to give each consumer ~1.5 partitions.\n\nKafka's killer feature is the persistent log. Messages aren't deleted after consumption — they stay for a configured retention period (default 7 days). This enables: replaying events for debugging, adding new consumers that process historical data, and event sourcing architectures.",
      codeExample: {
        title: "Kafka Producer & Consumer (KafkaJS)",
        code: `const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['localhost:9092'] });

// Producer
const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'user-events',
  messages: [
    {
      key: 'user-123',       // Same key → same partition
      value: JSON.stringify({
        type: 'page_view',
        url: '/products/42',
        timestamp: Date.now(),
      }),
    },
  ],
});

// Consumer
const consumer = kafka.consumer({
  groupId: 'analytics-group',
});
await consumer.connect();
await consumer.subscribe({ topic: 'user-events' });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value);
    console.log(\`[\${partition}] \${event.type}\`);
    await processEvent(event);
  },
});`,
      },
      pros: ["Millions of messages per second throughput", "Message replay and reprocessing", "Decoupled producers and consumers"],
      cons: ["Complex to operate (ZooKeeper/KRaft, partition management)", "Not ideal for low-latency request-response patterns", "Consumer rebalancing can cause processing delays"],
      realWorld: ["LinkedIn processes 7 trillion messages/day with Kafka", "Uber uses Kafka for real-time trip tracking", "Netflix uses Kafka for event processing pipelines"],
    },
  },
  {
    slug: "pub-sub",
    title: "Pub/Sub Pattern",
    description: "Publishers broadcast messages to all subscribers without knowing who they are",
    category: "messaging",
    difficulty: "Intermediate",
    icon: "📢",
    content: {
      overview: "The Publish/Subscribe pattern decouples message senders (publishers) from receivers (subscribers). Publishers send messages to a topic/channel without knowing who will receive them. All subscribers to that topic get a copy of the message. This enables broadcasting, event notification, and loose coupling between services.",
      keyPoints: [
        "Publishers and subscribers are fully decoupled — neither knows about the other",
        "Topic-based: messages are published to named topics, subscribers choose which topics to listen to",
        "Fan-out: one message is delivered to ALL subscribers (unlike queues where one consumer gets it)",
        "At-most-once delivery (Redis Pub/Sub) vs at-least-once (Kafka, Google Pub/Sub)",
        "Common implementations: Redis Pub/Sub, Google Cloud Pub/Sub, AWS SNS, Kafka topics",
      ],
      explanation: "In a message queue, each message is consumed by exactly one consumer. In pub/sub, each message is delivered to ALL subscribers. This is the key difference.\n\nConsider a user signup event. Multiple services care: the email service sends a welcome email, the analytics service tracks the signup, the recommendation service initializes preferences. With pub/sub, the auth service publishes a 'user.signup' event, and all three services receive it independently.\n\nRedis Pub/Sub is simple but ephemeral — if a subscriber is offline, it misses messages. Google Cloud Pub/Sub and Kafka provide durable pub/sub with message retention, so subscribers can catch up after downtime.",
      pros: ["Loose coupling — add subscribers without changing publishers", "Fan-out to multiple consumers effortlessly", "Natural fit for event-driven architectures"],
      cons: ["Message ordering is not guaranteed across subscribers", "Debugging is harder — messages flow to unknown subscribers", "No guarantee all subscribers processed successfully"],
      realWorld: ["Real-time notifications (new message, friend request)", "Microservice event propagation", "Live dashboards and monitoring alerts"],
    },
  },
  {
    slug: "event-driven",
    title: "Event-Driven Architecture",
    description: "Systems that communicate through events rather than direct synchronous calls",
    category: "messaging",
    difficulty: "Advanced",
    icon: "⚡",
    content: {
      overview: "Event-Driven Architecture (EDA) is a design pattern where system components communicate by producing and consuming events. Instead of services calling each other directly, they publish events that other services react to asynchronously, enabling loose coupling and high scalability.",
      keyPoints: [
        "Events represent facts: 'OrderPlaced', 'PaymentProcessed', 'UserRegistered'",
        "Event sourcing: store events as the source of truth, derive current state by replaying them",
        "CQRS (Command Query Responsibility Segregation): separate write and read models",
        "Saga pattern: coordinate distributed transactions across services using event chains",
        "Eventual consistency: the system reaches consistency over time, not immediately",
      ],
      explanation: "In a traditional architecture, the order service directly calls the payment service, then the inventory service, then the notification service. If any call fails, complex rollback logic is needed.\n\nIn EDA, the order service publishes an 'OrderPlaced' event. The payment service reacts by processing payment and publishing 'PaymentProcessed'. The inventory service reacts to that by reserving stock. Each service is independent and handles its own failures.\n\nEvent sourcing takes this further: instead of storing the current state of an order (status: 'shipped'), you store the sequence of events (OrderPlaced → PaymentReceived → ItemPicked → Shipped). You can reconstruct the current state by replaying events, and you have a complete audit trail.",
      pros: ["Extreme loose coupling between services", "Natural audit trail with event sourcing", "Each service scales independently"],
      cons: ["Eventual consistency requires careful design", "Debugging event chains is complex", "Event schema evolution needs careful management"],
      realWorld: ["Banking transaction processing", "E-commerce order fulfillment pipelines", "IoT sensor data processing"],
    },
  },
  // ── Distributed Systems ───────────────────────────────────
  {
    slug: "consistent-hashing",
    title: "Consistent Hashing",
    description: "Distributing data across nodes so adding/removing nodes minimizes data movement",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🎡",
    content: {
      overview: "Consistent hashing distributes data across a cluster of nodes using a hash ring. When a node is added or removed, only a fraction of keys (approximately 1/n) need to be remapped, compared to traditional hashing where nearly all keys must move.",
      keyPoints: [
        "Nodes and keys are placed on a circular hash space (ring) using the same hash function",
        "Each key is assigned to the first node encountered clockwise on the ring",
        "Adding a node only affects keys between it and its predecessor — minimal disruption",
        "Virtual nodes: each physical node has multiple positions on the ring for better distribution",
        "Without virtual nodes, data can be unevenly distributed; 100-200 virtual nodes per server is common",
      ],
      explanation: "With traditional hash-based distribution (key % N servers), adding or removing a server remaps almost every key. If you go from 3 to 4 servers, ~75% of keys move to different servers — cache invalidation disaster.\n\nConsistent hashing arranges the hash space as a ring (0 to 2^32). Both servers and keys are hashed to positions on this ring. Each key is stored on the first server found clockwise from its position.\n\nWhen a server is added, it takes responsibility for keys between itself and the previous server. Only those keys move. When a server is removed, its keys move to the next server clockwise. In both cases, most keys stay where they are.",
      codeExample: {
        title: "Consistent Hashing Implementation",
        code: `const crypto = require('crypto');

class ConsistentHash {
  constructor(replicas = 150) {
    this.replicas = replicas; // Virtual nodes per server
    this.ring = new Map();    // hash → server
    this.sortedKeys = [];     // sorted hash positions
  }

  hash(key) {
    return parseInt(crypto.createHash('md5')
      .update(key).digest('hex').slice(0, 8), 16);
  }

  addNode(node) {
    for (let i = 0; i < this.replicas; i++) {
      const h = this.hash(\`\${node}:\${i}\`);
      this.ring.set(h, node);
      this.sortedKeys.push(h);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  getNode(key) {
    const h = this.hash(key);
    // Find first node clockwise on the ring
    for (const pos of this.sortedKeys) {
      if (pos >= h) return this.ring.get(pos);
    }
    return this.ring.get(this.sortedKeys[0]); // Wrap
  }
}`,
      },
      pros: ["Minimal data movement when cluster changes", "Evenly distributes load with virtual nodes", "Foundation of many distributed systems"],
      cons: ["More complex than simple modulo hashing", "Virtual nodes add memory overhead", "Hotspot possible if hash function isn't uniform"],
      realWorld: ["Amazon DynamoDB uses consistent hashing", "Cassandra distributes data across nodes with it", "Memcached clients use consistent hashing for cache distribution"],
    },
  },
  {
    slug: "consensus-algorithms",
    title: "Consensus Algorithms (Raft & Paxos)",
    description: "How distributed nodes agree on a single value despite failures",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🤝",
    content: {
      overview: "Consensus algorithms enable a group of distributed nodes to agree on a single value or sequence of values, even when some nodes fail. Raft and Paxos are the two most important consensus algorithms. They're the foundation of distributed databases, configuration stores, and leader election systems.",
      keyPoints: [
        "Problem: how do N servers agree on a value when some might crash or have network issues?",
        "Requires a quorum (majority): with 5 nodes, 3 must agree. Tolerates 2 failures",
        "Raft: leader-based. One node is the leader, handles all writes, replicates to followers",
        "Paxos: proposer-based. More flexible but harder to understand and implement",
        "Used by: etcd (Raft), ZooKeeper (ZAB, Paxos-like), CockroachDB (Raft)",
      ],
      explanation: "In Raft, nodes are in one of three states: Leader, Follower, or Candidate. The leader receives all client writes and replicates them to followers. If the leader dies, followers detect the timeout and hold an election. The candidate with the most up-to-date log wins.\n\nA write is committed only when a majority (quorum) of nodes have acknowledged it. With 5 nodes, a write needs 3 acknowledgments. This means the system can tolerate 2 node failures and still make progress.\n\nRaft is designed to be understandable — the original paper is titled 'In Search of an Understandable Consensus Algorithm.' Paxos, while theoretically equivalent, is notoriously difficult to implement correctly.",
      pros: ["Tolerates minority node failures (N/2 - 1 failures for N nodes)", "Strong consistency guarantee", "Well-proven in production systems"],
      cons: ["Requires odd number of nodes (3, 5, 7) for clean majority", "Higher write latency due to quorum requirement", "Leader becomes bottleneck for all writes"],
      realWorld: ["etcd (Kubernetes state store) uses Raft", "CockroachDB uses Raft for distributed SQL", "Google Spanner uses Paxos for global consistency"],
    },
  },
  {
    slug: "leader-election",
    title: "Leader Election",
    description: "Algorithms for distributed nodes to elect a coordinator among themselves",
    category: "distributed",
    difficulty: "Advanced",
    icon: "👑",
    content: {
      overview: "Leader election is the process by which distributed nodes choose one node as the coordinator (leader) to make decisions, handle writes, or coordinate activities. When the leader fails, a new election selects a replacement, ensuring the system continues operating.",
      keyPoints: [
        "Only one leader at any time — avoids conflicts and split-brain scenarios",
        "Heartbeats: the leader periodically signals it's alive; followers start election on timeout",
        "Split-brain: network partition can cause two nodes to think they're the leader — fencing prevents this",
        "Lease-based: leader holds a time-limited lease, must renew it periodically",
        "Implementations: ZooKeeper, etcd, Redis (Redlock), database-based (advisory locks)",
      ],
      explanation: "In many distributed systems, certain tasks need a single coordinator: writing to the primary database, assigning work to workers, or managing cluster membership. Leader election ensures exactly one node fills this role.\n\nThe leader sends periodic heartbeats. If followers don't hear from the leader within a timeout (e.g., 10 seconds), they assume it's dead and start an election. The election process varies: Raft uses randomized timeouts, ZooKeeper uses sequential znodes.\n\nThe biggest danger is split-brain: a network partition isolates the leader from some followers. The followers elect a new leader, but the old leader is still running. Now you have two leaders accepting writes. Fencing tokens solve this — each leader gets an incrementing token, and the database rejects writes from older tokens.",
      realWorld: ["Kafka broker leader election for partitions", "Kubernetes control plane leader election", "Elasticsearch master node election"],
    },
  },
  {
    slug: "gossip-protocol",
    title: "Gossip Protocol",
    description: "Peer-to-peer protocol where nodes share state by randomly talking to each other",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🗣️",
    content: {
      overview: "Gossip protocols are decentralized communication protocols where each node periodically shares its state with a random subset of other nodes. Like a rumor spreading through a social network, information eventually reaches every node without a central coordinator.",
      keyPoints: [
        "Each node periodically picks a random peer and exchanges state information",
        "Information spreads exponentially: 1 → 2 → 4 → 8 nodes learn in each round",
        "Convergence: all nodes reach the same state in O(log N) rounds",
        "Failure detection: if no gossip received from a node, it's suspected as failed",
        "No single point of failure — fully decentralized, no leader required",
      ],
      explanation: "Every second, each node picks a random peer and sends its current state: 'Here's what I know about every node in the cluster.' The peer merges this information with its own and responds with its state. After a few rounds, every node has a consistent view of the cluster.\n\nThis is remarkably robust. Even if many messages are lost or nodes crash, information still propagates. The protocol is self-healing — a node that was offline catches up by receiving gossip from any peer.\n\nGossip is used for membership management (who's in the cluster?), failure detection (who's alive?), and eventually consistent state propagation (what's each node's load?).",
      pros: ["Fully decentralized — no single point of failure", "Scales to thousands of nodes", "Robust against message loss and node failures"],
      cons: ["Eventually consistent — convergence takes time", "Network overhead from periodic gossip messages", "Not suitable for strong consistency requirements"],
      realWorld: ["Cassandra uses gossip for cluster membership", "Consul uses gossip for service discovery", "Amazon DynamoDB's failure detection"],
    },
  },
  {
    slug: "rate-limiting",
    title: "Rate Limiting",
    description: "Controlling the number of requests a client can make in a time window",
    category: "distributed",
    difficulty: "Intermediate",
    icon: "🚦",
    content: {
      overview: "Rate limiting controls the number of requests a client can make to an API within a time window. It protects services from abuse, prevents resource exhaustion, and ensures fair usage across clients. Common algorithms include Fixed Window, Sliding Window, Token Bucket, and Leaky Bucket.",
      keyPoints: [
        "Fixed Window: count requests in fixed time windows (e.g., 100 requests per minute)",
        "Sliding Window: smoother than fixed window, avoids burst at window boundaries",
        "Token Bucket: tokens accumulate at a fixed rate; each request consumes a token. Allows bursts up to bucket capacity",
        "Leaky Bucket: requests enter a queue processed at a fixed rate. Smooths out traffic",
        "Rate limits communicated via headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After",
      ],
      explanation: "Token Bucket is the most popular algorithm. Imagine a bucket that holds 100 tokens. Tokens are added at a rate of 10 per second. Each request takes one token. If the bucket is empty, the request is rejected (429 Too Many Requests).\n\nThis naturally allows bursts: a client can send 100 requests immediately (draining the bucket) but then must wait for tokens to refill. This is ideal for APIs where occasional bursts are acceptable.\n\nIn distributed systems, rate limiting state (counters) must be shared across all servers. Redis is the common solution — its atomic INCR with EXPIRE provides a simple distributed counter.",
      codeExample: {
        title: "Token Bucket Rate Limiter",
        code: `class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }

  tryConsume() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;  // Request allowed
    }
    return false;   // Rate limited (429)
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.capacity,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;
  }
}

// Usage: 100 requests/minute capacity,
// refills at ~1.67 tokens/sec
const limiter = new TokenBucket(100, 100 / 60);`,
      },
      pros: ["Protects services from abuse and overload", "Token bucket naturally handles burst traffic", "Fair usage across clients"],
      cons: ["Distributed rate limiting adds Redis dependency", "Fixed windows can allow 2x limit at boundary edges", "Hard to choose the right limits without load testing"],
      realWorld: ["GitHub API: 5000 requests/hour", "Twitter API: 300 tweets/3 hours", "Stripe API: 100 requests/second"],
    },
  },
  // ── Design Patterns ───────────────────────────────────────
  {
    slug: "circuit-breaker",
    title: "Circuit Breaker Pattern",
    description: "Prevent cascading failures by failing fast when a downstream service is unhealthy",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🔌",
    content: {
      overview: "The Circuit Breaker pattern prevents an application from repeatedly calling a failing service. Like an electrical circuit breaker, it 'trips' when failures exceed a threshold, immediately rejecting requests without trying the call. After a cooldown, it allows a test request to see if the service has recovered.",
      keyPoints: [
        "Three states: Closed (normal), Open (failing fast), Half-Open (testing recovery)",
        "Closed: requests pass through normally; failures are counted",
        "Open: all requests immediately fail without calling the downstream service",
        "Half-Open: after timeout, one request is allowed through to test if the service recovered",
        "Prevents cascading failures where one failed service brings down the entire system",
      ],
      explanation: "Imagine Service A calls Service B, which is down. Without a circuit breaker, Service A keeps retrying, holding connections open, consuming threads, and eventually Service A itself becomes unresponsive. Now Service C, which depends on Service A, also fails. This is a cascading failure.\n\nWith a circuit breaker, after 5 consecutive failures to Service B, the breaker trips to Open state. For the next 30 seconds, all calls to Service B immediately return an error without making a network call. This protects Service A's resources.\n\nAfter 30 seconds, the breaker moves to Half-Open and allows one test request. If it succeeds, the breaker closes and normal operation resumes. If it fails, it stays open for another cooldown period.",
      codeExample: {
        title: "Circuit Breaker Implementation",
        code: `class CircuitBreaker {
  constructor(fn, { threshold = 5, timeout = 30000 }) {
    this.fn = fn;
    this.threshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = 0;
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}`,
      },
      pros: ["Prevents cascading failures across services", "Fails fast — frees up resources immediately", "Self-healing with half-open testing"],
      cons: ["Adds complexity to service calls", "Must tune threshold and timeout per dependency", "Can mask real issues if breaker trips too easily"],
      realWorld: ["Netflix Hystrix (now Resilience4j)", "AWS App Mesh circuit breaking", "Microsoft Azure Service Fabric"],
    },
  },
  {
    slug: "saga-pattern",
    title: "Saga Pattern",
    description: "Managing distributed transactions across microservices using a sequence of local transactions",
    category: "patterns",
    difficulty: "Advanced",
    icon: "📜",
    content: {
      overview: "The Saga pattern manages distributed transactions by breaking them into a sequence of local transactions, each with a compensating action. If one step fails, the saga executes compensating transactions to undo the completed steps, achieving eventual consistency without distributed locks.",
      keyPoints: [
        "Each service performs a local transaction and publishes an event/command for the next step",
        "If a step fails, compensating transactions undo the previous steps in reverse order",
        "Choreography: services react to events autonomously — no central coordinator",
        "Orchestration: a central saga orchestrator tells each service what to do and handles failures",
        "Provides eventual consistency without the performance cost of distributed ACID (2PC)",
      ],
      explanation: "Consider an e-commerce order: (1) Reserve inventory, (2) Process payment, (3) Arrange shipping. With traditional distributed transactions (2PC), all three must commit atomically — slow and fragile.\n\nWith a saga: Step 1 reserves inventory. Step 2 charges payment. If Step 3 (shipping) fails, compensating transactions fire: refund payment (undo Step 2), release inventory (undo Step 1).\n\nOrchestrated sagas use a central coordinator that sends commands ('Reserve inventory') and listens for responses ('Inventory reserved'). Choreographed sagas have each service publish events that trigger the next step.",
      pros: ["No distributed locks or 2PC overhead", "Each service maintains its own ACID transactions", "Scales well in microservices architectures"],
      cons: ["Complex to implement correctly, especially compensating logic", "Eventual consistency — intermediate states are visible", "Debugging saga failures across services is challenging"],
      realWorld: ["Order processing in e-commerce (Amazon, Shopify)", "Travel booking (flight + hotel + car rental)", "Banking fund transfers across institutions"],
    },
  },
  {
    slug: "cqrs",
    title: "CQRS (Command Query Responsibility Segregation)",
    description: "Separate models for reading and writing data, optimized independently",
    category: "patterns",
    difficulty: "Advanced",
    icon: "↔️",
    content: {
      overview: "CQRS separates the read and write sides of an application into distinct models. Commands (writes) go to a model optimized for validation and consistency. Queries (reads) go to a model optimized for fast retrieval. This allows each side to scale, evolve, and be optimized independently.",
      keyPoints: [
        "Write model: normalized, validates business rules, handles commands (CreateOrder, UpdateUser)",
        "Read model: denormalized, optimized for specific query patterns (pre-joined, pre-aggregated)",
        "Read and write models can use different databases: SQL for writes, Elasticsearch for reads",
        "Often paired with Event Sourcing: events update the read model asynchronously",
        "The read model can be rebuilt from scratch by replaying events",
      ],
      explanation: "In a traditional CRUD application, the same database model handles both reads and writes. This forces trade-offs: normalize for write performance or denormalize for read performance?\n\nCQRS eliminates this trade-off. Writes go to a normalized relational database with strict constraints. Reads come from a denormalized read store (Redis, Elasticsearch, or a materialized view) optimized for the exact queries the UI needs.\n\nWhen a write occurs, an event is published (e.g., 'OrderCreated'). An event handler updates the read model asynchronously. The read model might pre-compute dashboards, pre-join related data, or maintain search indexes.",
      pros: ["Read and write sides scale independently", "Each side uses the optimal database/model", "Simplifies complex domains by separating concerns"],
      cons: ["Eventually consistent between read and write models", "More infrastructure to manage (two databases, event handlers)", "Overkill for simple CRUD applications"],
      realWorld: ["E-commerce product search (write to SQL, read from Elasticsearch)", "Financial reporting (write transactions, read pre-computed reports)", "Social media feeds (write posts, read pre-built timelines)"],
    },
  },
  {
    slug: "strangler-fig",
    title: "Strangler Fig Pattern",
    description: "Incrementally migrating a legacy system by gradually replacing components",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🌿",
    content: {
      overview: "The Strangler Fig pattern is a migration strategy where you gradually replace components of a legacy system with new implementations. Named after the strangler fig tree that grows around a host tree, the new system slowly wraps the old one until it can be removed entirely.",
      keyPoints: [
        "Never attempt a 'big bang' rewrite — it's the highest-risk approach",
        "Route traffic through a facade that delegates to old or new system per feature",
        "Migrate one feature at a time: user auth → user profiles → search → etc.",
        "Both old and new systems run in parallel during migration",
        "Rollback is easy: just route traffic back to the old system for that feature",
      ],
      explanation: "Rewriting a large system from scratch is tempting but dangerous. The new system must replicate all functionality of the old one, including edge cases discovered over years. Meanwhile, the old system keeps evolving.\n\nThe Strangler Fig approach places a routing layer (facade) in front of both systems. Initially, 100% of traffic goes to the old system. You build the new 'user auth' module, test it thoroughly, then update the facade to route auth requests to the new system.\n\nThis continues feature by feature. At any point, you can route a feature back to the old system if issues arise. Eventually, the old system handles nothing and can be decommissioned.",
      pros: ["Low risk — migrate incrementally with easy rollback", "Old system keeps running during migration", "Each migration step is small and testable"],
      cons: ["Running two systems in parallel increases operational cost", "Need to maintain the routing facade", "Can drag on if not prioritized — becomes permanent dual-system"],
      realWorld: ["Amazon's monolith-to-microservices migration", "Shopify's gradual migration from Rails monolith", "LinkedIn migrating from monolith to services"],
    },
  },
  {
    slug: "bulkhead",
    title: "Bulkhead Pattern",
    description: "Isolating components so a failure in one doesn't cascade to others",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🚢",
    content: {
      overview: "The Bulkhead pattern isolates different parts of a system so that a failure in one component doesn't bring down the entire system. Named after the watertight compartments in ships, it ensures that flooding in one section doesn't sink the whole vessel.",
      keyPoints: [
        "Separate thread pools, connection pools, or service instances per dependency",
        "If one dependency exhausts its pool, other dependencies are unaffected",
        "Types: thread pool isolation, process isolation, connection pool isolation",
        "Often combined with Circuit Breaker for comprehensive resilience",
        "Can be applied at service level (separate deployments) or code level (separate thread pools)",
      ],
      explanation: "Without bulkheads, a single slow dependency can exhaust all available threads. If your app has 100 threads and the payment service is slow, all 100 threads get stuck waiting for payment responses. Now no threads are available for user service calls, product service calls, or anything else.\n\nWith bulkheads, you allocate separate resource pools: 30 threads for payment, 30 for users, 40 for products. If payment is slow and uses all 30 threads, the other 70 threads continue serving user and product requests normally.\n\nAt a larger scale, bulkheads mean deploying separate instances for different customer tiers: free users on one pool, enterprise on another. An outage affecting free-tier doesn't impact paying customers.",
      pros: ["Prevents cascading failures from slow dependencies", "Isolates blast radius of failures", "Can prioritize critical paths with larger pools"],
      cons: ["Reduced overall resource utilization (pools can't share idle capacity)", "More complex configuration and tuning", "Must size pools carefully for each dependency"],
      realWorld: ["Netflix Hystrix thread pool isolation", "AWS account separation for blast radius", "Kubernetes resource quotas per namespace"],
    },
  },
  // ── Real-World Systems ────────────────────────────────────
  {
    slug: "design-url-shortener",
    title: "Design a URL Shortener",
    description: "Design a service like TinyURL that creates short aliases for long URLs",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🔗",
    content: {
      overview: "A URL shortener converts long URLs into short, unique aliases (e.g., tinyurl.com/abc123). The core challenges are generating unique short codes, handling high read volume, and providing fast redirects. This is one of the most common system design interview questions.",
      keyPoints: [
        "Core API: POST /shorten {url} → short_code, GET /{short_code} → 301 redirect to original URL",
        "Short code generation: Base62 encoding of auto-increment ID, or hash-based (MD5/SHA → first 7 chars)",
        "Read-heavy: 100:1 read/write ratio — optimize for fast redirects",
        "Caching: store popular URLs in Redis for sub-ms redirect",
        "Database: simple schema — (short_code, original_url, created_at, expires_at)",
      ],
      explanation: "Scale estimation: 100M new URLs/day = ~1200 writes/sec. 10B redirects/day = ~115K reads/sec. Storage: 100M × 500 bytes = 50GB/day, ~18TB/year.\n\nShort code generation using Base62 (a-z, A-Z, 0-9): 7 characters = 62^7 = 3.5 trillion possible codes — enough for decades. Approach 1: use a distributed ID generator (Snowflake), convert to Base62. Approach 2: hash the URL, take first 7 chars, handle collisions.\n\nArchitecture: Load Balancer → Application Servers → Cache (Redis) → Database (SQL or NoSQL). For redirects: check Redis first (cache hit for popular URLs), fall back to database. Use 301 (permanent redirect) for SEO, 302 (temporary redirect) for analytics tracking.\n\nFor analytics, log each redirect event to Kafka and process asynchronously.",
      codeExample: {
        title: "URL Shortener Core Logic",
        code: `const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encode(num) {
  let str = '';
  while (num > 0) {
    str = BASE62[num % 62] + str;
    num = Math.floor(num / 62);
  }
  return str.padStart(7, '0');
}

// POST /api/shorten
app.post('/api/shorten', async (req, res) => {
  const { url } = req.body;
  const id = await db.insert({ url });  // Auto-increment
  const code = encode(id);
  await redis.set(code, url, 'EX', 86400 * 30);
  res.json({ shortUrl: \`https://short.ly/\${code}\` });
});

// GET /:code → redirect
app.get('/:code', async (req, res) => {
  let url = await redis.get(req.params.code);
  if (!url) {
    const row = await db.findByCode(req.params.code);
    if (!row) return res.status(404).send('Not found');
    url = row.url;
    await redis.set(req.params.code, url, 'EX', 3600);
  }
  res.redirect(301, url);
});`,
      },
      realWorld: ["TinyURL, Bit.ly, t.co (Twitter)", "Shortened links in SMS and email marketing", "Internal link management at large companies"],
    },
  },
  {
    slug: "design-chat-system",
    title: "Design a Chat System",
    description: "Design a real-time messaging system like WhatsApp or Slack",
    category: "real-world",
    difficulty: "Advanced",
    icon: "💬",
    content: {
      overview: "A chat system supports real-time message delivery between users (1-on-1 and group). Core challenges include maintaining persistent WebSocket connections at scale, message ordering, offline message delivery, and read receipts. At WhatsApp's scale, this means 100B+ messages per day.",
      keyPoints: [
        "WebSocket connections for real-time message delivery — each user maintains a persistent connection",
        "Connection gateway: a stateful service that maps user IDs to WebSocket connections",
        "Message flow: Sender → Gateway → Message Service → Store in DB → Forward to recipient's Gateway",
        "Offline users: messages are stored and delivered when they reconnect (push notification triggers)",
        "Message ordering: timestamps + server-assigned sequence numbers within each conversation",
      ],
      explanation: "Architecture: Users connect via WebSocket to a Chat Gateway (stateful, knows which user is on which server). When Alice sends a message to Bob:\n\n1. Alice's gateway receives the message over WebSocket\n2. Message is sent to the Message Service via internal RPC\n3. Message Service stores it in the database (Cassandra — partitioned by conversation ID)\n4. Message Service checks if Bob is online by querying the presence service\n5. If online, forward to Bob's gateway, which delivers via WebSocket\n6. If offline, enqueue a push notification\n\nFor group chats, the message is fanned out to all group members. For a 500-person group, that's 500 deliveries per message — message queues handle this async.\n\nRead receipts and typing indicators use lightweight signals over the same WebSocket connection.",
      realWorld: ["WhatsApp: 100B messages/day, 2B users", "Slack: persistent group channels with threading", "Discord: voice + text + presence for millions of concurrent users"],
    },
  },
  {
    slug: "design-news-feed",
    title: "Design a News Feed",
    description: "Design a social media feed system like Twitter's timeline or Facebook's News Feed",
    category: "real-world",
    difficulty: "Advanced",
    icon: "📰",
    content: {
      overview: "A News Feed system aggregates and ranks content from users you follow, delivering a personalized timeline. The core challenge is generating feeds for millions of users in real-time, balancing freshness, relevance, and system performance.",
      keyPoints: [
        "Fan-out on write: pre-compute feeds when a user posts — push to all followers' timelines",
        "Fan-out on read: compute the feed at read time by pulling posts from followed users — pull model",
        "Hybrid approach: fan-out on write for normal users, fan-out on read for celebrities (millions of followers)",
        "Feed ranking: chronological, or ML-based scoring (engagement, relevance, recency)",
        "Feed storage: pre-computed timeline in Redis (list of post IDs per user)",
      ],
      explanation: "When User A posts, the system must deliver that post to all of A's followers' feeds. Two approaches:\n\nFan-out on write: when A posts, immediately push the post ID into every follower's feed cache (Redis list). When a follower opens their feed, it's already built — just read from Redis. Fast reads, but expensive for users with millions of followers (celebrity problem).\n\nFan-out on read: the feed is computed when a user requests it. Pull recent posts from all followed users, merge, rank, and return. No precomputation, but slow for users following thousands of accounts.\n\nThe hybrid approach (used by Twitter): regular users use fan-out on write. Celebrities (>10K followers) use fan-out on read — their posts are mixed in at read time. This avoids writing to millions of caches when a celebrity tweets.",
      codeExample: {
        title: "Feed Generation (Hybrid Approach)",
        code: `// Fan-out on write for normal users
async function onNewPost(post) {
  const followers = await getFollowers(post.authorId);

  if (followers.length < 10000) {
    // Small following: push to all feeds
    for (const followerId of followers) {
      await redis.lpush(
        \`feed:\${followerId}\`, post.id
      );
      await redis.ltrim(
        \`feed:\${followerId}\`, 0, 999
      ); // Keep 1000
    }
  }
  // Celebrities: skip fan-out, merge at read time
}

// Read feed (merge pre-built + celebrity posts)
async function getFeed(userId) {
  // Pre-built feed from fan-out
  const feedIds = await redis.lrange(
    \`feed:\${userId}\`, 0, 49
  );
  // Celebrity posts (fan-out on read)
  const celebs = await getCelebritiesFollowed(userId);
  const celebPosts = await getRecentPosts(celebs);

  // Merge, rank by timestamp, return top 50
  const all = [...feedIds, ...celebPosts.map(p => p.id)];
  return rankAndLimit(all, 50);
}`,
      },
      realWorld: ["Twitter timeline (fan-out on write + hybrid for celebrities)", "Facebook News Feed (ML-ranked)", "Instagram feed (engagement-based ranking)"],
    },
  },
  {
    slug: "design-notification-system",
    title: "Design a Notification System",
    description: "Design a system to send push notifications, emails, and SMS at scale",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🔔",
    content: {
      overview: "A notification system delivers messages across multiple channels (push, email, SMS, in-app) based on user preferences and event triggers. It handles template rendering, delivery scheduling, rate limiting, and retry logic at scale.",
      keyPoints: [
        "Multi-channel: push notifications (APNs/FCM), email (SES/SendGrid), SMS (Twilio), in-app",
        "Event-driven: services publish events (OrderShipped), notification service reacts based on user preferences",
        "Template system: render notification content from templates + event data",
        "User preferences: users choose which notifications they want and on which channels",
        "Deduplication: prevent sending the same notification twice using idempotency keys",
      ],
      explanation: "Architecture: Event producers → Message Queue (Kafka) → Notification Service → Channel-specific workers (push worker, email worker, SMS worker) → Third-party providers (APNs, SendGrid, Twilio).\n\nWhen an order ships, the order service publishes an 'OrderShipped' event. The notification service: (1) looks up user preferences — does this user want shipping notifications? On which channels? (2) Renders the message from a template. (3) Enqueues delivery jobs for each channel.\n\nChannel workers handle delivery, retries, and provider-specific logic. Push notifications need device tokens (stored per user). Email needs unsubscribe links (CAN-SPAM compliance). SMS needs phone number verification.\n\nRate limiting prevents notification fatigue: max 3 push notifications per hour per user. Priority levels ensure critical notifications (security alerts) bypass rate limits.",
      realWorld: ["Amazon order updates across email, push, and SMS", "Slack notification preferences per channel", "GitHub notification routing (email, web, mobile)"],
    },
  },
  {
    slug: "design-autocomplete",
    title: "Design Search Autocomplete",
    description: "Design a typeahead system that suggests completions as users type",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🔍",
    content: {
      overview: "Search autocomplete (typeahead) suggests query completions as users type, showing the most relevant results within 100ms. The core data structure is a Trie (prefix tree) that efficiently stores and retrieves strings by prefix. The system must handle millions of queries per second with minimal latency.",
      keyPoints: [
        "Trie data structure: stores words character by character, enabling fast prefix lookup",
        "Top-K results: each trie node stores the top 10-20 most popular completions for that prefix",
        "Data collection: log search queries, aggregate popularity (MapReduce), update trie periodically",
        "Latency target: <100ms end-to-end, suggestions update after 2-3 keystrokes",
        "Multi-layer caching: browser cache, CDN cache, application cache (Redis)",
      ],
      explanation: "The Trie approach: build a trie of all searchable terms. For the prefix 'sys', traverse to the 's' → 'y' → 's' node and return pre-computed top suggestions: ['system design', 'system of a down', 'systems thinking'].\n\nTo keep suggestions relevant, log all search queries and periodically (every few hours) aggregate popularity using MapReduce. Rebuild the trie with updated popularity scores and deploy it to application servers.\n\nOptimizations: (1) Don't query until 2+ characters typed (reduces load 50x). (2) Debounce keystrokes by 100-200ms. (3) Cache results at the CDN — 'sys' returns the same results for every user. (4) Return results from browser cache if the user deletes and retypes.",
      codeExample: {
        title: "Trie for Autocomplete",
        code: `class TrieNode {
  constructor() {
    this.children = {};
    this.topSuggestions = []; // Pre-computed top-K
  }
}

class AutocompleteTrie {
  constructor() { this.root = new TrieNode(); }

  insert(word, popularity) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      // Update top suggestions at each prefix node
      this.updateTop(node, word, popularity);
    }
  }

  updateTop(node, word, popularity) {
    const existing = node.topSuggestions
      .findIndex(s => s.word === word);
    if (existing >= 0) {
      node.topSuggestions[existing].score = popularity;
    } else {
      node.topSuggestions.push(
        { word, score: popularity }
      );
    }
    node.topSuggestions.sort((a, b) => b.score - a.score);
    node.topSuggestions = node.topSuggestions.slice(0, 10);
  }

  search(prefix) {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children[char]) return [];
      node = node.children[char];
    }
    return node.topSuggestions;
  }
}`,
      },
      realWorld: ["Google Search autocomplete (billions of queries/day)", "YouTube search suggestions", "E-commerce product search (Amazon, Shopify)"],
    },
  },
  {
    slug: "design-video-streaming",
    title: "Design a Video Streaming Platform",
    description: "Design a system like YouTube or Netflix for uploading and streaming video at scale",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🎬",
    content: {
      overview: "A video streaming platform handles video upload, transcoding into multiple resolutions and formats, storage in a distributed system, and adaptive bitrate streaming to millions of concurrent viewers. Netflix streams 17% of all internet traffic.",
      keyPoints: [
        "Upload pipeline: chunked upload → virus scan → transcoding (multiple resolutions: 240p to 4K)",
        "Transcoding: convert raw video into multiple formats (H.264, VP9, AV1) and resolutions using FFmpeg",
        "Adaptive Bitrate Streaming (ABR): client automatically switches quality based on bandwidth (HLS/DASH)",
        "CDN distribution: video segments cached at edge servers globally for low-latency playback",
        "Blob storage: video files stored in object storage (S3) — raw uploads and transcoded variants",
      ],
      explanation: "Upload flow: the client uploads the video in chunks to an upload service. Chunks are stored in blob storage (S3). A transcoding pipeline (triggered via message queue) converts the video into multiple renditions: 240p, 360p, 480p, 720p, 1080p, 4K — each in multiple codecs.\n\nEach rendition is split into small segments (2-10 seconds each) and stored on blob storage. A manifest file (HLS .m3u8 or DASH .mpd) lists all segments and their quality levels.\n\nStreaming flow: the video player downloads the manifest, then requests segments. It starts with low quality, monitors download speed, and switches to higher quality as bandwidth allows (adaptive bitrate). If bandwidth drops, it switches to lower quality without buffering.\n\nCDN is crucial: segments are cached at 200+ edge locations. A viewer in Tokyo gets segments from a Tokyo edge server, not the US origin.",
      realWorld: ["YouTube: 500 hours of video uploaded every minute", "Netflix: 200M subscribers, 17% of global internet traffic", "Twitch: live streaming with sub-second latency"],
    },
  },
  {
    slug: "design-file-storage",
    title: "Design a File Storage System",
    description: "Design a cloud file storage service like Google Drive or Dropbox",
    category: "real-world",
    difficulty: "Advanced",
    icon: "📁",
    content: {
      overview: "A cloud file storage system lets users upload, sync, and share files across devices. Core challenges include efficient file syncing (only transferring changed parts), conflict resolution when multiple devices edit the same file, and reliable storage at scale.",
      keyPoints: [
        "Block-level deduplication: split files into blocks (4MB chunks), hash each block, only store unique blocks",
        "Delta sync: when a file changes, only upload the changed blocks — not the entire file",
        "Metadata DB: stores file/folder hierarchy, permissions, versions, block references",
        "Block storage: actual file blocks in blob storage (S3), referenced by content hash",
        "Conflict resolution: last-write-wins, or create conflict copies for manual resolution",
      ],
      explanation: "File structure: a 100MB file is split into 25 blocks of 4MB each. Each block is hashed (SHA-256). Only blocks with new hashes are uploaded. If you edit page 5 of a document, only 1-2 blocks change — the upload is 4-8MB instead of 100MB.\n\nDeduplication: if two users upload the same file, the blocks are identical (same hashes). The system stores the blocks once and both users' metadata points to the same blocks. This saves massive storage.\n\nSync flow: (1) Client detects file change. (2) Splits file into blocks, computes hashes. (3) Asks server which blocks it already has. (4) Uploads only new blocks. (5) Updates metadata with new block list. (6) Server notifies other devices via long-polling or WebSocket. (7) Other devices download only the new blocks.\n\nConflict handling: if two devices edit the same file offline, the last sync wins and a conflict copy is created for the other version.",
      realWorld: ["Dropbox uses block-level dedup and delta sync", "Google Drive handles 2B+ files daily", "iCloud syncs across Apple devices"],
    },
  },
  {
    slug: "design-ride-sharing",
    title: "Design a Ride-Sharing Platform",
    description: "Design a system like Uber for matching riders with drivers in real-time",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🚗",
    content: {
      overview: "A ride-sharing platform matches riders with nearby drivers in real-time, calculates routes and fares, and tracks rides from pickup to dropoff. Core challenges include real-time location tracking at scale, efficient driver matching using spatial indexes, and dynamic pricing during high demand.",
      keyPoints: [
        "Location service: drivers send GPS updates every 3-5 seconds — millions of location updates per second",
        "Spatial indexing: find nearby drivers using geohash, QuadTree, or PostGIS for efficient proximity queries",
        "Matching algorithm: find nearest available driver considering ETA, driver rating, and vehicle type",
        "ETA calculation: real-time routing considering traffic, road closures, historical patterns",
        "Surge pricing: dynamic pricing based on supply (available drivers) and demand (ride requests) per zone",
      ],
      explanation: "When a rider requests a ride: (1) The location service identifies the rider's geohash cell. (2) A proximity query finds available drivers within adjacent cells (typically 1-3km radius). (3) The matching service ranks candidates by ETA, rating, and vehicle match. (4) The top driver gets a ride offer with 15-second timeout. (5) If declined, offer goes to the next driver.\n\nDriver location tracking: each driver sends GPS coordinates every 4 seconds. With 1M active drivers, that's 250K updates/second. These are stored in a spatial index (QuadTree or geohash-based) in memory for fast proximity queries.\n\nSurge pricing divides the city into hexagonal zones. When ride requests in a zone exceed available drivers, surge multiplier increases (1.5x, 2x, 3x). This incentivizes nearby drivers to move to the high-demand zone.",
      realWorld: ["Uber: 100M+ monthly riders, 5M+ drivers", "Lyft: real-time matching in 600+ cities", "Grab: dominant in Southeast Asia with similar architecture"],
    },
  },

  // ── Additional Fundamentals ─────────────────────────────────
  {
    slug: "availability-reliability",
    title: "Availability, Reliability & Fault Tolerance",
    description: "Ensuring systems stay operational and recover gracefully from failures",
    category: "fundamentals",
    difficulty: "Intermediate",
    icon: "🛡️",
    content: {
      overview: "Availability measures the percentage of time a system is operational and accessible. Reliability ensures the system performs its intended function without failure. Fault tolerance is the ability to continue operating when components fail. Together, these properties define how resilient a system is.",
      keyPoints: [
        "Availability is measured in 'nines': 99.9% (3 nines) = 8.76 hours downtime/year, 99.99% (4 nines) = 52.6 minutes/year",
        "Reliability means the system produces correct results consistently — a system can be available but unreliable",
        "Single Point of Failure (SPOF): any component whose failure brings down the entire system",
        "Redundancy eliminates SPOFs: active-active (both handle traffic), active-passive (standby takes over on failure)",
        "Failover strategies: cold standby (minutes), warm standby (seconds), hot standby (milliseconds)",
      ],
      explanation: "A system's availability is calculated as: Availability = Uptime / (Uptime + Downtime). For two components in series (both must work), multiply their availabilities. For components in parallel (either can work), availability = 1 - (1 - A1)(1 - A2).\n\nTo achieve high availability, eliminate every SPOF: use multiple app servers behind a load balancer, replicate databases with automatic failover, deploy across multiple availability zones, and use health checks to detect and route around failures.\n\nFault tolerance goes beyond availability — it means the system continues to function (possibly at reduced capacity) even when parts fail. Techniques include: replication, checksums for data integrity, circuit breakers to isolate failing services, and graceful degradation (serving cached data when the database is down).",
      codeExample: {
        title: "Health Check with Failover",
        code: `class ServiceWithFailover {
  constructor(primaryUrl, backupUrl) {
    this.primary = primaryUrl;
    this.backup = backupUrl;
  }

  async request(path) {
    try {
      const res = await fetch(this.primary + path, {
        signal: AbortSignal.timeout(3000)
      });
      if (!res.ok) throw new Error('Primary failed');
      return res.json();
    } catch (err) {
      console.warn('Failing over to backup:', err.message);
      const res = await fetch(this.backup + path);
      return res.json();
    }
  }
}`,
      },
      pros: ["Users experience minimal disruption", "Business continuity during failures", "Enables SLA commitments (99.99% uptime)"],
      cons: ["Redundancy increases infrastructure cost", "More complex deployment and monitoring", "Active-active setups require data consistency strategies"],
      realWorld: ["AWS targets 99.99% availability for most services", "Google's SRE book defines error budgets based on SLOs", "Netflix's Chaos Monkey randomly kills instances to test fault tolerance"],
    },
  },
  {
    slug: "concurrency-parallelism",
    title: "Concurrency vs Parallelism",
    description: "Two approaches to handling multiple tasks — interleaving vs simultaneous execution",
    category: "fundamentals",
    difficulty: "Intermediate",
    icon: "🔀",
    content: {
      overview: "Concurrency is about dealing with multiple tasks at once by interleaving their execution (structure). Parallelism is about executing multiple tasks simultaneously using multiple processors (execution). A system can be concurrent without being parallel, and vice versa.",
      keyPoints: [
        "Concurrency: multiple tasks make progress by sharing CPU time (context switching) — even on a single core",
        "Parallelism: multiple tasks run simultaneously on different CPU cores or machines",
        "Concurrency is about structure; parallelism is about execution",
        "Thread safety: shared mutable state requires synchronization (mutexes, semaphores, CAS operations)",
        "Common pitfalls: race conditions, deadlocks, livelocks, priority inversion",
      ],
      explanation: "Imagine a single chef (one CPU core) preparing two dishes. Concurrency: the chef chops vegetables for dish A, then stirs dish B, then goes back to dish A — interleaving tasks. Parallelism: two chefs (two cores) each prepare one dish simultaneously.\n\nIn system design, concurrency enables a web server to handle thousands of connections on a single thread (event loop in Node.js). Parallelism enables a data pipeline to process multiple partitions simultaneously across multiple workers.\n\nKey primitives: Mutex (mutual exclusion — only one thread enters critical section), Semaphore (allows N concurrent accesses), Condition Variable (thread waits until a condition is true), Compare-And-Swap (lock-free atomic operation).",
      codeExample: {
        title: "Concurrency vs Parallelism in JavaScript",
        code: `// Concurrency: single thread, interleaved I/O
async function concurrent() {
  const [users, posts] = await Promise.all([
    fetch('/api/users'),   // starts request
    fetch('/api/posts'),   // starts immediately, doesn't wait
  ]);
  // Both requests run concurrently on one thread
}

// Parallelism: multiple threads via Web Workers
// main.js
const worker = new Worker('heavy-task.js');
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => console.log(e.data);

// heavy-task.js (runs on separate CPU core)
self.onmessage = (e) => {
  const result = e.data.data.map(expensiveComputation);
  self.postMessage(result);
};`,
      },
      pros: ["Concurrency improves responsiveness without extra hardware", "Parallelism dramatically speeds up CPU-bound tasks", "Modern languages offer high-level abstractions (async/await, goroutines)"],
      cons: ["Shared mutable state introduces bugs (race conditions, deadlocks)", "Debugging concurrent code is significantly harder", "Parallelism has diminishing returns (Amdahl's Law)"],
    },
  },

  // ── Additional Scalability ──────────────────────────────────
  {
    slug: "serverless",
    title: "Serverless Architecture",
    description: "Run code without managing servers — the cloud provider handles scaling and infrastructure",
    category: "scalability",
    difficulty: "Intermediate",
    icon: "☁️",
    content: {
      overview: "Serverless computing lets you run functions in the cloud without provisioning or managing servers. The cloud provider automatically allocates resources, scales based on demand, and charges only for actual execution time. AWS Lambda, Google Cloud Functions, and Azure Functions are the leading platforms.",
      keyPoints: [
        "Functions-as-a-Service (FaaS): deploy individual functions that run in response to events (HTTP requests, queue messages, cron schedules)",
        "Pay-per-invocation: charged only for compute time used (typically per 100ms), not for idle servers",
        "Auto-scaling: scales from zero to thousands of concurrent instances automatically",
        "Cold starts: first invocation after idle period takes 100ms-5s to initialize the runtime",
        "Stateless by design: each invocation is independent — use external storage (S3, DynamoDB) for state",
      ],
      explanation: "In a traditional architecture, you provision servers, configure auto-scaling groups, and pay for idle capacity. With serverless, the cloud provider handles all of this.\n\nA typical serverless architecture: API Gateway receives HTTP requests → triggers Lambda functions → functions read/write to DynamoDB → return responses. You only write the business logic; AWS manages the servers, OS patches, scaling, and availability.\n\nLimitations: execution time limits (15 min on AWS Lambda), memory limits (10GB), cold start latency, vendor lock-in, and difficulty debugging distributed functions. Serverless works best for event-driven workloads, APIs, data processing pipelines, and scheduled tasks.",
      codeExample: {
        title: "AWS Lambda Function (Node.js)",
        code: `// handler.js — deployed as an AWS Lambda function
export const handler = async (event) => {
  const { httpMethod, path, body } = event;

  if (httpMethod === 'GET' && path === '/users') {
    const users = await db.scan({ TableName: 'Users' });
    return { statusCode: 200, body: JSON.stringify(users) };
  }

  if (httpMethod === 'POST' && path === '/users') {
    const user = JSON.parse(body);
    await db.put({ TableName: 'Users', Item: user });
    return { statusCode: 201, body: JSON.stringify(user) };
  }

  return { statusCode: 404, body: 'Not Found' };
};`,
      },
      pros: ["Zero server management and automatic scaling", "Pay only for actual usage — ideal for variable workloads", "Reduced operational overhead and faster time-to-market"],
      cons: ["Cold start latency can impact user experience", "Vendor lock-in to specific cloud provider", "Hard to debug and test locally; limited execution time"],
      realWorld: ["Coca-Cola replaced all EC2 instances with Lambda, cutting costs by 65%", "Netflix uses Lambda for encoding, validation, and event processing", "iRobot uses serverless for real-time IoT data from Roomba vacuums"],
    },
  },

  // ── Additional Networking ───────────────────────────────────
  {
    slug: "proxy-reverse-proxy",
    title: "Proxy vs Reverse Proxy",
    description: "Forward proxies represent clients; reverse proxies represent servers — both add security and performance",
    category: "networking",
    difficulty: "Beginner",
    icon: "🔄",
    content: {
      overview: "A forward proxy sits between clients and the internet, making requests on behalf of clients. A reverse proxy sits in front of servers, receiving requests from clients and forwarding them to backend servers. Despite similar mechanics, they serve different purposes.",
      keyPoints: [
        "Forward proxy: client → proxy → internet. Hides client identity, enables content filtering, caching",
        "Reverse proxy: internet → proxy → server. Hides server identity, enables load balancing, SSL termination, caching",
        "Reverse proxies are the backbone of modern web architecture (Nginx, HAProxy, Cloudflare)",
        "SSL termination at the reverse proxy offloads encryption work from backend servers",
        "Reverse proxies can compress responses, serve static files, and protect against DDoS attacks",
      ],
      explanation: "Forward proxy: imagine a company where all employee internet traffic goes through a proxy server. The proxy can cache frequently accessed sites, block inappropriate content, and hide employees' IP addresses from external websites. The external website only sees the proxy's IP.\n\nReverse proxy: when you visit a website, your request first hits a reverse proxy (e.g., Nginx). The proxy decides which backend server should handle the request, forwards it, receives the response, and sends it back to you. You never communicate directly with the backend.\n\nCommon reverse proxy features: load balancing across multiple servers, SSL/TLS termination, response caching, request rate limiting, A/B testing via traffic splitting, and serving as a web application firewall (WAF).",
      pros: ["Improved security by hiding internal infrastructure", "Better performance via caching and compression", "Centralized SSL management and logging"],
      cons: ["Adds a network hop (slight latency increase)", "Single point of failure if not redundant", "Configuration complexity for advanced routing rules"],
      realWorld: ["Nginx powers 34% of all websites as a reverse proxy", "Cloudflare acts as a reverse proxy for 20% of the internet", "Corporate VPNs often use forward proxies for security"],
    },
  },
  {
    slug: "tcp-vs-udp",
    title: "TCP vs UDP",
    description: "Reliable ordered delivery (TCP) vs fast fire-and-forget messaging (UDP)",
    category: "networking",
    difficulty: "Beginner",
    icon: "📡",
    content: {
      overview: "TCP (Transmission Control Protocol) and UDP (User Datagram Protocol) are the two main transport-layer protocols. TCP provides reliable, ordered, connection-based communication. UDP provides fast, connectionless, best-effort delivery without guarantees.",
      keyPoints: [
        "TCP: connection-oriented (3-way handshake), guarantees delivery order and completeness, has flow/congestion control",
        "UDP: connectionless, no delivery guarantees, no ordering, no congestion control — but much faster",
        "TCP overhead: 20-byte header + handshake + ACKs. UDP overhead: just 8-byte header",
        "TCP is used for: HTTP/HTTPS, email (SMTP), file transfer (FTP), SSH",
        "UDP is used for: DNS, video streaming, online gaming, VoIP, IoT sensors",
      ],
      explanation: "TCP is like sending a registered letter — you get confirmation it arrived, it arrives in order, and lost letters are re-sent. UDP is like shouting across a room — fast, but some words might get lost.\n\nTCP's 3-way handshake: Client sends SYN → Server replies SYN-ACK → Client sends ACK. Only then can data flow. This adds latency but establishes a reliable connection.\n\nWhy use UDP? For real-time applications where speed matters more than completeness. In a video call, a dropped frame is better than a delayed one. Retransmitting a lost packet would cause the video to freeze and fall behind. Modern protocols like QUIC (used by HTTP/3) build reliability on top of UDP to get the best of both worlds.",
      pros: ["TCP: reliable, ordered delivery with error checking", "UDP: minimal latency, no connection overhead", "Each fits different use cases perfectly"],
      cons: ["TCP: higher latency due to handshake and ACKs", "UDP: no delivery guarantee — packets can be lost, duplicated, or reordered", "TCP: head-of-line blocking in multiplexed connections"],
      realWorld: ["HTTP/1.1 and HTTP/2 use TCP; HTTP/3 uses QUIC (built on UDP)", "Online games use UDP for player position updates (60+ times/sec)", "DNS uses UDP for queries (fast) but TCP for zone transfers (reliable)"],
    },
  },
  {
    slug: "rest-vs-graphql",
    title: "REST vs GraphQL",
    description: "Two dominant API paradigms — resource-oriented endpoints vs flexible query language",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🔌",
    content: {
      overview: "REST (Representational State Transfer) exposes resources via multiple endpoints with standard HTTP methods. GraphQL provides a single endpoint where clients specify exactly what data they need via a query language. Each has trade-offs in flexibility, caching, and complexity.",
      keyPoints: [
        "REST: multiple endpoints (/users, /posts), uses HTTP verbs (GET, POST, PUT, DELETE), returns fixed data shapes",
        "GraphQL: single endpoint (/graphql), clients write queries specifying exact fields needed, returns only requested data",
        "Over-fetching (REST returns too much data) and under-fetching (REST requires multiple calls) are solved by GraphQL",
        "REST is easier to cache (HTTP caching, CDNs). GraphQL caching is more complex (query-level or field-level)",
        "GraphQL has a strong type system and schema — acts as a contract between frontend and backend",
      ],
      explanation: "Consider a mobile app showing a user's profile with their recent posts. With REST: GET /users/1 returns all user fields (many unused), then GET /users/1/posts returns all post fields. Two requests, lots of extra data.\n\nWith GraphQL: one query fetches exactly what's needed:\n  query { user(id: 1) { name, avatar, posts(limit: 5) { title, likes } } }\n\nWhen to use REST: public APIs, simple CRUD apps, when HTTP caching is critical, when the team is small. When to use GraphQL: mobile apps (bandwidth matters), complex data relationships, multiple frontend clients needing different data shapes, rapid frontend iteration.",
      codeExample: {
        title: "REST vs GraphQL Comparison",
        code: `// REST: Two requests, over-fetched data
const user = await fetch('/api/users/1').then(r => r.json());
// Returns: { id, name, email, bio, avatar, settings, ... }
const posts = await fetch('/api/users/1/posts').then(r => r.json());
// Returns: [{ id, title, body, likes, comments, author, ... }]

// GraphQL: One request, exact data
const { data } = await fetch('/graphql', {
  method: 'POST',
  body: JSON.stringify({
    query: \`{
      user(id: 1) {
        name
        avatar
        posts(limit: 5) { title, likes }
      }
    }\`
  })
}).then(r => r.json());
// Returns: { user: { name, avatar, posts: [{ title, likes }] } }`,
      },
      pros: ["REST: simple, widely understood, excellent HTTP caching", "GraphQL: no over/under-fetching, strongly typed schema", "GraphQL: single endpoint simplifies API versioning"],
      cons: ["REST: over-fetching and under-fetching waste bandwidth", "GraphQL: complex caching, potential for expensive queries", "GraphQL: steeper learning curve, harder to rate-limit"],
    },
  },
  {
    slug: "webhooks",
    title: "Webhooks",
    description: "Server-to-server HTTP callbacks that notify your app when events happen",
    category: "networking",
    difficulty: "Beginner",
    icon: "🪝",
    content: {
      overview: "Webhooks are HTTP callbacks — when an event occurs in a source system, it sends an HTTP POST request to a pre-configured URL in your system. Instead of polling an API repeatedly to check for changes, your app gets notified instantly when something happens.",
      keyPoints: [
        "Push model: the source system pushes data to you when events occur — no polling needed",
        "Your app registers a callback URL with the source system",
        "Events are delivered as HTTP POST requests with a JSON payload describing what happened",
        "Must handle: retries (idempotency), verification (signatures), ordering, and failures",
        "Common use cases: payment notifications, git push events, form submissions, CI/CD triggers",
      ],
      explanation: "Without webhooks: your app polls Stripe every 5 seconds asking 'Any new payments?' — 99% of requests return nothing. With webhooks: Stripe sends your app an HTTP POST the instant a payment succeeds.\n\nWebhook security: providers sign payloads with a shared secret (HMAC-SHA256). Your app verifies the signature before processing. This prevents attackers from sending fake webhook events.\n\nReliability: webhook delivery can fail (your server is down, network issues). Good providers retry with exponential backoff (1min, 5min, 30min, 1hr). Your handler must be idempotent — processing the same event twice should be safe (use the event ID to deduplicate).",
      codeExample: {
        title: "Webhook Handler (Express.js)",
        code: `const crypto = require('crypto');

app.post('/webhooks/stripe', express.raw({ type: '*/*' }), (req, res) => {
  // 1. Verify signature
  const sig = req.headers['stripe-signature'];
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (sig !== \`sha256=\${hash}\`) {
    return res.status(401).send('Invalid signature');
  }

  // 2. Parse and deduplicate
  const event = JSON.parse(req.body);
  if (await isProcessed(event.id)) {
    return res.status(200).send('Already processed');
  }

  // 3. Handle event
  if (event.type === 'payment_intent.succeeded') {
    await fulfillOrder(event.data.object);
  }

  await markProcessed(event.id);
  res.status(200).send('OK');
});`,
      },
      pros: ["Real-time notifications without polling overhead", "Simple to implement — just an HTTP endpoint", "Decouples systems — source doesn't need to know your internals"],
      cons: ["Delivery is not guaranteed — need retry logic", "Debugging is harder (no request you initiated)", "Must handle out-of-order delivery and duplicates"],
      realWorld: ["GitHub sends webhooks for push, PR, and issue events", "Stripe sends webhooks for payment, subscription, and dispute events", "Slack sends webhooks when messages, reactions, or slash commands occur"],
    },
  },
  {
    slug: "long-polling",
    title: "Long Polling vs WebSockets vs SSE",
    description: "Three techniques for real-time server-to-client communication",
    category: "networking",
    difficulty: "Intermediate",
    icon: "🔃",
    content: {
      overview: "When a client needs real-time updates from a server, there are three main approaches: Long Polling (client holds a request open until data arrives), WebSockets (persistent bidirectional connection), and Server-Sent Events (SSE — server pushes updates over a one-way connection).",
      keyPoints: [
        "Short polling: client requests every N seconds. Simple but wasteful — most responses are empty",
        "Long polling: client sends request, server holds it open until data is available or timeout, then client immediately reconnects",
        "WebSockets: persistent full-duplex connection over a single TCP socket. Both client and server can send at any time",
        "SSE (Server-Sent Events): server pushes updates to client over a single HTTP connection. One-way only (server → client)",
        "Choose based on: bidirectional need (WebSockets), simple server push (SSE), or broad compatibility (long polling)",
      ],
      explanation: "Long polling: Client sends a GET request. Server doesn't respond immediately — it waits until new data is available (or a timeout, typically 30-60s). Client processes the response and immediately sends another request. This simulates real-time with standard HTTP.\n\nWebSockets: After an HTTP handshake upgrade, both sides communicate freely over a persistent TCP connection. Ideal for chat apps, multiplayer games, and collaborative editing. Overhead per message is just 2-6 bytes (vs ~800 bytes for HTTP headers).\n\nSSE: Server sends a stream of events over a standard HTTP connection using the text/event-stream content type. Built into browsers via the EventSource API. Simpler than WebSockets for one-way updates. Supports automatic reconnection.",
      codeExample: {
        title: "Three Real-Time Approaches",
        code: `// 1. Long Polling
async function longPoll() {
  const res = await fetch('/api/updates?since=' + lastId);
  const data = await res.json();
  processUpdates(data);
  longPoll(); // immediately reconnect
}

// 2. WebSocket
const ws = new WebSocket('wss://api.example.com/ws');
ws.onmessage = (event) => processUpdates(JSON.parse(event.data));
ws.send(JSON.stringify({ type: 'subscribe', channel: 'feed' }));

// 3. Server-Sent Events (SSE)
const source = new EventSource('/api/stream');
source.onmessage = (event) => processUpdates(JSON.parse(event.data));
source.onerror = () => console.log('Reconnecting...');`,
      },
      pros: ["Long polling: works everywhere, no special server support", "WebSockets: lowest latency, bidirectional, minimal overhead", "SSE: simple API, automatic reconnection, works with HTTP/2"],
      cons: ["Long polling: high server resource usage, latency gap between events", "WebSockets: harder to scale (stateful connections), no HTTP caching", "SSE: one-way only, limited browser connection pool (6 per domain in HTTP/1.1)"],
    },
  },
  {
    slug: "http-https",
    title: "HTTP & HTTPS",
    description: "The protocol powering the web — and its secure, encrypted counterpart",
    category: "networking",
    difficulty: "Beginner",
    icon: "🔒",
    content: {
      overview: "HTTP (HyperText Transfer Protocol) is the application-layer protocol used for transmitting web pages, APIs, and resources. HTTPS adds TLS/SSL encryption on top of HTTP, ensuring data confidentiality, integrity, and server authentication.",
      keyPoints: [
        "HTTP is stateless: each request is independent — the server doesn't remember previous requests",
        "HTTP methods: GET (read), POST (create), PUT (update/replace), PATCH (partial update), DELETE (remove)",
        "Status codes: 2xx (success), 3xx (redirect), 4xx (client error), 5xx (server error)",
        "HTTPS uses TLS handshake: client verifies server's certificate, both agree on encryption keys",
        "HTTP/2 adds multiplexing (multiple requests over one connection), header compression, and server push",
      ],
      explanation: "An HTTP request consists of: method (GET), URL (/api/users), headers (Content-Type, Authorization), and an optional body. The server responds with a status code, headers, and a body.\n\nHTTPS wraps HTTP in TLS encryption. The TLS handshake: (1) Client sends 'hello' with supported cipher suites. (2) Server responds with its SSL certificate containing its public key. (3) Client verifies the certificate against trusted Certificate Authorities. (4) Both sides derive symmetric encryption keys. All subsequent data is encrypted.\n\nHTTP/2 (2015) fixed head-of-line blocking by multiplexing streams over a single TCP connection. HTTP/3 (2022) replaced TCP with QUIC (UDP-based) to eliminate TCP-level head-of-line blocking and reduce connection setup latency.",
      pros: ["HTTP is simple, universal, and well-tooled", "HTTPS prevents eavesdropping and man-in-the-middle attacks", "HTTP/2 and HTTP/3 significantly improve performance"],
      cons: ["HTTP is stateless — session management requires cookies/tokens", "HTTPS adds TLS handshake latency (1-2 round trips)", "HTTP/2 server push is rarely used in practice"],
    },
  },

  // ── Additional Databases ────────────────────────────────────
  {
    slug: "bloom-filters",
    title: "Bloom Filters",
    description: "Space-efficient probabilistic data structure for testing set membership",
    category: "databases",
    difficulty: "Advanced",
    icon: "🌸",
    content: {
      overview: "A Bloom filter is a probabilistic data structure that can tell you if an element is 'possibly in the set' or 'definitely not in the set'. It uses a bit array and multiple hash functions. It can have false positives but never false negatives, making it perfect for quickly filtering out non-existent keys.",
      keyPoints: [
        "Uses a bit array of m bits and k independent hash functions",
        "Insert: hash the element k times, set those k bit positions to 1",
        "Lookup: hash the element k times, check if all k positions are 1. If any is 0, the element is definitely not in the set",
        "False positive rate: P ≈ (1 - e^(-kn/m))^k where n is the number of inserted elements",
        "Cannot delete elements from a standard Bloom filter (Counting Bloom filters support deletion)",
      ],
      explanation: "Imagine checking if a username is taken. Without a Bloom filter, you query the database for every attempt. With a Bloom filter: first check the filter. If it says 'no' — the username is definitely available, skip the DB query. If it says 'maybe yes' — then query the database to confirm.\n\nExample: m=1000 bits, k=3 hash functions. To insert 'alice': hash1('alice')=42, hash2('alice')=307, hash3('alice')=819. Set bits 42, 307, and 819 to 1. To check 'bob': if any of its three bit positions is 0, bob is definitely not in the set.\n\nBloom filters are incredibly space-efficient. To store 1 million elements with a 1% false positive rate, you need only 1.14 MB (vs hundreds of MB for a hash set).",
      codeExample: {
        title: "Simple Bloom Filter",
        code: `class BloomFilter {
  constructor(size = 1000, hashCount = 3) {
    this.bits = new Uint8Array(size);
    this.size = size;
    this.hashCount = hashCount;
  }

  _hashes(value) {
    const positions = [];
    for (let i = 0; i < this.hashCount; i++) {
      let hash = 0;
      for (const ch of value + i) hash = (hash * 31 + ch.charCodeAt(0)) % this.size;
      positions.push(hash);
    }
    return positions;
  }

  add(value) {
    for (const pos of this._hashes(value)) this.bits[pos] = 1;
  }

  mightContain(value) {
    return this._hashes(value).every(pos => this.bits[pos] === 1);
  }
}

const bf = new BloomFilter(10000, 5);
bf.add('alice'); bf.add('bob');
bf.mightContain('alice'); // true
bf.mightContain('charlie'); // false (definitely not)`,
      },
      pros: ["Extremely space-efficient compared to hash sets", "O(k) constant time for both insert and lookup", "No false negatives — if it says 'no', the answer is definitive"],
      cons: ["False positives are possible — must confirm with actual lookup", "Cannot delete elements (standard variant)", "Bit array size must be chosen upfront based on expected cardinality"],
      realWorld: ["Google Chrome uses Bloom filters to check malicious URLs", "Cassandra uses Bloom filters to avoid unnecessary disk reads for SSTables", "Medium uses Bloom filters to avoid recommending already-read articles"],
    },
  },
  {
    slug: "database-types",
    title: "Types of Databases",
    description: "Choosing the right database type: relational, document, key-value, graph, columnar, time-series",
    category: "databases",
    difficulty: "Intermediate",
    icon: "📚",
    content: {
      overview: "Different data access patterns require different database types. Relational databases (SQL) work for structured data with relationships. Document stores handle semi-structured data. Key-value stores excel at simple lookups. Graph databases model complex relationships. Columnar databases optimize analytics. Time-series databases handle temporal data.",
      keyPoints: [
        "Relational (SQL): tables with rows and columns, joins, ACID transactions — PostgreSQL, MySQL",
        "Document: flexible JSON/BSON documents, nested data, no fixed schema — MongoDB, CouchDB",
        "Key-Value: simple get/set by key, extremely fast, ideal for caching — Redis, DynamoDB",
        "Wide-Column: data organized by columns rather than rows, great for analytics — Cassandra, HBase",
        "Graph: nodes and edges model relationships, efficient traversal — Neo4j, Amazon Neptune",
        "Time-Series: optimized for timestamped data, downsampling, retention policies — InfluxDB, TimescaleDB",
      ],
      explanation: "How to choose:\n\n- Need ACID transactions and complex joins? → Relational (PostgreSQL)\n- Flexible schema with nested objects? → Document (MongoDB)\n- Simple lookups with extreme speed? → Key-Value (Redis)\n- Analytics on billions of rows? → Wide-Column (Cassandra) or Columnar (ClickHouse)\n- Social network relationships? → Graph (Neo4j)\n- IoT sensor data or metrics? → Time-Series (InfluxDB)\n\nMany systems use multiple database types (polyglot persistence): e.g., PostgreSQL for user accounts, Redis for sessions, Elasticsearch for search, and InfluxDB for metrics.",
      realWorld: ["Uber uses PostgreSQL + Redis + Cassandra + Elasticsearch", "Facebook uses MySQL (users) + TAO (graph cache) + RocksDB (messaging)", "Netflix uses Cassandra (100+ PB) + EVCache (Redis) + Elasticsearch"],
    },
  },

  // ── Additional Messaging ────────────────────────────────────
  {
    slug: "change-data-capture",
    title: "Change Data Capture (CDC)",
    description: "Capture and stream database changes in real-time to downstream systems",
    category: "messaging",
    difficulty: "Advanced",
    icon: "📋",
    content: {
      overview: "Change Data Capture (CDC) is a pattern that tracks changes (inserts, updates, deletes) in a database and streams them as events to other systems. Instead of polling for changes or using dual writes, CDC reads the database's transaction log to capture every change reliably and in order.",
      keyPoints: [
        "Log-based CDC reads the database's write-ahead log (WAL/binlog) — captures every change without impacting query performance",
        "Alternatives: trigger-based CDC (database triggers write to a changelog table) — simpler but higher overhead",
        "Debezium is the most popular open-source CDC platform — connectors for PostgreSQL, MySQL, MongoDB, etc.",
        "CDC events flow to Kafka, enabling real-time materialized views, cache invalidation, search index updates",
        "Eliminates dual-write problems: instead of writing to DB and Kafka separately (risking inconsistency), write to DB and let CDC propagate",
      ],
      explanation: "The dual-write problem: your service writes an order to PostgreSQL AND publishes an event to Kafka. If the Kafka publish fails after the DB write, downstream systems miss the event. If you reverse the order, you might publish an event for a failed write.\n\nCDC solves this: write only to the database. Debezium reads PostgreSQL's WAL and publishes change events to Kafka automatically. Every committed transaction becomes an event — exactly once, in order.\n\nCommon CDC pipeline: PostgreSQL → Debezium → Kafka → Consumers (Elasticsearch for search, Redis for cache, data warehouse for analytics). This creates an eventually consistent but reliable data pipeline.",
      codeExample: {
        title: "CDC Event Structure (Debezium)",
        code: `// Debezium CDC event from PostgreSQL
{
  "op": "u",  // c=create, u=update, d=delete, r=read(snapshot)
  "before": { "id": 1001, "status": "pending", "total": 50.00 },
  "after":  { "id": 1001, "status": "shipped", "total": 50.00 },
  "source": {
    "connector": "postgresql",
    "db": "orders",
    "table": "orders",
    "lsn": 3412894,        // log sequence number
    "txId": 983,
    "ts_ms": 1698234567890
  }
}

// Consumer: update search index on order changes
consumer.on('orders.orders', (event) => {
  if (event.op === 'u' || event.op === 'c') {
    elasticsearch.index('orders', event.after.id, event.after);
  } else if (event.op === 'd') {
    elasticsearch.delete('orders', event.before.id);
  }
});`,
      },
      pros: ["No impact on source database performance (reads WAL, not queries)", "Exactly-once ordered delivery of all changes", "Eliminates dual-write inconsistencies"],
      cons: ["Additional infrastructure complexity (Debezium + Kafka)", "Schema changes require careful handling", "Initial snapshot of existing data can be slow for large tables"],
      realWorld: ["Airbnb uses CDC to sync search indexes in real-time", "Netflix uses CDC for cache invalidation across services", "Shopify uses Debezium CDC for event-driven order processing"],
    },
  },
  {
    slug: "batch-vs-stream",
    title: "Batch vs Stream Processing",
    description: "Process data in large scheduled chunks or continuously as it arrives",
    category: "messaging",
    difficulty: "Intermediate",
    icon: "🔀",
    content: {
      overview: "Batch processing collects data over a period and processes it all at once (hourly, daily). Stream processing handles data continuously as individual events arrive, providing near-real-time results. The choice depends on latency requirements, data volume, and processing complexity.",
      keyPoints: [
        "Batch: high throughput, high latency. Process hours/days of data in one job — MapReduce, Spark, data warehouses",
        "Stream: lower throughput per event, low latency. Process events within milliseconds — Kafka Streams, Flink, Spark Streaming",
        "Lambda architecture: run both batch (accuracy) and stream (speed) pipelines, merge results",
        "Kappa architecture: use stream processing for everything — replay the event log for reprocessing",
        "Windowing in streams: tumbling (fixed), sliding (overlapping), session (gap-based) windows for aggregations",
      ],
      explanation: "Batch processing example: every night, process all of yesterday's orders to generate sales reports, update recommendation models, and calculate royalties. Hadoop/Spark reads from a data lake, processes terabytes, and writes results to a data warehouse.\n\nStream processing example: as each order comes in, update the real-time dashboard, check for fraud, send confirmation emails, and update inventory counts — all within seconds.\n\nMany modern systems use both: stream processing for real-time features (dashboards, alerts, fraud detection) and batch processing for complex analytics, ML model training, and reconciliation.",
      pros: ["Batch: simple to implement, efficient for large datasets, easy to retry", "Stream: real-time results, immediate reactions to events", "Stream: natural fit for event-driven architectures"],
      cons: ["Batch: high latency — results are hours or days old", "Stream: harder to handle failures and out-of-order events", "Stream: exactly-once processing is complex to guarantee"],
      realWorld: ["Netflix: batch for recommendation models, stream for real-time viewing metrics", "Uber: stream processing for surge pricing, batch for driver payments", "LinkedIn: Kafka streams for real-time notifications, batch Spark for analytics"],
    },
  },

  // ── Additional Distributed Systems ──────────────────────────
  {
    slug: "service-discovery",
    title: "Service Discovery",
    description: "How microservices find and communicate with each other in a dynamic environment",
    category: "distributed",
    difficulty: "Intermediate",
    icon: "🔍",
    content: {
      overview: "In a microservices architecture, services are deployed across multiple servers with dynamic IP addresses. Service discovery is the mechanism by which services find each other's network locations. It can be client-side (the client queries a registry and chooses an instance) or server-side (a load balancer queries the registry).",
      keyPoints: [
        "Service registry: a database of available service instances and their network locations (Consul, etcd, ZooKeeper)",
        "Client-side discovery: client queries the registry, picks an instance, and connects directly — more control, more coupling",
        "Server-side discovery: client sends to a load balancer/router, which queries the registry — simpler clients, extra hop",
        "Registration: services register on startup and deregister on shutdown. Health checks remove unhealthy instances",
        "DNS-based discovery: Kubernetes uses DNS (service-name.namespace.svc.cluster.local) to resolve to service IPs",
      ],
      explanation: "Without service discovery, you'd hardcode IP addresses — impossible when containers scale up/down dynamically. Service discovery solves this.\n\nClient-side: the Order service needs to call the Payment service. It queries Consul for healthy Payment instances, gets [10.0.1.5:8080, 10.0.1.6:8080], and picks one (round-robin, random, least-connections). Libraries like Netflix Eureka + Ribbon implement this pattern.\n\nServer-side: the Order service sends requests to a load balancer (e.g., AWS ALB). The load balancer queries the registry and forwards to a healthy instance. Kubernetes Services work this way — you call 'payment-service:8080' and kube-proxy routes to a healthy pod.\n\nHealth checks: the registry periodically pings instances (HTTP GET /health). If an instance fails 3 consecutive checks, it's removed from the registry.",
      pros: ["Enables dynamic scaling — no hardcoded addresses", "Automatic failover when instances become unhealthy", "Supports multiple environments (dev, staging, prod) transparently"],
      cons: ["Service registry is a critical dependency (must be highly available)", "Client-side discovery adds complexity to every service", "Stale registry data can route traffic to dead instances"],
      realWorld: ["Netflix uses Eureka for service discovery across 1000+ microservices", "Kubernetes uses etcd-backed DNS for service discovery", "HashiCorp Consul provides service discovery with built-in health checking"],
    },
  },
  {
    slug: "distributed-locking",
    title: "Distributed Locking",
    description: "Coordinate access to shared resources across multiple processes or machines",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🔐",
    content: {
      overview: "A distributed lock ensures that only one process across multiple machines can access a shared resource at a time. Unlike local mutexes, distributed locks must handle network partitions, process crashes, and clock skew. Implementations use Redis (Redlock), ZooKeeper, or etcd.",
      keyPoints: [
        "Purpose: prevent double-processing, enforce mutual exclusion in distributed systems",
        "Redis SETNX: simplest approach — SET key value NX PX 30000 (set if not exists, with 30s TTL)",
        "Redlock (Redis): acquire locks on N/2+1 independent Redis nodes for higher reliability",
        "ZooKeeper: create ephemeral sequential znodes — lowest sequence number holds the lock",
        "Fencing tokens: monotonically increasing token prevents stale lock holders from making writes",
      ],
      explanation: "Problem: two instances of your payment service both try to charge the same order. Without distributed locking, both succeed — the customer is charged twice.\n\nSimple Redis lock: SET order:1234:lock worker-1 NX PX 30000. If another worker tries, SETNX fails — it must wait. The TTL (30s) prevents deadlocks if the lock holder crashes.\n\nDanger: if worker-1's GC pause lasts longer than 30s, the lock expires and worker-2 acquires it. Now both workers think they hold the lock. Solution: fencing tokens — each lock acquisition returns a monotonically increasing number. The storage layer rejects writes with stale tokens.\n\nZooKeeper approach: more robust. Uses ephemeral nodes (auto-deleted if the client disconnects) and sequential ordering to implement fair, deadlock-free locks.",
      codeExample: {
        title: "Distributed Lock with Redis",
        code: `const crypto = require('crypto');

class RedisLock {
  constructor(redis) { this.redis = redis; }

  async acquire(resource, ttlMs = 30000) {
    const token = crypto.randomUUID();
    const acquired = await this.redis.set(
      \`lock:\${resource}\`, token, 'NX', 'PX', ttlMs
    );
    return acquired ? token : null;
  }

  async release(resource, token) {
    // Lua script: only release if we own the lock
    const script = \`
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      end
      return 0\`;
    return this.redis.eval(script, 1, \`lock:\${resource}\`, token);
  }
}

// Usage
const lock = new RedisLock(redis);
const token = await lock.acquire('order:1234');
if (token) {
  try { await processPayment('order:1234'); }
  finally { await lock.release('order:1234', token); }
}`,
      },
      pros: ["Prevents race conditions in distributed systems", "Redis locks are fast and simple for most use cases", "ZooKeeper locks are reliable with strong consistency guarantees"],
      cons: ["Redis locks can fail under network partitions (not perfectly safe)", "Clock skew can cause lock expiration issues", "Adds latency and complexity to critical paths"],
      realWorld: ["Stripe uses distributed locks to prevent double-charging", "Uber uses ZooKeeper locks for ride assignment", "Kubernetes uses etcd leases for leader election (a form of distributed locking)"],
    },
  },
  {
    slug: "distributed-tracing",
    title: "Distributed Tracing",
    description: "Track requests as they flow through multiple microservices for debugging and performance analysis",
    category: "distributed",
    difficulty: "Intermediate",
    icon: "🔭",
    content: {
      overview: "Distributed tracing tracks a single request as it travels through multiple services in a microservice architecture. Each service adds a 'span' (a timed operation) to the trace, creating a tree of spans that shows the full request lifecycle, latencies, and failure points.",
      keyPoints: [
        "Trace: the entire journey of a request across all services. Identified by a unique trace ID",
        "Span: a single operation within a trace (e.g., 'query user DB'). Has start time, duration, status, and parent span",
        "Context propagation: trace ID and span ID are passed between services via HTTP headers (traceparent, b3)",
        "OpenTelemetry: the standard for instrumentation — vendor-neutral APIs for traces, metrics, and logs",
        "Backends: Jaeger, Zipkin, Datadog, AWS X-Ray visualize traces as waterfall/flame charts",
      ],
      explanation: "A user request hits API Gateway → User Service → Order Service → Payment Service → Notification Service. Without tracing, if the request is slow, you'd check logs in each service separately. With tracing, one trace ID links all operations:\n\nTrace abc123:\n  ├─ API Gateway (2ms)\n  ├─ User Service: auth check (15ms)\n  ├─ Order Service: create order (45ms)\n  │   ├─ DB write (12ms)\n  │   └─ Cache invalidation (3ms)\n  ├─ Payment Service: charge card (320ms) ← bottleneck!\n  └─ Notification Service: send email (8ms)\n\nThe trace immediately reveals the Payment Service is the bottleneck. You can drill into its span to see it spent 280ms waiting for the payment gateway response.",
      pros: ["Pinpoints latency bottlenecks across services instantly", "Visualizes the full request flow for debugging", "OpenTelemetry provides vendor-neutral instrumentation"],
      cons: ["Instrumentation adds small overhead to every request", "High-volume traces require significant storage", "Sampling is needed at scale — you can't store every trace"],
      realWorld: ["Google's Dapper paper (2010) pioneered distributed tracing", "Uber's Jaeger handles billions of spans per day", "Netflix uses distributed tracing to debug across 1000+ microservices"],
    },
  },
  {
    slug: "heartbeats",
    title: "Heartbeat Mechanism",
    description: "Periodic signals that indicate a service or node is alive and healthy",
    category: "distributed",
    difficulty: "Beginner",
    icon: "💓",
    content: {
      overview: "A heartbeat is a periodic signal sent between distributed system components to indicate they are alive and functioning. If heartbeats stop arriving, the monitoring system assumes the sender has failed and triggers recovery actions like failover, re-replication, or alerting.",
      keyPoints: [
        "Heartbeat interval: how often signals are sent (typically every 1-10 seconds)",
        "Timeout: how long to wait before declaring a node dead (usually 3x the interval)",
        "Push heartbeats: the node sends a signal to a coordinator ('I'm alive')",
        "Pull heartbeats: a coordinator pings the node and expects a response",
        "Phi Accrual Failure Detector: instead of binary alive/dead, calculates a suspicion level based on heartbeat history",
      ],
      explanation: "In a distributed database cluster: each node sends a heartbeat every 5 seconds to the leader. If the leader doesn't receive a heartbeat for 15 seconds (3 missed beats), it marks the node as 'suspected dead'. After 30 seconds with no heartbeat, it's declared dead and its data partitions are reassigned to healthy nodes.\n\nFalse positives are dangerous: a slow network or GC pause can cause missed heartbeats. The node is alive but declared dead — causing unnecessary failover, data migration, and split-brain scenarios. The Phi Accrual detector reduces false positives by tracking heartbeat arrival times and computing a statistical suspicion level rather than using a fixed timeout.\n\nHeartbeats are also used for: leader election (followers detect leader failure), load balancer health checks, distributed lock renewal, and cluster membership management.",
      pros: ["Simple and effective failure detection", "Low overhead — tiny messages at regular intervals", "Enables automatic failover and self-healing systems"],
      cons: ["False positives from network delays or GC pauses", "Fixed timeouts don't adapt to varying network conditions", "High-frequency heartbeats increase network traffic in large clusters"],
      realWorld: ["Kubernetes uses liveness probes (heartbeats) to restart failed pods", "ZooKeeper uses session heartbeats to maintain ephemeral nodes", "Cassandra uses Phi Accrual failure detection with gossip-based heartbeats"],
    },
  },
  {
    slug: "disaster-recovery",
    title: "Disaster Recovery",
    description: "Strategies for recovering systems and data after catastrophic failures",
    category: "distributed",
    difficulty: "Advanced",
    icon: "🆘",
    content: {
      overview: "Disaster recovery (DR) is the set of policies, tools, and procedures to recover IT systems after a catastrophic event — data center outage, natural disaster, cyber attack, or critical software failure. DR plans define Recovery Time Objective (RTO — how fast) and Recovery Point Objective (RPO — how much data loss is acceptable).",
      keyPoints: [
        "RTO (Recovery Time Objective): maximum acceptable downtime. E.g., 4 hours means the system must be back within 4 hours",
        "RPO (Recovery Point Objective): maximum acceptable data loss. E.g., 1 hour means you can lose at most 1 hour of data",
        "Cold DR: backups only, manual restoration — hours/days RTO, lowest cost",
        "Warm DR: standby infrastructure partially running — minutes/hours RTO",
        "Hot DR: fully running replica in another region — seconds/minutes RTO, highest cost",
      ],
      explanation: "DR strategies from cheapest to most resilient:\n\n1. Backup & Restore: regular backups to S3/GCS. On disaster, spin up new infrastructure and restore. RTO: hours. RPO: last backup interval.\n\n2. Pilot Light: core infrastructure (database replicas) always running in DR region. On disaster, scale up compute. RTO: tens of minutes.\n\n3. Warm Standby: scaled-down but fully functional copy in DR region. On disaster, scale to full capacity and redirect traffic. RTO: minutes.\n\n4. Multi-Region Active-Active: full infrastructure in multiple regions, all serving traffic. On disaster, DNS routes all traffic to surviving region. RTO: seconds. RPO: near zero.\n\nKey practices: automated failover, regular DR drills, immutable backups (protection against ransomware), and runbooks documenting exact recovery steps.",
      pros: ["Protects business continuity during catastrophic events", "Regulatory compliance (many industries require DR plans)", "Active-active DR also improves normal performance via geographic distribution"],
      cons: ["Hot DR doubles (or more) infrastructure costs", "DR drills require significant engineering time", "Complexity of keeping DR environment in sync with production"],
      realWorld: ["AWS recommends multi-AZ for HA, multi-region for DR", "Netflix runs active-active across 3 AWS regions", "Financial institutions are required by regulation to have tested DR plans"],
    },
  },

  // ── Additional Patterns ─────────────────────────────────────
  {
    slug: "idempotency",
    title: "Idempotency",
    description: "Design operations that produce the same result no matter how many times they are executed",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🔁",
    content: {
      overview: "An operation is idempotent if performing it multiple times has the same effect as performing it once. In distributed systems where retries are common (network timeouts, message redelivery), idempotency prevents duplicate side effects like double charges or duplicate records.",
      keyPoints: [
        "Naturally idempotent: GET, PUT (set to value), DELETE (delete if exists). NOT idempotent: POST (create), increment",
        "Idempotency key: a unique client-generated key (UUID) sent with each request to deduplicate on the server",
        "Server stores processed idempotency keys and returns cached response for duplicate requests",
        "Critical for: payment processing, order placement, message handling, webhook processing",
        "TTL: idempotency keys should expire after a reasonable window (e.g., 24-48 hours)",
      ],
      explanation: "Problem: Client sends POST /payments. Network times out. Did the payment go through? The client doesn't know, so it retries. Without idempotency, the customer is charged twice.\n\nSolution: Client includes an Idempotency-Key header (a UUID). Server flow:\n1. Check if this key exists in the idempotency store\n2. If yes → return the stored response (no duplicate processing)\n3. If no → process the request, store the result with the key, return response\n\nEven if the client retries 10 times with the same key, the payment is processed exactly once.",
      codeExample: {
        title: "Idempotent API Endpoint",
        code: `app.post('/api/payments', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key required' });
  }

  // Check if already processed
  const cached = await redis.get(\`idem:\${idempotencyKey}\`);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }

  // Process payment
  const result = await processPayment(req.body);

  // Store result with 24h TTL
  await redis.setex(
    \`idem:\${idempotencyKey}\`, 86400, JSON.stringify(result)
  );

  res.status(201).json(result);
});

// Client usage
fetch('/api/payments', {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({ amount: 50, currency: 'USD' })
});`,
      },
      pros: ["Prevents duplicate side effects from retries", "Enables safe retry logic — clients can retry freely", "Simple to implement with a key-value store"],
      cons: ["Requires additional storage for idempotency keys", "Key collision (extremely unlikely with UUIDs) could skip processing", "Must handle concurrent requests with the same key (locking)"],
      realWorld: ["Stripe requires Idempotency-Key for all POST requests", "AWS S3 PUT is naturally idempotent (same key = overwrite)", "Kafka consumer groups use offsets for idempotent message processing"],
    },
  },
  {
    slug: "client-server",
    title: "Client-Server Architecture",
    description: "The foundational model where clients request services from centralized servers",
    category: "patterns",
    difficulty: "Beginner",
    icon: "🖥️",
    content: {
      overview: "Client-server architecture divides a system into two roles: clients (which request services) and servers (which provide them). The client initiates communication, and the server responds. This model underpins the web, email, databases, and most networked applications.",
      keyPoints: [
        "Client: initiates requests. Examples: web browser, mobile app, API consumer",
        "Server: listens for and responds to requests. Examples: web server, database, API backend",
        "Thin client: minimal logic on client (server-rendered HTML). Thick client: rich logic on client (SPAs, mobile apps)",
        "Stateless servers are easier to scale horizontally (add more servers behind a load balancer)",
        "Alternatives: peer-to-peer (no central server), serverless (abstracted server), event-driven (pub/sub)",
      ],
      explanation: "The web is the quintessential client-server system. Your browser (client) sends an HTTP request to google.com (server). The server processes the request, queries databases, and returns an HTML/JSON response.\n\nEvolution of client-server:\n1. Monolithic: single server handles everything (web + app + DB)\n2. 2-tier: client talks directly to database server\n3. 3-tier: client → application server → database server\n4. N-tier / microservices: client → API gateway → multiple specialized services → multiple databases\n\nModern SPAs (React, Vue) are 'thick clients' — they handle routing, state management, and rendering. The server becomes a thin API layer that returns JSON data.",
      pros: ["Simple and well-understood architecture", "Centralized data management and access control", "Easy to update server without changing clients"],
      cons: ["Server is a single point of failure (needs redundancy)", "Server capacity limits the number of concurrent clients", "Network dependency — clients can't function offline without caching"],
    },
  },
  {
    slug: "peer-to-peer",
    title: "Peer-to-Peer (P2P) Architecture",
    description: "Decentralized systems where every node is both client and server",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "🕸️",
    content: {
      overview: "In P2P architecture, every node (peer) acts as both a client and a server. There's no central authority — peers communicate directly, share resources, and collectively provide the service. This creates highly resilient, scalable systems that can't be taken down by removing a single node.",
      keyPoints: [
        "No central server — every peer contributes resources (bandwidth, storage, compute)",
        "Structured P2P: peers organized in a DHT (Distributed Hash Table) for efficient lookup — Chord, Kademlia",
        "Unstructured P2P: peers connect randomly, use flooding or random walks to find content — early Gnutella",
        "Hybrid P2P: some central coordination (tracker/bootstrap nodes) but data transfer is peer-to-peer — BitTorrent",
        "NAT traversal: peers behind firewalls/NATs use techniques like STUN, TURN, ICE to establish direct connections",
      ],
      explanation: "BitTorrent example: A file is split into pieces. Each peer downloads pieces from multiple other peers simultaneously (not from one server). As you download, you also upload pieces you already have to other peers. This distributes bandwidth costs and gets faster as more peers join.\n\nDHT (Distributed Hash Table): maps keys to peers. To find which peer stores file X, hash the filename to get a key, then route through the DHT to find the responsible peer. Lookup takes O(log N) hops for N peers.\n\nWebRTC enables P2P in the browser — video calls, file sharing, and real-time data channels without a central server (except for initial signaling).",
      pros: ["No single point of failure — extremely resilient", "Scales naturally as more peers join (they bring resources)", "No central infrastructure costs — peers contribute bandwidth"],
      cons: ["Harder to enforce security and access control", "Free-rider problem — some peers consume without contributing", "NAT traversal is complex; not all peers can connect directly"],
      realWorld: ["BitTorrent: handles 40% of internet upload traffic", "IPFS: decentralized file storage using content-addressed DHT", "WebRTC: powers Google Meet, Discord voice, and browser-based P2P file sharing"],
    },
  },
  {
    slug: "push-vs-pull",
    title: "Push vs Pull Architecture",
    description: "Should the server push data to clients or should clients pull when they need it?",
    category: "patterns",
    difficulty: "Intermediate",
    icon: "📤",
    content: {
      overview: "In a pull architecture, clients request data when they need it (polling). In a push architecture, the server sends data to clients as soon as it's available. The choice affects latency, resource usage, and complexity. Many systems use a hybrid approach.",
      keyPoints: [
        "Pull (polling): client periodically requests updates. Simple but can be wasteful or have latency gaps",
        "Push: server sends updates immediately when data changes. Lower latency but requires persistent connections",
        "Fan-out on write (push): pre-compute and push to all followers' feeds when content is created",
        "Fan-out on read (pull): compute the feed when a user requests it by pulling from followed users",
        "Hybrid: push for active users, pull for inactive users (Twitter's approach)",
      ],
      explanation: "Twitter's news feed is the classic example:\n\nPush (fan-out on write): When a user tweets, immediately write that tweet to all followers' cached timelines. Reading the timeline is fast (pre-computed), but a celebrity with 50M followers creates 50M writes per tweet.\n\nPull (fan-out on read): When a user opens their timeline, query all followed users for recent tweets and merge them. No write amplification, but reading is slow (many queries per request).\n\nTwitter's hybrid: regular users' tweets are pushed (fan-out on write). Celebrities' tweets are pulled at read time and merged into the pre-computed feed. This caps write amplification while keeping reads fast.",
      pros: ["Push: near-zero latency for updates, efficient for frequently-read data", "Pull: simpler implementation, no wasted pushes for inactive users", "Hybrid: balances the trade-offs of both approaches"],
      cons: ["Push: write amplification for popular content creators", "Pull: higher read latency, more compute at read time", "Push: maintaining persistent connections at scale is complex"],
      realWorld: ["Instagram: fan-out on write for feeds (push model)", "Twitter: hybrid push/pull based on follower count", "Email: push (IMAP IDLE) for new emails, pull (POP3) for batch download"],
    },
  },

  // ── Additional Real-World Systems ───────────────────────────
  {
    slug: "design-instagram",
    title: "Design Instagram",
    description: "Photo-sharing social network with feeds, stories, likes, and explore — serving 2B+ users",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "📸",
    content: {
      overview: "Instagram is a photo and video sharing platform where users post content, follow others, view a personalized feed, interact via likes/comments, and discover new content. Core challenges include generating personalized feeds at scale, storing and serving billions of photos/videos efficiently, and handling celebrity posting (fan-out problem).",
      keyPoints: [
        "Photo storage: original photos stored in object storage (S3), multiple resolutions generated and served via CDN",
        "News feed: fan-out on write — when a user posts, write to all followers' feed caches (Redis/Memcached)",
        "Celebrity optimization: don't fan out for users with millions of followers — merge their posts at read time",
        "Like/comment counters: use Redis for fast increment/decrement, async sync to database",
        "Explore/discovery: ML-based recommendation engine analyzing user behavior, content features, and engagement signals",
      ],
      explanation: "Core services: (1) User Service — profiles, follows, authentication. (2) Post Service — upload, store, generate thumbnails. (3) Feed Service — generate and cache personalized feeds. (4) Notification Service — push notifications for likes, comments, follows.\n\nPhoto upload flow: client uploads to Post Service → store original in S3 → async job generates 4-5 resolutions → store URLs in DB → fan-out to followers' feeds → send push notifications.\n\nFeed generation (fan-out on write): User A posts → Feed Service writes post ID to all followers' Redis feed lists. When a user opens the app, read their pre-computed feed from Redis (fast). For celebrities (>500K followers), skip fan-out and merge their posts at read time.\n\nStorage: Instagram stores 100M+ photos/day. Using S3 with CDN, each photo in ~5 sizes = ~500M objects/day. Content-addressed storage deduplicates identical uploads.",
      realWorld: ["Instagram: 2B+ monthly active users, 100M+ photos uploaded daily", "Uses PostgreSQL (sharded) for metadata, Redis for feeds, S3 for media", "Moved from fan-out on write to hybrid model as celebrity accounts grew"],
    },
  },
  {
    slug: "design-twitter",
    title: "Design Twitter",
    description: "Real-time microblogging platform with tweets, timelines, trends, and search",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🐦",
    content: {
      overview: "Twitter (X) is a microblogging platform where users post short messages (tweets), follow others, see a personalized timeline, and discover trending topics. Core challenges include timeline generation at scale, handling celebrity tweet fan-out, real-time search, and trending topic computation.",
      keyPoints: [
        "Timeline: hybrid fan-out — push for regular users (<5K followers), pull-and-merge for celebrities at read time",
        "Tweet storage: append-only with ~500M tweets/day. Sharded by tweet ID (snowflake IDs embed timestamp)",
        "Search: inverted index updated in near-real-time, supports recency-weighted ranking",
        "Trends: streaming computation over sliding windows, counting hashtag/topic frequency with decay",
        "Snowflake IDs: 64-bit IDs = timestamp(41b) + datacenter(5b) + machine(5b) + sequence(12b) — sortable, unique",
      ],
      explanation: "Timeline generation: The read-heavy path. When User A opens Twitter, the Feed Service reads their pre-computed timeline from cache (fan-out on write). For followed celebrities, it fetches recent tweets and merges them in real-time (fan-out on read).\n\nTweet posting: User posts tweet → write to Tweets table → async fan-out to followers' timeline caches → update search index → check for trending hashtags → send push notifications.\n\nTrending topics: A streaming pipeline (Kafka + Flink) processes all tweets in real-time. It counts hashtag occurrences in sliding windows (5min, 1hr), applies geographic filtering, and ranks by velocity (rate of increase, not just count). This prevents stale topics from dominating.\n\nSearch: an inverted index maps words to tweet IDs. When a user searches 'election', find all tweet IDs containing that word, rank by relevance (recency, engagement, user authority), and return top results.",
      realWorld: ["Twitter: 500M+ tweets/day, 300K+ tweets/second during peak events", "Hybrid fan-out reduced timeline generation latency from 5s to 300ms", "Manhattan (Twitter's key-value store) handles 10M+ requests/second"],
    },
  },
  {
    slug: "design-ecommerce",
    title: "Design E-Commerce Platform",
    description: "Design Amazon-like marketplace with catalog, cart, orders, payments, and recommendations",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🛒",
    content: {
      overview: "An e-commerce platform lets users browse products, add to cart, checkout, make payments, and track orders. Core challenges include inventory management (preventing overselling), handling flash sales (extreme traffic spikes), and building personalized recommendations.",
      keyPoints: [
        "Product catalog: search via Elasticsearch, browse via category hierarchy, filter by attributes",
        "Shopping cart: stored in Redis (fast, per-session) with DB persistence for logged-in users",
        "Inventory: pessimistic locking or reservation-based system to prevent overselling during checkout",
        "Order processing: saga pattern across services — inventory → payment → fulfillment → notification",
        "Recommendations: collaborative filtering ('users who bought X also bought Y'), content-based, and trending",
      ],
      explanation: "Flash sale challenge: 1M users try to buy 1K items at exactly 10:00 AM. Naive approach: all 1M hit the inventory DB simultaneously — database melts.\n\nSolution: (1) Queue-based throttling — funnel all requests through a message queue, process sequentially. (2) Inventory in Redis — fast atomic decrement (DECR). If count reaches 0, reject remaining requests immediately. (3) Pre-generate tokens — only 1K tokens are created, distributed randomly. Only token holders can proceed to checkout.\n\nOrder saga: CreateOrder → ReserveInventory → ChargePayment → ShipOrder. If payment fails, compensating action releases the inventory reservation. Each step is idempotent and publishes events for the next step.\n\nSearch: Elasticsearch indexes product title, description, brand, category, and attributes. Supports fuzzy matching, faceted search (filter by price range, rating, brand), and relevance ranking.",
      realWorld: ["Amazon: 350M+ products, processes 66K orders/second during Prime Day", "Shopify: handles 80K+ requests/second across millions of stores", "Alibaba: 583K orders/second during Singles' Day peak"],
    },
  },
  {
    slug: "design-google-docs",
    title: "Design Google Docs",
    description: "Real-time collaborative document editor where multiple users edit simultaneously",
    category: "real-world",
    difficulty: "Advanced",
    icon: "📝",
    content: {
      overview: "A collaborative editor lets multiple users edit the same document simultaneously with real-time cursor tracking and conflict-free merging. Core challenges include conflict resolution when users edit the same text concurrently, real-time synchronization, and offline support.",
      keyPoints: [
        "OT (Operational Transformation): transform concurrent operations against each other to maintain consistency",
        "CRDT (Conflict-free Replicated Data Type): data structure that automatically merges without conflicts",
        "Each keystroke is an operation: insert(position, char), delete(position). Operations are broadcast to all clients",
        "Cursor presence: each user's cursor position and selection are shared in real-time via WebSocket",
        "Version history: every operation is logged, enabling undo/redo and viewing document history",
      ],
      explanation: "The core problem: User A inserts 'X' at position 5. Simultaneously, User B deletes character at position 3. When A receives B's operation, position 5 has shifted — blindly applying it would corrupt the document.\n\nOT solution: when receiving a remote operation, transform it against all local operations that happened concurrently. Insert(5,'X') transformed against Delete(3) becomes Insert(4,'X') because the deletion shifted everything left by 1.\n\nCRDT alternative: assign each character a unique ID and position between neighbors (fractional indexing). Insert('X', between char-3 and char-4). CRDTs merge automatically without a central server — enabling true P2P editing and offline support.\n\nArchitecture: Client → WebSocket → Collaboration Service (applies OT/CRDT) → Document Store (periodic snapshots) → CDN (for document loading). The collaboration service maintains the authoritative document state and broadcasts transformed operations to all connected clients.",
      realWorld: ["Google Docs uses OT with a central server for conflict resolution", "Figma uses CRDTs for real-time design collaboration", "Apple Notes uses CRDTs for offline-first sync across devices"],
    },
  },
  {
    slug: "design-google-maps",
    title: "Design Google Maps",
    description: "Navigation and mapping platform with real-time traffic, routing, and location search",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🗺️",
    content: {
      overview: "A mapping platform provides map rendering, location search, turn-by-turn navigation, real-time traffic, and ETA calculation. Core challenges include storing and serving map tiles at multiple zoom levels, computing optimal routes on a massive road graph, and incorporating real-time traffic data.",
      keyPoints: [
        "Map tiles: pre-rendered at ~20 zoom levels, served from CDN. Vector tiles (modern) are smaller and rendered client-side",
        "Geocoding: convert address text to lat/lng coordinates using address databases and NLP",
        "Routing: road network as a weighted graph. Use A* or Contraction Hierarchies for fast shortest-path queries",
        "Real-time traffic: aggregate GPS data from millions of phones, compute road segment speeds, update routing weights",
        "ETA: combine routing distance with real-time traffic, historical patterns (rush hour), and road type",
      ],
      explanation: "Map tile serving: the world map is divided into tiles at each zoom level. Level 0 = 1 tile (whole world). Level 1 = 4 tiles. Level 20 = ~1 trillion tiles. Each tile is a 256x256 image (raster) or vector data. Tiles are pre-generated and served from CDN with aggressive caching.\n\nRouting: the road network is a graph with ~1 billion edges. Dijkstra's algorithm is too slow. Contraction Hierarchies pre-process the graph by adding 'shortcut' edges — continental routes are computed in milliseconds.\n\nReal-time traffic: millions of Android phones anonymously report their GPS location and speed. Map matching algorithms snap GPS points to road segments. Speeds are aggregated per road segment and time window. Slow segments are colored red on the map and routing is updated to avoid congestion.\n\nPlaces search: when you search 'coffee shop near me', the system uses your location to find nearby POIs (Points of Interest) via spatial index (R-tree or geohash), ranks by relevance, rating, distance, and returns results.",
      realWorld: ["Google Maps: 1B+ monthly users, 20PB+ of street imagery", "Waze: crowdsourced traffic + incident reporting", "Mapbox: powers Uber, Snap, and many apps with custom map rendering"],
    },
  },
  {
    slug: "design-key-value-store",
    title: "Design Distributed Key-Value Store",
    description: "Fast, scalable storage with simple get/put operations — like DynamoDB or Redis Cluster",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🗝️",
    content: {
      overview: "A distributed key-value store provides simple get(key) and put(key, value) operations across multiple nodes with high availability and scalability. Core challenges include data partitioning, replication, consistency, conflict resolution, and failure handling.",
      keyPoints: [
        "Partitioning: consistent hashing distributes keys across nodes. Adding/removing nodes moves only K/N keys",
        "Replication: each key is replicated on N nodes (typically 3) for fault tolerance. Quorum: R + W > N for consistency",
        "Conflict resolution: vector clocks track causality. Last-writer-wins (LWW) or application-level merge for concurrent writes",
        "Failure detection: gossip protocol propagates membership changes. Sloppy quorum + hinted handoff for temporary failures",
        "Storage engine: LSM-tree (Log-Structured Merge tree) for write-heavy workloads, B-tree for read-heavy",
      ],
      explanation: "Architecture following DynamoDB's design:\n\n1. Consistent hashing ring: keys are hashed to positions on a ring. Each node owns a range. Virtual nodes ensure even distribution.\n\n2. Replication: key K is stored on the node that owns its hash position AND the next N-1 nodes clockwise on the ring.\n\n3. Read/Write quorum: with N=3 replicas, W=2 (write to 2 nodes), R=2 (read from 2 nodes). Since R+W > N, at least one node has the latest value. Tunable: W=1,R=1 for speed. W=3,R=1 for write-safety.\n\n4. Conflict resolution: if two nodes accept writes to the same key during a partition, vector clocks detect the conflict. The application resolves it (e.g., merge shopping carts) or LWW picks the latest timestamp.\n\n5. Anti-entropy: Merkle trees on each node detect data inconsistencies. Nodes periodically compare Merkle tree hashes and sync divergent key ranges.",
      realWorld: ["Amazon DynamoDB: based on Dynamo paper (2007), single-digit millisecond latency", "Apache Cassandra: DynamoDB-inspired, used by Netflix (100+ PB), Apple (400K+ nodes)", "Redis Cluster: in-memory KV store with automatic sharding across 1000 nodes"],
    },
  },
  {
    slug: "design-payment-system",
    title: "Design Payment System",
    description: "Handle money movement reliably — processing charges, refunds, and settlements at scale",
    category: "real-world",
    difficulty: "Advanced",
    icon: "💳",
    content: {
      overview: "A payment system processes financial transactions — charging credit cards, handling refunds, settling with merchants, and preventing fraud. The paramount concern is correctness: money must never be lost, duplicated, or charged incorrectly. This requires exactly-once processing, strong consistency, and comprehensive audit trails.",
      keyPoints: [
        "Idempotency is non-negotiable: every payment request includes an idempotency key to prevent double charges",
        "Double-entry bookkeeping: every transaction creates two entries (debit one account, credit another). Total always balances to zero",
        "Payment state machine: CREATED → AUTHORIZED → CAPTURED → SETTLED (or FAILED/REFUNDED at any point)",
        "PSP integration: Payment Service Provider (Stripe, Adyen) handles card network communication",
        "Reconciliation: daily batch job compares internal records with PSP/bank statements to detect discrepancies",
      ],
      explanation: "Payment flow: (1) Client submits order with payment method. (2) Payment Service creates a payment record (CREATED) with an idempotency key. (3) Calls PSP to authorize the card (AUTHORIZED — funds are held). (4) On order confirmation, captures the payment (CAPTURED — funds are deducted). (5) At end of day, settlement batch transfers funds to the merchant.\n\nExactly-once processing: the Payment Service uses a transactional outbox pattern. Within one DB transaction: insert payment record + insert event to outbox table. A separate process reads the outbox and publishes to Kafka. Even if the process crashes and restarts, the event is published exactly once.\n\nFraud detection: real-time rules engine checks velocity (too many transactions in short time), amount anomalies, geographic impossibility (two transactions from different countries within minutes), and ML models trained on historical fraud patterns.",
      realWorld: ["Stripe processes hundreds of billions of dollars/year with <0.1% failure rate", "Square uses double-entry ledger for all financial operations", "PayPal handles 40M+ transactions/day across 200 markets"],
    },
  },
  {
    slug: "design-web-crawler",
    title: "Design Web Crawler",
    description: "Systematically browse the internet, download web pages, and build a searchable index",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🕷️",
    content: {
      overview: "A web crawler (spider) systematically downloads web pages, extracts links, and follows them to discover more pages. It's the foundation of search engines. Core challenges include politeness (not overwhelming websites), deduplication (not crawling the same page twice), prioritization (crawling important pages first), and scale (billions of pages).",
      keyPoints: [
        "URL frontier: a priority queue of URLs to crawl. Prioritize by page importance (PageRank), freshness, and domain",
        "Politeness: respect robots.txt, enforce per-domain rate limits (1 request/second), and spread load across domains",
        "Deduplication: URL dedup (normalize and hash URLs) + content dedup (fingerprint page content to detect mirrors/duplicates)",
        "DNS resolver: custom caching DNS resolver to avoid DNS bottleneck at high crawl rates",
        "Distributed architecture: multiple crawler workers, URL frontier partitioned by domain, central coordination",
      ],
      explanation: "Crawl loop: (1) Pop highest-priority URL from frontier. (2) Check robots.txt cache for permission. (3) Check URL dedup store (Bloom filter) — skip if already crawled. (4) Download page (HTTP GET with timeout). (5) Parse HTML, extract links and content. (6) Compute content fingerprint (SimHash) — skip if duplicate content. (7) Store page content for indexing. (8) Add extracted links to frontier.\n\nScale: Google crawls billions of pages. To crawl 1B pages/day at 1 page/second/worker = 11,574 workers. URL frontier is distributed — partition by domain hash so each worker handles a set of domains, enabling per-domain rate limiting.\n\nFreshness: not all pages need re-crawling at the same rate. News sites: hourly. Corporate pages: weekly. Historical archives: monthly. Adaptive crawl rate based on how frequently pages change.",
      realWorld: ["Googlebot crawls hundreds of billions of pages", "Common Crawl provides free monthly web crawl datasets (250B+ pages)", "Scrapy is a popular open-source Python crawling framework"],
    },
  },
  {
    slug: "design-google-search",
    title: "Design Search Engine",
    description: "Index billions of web pages and return the most relevant results in milliseconds",
    category: "real-world",
    difficulty: "Advanced",
    icon: "🔎",
    content: {
      overview: "A search engine crawls the web, builds an inverted index of all words and their containing documents, and ranks results by relevance when a user searches. Core challenges include building and updating a petabyte-scale inverted index, ranking billions of results in milliseconds, and handling ambiguous queries.",
      keyPoints: [
        "Inverted index: maps each word to a sorted list of document IDs containing that word, with positions and frequencies",
        "PageRank: pages linked by many important pages are themselves important. Recursive graph algorithm",
        "Query processing: parse query → look up terms in inverted index → intersect posting lists → rank results → return top K",
        "Ranking signals: PageRank, term frequency (TF-IDF), freshness, click-through rate, page speed, mobile-friendliness",
        "Index sharding: the index is too large for one machine — partition by document ID across thousands of shards",
      ],
      explanation: "Indexing pipeline: (1) Crawler downloads pages. (2) Parser extracts text, title, headings, links. (3) Tokenizer splits text into terms, applies stemming (running→run), removes stop words. (4) Indexer builds inverted index: 'distributed' → [doc1:pos5, doc47:pos12, doc203:pos1].\n\nQuery processing: user searches 'distributed systems'. (1) Look up 'distributed' posting list and 'systems' posting list. (2) Intersect lists to find documents containing both words. (3) Score each document: TF-IDF (how important is the term in this document vs all documents) × PageRank × freshness × 100+ other signals. (4) Return top 10 results.\n\nScale: the index is partitioned across thousands of machines. Each query is sent to all shards in parallel. Each shard returns its top-K results. A merger combines and re-ranks them. Total latency: 200-400ms for billions of documents.",
      realWorld: ["Google: 100B+ pages indexed, 8.5B searches/day", "Bing: uses deep learning for query understanding and ranking", "Elasticsearch: popular open-source search engine based on Lucene"],
    },
  },
  {
    slug: "design-spotify",
    title: "Design Spotify",
    description: "Music streaming platform with playlists, recommendations, and offline playback",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "🎵",
    content: {
      overview: "A music streaming service lets users search, browse, and stream millions of songs on demand. It generates personalized playlists, supports offline downloads, and handles concurrent streams from millions of users. Core challenges include audio streaming at scale, recommendation algorithms, and music rights management.",
      keyPoints: [
        "Audio storage: songs stored in multiple formats and bitrates (96/160/320 kbps). Served from CDN edge nodes",
        "Streaming protocol: adaptive bitrate streaming — client switches quality based on network conditions",
        "Recommendation: collaborative filtering (users with similar taste), audio features (tempo, energy), NLP on playlists/reviews",
        "Offline mode: encrypted downloads stored locally, license checked periodically (every 30 days)",
        "Royalty tracking: every stream is logged for per-play royalty calculation and reporting to rights holders",
      ],
      explanation: "Audio pipeline: artist uploads WAV → transcoding service generates Ogg Vorbis (96/160/320 kbps) + AAC variants → stored in object storage → replicated to CDN edge servers worldwide.\n\nStreaming: client requests a song → CDN serves audio chunks (not the full file). Adaptive bitrate: on WiFi, stream 320kbps. On cellular, drop to 160kbps. On poor connection, drop to 96kbps. Seamless switching mid-song.\n\nDiscover Weekly (recommendation): (1) Collaborative filtering: find users with similar listening history, recommend songs they liked that you haven't heard. (2) Audio analysis: ML models analyze raw audio for tempo, key, energy, danceability — recommend songs with similar features. (3) NLP: analyze playlist titles, blog posts, and reviews to understand song context. Combine all signals to generate a personalized 30-song playlist every Monday.",
      realWorld: ["Spotify: 600M+ users, 100M+ songs, 5B+ playlists", "Uses Google Cloud with 2,500+ microservices", "Discover Weekly generates 2B+ streams/month"],
    },
  },
  {
    slug: "design-tinder",
    title: "Design Tinder",
    description: "Location-based dating app with swipe-based matching, real-time chat, and profile recommendations",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "💘",
    content: {
      overview: "A dating app shows nearby user profiles for swiping (like/pass), creates matches when both users like each other, and enables real-time chat between matches. Core challenges include efficient proximity-based user discovery, recommendation ranking, preventing users from seeing the same profiles repeatedly, and real-time matching.",
      keyPoints: [
        "Geospatial indexing: find users within N km radius using geohash or spatial index. Update location on app open",
        "Recommendation engine: rank nearby profiles by compatibility score, activity recency, and previous swipe patterns",
        "Swipe deduplication: store all shown profiles per user to never show the same person twice",
        "Matching: when User A likes User B AND User B has already liked User A → create match, notify both via push",
        "Chat: WebSocket-based real-time messaging between matched users, similar to design-chat-system",
      ],
      explanation: "Profile recommendation flow: (1) User opens app, sends GPS location. (2) Backend finds eligible profiles within radius using geohash spatial query. (3) Filter out: already swiped, blocked, wrong gender/age preferences, inactive users. (4) Rank remaining profiles by: distance, activity recency, profile completeness, Elo-like attractiveness score, and compatibility signals. (5) Return top-N profiles as a 'card stack' for swiping.\n\nMatching: swipes are stored as (swiper_id, swipee_id, direction). On a right-swipe, check if a reverse swipe exists. If yes → create match → send push notifications to both → enable chat.\n\nScale challenge: with 50M active users, the 'already seen' set per user can grow to hundreds of thousands. Store as a Bloom filter (space-efficient) or compressed bitmap per user.",
      realWorld: ["Tinder: 75M+ monthly users, 2B+ swipes/day", "Uses geosharding to partition users by location", "Processes 1.5M matches/day requiring real-time notifications"],
    },
  },
  {
    slug: "design-job-scheduler",
    title: "Design Distributed Job Scheduler",
    description: "Schedule and execute tasks across a cluster — cron jobs, delayed tasks, and recurring workflows",
    category: "real-world",
    difficulty: "Advanced",
    icon: "⏰",
    content: {
      overview: "A distributed job scheduler manages the scheduling, execution, and monitoring of tasks across multiple machines. It handles one-time delayed jobs, recurring cron-like schedules, and complex DAG workflows. Core challenges include exactly-once execution, handling worker failures, and scaling to millions of jobs.",
      keyPoints: [
        "Job types: immediate, delayed (run at specific time), recurring (cron expression), DAG (job dependencies)",
        "Exactly-once execution: use distributed locking or DB row-level locking to prevent two workers from picking the same job",
        "Worker pool: workers pull jobs from a queue. Failed jobs are retried with exponential backoff and dead-letter queue",
        "Scheduling: priority queue ordered by next execution time. Timer-based polling or database polling for due jobs",
        "Observability: job status tracking (PENDING→RUNNING→SUCCESS/FAILED), execution logs, alerting on failures",
      ],
      explanation: "Architecture: (1) Scheduler Service: accepts job submissions, stores in database with next_run_at timestamp, manages recurring job re-scheduling. (2) Timer Service: polls database every second for jobs where next_run_at <= now(). Pushes due jobs to execution queue. (3) Worker Pool: workers pull jobs from the queue, execute them, report status.\n\nExactly-once guarantee: when the Timer Service picks up a job, it atomically updates the status to RUNNING with a lease_expiry timestamp (e.g., 5 minutes). If the worker crashes, the lease expires and another worker can pick it up. The worker checks idempotency keys before executing.\n\nCron scheduling: parse cron expression '0 9 * * 1' (every Monday at 9 AM). Compute next_run_at. After successful execution, compute the next occurrence and update next_run_at.\n\nDAG workflows: Job A → [Job B, Job C] → Job D. Store dependencies in a graph. When A completes, check if B and C's dependencies are met. When both B and C complete, trigger D.",
      realWorld: ["Airflow: DAG-based workflow scheduler used at Airbnb, Spotify, PayPal", "Kubernetes CronJobs: built-in cron scheduling for containerized tasks", "Celery: distributed task queue for Python with 10K+ GitHub stars"],
    },
  },
  {
    slug: "design-location-service",
    title: "Design Location-Based Service",
    description: "Find nearby places, businesses, and points of interest — like Yelp or Google Places",
    category: "real-world",
    difficulty: "Intermediate",
    icon: "📍",
    content: {
      overview: "A location-based service (LBS) helps users find nearby businesses, restaurants, and points of interest (POIs). Users can search by location and category, view business details, read/write reviews, and see ratings. Core challenges include efficient geospatial queries at scale and relevance ranking.",
      keyPoints: [
        "Geospatial indexing: geohash or QuadTree to efficiently query POIs within a radius or bounding box",
        "Geohash: encode lat/lng into a string (e.g., '9q8yyk'). Nearby locations share a common prefix — range query on prefix",
        "QuadTree: recursively divide 2D space into quadrants. Leaf nodes contain POIs. Efficient for variable-density areas",
        "Search ranking: combine relevance (text match), distance, rating, review count, business status (open now)",
        "Read-heavy: POI data rarely changes. Aggressive caching by geohash prefix + category",
      ],
      explanation: "Search flow: user searches 'pizza near me' at location (37.77, -122.42). (1) Geocode user location to geohash '9q8yyk'. (2) Query POI index for businesses with category='pizza' in geohash '9q8yyk' and adjacent 8 geohash cells. (3) Filter by distance radius (e.g., 5km). (4) Rank by: text relevance × (1/distance) × rating × log(review_count) × is_open_now. (5) Return top 20 results with business details.\n\nGeohash precision: length 4 = ~39km cell, length 5 = ~5km cell, length 6 = ~1.2km cell. For 'nearby' queries, use length 5-6 and check the cell + 8 neighbors to handle edge cases near cell boundaries.\n\nWrite path: business owners update their listing (hours, photos, menu). Updates go through a moderation queue, then update the POI database and invalidate geohash-based caches.\n\nReview system: reviews are stored per business. Rating is a running weighted average. Fake review detection uses ML models analyzing review patterns, user behavior, and text analysis.",
      realWorld: ["Yelp: 200M+ reviews, geohash-based search across 30+ countries", "Google Places: billions of POIs with real-time business hours and busyness data", "Foursquare: location intelligence platform powering 150K+ apps"],
    },
  },
];

export const getCategoryColor = (categoryId: string): string => {
  const colorMap: Record<string, string> = {
    fundamentals: "blue",
    scalability: "emerald",
    "load-balancing": "purple",
    databases: "orange",
    caching: "yellow",
    networking: "cyan",
    messaging: "pink",
    distributed: "red",
    patterns: "indigo",
    "real-world": "violet",
  };
  return colorMap[categoryId] || "gray";
};

export const getDifficultyColor = (difficulty: Difficulty): string => {
  const colorMap: Record<Difficulty, string> = {
    Beginner: "emerald",
    Intermediate: "amber",
    Advanced: "red",
  };
  return colorMap[difficulty];
};
