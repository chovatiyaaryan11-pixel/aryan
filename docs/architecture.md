# Architecture

## Current MVP

Client -> FastAPI -> SQLite
                    -> Memory
                    -> Tasks
                    -> Agent endpoint

## Planned production architecture

Web dashboard -> API -> Agent orchestrator -> AI model
                              |-> PostgreSQL
                              |-> vector memory
                              |-> Notion integration
                              |-> approved automation tools

The agent must require confirmation before consequential actions such as sending messages, deleting data, or making financial transactions.
