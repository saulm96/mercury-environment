---
name: backend-model
description: Defines Sequelize model conventions for MySQL — UUID primary keys stored as CHAR(36), paranoid soft deletes, and index requirements
metadata:
  agent: backend
---
# backend-model

**Agent:** Backend Agent
**When to activate:** Whenever a Sequelize model is created or modified.

---

## Absolute rule

During development, use `sync: { alter: true }` to automatically sync model definitions to the database. Migrations will be introduced before production deployment.

## Model structure

```typescript
import { Column, DataType, Model, Table, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../users/user.model';

@Table({ tableName: 'expenses', timestamps: true, paranoid: true })
export class Expense extends Model {
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  description: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  date: string;
}
```

## Mandatory conventions

- `primaryKey` is always UUID v4 stored as `CHAR(36)`. Never use autoincrement.
- `timestamps: true` always — `createdAt` and `updatedAt` automatic.
- `paranoid: true` on all models representing user data — soft delete by default.
- Table names in `snake_case` plural (`expenses`, `income_entries`).
- Column names in `camelCase` in the model; Sequelize maps them to `snake_case` in DB.
- Every string field has an explicit length (`DataType.STRING(255)`).
- Every decimal field has explicit precision (`DataType.DECIMAL(10, 2)`).
- UUID foreign keys use `DataType.CHAR(36)` (MySQL does not have a native UUID type).

## Mandatory indexes

- Always add an index on `userId` (all queries filter by user).
- Add an index on date fields if they will be used for filtering or sorting.
- Add an index on fields used in frequent `WHERE` clauses.
