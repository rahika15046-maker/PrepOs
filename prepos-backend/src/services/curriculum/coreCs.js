import { S, R, topic } from './helpers.js'

const STAGE = 'Core Computer Science'

export const CORE_CS_TOPICS = {
  oop: topic({
    key: 'cs-oop',
    title: 'Object-Oriented Programming',
    stage: STAGE,
    track: 'core-cs',
    difficulty: 'beginner',
    importance: 8,
    description:
      'The four pillars of OOP, SOLID design and the patterns that interviewers and real codebases rely on.',
    outcomes: [
      'Model a real problem as cooperating classes and interfaces',
      'Explain encapsulation, inheritance, polymorphism and abstraction with examples',
      'Apply SOLID principles to critique and refactor code',
      'Recognise and implement the most common design patterns',
    ],
    subtopicDetails: [
      S('Classes, Objects & Memory', 2, 'How objects are created, stored and referenced.', ['Class vs object', 'Constructors & destructors', 'this / self reference', 'Static vs instance members', 'Stack vs heap allocation', 'Shallow vs deep copy'], ['Model a BankAccount and LibraryBook class']),
      S('Encapsulation & Abstraction', 2, 'Hiding state and exposing only what callers need.', ['Access modifiers', 'Getters & setters', 'Data hiding', 'Abstraction vs encapsulation', 'Immutability', 'Information hiding in APIs']),
      S('Inheritance', 2.5, 'Reusing behaviour through class hierarchies.', ['Single, multilevel, hierarchical inheritance', 'Method overriding', 'super keyword', 'Constructor chaining', 'Diamond problem', 'Composition over inheritance']),
      S('Polymorphism', 2.5, 'One interface, many behaviours.', ['Compile-time (overloading)', 'Run-time (overriding)', 'Dynamic dispatch & vtables', 'Upcasting & downcasting', 'Duck typing', 'Operator overloading']),
      S('Interfaces & Abstract Classes', 2, 'Contracts vs partial implementations.', ['Interface vs abstract class', 'Default methods', 'Multiple interface implementation', 'Marker interfaces', 'Programming to an interface']),
      S('SOLID Principles', 3.5, 'Five guidelines for maintainable object design.', ['Single Responsibility', 'Open/Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion', 'Spotting violations in code'], ['Refactor a God class into SOLID-compliant classes']),
      S('Design Patterns Essentials', 4, 'Reusable solutions to recurring design problems.', ['Singleton', 'Factory & Abstract Factory', 'Builder', 'Observer', 'Strategy', 'Decorator', 'Adapter', 'When NOT to use a pattern']),
      S('Exceptions, Generics & Object Lifecycle', 2, 'Robust error handling and reusable typed code.', ['Checked vs unchecked exceptions', 'try/catch/finally', 'Custom exceptions', 'Generics & type safety', 'Garbage collection basics', 'equals/hashCode contract']),
    ],
    resources: [
      R('OOP concepts explained with examples', 'video', 'object oriented programming full course'),
      R('SOLID principles with code examples', 'article', 'SOLID principles explained with examples'),
      R('Refactoring Guru — Design Patterns', 'documentation', 'refactoring guru design patterns'),
    ],
    interviewFocus: [
      'Explain the four pillars of OOP with a real-world example',
      'Difference between abstract class and interface',
      'What is the diamond problem and how is it solved?',
      'Give an example of violating and fixing the Liskov Substitution Principle',
      'Design a parking lot / elevator system (LLD)',
    ],
    miniProject: 'Design and implement a Library Management System using at least three design patterns.',
  }),

  dbms: topic({
    key: 'cs-dbms',
    title: 'Database Management Systems (DBMS & SQL)',
    stage: STAGE,
    track: 'core-cs',
    difficulty: 'intermediate',
    importance: 9,
    description:
      'Relational theory, SQL mastery, transactions, indexing and how databases actually execute queries.',
    outcomes: [
      'Design normalised schemas from requirements',
      'Write complex SQL with joins, aggregates, window functions and subqueries',
      'Explain ACID, isolation levels and how concurrency anomalies arise',
      'Reason about indexes and query plans to fix slow queries',
    ],
    subtopicDetails: [
      S('Relational Model & Keys', 2, 'Tables, relations and the keys that identify rows.', ['Tuples, attributes, relations', 'Super, candidate, primary keys', 'Foreign keys & referential integrity', 'Integrity constraints', 'Relational algebra basics', 'Schema vs instance']),
      S('ER Modeling & Schema Design', 2.5, 'Translating business requirements into tables.', ['Entities & relationships', 'Cardinality (1:1, 1:N, M:N)', 'Weak entities', 'Generalisation/specialisation', 'ER diagram to relational schema', 'Junction tables']),
      S('SQL Fundamentals', 5, 'Reading and writing data with SQL.', ['DDL vs DML vs DCL vs TCL', 'SELECT, WHERE, ORDER BY, LIMIT', 'GROUP BY & HAVING', 'INNER/LEFT/RIGHT/FULL/CROSS joins', 'Subqueries & correlated subqueries', 'Set operations (UNION, INTERSECT)', 'NULL handling', 'Views'], ['Solve 30 SQL problems on a practice platform']),
      S('Advanced SQL', 4, 'Window functions, CTEs and analytical queries.', ['Window functions (ROW_NUMBER, RANK, LAG)', 'Common Table Expressions', 'Recursive CTEs', 'CASE expressions', 'Stored procedures & triggers', 'Query optimisation habits']),
      S('Normalization', 3, 'Removing redundancy without losing information.', ['Functional dependencies', 'Anomalies (insert/update/delete)', '1NF, 2NF, 3NF, BCNF', 'Lossless decomposition', 'Denormalisation trade-offs', 'Closure of attributes']),
      S('Transactions & ACID', 3, 'Guaranteeing correctness under failure.', ['Atomicity, Consistency, Isolation, Durability', 'Commit & rollback', 'Savepoints', 'Schedules & serializability', 'Write-ahead logging', 'Crash recovery basics']),
      S('Concurrency Control & Isolation Levels', 3.5, 'Running many transactions safely at once.', ['Dirty, non-repeatable & phantom reads', 'Read uncommitted → Serializable', 'Two-phase locking', 'Deadlocks in databases', 'MVCC', 'Optimistic vs pessimistic locking']),
      S('Indexing & Storage', 3.5, 'Why some queries are fast and others crawl.', ['B-tree & B+ tree indexes', 'Clustered vs non-clustered', 'Composite indexes & leftmost prefix', 'Hash indexes', 'Covering indexes', 'EXPLAIN & query plans', 'Cost of over-indexing']),
      S('NoSQL, CAP & Scaling Basics', 3, 'When and why to leave the relational model.', ['Document, key-value, column, graph stores', 'CAP theorem', 'BASE vs ACID', 'Replication', 'Sharding & partitioning', 'Choosing SQL vs NoSQL']),
    ],
    resources: [
      R('DBMS full course for placements', 'video', 'DBMS full course placement'),
      R('SQL practice problems', 'practice', 'sql practice problems interview'),
      R('Use The Index, Luke — SQL indexing guide', 'documentation', 'use the index luke'),
    ],
    interviewFocus: [
      'Explain ACID with a bank-transfer example',
      'Difference between clustered and non-clustered index',
      'What are isolation levels and which anomalies does each prevent?',
      'Normalise this table to 3NF / BCNF',
      'Second-highest salary / top-N per group SQL problems',
    ],
    miniProject: 'Design a normalised schema for an e-commerce app and write 15 analytical queries against it.',
  }),

  os: topic({
    key: 'cs-os',
    title: 'Operating Systems',
    stage: STAGE,
    track: 'core-cs',
    difficulty: 'intermediate',
    importance: 8,
    description:
      'How the OS manages processes, memory, storage and concurrency — the foundation of every running program.',
    outcomes: [
      'Explain process vs thread and how context switching works',
      'Solve classic synchronisation problems with semaphores/mutexes',
      'Detect and prevent deadlocks',
      'Trace address translation, paging and page replacement by hand',
    ],
    subtopicDetails: [
      S('OS Fundamentals & System Calls', 2, 'What an OS is and how programs talk to it.', ['Kernel vs user mode', 'System calls', 'Monolithic vs micro-kernel', 'Boot process', 'Interrupts & traps', 'OS types']),
      S('Processes & Threads', 3, 'The unit of execution and its lifecycle.', ['Process states & PCB', 'Context switching', 'fork/exec/wait', 'Threads vs processes', 'User vs kernel threads', 'Multithreading models', 'Zombie & orphan processes']),
      S('CPU Scheduling', 3, 'Deciding who runs next.', ['FCFS, SJF, SRTF', 'Priority scheduling & starvation', 'Round robin & time quantum', 'Multilevel feedback queue', 'Turnaround/waiting/response time', 'Gantt chart problems'], ['Solve 10 scheduling numericals']),
      S('Synchronization', 4, 'Coordinating concurrent execution.', ['Race conditions & critical sections', 'Mutex vs semaphore vs monitor', 'Peterson\'s solution', 'Producer–consumer', 'Readers–writers', 'Dining philosophers', 'Spinlocks & atomic operations']),
      S('Deadlocks', 2.5, 'When everyone waits forever.', ['Four necessary conditions', 'Resource allocation graph', 'Prevention & avoidance', 'Banker\'s algorithm', 'Detection & recovery', 'Livelock vs starvation']),
      S('Memory Management', 3.5, 'Giving every process its own address space.', ['Logical vs physical address', 'Contiguous allocation & fragmentation', 'Paging & page tables', 'Segmentation', 'TLB', 'Multilevel page tables']),
      S('Virtual Memory', 3.5, 'Running programs larger than RAM.', ['Demand paging & page faults', 'FIFO, LRU, Optimal replacement', 'Belady\'s anomaly', 'Thrashing & working set', 'Copy-on-write', 'Swapping']),
      S('File Systems & I/O', 3, 'Persisting data safely.', ['File attributes & operations', 'Allocation (contiguous, linked, indexed)', 'Inodes & directories', 'Disk scheduling (SCAN, C-SCAN)', 'RAID levels', 'Journaling']),
      S('Inter-Process Communication', 2, 'How processes exchange data.', ['Pipes & named pipes', 'Message queues', 'Shared memory', 'Sockets', 'Signals']),
    ],
    resources: [
      R('Operating Systems full course', 'video', 'operating systems full course gate smashers'),
      R('OSTEP — Operating Systems: Three Easy Pieces', 'book', 'ostep operating systems three easy pieces'),
    ],
    interviewFocus: [
      'Process vs thread — what is shared and what is not?',
      'What happens during a context switch?',
      'Explain deadlock and the four Coffman conditions',
      'What is thrashing and how do you avoid it?',
      'Mutex vs semaphore — when do you use which?',
    ],
    miniProject: 'Write a multithreaded producer–consumer program and a small CPU-scheduling simulator.',
  }),

  cn: topic({
    key: 'cs-cn',
    title: 'Computer Networks',
    stage: STAGE,
    track: 'core-cs',
    difficulty: 'intermediate',
    importance: 8,
    description:
      'From bits on a wire to HTTPS in the browser: the layered model that powers the internet.',
    outcomes: [
      'Trace what happens when you type a URL and press Enter',
      'Subnet an IP block and reason about routing',
      'Explain TCP reliability, flow control and congestion control',
      'Understand DNS, HTTP/HTTPS and TLS well enough to debug real issues',
    ],
    subtopicDetails: [
      S('Network Models (OSI & TCP/IP)', 2.5, 'Layered thinking about communication.', ['OSI 7 layers', 'TCP/IP 4 layers', 'Encapsulation & headers', 'Protocol vs service', 'Switching: circuit vs packet', 'Latency, bandwidth, throughput']),
      S('Data Link & Physical Layer', 3, 'Moving frames between neighbours.', ['MAC addresses & Ethernet', 'Switches vs hubs', 'ARP', 'Error detection (CRC, parity)', 'CSMA/CD & CSMA/CA', 'VLAN basics']),
      S('IP Addressing & Subnetting', 4, 'Addressing machines and carving networks.', ['IPv4 classes & CIDR', 'Subnet masks & subnetting', 'Private vs public IPs', 'NAT', 'IPv6 basics', 'DHCP'], ['Solve 15 subnetting problems']),
      S('Routing', 3, 'How packets find their way.', ['Routers & forwarding tables', 'Distance vector (RIP)', 'Link state (OSPF)', 'BGP overview', 'ICMP, ping & traceroute', 'TTL']),
      S('Transport Layer: TCP & UDP', 4.5, 'Reliable vs fast delivery.', ['Ports & sockets', 'TCP 3-way handshake & teardown', 'Sequence & acknowledgement numbers', 'Flow control (sliding window)', 'Congestion control (slow start, AIMD)', 'UDP use-cases', 'TCP vs UDP']),
      S('DNS, HTTP & HTTPS', 4, 'The application protocols developers use daily.', ['DNS resolution & record types', 'HTTP methods, status codes, headers', 'HTTP/1.1 vs HTTP/2 vs HTTP/3', 'Cookies & sessions', 'CORS', 'TLS handshake & certificates', 'Caching headers']),
      S('Application Protocols & Real-Time', 2.5, 'Email, file transfer and persistent connections.', ['SMTP, IMAP, POP3', 'FTP/SFTP', 'WebSockets & SSE', 'REST vs gRPC at the wire level', 'SSH']),
      S('Network Security Basics', 2.5, 'Threats and the controls against them.', ['Symmetric vs asymmetric crypto', 'Digital signatures', 'Firewalls', 'VPN', 'Common attacks (DDoS, MITM, spoofing)', 'Zero trust overview']),
      S('Load Balancers, CDNs & Proxies', 2, 'Infrastructure between client and server.', ['Forward vs reverse proxy', 'L4 vs L7 load balancing', 'CDN edge caching', 'Health checks', 'API gateways']),
    ],
    resources: [
      R('Computer Networks full course', 'video', 'computer networks full course'),
      R('Kurose & Ross — Computer Networking: A Top-Down Approach', 'book', 'kurose ross computer networking top down'),
      R('Wireshark basics to see packets yourself', 'video', 'wireshark tutorial beginners'),
    ],
    interviewFocus: [
      'What happens when you type google.com in the browser?',
      'TCP vs UDP — with real examples',
      'Explain the TCP three-way handshake',
      'How does HTTPS keep data secure?',
      'What is subnetting and why is it needed?',
    ],
    miniProject: 'Build a simple TCP chat server and inspect the packets with Wireshark.',
  }),

  systemDesign: topic({
    key: 'cs-system-design',
    title: 'System Design Fundamentals',
    stage: STAGE,
    track: 'core-cs',
    difficulty: 'advanced',
    importance: 8,
    description:
      'The building blocks for designing scalable, reliable services — asked in almost every SDE interview.',
    outcomes: [
      'Break a vague product requirement into a concrete design',
      'Choose caches, queues, databases and partitioning strategies with trade-offs',
      'Do back-of-the-envelope capacity estimation',
      'Walk through classic designs: URL shortener, chat, news feed',
    ],
    subtopicDetails: [
      S('Requirements & Estimation', 2, 'Turning ambiguity into numbers.', ['Functional vs non-functional requirements', 'QPS, storage & bandwidth estimation', 'Latency numbers to know', 'SLA / SLO / SLI', 'Read-heavy vs write-heavy']),
      S('Scalability & Load Balancing', 3, 'Handling more users.', ['Vertical vs horizontal scaling', 'Stateless services', 'Load-balancing algorithms', 'Consistent hashing', 'Auto-scaling', 'Single points of failure']),
      S('Caching', 3, 'Trading memory for speed.', ['Cache-aside, write-through, write-back', 'Eviction policies (LRU, LFU)', 'Cache invalidation', 'Redis vs Memcached', 'CDN caching', 'Cache stampede']),
      S('Database Scaling', 3.5, 'Growing beyond one machine.', ['Replication (leader/follower)', 'Sharding strategies', 'Indexes at scale', 'SQL vs NoSQL choice', 'CAP & PACELC', 'Eventual consistency']),
      S('Messaging & Async Processing', 3, 'Decoupling services.', ['Queues vs pub/sub', 'Kafka & RabbitMQ concepts', 'At-least/at-most/exactly-once', 'Idempotency', 'Dead-letter queues', 'Backpressure']),
      S('API Design & Communication', 2.5, 'Contracts between services.', ['REST best practices', 'GraphQL & gRPC', 'Pagination & rate limiting', 'API versioning', 'Authentication (JWT, OAuth2)', 'Idempotent endpoints']),
      S('Reliability & Observability', 2.5, 'Staying up and knowing why you are not.', ['Redundancy & failover', 'Circuit breakers & retries', 'Logging, metrics, tracing', 'Health checks', 'Disaster recovery']),
      S('Classic Design Case Studies', 6, 'Practise the interview format end-to-end.', ['URL shortener', 'Rate limiter', 'Chat / messaging system', 'News feed', 'File storage (Drive/Dropbox)', 'Notification service', 'Low-level design vs high-level design'], ['Design 5 systems on paper with diagrams and estimations']),
    ],
    resources: [
      R('System design primer', 'article', 'system design primer github donnemartin'),
      R('System design interview walkthroughs', 'video', 'system design interview url shortener'),
      R('Designing Data-Intensive Applications', 'book', 'designing data-intensive applications kleppmann'),
    ],
    interviewFocus: [
      'Design a URL shortener',
      'How would you scale a read-heavy service?',
      'Explain consistent hashing',
      'SQL vs NoSQL for this use case — justify',
      'How do you make an API idempotent?',
    ],
    miniProject: 'Write a full design doc (requirements, estimates, diagrams, trade-offs) for a chat application.',
  }),
}

/** Keyword matching from AI-generated csSubjects to curated topics. */
export const CORE_CS_MATCHERS = [
  { id: 'oop', test: /\b(oop|oops|object[- ]oriented|design patterns?)\b/i },
  { id: 'dbms', test: /\b(dbms|database|sql|rdbms|data ?modell?ing)\b/i },
  { id: 'os', test: /\b(operating systems?|os)\b/i },
  { id: 'cn', test: /\b(computer networks?|networking|networks?|cn|tcp)\b/i },
  { id: 'systemDesign', test: /\b(system design|distributed systems?|architecture|scalab)/i },
]
