# FlowForge

A simplified Zapier/n8n-style workflow automation platform: a drag-and-drop
visual editor for building **trigger → condition → action** workflows,
executed asynchronously by a distributed worker pool, with real-time
execution logs streamed to the browser over WebSockets.

## Stack

**Frontend**: React, TypeScript, React Flow, React Query, Tailwind CSS, native WebSocket
**Backend**: Go, Gin, GORM, PostgreSQL, Redis
**Workflow engine**: a Redis-backed distributed task queue + worker pool (see
[Swapping in Temporal](#swapping-in-temporal) below for how to upgrade to Temporal)

## Architecture

```
┌─────────────┐      REST/JSON       ┌──────────────┐
│   React     │ ───────────────────▶ │  Gin API     │
│  (ReactFlow)│ ◀─────────────────── │  (Go)        │
└─────────────┘      WebSocket       └──────┬───────┘
       ▲               logs                 │
       │                                     │ writes
       │                              ┌──────▼───────┐
       │                              │  PostgreSQL   │  workflows, executions, logs
       │                              └──────┬───────┘
       │                                     │
       │                              ┌──────▼───────┐
       └───────── pub/sub ───────────▶│    Redis      │  execution queue + pub/sub
                                       └──────┬───────┘
                                              │ BRPOP
                                     ┌────────▼────────┐
                                     │ Worker goroutines│  (horizontally scalable)
                                     │ engine.run()      │
                                     └───────────────────┘
```

1. A trigger fires — a webhook POST to `/webhooks/:slug`, a cron schedule, or
   a manual "Test run" click.
2. The API creates an `Execution` row and pushes the execution ID onto a
   Redis list (`flowforge:execution:queue`).
3. One of N worker goroutines (`engine.StartWorkers`) pops the ID, loads the
   workflow's nodes/edges, topologically sorts the graph (Kahn's algorithm),
   and executes each node in order: triggers pass through, conditions
   short-circuit the branch if false, actions run (HTTP request / delay /
   log).
4. Every step is written to `execution_logs` in Postgres **and** published to
   a Redis channel scoped to that execution ID.
5. The frontend opens a WebSocket to `/ws/executions/:id`; the backend
   subscribes to that Redis channel and streams events straight through,
   giving real-time log tailing that works even if the worker that ran the
   execution is a different process/replica than the one holding the
   WebSocket connection.

Running `engine.StartWorkers(ctx, n)` in multiple backend replicas gives you
genuine distributed processing — all replicas pop from the same Redis queue,
so work is load-balanced automatically.

## Running locally

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Postgres: localhost:5432 (user/pass/db: `flowforge`)
- Redis: localhost:6379

Or run natively:

```bash
# Backend
cd backend
go mod tidy
go run ./cmd/server

# Frontend
cd frontend
npm install
npm run dev
```

## API summary

| Method | Path                              | Description                          |
|--------|------------------------------------|---------------------------------------|
| GET    | `/api/workflows`                  | List workflows                        |
| POST   | `/api/workflows`                  | Create workflow                       |
| GET    | `/api/workflows/:id`              | Get workflow                          |
| PUT    | `/api/workflows/:id`              | Update workflow (nodes/edges)         |
| DELETE | `/api/workflows/:id`              | Delete workflow                       |
| PATCH  | `/api/workflows/:id/status`       | Set status (draft/active/paused)      |
| POST   | `/api/workflows/:id/trigger`      | Manually trigger a run                |
| GET    | `/api/workflows/:id/executions`   | List executions for a workflow        |
| GET    | `/api/executions/:id`             | Get one execution                     |
| GET    | `/api/executions/:id/logs`        | Get logs for an execution             |
| POST   | `/webhooks/:slug`                 | Public webhook trigger endpoint       |
| GET    | `/ws/executions/:id`              | WebSocket: live execution log stream  |

## Node types

- **Trigger**: `manual`, `webhook`, `schedule` (cron expression on the workflow)
- **Condition**: `field` / `operator` (`equals`, `not_equals`, `contains`) / `value`, evaluated against the trigger's input payload — false conditions stop that branch without failing the run
- **Action**: `http_request` (method/url/body), `log` (message), `delay` (ms)

## Swapping in Temporal

The engine is intentionally isolated behind `engine.Engine.Enqueue` /
`engine.Engine.StartWorkers` so the Redis-queue implementation can be
replaced with real Temporal without touching handlers or the frontend:

1. Add the Temporal Go SDK (`go.temporal.io/sdk`) and run a Temporal server
   (`temporalite` or the Temporal docker-compose) alongside Postgres/Redis.
2. Define a `WorkflowExecution` Temporal workflow whose body is basically
   `engine.run`'s node loop, and an activity per node type
   (`RunTriggerActivity`, `RunConditionActivity`, `RunActionActivity`) built
   from `engine/nodes.go`.
3. Replace `Enqueue` with `temporalClient.ExecuteWorkflow(...)` and replace
   `StartWorkers`/`workerLoop` with a `worker.New(temporalClient, taskQueue,
   worker.Options{})` that registers the workflow + activities.
4. Keep emitting `ExecutionLog` rows + Redis pub/sub from inside the
   activities exactly as `engine.emit` does today, so the WebSocket/log UI
   needs no changes.
5. Temporal's own UI/CLI (`temporal workflow show`) then gives you retries,
   timers, signals, and durable execution history for free — the queue-based
   engine here is a lightweight stand-in with the same external API.

## Project layout

```
flowforge/
├── backend/
│   ├── cmd/server/main.go        # entrypoint: wires DB, Redis, engine, routes
│   └── internal/
│       ├── config/                # env config
│       ├── db/                    # GORM/Postgres connection + migrations
│       ├── models/                # Workflow, Execution, ExecutionLog
│       ├── engine/                # graph topo-sort + node execution + worker pool
│       ├── handlers/              # REST + webhook + WebSocket handlers
│       ├── realtime/               # Redis pub/sub -> WebSocket hub
│       └── scheduler/              # cron trigger sync
├── frontend/
│   └── src/
│       ├── api/                   # axios client + React Query hooks
│       ├── components/            # FlowEditor (React Flow canvas), node types, inspector, logs
│       ├── hooks/                 # useExecutionStream (WebSocket)
│       ├── pages/                 # Dashboard, Editor
│       └── types/
└── docker-compose.yml
```
